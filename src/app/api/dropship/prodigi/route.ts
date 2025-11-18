import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { authenticateRequest } from "@/lib/auth/jwtAuth";
import { prodigiClient } from "@/lib/prodigi";
import { z } from "zod";

/**
 * Converts a Supabase storage path to a public URL
 * Prodigi requires publicly accessible absolute URLs
 */
function getPublicImageUrl(imageUrl: string | null | undefined, supabase: any): string | null {
  if (!imageUrl) {
    console.warn('⚠️ No image URL provided');
    return null;
  }

  // If already a full URL, return it
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    console.log('✅ Image URL is already a full URL:', imageUrl);
    return imageUrl;
  }

  // Try to determine which bucket based on path/URL patterns
  let bucket = 'images'; // Default bucket
  
  // Check if it's a curated image (might have different patterns)
  if (imageUrl.includes('curated') || imageUrl.includes('public-')) {
    bucket = 'curated-images';
  }

  try {
    // Convert storage path to public URL
    const { data } = supabase.storage.from(bucket).getPublicUrl(imageUrl);
    const publicUrl = data?.publicUrl;
    
    if (publicUrl) {
      console.log('✅ Converted storage path to public URL:', {
        original: imageUrl,
        publicUrl,
        bucket
      });
      return publicUrl;
    } else {
      console.warn('⚠️ Failed to get public URL for:', imageUrl);
      return imageUrl; // Return original as fallback
    }
  } catch (error) {
    console.error('❌ Error converting image URL:', error);
    return imageUrl; // Return original as fallback
  }
}

