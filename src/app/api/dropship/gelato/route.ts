import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { gelatoClient } from "@/lib/gelato";
import { z } from "zod";

const CreateGelatoOrderSchema = z.object({
  orderId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication (admin only for now)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = CreateGelatoOrderSchema.parse(body);

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
      .eq('provider', 'gelato')
      .single();

    if (existingDropship && (existingDropship as any).status !== 'failed') {
      return NextResponse.json(
        { error: 'Dropship order already exists for this order' },
        { status: 409 }
      );
    }

    // Prepare order data for Gelato
    const gelatoOrderData = {
      orderReference: (order as any).order_number,
      items: (order as any).order_items.map((item: any) => ({
        productUid: gelatoClient.getProductUid(
          item.products.frame_size,
          item.products.frame_style,
          item.products.frame_material
        ),
        quantity: item.quantity,
        imageUrl: item.products.images.image_url,
        frameSize: item.products.frame_size,
        frameStyle: item.products.frame_style,
        frameMaterial: item.products.frame_material,
      })),
      shippingAddress: (order as any).shipping_address,
      customerEmail: (order as any).customer_email,
      customerPhone: (order as any).customer_phone,
    };

    // Convert to Gelato format
    const gelatoOrder = gelatoClient.convertToGelatoOrder(gelatoOrderData);

    // Create order in Gelato
    const gelatoResponse = await gelatoClient.createOrder(gelatoOrder);

    // Update or create dropship order record
    const dropshipOrderData = {
      order_id: validatedData.orderId,
      provider: 'gelato',
      provider_order_id: gelatoResponse.orderId,
      status: 'submitted',
      tracking_number: gelatoResponse.trackingNumber,
      tracking_url: gelatoResponse.trackingUrl,
      estimated_delivery: gelatoResponse.estimatedDelivery ? new Date(gelatoResponse.estimatedDelivery) : null,
      provider_response: gelatoResponse,
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
      gelatoOrderId: gelatoResponse.orderId,
      trackingNumber: gelatoResponse.trackingNumber,
      estimatedDelivery: gelatoResponse.estimatedDelivery,
    });
  } catch (error) {
    console.error('Error in POST /api/dropship/gelato:', error);
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
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

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
        orders!inner (
          user_id
        )
      `)
      .eq('order_id', orderId)
      .eq('provider', 'gelato')
      .eq('orders.user_id', user.id)
      .single();

    if (dropshipError || !dropshipOrder) {
      return NextResponse.json(
        { error: 'Dropship order not found' },
        { status: 404 }
      );
    }

    // Get updated status from Gelato
    if ((dropshipOrder as any).provider_order_id) {
      try {
        const gelatoOrder = await gelatoClient.getOrder((dropshipOrder as any).provider_order_id);
        
        // Update local record with latest status
        const { error: updateError } = await (supabase as any)
          .from('dropship_orders')
          .update({
            status: gelatoOrder.status,
            tracking_number: gelatoOrder.trackingNumber,
            tracking_url: gelatoOrder.trackingUrl,
            estimated_delivery: gelatoOrder.estimatedDelivery ? new Date(gelatoOrder.estimatedDelivery) : null,
            provider_response: gelatoOrder,
            updated_at: new Date().toISOString(),
          })
          .eq('id', (dropshipOrder as any).id);

        if (updateError) {
          console.error('Error updating dropship order status:', updateError);
        }

        return NextResponse.json({
          dropshipOrder: {
            ...(dropshipOrder as any),
            status: gelatoOrder.status,
            trackingNumber: gelatoOrder.trackingNumber,
            trackingUrl: gelatoOrder.trackingUrl,
            estimatedDelivery: gelatoOrder.estimatedDelivery,
          }
        });
      } catch (gelatoError) {
        console.error('Error fetching Gelato order status:', gelatoError);
        // Return local data if Gelato is unavailable
        return NextResponse.json({ dropshipOrder });
      }
    }

    return NextResponse.json({ dropshipOrder });
  } catch (error) {
    console.error('Error in GET /api/dropship/gelato:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