const CreateProdigiOrderSchema = z.object({
  orderId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    // JWT-only authentication (admin only for now)
    const { user, error: authError } = await authenticateRequest(request);
    
    if (authError || !user) {
      console.log('Dropship Prodigi API: Authentication failed', { error: authError });
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.log('Dropship Prodigi API: User authenticated', { userId: user.id });
    
    // Use service client for database operations (bypasses RLS)
    const supabase = createServiceClient();

    const body = await request.json();
    const validatedData = CreateProdigiOrderSchema.parse(body);

    // Fetch order with all details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          products (
            *,
            images (
              image_url,
              thumbnail_url
            )
          )
        )
      `)
      .eq('id', validatedData.orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    if ((order as any).status !== 'paid') {
      return NextResponse.json(
        { error: 'Order must be paid before creating dropship order' },
        { status: 400 }
      );
    }

    // Check if dropship order already exists
    const { data: existingDropship } = await supabase
      .from('dropship_orders')
      .select('id, status')
      .eq('order_id', validatedData.orderId)
      .eq('provider', 'prodigi')
      .single();

    if (existingDropship && (existingDropship as any).status !== 'failed') {
      return NextResponse.json(
        { error: 'Dropship order already exists for this order' },
        { status: 409 }
      );
    }

    // Prepare order data for Prodigi
    const prodigiOrderData = {
      orderReference: (order as any).order_number,
      items: await Promise.all((order as any).order_items.map(async (item: any) => {
        // CRITICAL: Convert image URL to public URL if it's a storage path
        // Prodigi requires publicly accessible absolute URLs
        const rawImageUrl = item.products?.images?.image_url || item.products?.images?.thumbnail_url || '';
        const publicImageUrl = getPublicImageUrl(rawImageUrl, supabase);
        
        if (!publicImageUrl) {
          console.error('❌ No valid image URL for Prodigi order item:', {
            productId: item.products?.id,
            imageId: item.products?.images?.id,
            rawImageUrl,
            hasImage: !!item.products?.images
          });
          throw new Error(`Missing or invalid image URL for product ${item.products?.id}`);
        }
        
        console.log('🖼️ Image URL for Prodigi:', {
          productId: item.products?.id,
          rawUrl: rawImageUrl,
          publicUrl: publicImageUrl,
          isFullUrl: publicImageUrl.startsWith('http')
        });
        
        return {
          productSku: await prodigiClient.getProductSku(
            item.products.frame_size,
            item.products.frame_style,
            item.products.frame_material
          ),
          quantity: item.quantity,
          imageUrl: publicImageUrl, // Use public URL instead of raw path
          frameSize: item.products.frame_size,
          frameStyle: item.products.frame_style,
          frameMaterial: item.products.frame_material,
        };
      })),
      shippingAddress: (order as any).shipping_address,
      customerEmail: (order as any).customer_email,
      customerPhone: (order as any).customer_phone,
    };

    // Convert to Prodigi format
    const prodigiOrder = await prodigiClient.convertToProdigiOrder(prodigiOrderData);

    // 🔍 PHASE 2: Final price validation with Prodigi quote before creating order
    console.log('🔍 Final price validation: Getting Prodigi quote before order creation...');
    try {
      // Extract items for quote request
      const quoteItems = prodigiOrder.items.map((item: any) => ({
        sku: item.sku,
        quantity: item.copies || 1,
        attributes: item.attributes || {}
      }));

      const shippingCountry = prodigiOrder.recipient.address.countryCode;
      
      console.log('📤 Final quote request:', {
        items: quoteItems.map((i: any) => `${i.sku} x${i.quantity}`).join(', '),
        destination: shippingCountry
      });

      // Get real-time quote from Prodigi
      const finalQuotes = await prodigiClient.getQuote({
        items: quoteItems,
        destinationCountryCode: shippingCountry
      });

      if (finalQuotes && finalQuotes.length > 0) {
        const finalQuote = finalQuotes[0];
        // Note: finalQuote.cost contains the shipping cost (not items cost)
        const quotedShippingCost = parseFloat(finalQuote.cost.amount);
        
        console.log('📥 Final Prodigi quote received:', {
          shippingCost: `$${quotedShippingCost.toFixed(2)} ${finalQuote.cost.currency}`,
          method: finalQuote.shipmentMethod,
          estimatedDays: finalQuote.estimatedDays
        });

        // Extract expected values from order
        const orderTotal = (order as any).total_amount || 0;
        const expectedShipping = (order as any).shipping_amount || 0;
        
        console.log('📊 Final shipping cost comparison:', {
          expectedShipping: `$${expectedShipping.toFixed(2)}`,
          quotedShipping: `$${quotedShippingCost.toFixed(2)}`,
          orderTotal: `$${orderTotal.toFixed(2)}`,
          difference: `$${Math.abs(quotedShippingCost - expectedShipping).toFixed(2)}`,
          percentDiff: expectedShipping > 0 
            ? `${((Math.abs(quotedShippingCost - expectedShipping) / expectedShipping) * 100).toFixed(2)}%`
            : 'N/A'
        });

        // Log for audit trail (don't block order, but alert if significant difference)
        const shippingDiff = Math.abs(quotedShippingCost - expectedShipping);
        const percentDiff = expectedShipping > 0 ? (shippingDiff / expectedShipping) * 100 : 0;
        
        if (percentDiff > 10 && expectedShipping > 0) {
          console.warn('⚠️ SHIPPING COST MISMATCH DETECTED!', {
            expectedShipping,
            quotedShipping: quotedShippingCost,
            difference: shippingDiff,
            percentDiff: `${percentDiff.toFixed(2)}%`,
            action: 'Logging for review - order will proceed'
          });
          
          // TODO: Consider adding to monitoring/alerting system
          // For now, we log and proceed (Stripe already charged customer)
        } else {
          console.log('✅ Final shipping validation passed:', {
            difference: `${percentDiff.toFixed(2)}%`,
            threshold: '10%'
          });
        }
      } else {
        console.warn('⚠️ No quotes returned for final validation, proceeding with order');
      }
    } catch (quoteError) {
      // Don't block order creation if quote fails (Stripe already charged)
      console.error('⚠️ Failed to get final Prodigi quote:', quoteError);
      console.log('⚠️ Proceeding with order creation (final quote validation failed)');
    }

    // Create order in Prodigi
    console.log('📦 Creating Prodigi order...');
    const prodigiResponse = await prodigiClient.createOrder(prodigiOrder);

    // Update or create dropship order record
    const dropshipOrderData = {
      order_id: validatedData.orderId,
      provider: 'prodigi',
      provider_order_id: prodigiResponse.id,
      status: 'submitted',
      tracking_number: prodigiResponse.trackingNumber,
      tracking_url: prodigiResponse.trackingUrl,
      estimated_delivery: prodigiResponse.estimatedDelivery ? new Date(prodigiResponse.estimatedDelivery) : null,
      provider_response: prodigiResponse,
    };

    if (existingDropship) {
      // Update existing record
      const { error: updateError } = await (supabase as any)
        .from('dropship_orders')
        .update(dropshipOrderData)
        .eq('id', (existingDropship as any).id);

      if (updateError) {
        console.error('Error updating dropship order:', updateError);
        return NextResponse.json(
          { error: 'Failed to update dropship order' },
          { status: 500 }
        );
      }
    } else {
      // Create new record
      const { error: insertError } = await (supabase as any)
        .from('dropship_orders')
        .insert(dropshipOrderData);

      if (insertError) {
        console.error('Error creating dropship order:', insertError);
        return NextResponse.json(
          { error: 'Failed to create dropship order' },
          { status: 500 }
        );
      }
    }

    // Update main order status
    const { error: orderUpdateError } = await (supabase as any)
      .from('orders')
      .update({ 
        status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('id', validatedData.orderId);

    if (orderUpdateError) {
      console.error('Error updating order status:', orderUpdateError);
    }

    return NextResponse.json({
      success: true,
      prodigiOrderId: prodigiResponse.id,
      trackingNumber: prodigiResponse.trackingNumber,
      estimatedDelivery: prodigiResponse.estimatedDelivery,
    });
  } catch (error) {
    console.error('Error in POST /api/dropship/prodigi:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // JWT-only authentication
    const { user, error: authError } = await authenticateRequest(request);
    
    if (authError || !user) {
      console.log('Dropship Prodigi API (GET): Authentication failed', { error: authError });
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.log('Dropship Prodigi API (GET): User authenticated', { userId: user.id });
    
    // Use service client for database operations
    const supabase = createServiceClient();

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    // Fetch dropship order
    const { data: dropshipOrder, error: dropshipError } = await supabase
      .from('dropship_orders')
      .select(`
        *,
        orders (
          id,
          order_number,
          status
        )
      `)
      .eq('order_id', orderId)
      .eq('provider', 'prodigi')
      .single();

    if (dropshipError || !dropshipOrder) {
      return NextResponse.json(
        { error: 'Dropship order not found' },
        { status: 404 }
      );
    }

    // Get updated status from Prodigi
    if ((dropshipOrder as any).provider_order_id) {
      try {
        const orderStatus = await prodigiClient.getOrderStatus((dropshipOrder as any).provider_order_id);
        
        // Update local record with latest status
        const { error: updateError } = await (supabase as any)
          .from('dropship_orders')
          .update({
            status: orderStatus.status,
            tracking_number: orderStatus.trackingNumber,
            tracking_url: orderStatus.trackingUrl,
            estimated_delivery: orderStatus.estimatedDelivery ? new Date(orderStatus.estimatedDelivery) : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', (dropshipOrder as any).id);

        if (updateError) {
          console.error('Error updating dropship order status:', updateError);
        }

        return NextResponse.json({
          dropshipOrder: {
            ...(dropshipOrder as any),
            status: orderStatus.status,
            trackingNumber: orderStatus.trackingNumber,
            trackingUrl: orderStatus.trackingUrl,
            estimatedDelivery: orderStatus.estimatedDelivery,
          }
        });
      } catch (prodigiError) {
        console.error('Error fetching Prodigi order status:', prodigiError);
        // Return local data if Prodigi is unavailable
        return NextResponse.json({ dropshipOrder });
      }
    }

    return NextResponse.json({ dropshipOrder });
  } catch (error) {
    console.error('Error in GET /api/dropship/prodigi:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
