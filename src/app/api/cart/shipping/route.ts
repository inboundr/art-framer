import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { authenticateRequest } from '@/lib/auth/jwtAuth';
import { z } from 'zod';
import type { ShippingItem } from '@/lib/shipping';

// Helper function to get product attributes based on SKU type
function getProductAttributesForSku(sku: string, frameStyle: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  
  // Only add attributes for SKUs that require them
  // GLOBAL-FRA-CAN-* (extra large frames) require both color and wrap
  if (sku.startsWith('GLOBAL-FRA-CAN-')) {
    if (frameStyle === 'black') {
      attributes.color = 'black';
    } else if (frameStyle === 'white') {
      attributes.color = 'white';
    } else if (frameStyle === 'natural') {
      attributes.color = 'natural';
    } else if (frameStyle === 'gold') {
      attributes.color = 'gold';
    } else if (frameStyle === 'silver') {
      attributes.color = 'silver';
    } else if (frameStyle === 'brown') {
      attributes.color = 'brown';
    } else if (frameStyle === 'grey') {
      attributes.color = 'grey';
    }
    attributes.wrap = 'ImageWrap';
  }
  // GLOBAL-CFPM-* (canvas prints) require color
  else if (sku.startsWith('GLOBAL-CFPM-')) {
    if (frameStyle === 'black') {
      attributes.color = 'black';
    } else if (frameStyle === 'white') {
      attributes.color = 'white';
    } else if (frameStyle === 'natural') {
      attributes.color = 'natural';
    } else if (frameStyle === 'gold') {
      attributes.color = 'gold';
    } else if (frameStyle === 'silver') {
      attributes.color = 'silver';
    } else if (frameStyle === 'brown') {
      attributes.color = 'brown';
    } else if (frameStyle === 'grey') {
      attributes.color = 'grey';
    }
  }
  // GLOBAL-FAP-* (standard frames) don't require attributes
  // No attributes needed for these SKUs
  
  return attributes;
}

const ShippingAddressSchema = z.object({
  countryCode: z.string().min(2).max(2),
  stateOrCounty: z.string().optional(),
  postalCode: z.string().optional(),
  city: z.string().optional(),
});


export async function POST(request: NextRequest) {
  try {
    console.log('Cart Shipping API: Starting request');
    
    // JWT-only authentication
    const { user, error: authError } = await authenticateRequest(request);
    
    if (authError || !user) {
      console.log('Cart Shipping API: Authentication failed', { error: authError });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('Cart Shipping API: Authenticated user', { 
      userId: user.id, 
      userEmail: user.email 
    });

    const body = await request.json();
    const validatedAddress = ShippingAddressSchema.parse(body);

    // Use service client to bypass RLS for cart operations
    const serviceSupabase = createServiceClient();
    
    // Get cart items
    const { data: cartItems, error: cartError } = await serviceSupabase
      .from('cart_items')
      .select(`
        *,
        products (
          *,
          images (
            id,
            prompt,
            image_url,
            thumbnail_url,
            user_id,
            created_at
          )
        )
      `)
      .eq('user_id', user.id);

    if (cartError) {
      console.error('Error fetching cart items:', cartError);
      return NextResponse.json(
        { error: 'Failed to fetch cart items' },
        { status: 500 }
      );
    }

    if (!cartItems || cartItems.length === 0) {
      return NextResponse.json({
        shippingCost: 0,
        estimatedDays: 0,
        serviceName: 'No items in cart'
      });
    }

    // Use enhanced shipping service
    const { defaultShippingService } = await import('@/lib/shipping');
    const { ProdigiClient } = await import('@/lib/prodigi');
    
    // Initialize Prodigi client for SKU regeneration
    const prodigiApiKey = process.env.PRODIGI_API_KEY;
    const prodigiEnvironment = process.env.PRODIGI_ENVIRONMENT as 'sandbox' | 'production' || 'production';
    
    if (!prodigiApiKey) {
      console.warn('⚠️ Prodigi API key not configured, using stored SKUs');
    }
    
    const prodigiClient = prodigiApiKey ? new ProdigiClient(prodigiApiKey, prodigiEnvironment) : null;
    
    // Use stored SKUs directly - no need to regenerate (already validated when added to cart)
    // Extract base SKUs and batch fetch product details for attributes
    const baseSkus = cartItems.map((item: { 
      products: { 
        sku: string; 
      }; 
    }) => 
      prodigiClient ? prodigiClient.extractBaseProdigiSku(item.products.sku) : item.products.sku
    );
    
    // Batch fetch product details (deduplicate SKUs first)
    const uniqueSkus = [...new Set(baseSkus)];
    const productDetailsCache = new Map<string, any>();
    
    if (prodigiClient && uniqueSkus.length > 0) {
      await Promise.all(
        uniqueSkus.map(async (sku) => {
          try {
            const details = await prodigiClient.getProductDetails(sku);
            productDetailsCache.set(sku, details);
          } catch (error) {
            console.warn(`⚠️ Failed to fetch product details for ${sku}:`, error);
          }
        })
      );
    }
    
    // Build shipping items using stored SKUs and cached product details
    const shippingItems: ShippingItem[] = cartItems.map((item: { 
      products: { 
        sku: string; 
        price: number; 
        frame_style: string; 
      }; 
      quantity: number 
    }) => {
      // Extract base SKU (remove image ID suffix if present)
      const baseSku = prodigiClient ? prodigiClient.extractBaseProdigiSku(item.products.sku) : item.products.sku;
      
      // Get attributes from cached product details
      const productDetails = productDetailsCache.get(baseSku);
      const attributes: Record<string, string> = {};
      
      if (productDetails?.attributes) {
        const validAttributes = productDetails.attributes;
        
        // Map frame_style to color attribute
        if (validAttributes.color?.length > 0) {
          const matchingColor = validAttributes.color.find(
            (opt: string) => opt.toLowerCase() === item.products.frame_style.toLowerCase()
          );
          attributes.color = matchingColor || validAttributes.color[0];
        }
        
        // Add wrap if available
        if (validAttributes.wrap?.length > 0) {
          const imageWrap = validAttributes.wrap.find((w: string) => 
            w.toLowerCase().includes('image') || w.toLowerCase() === 'imagewrap'
          );
          if (imageWrap) {
            attributes.wrap = imageWrap.toLowerCase();
          }
        }
      } else {
        // Fallback: use frame_style as color
        attributes.color = item.products.frame_style;
      }
      
      return {
        sku: baseSku,
        quantity: item.quantity,
        price: item.products.price,
        attributes
      };
    });

    // Calculate shipping cost using GUARANTEED calculation
    const shippingCalculation = await defaultShippingService.calculateShippingGuaranteed(
      shippingItems,
      validatedAddress,
      {
        expedited: false,
        insurance: false,
        signature: false,
        trackingRequired: true,
      },
      false // Will be true when Google Maps validation is implemented
    );

    return NextResponse.json({
      shippingCost: shippingCalculation.recommended.cost,
      estimatedDays: shippingCalculation.recommended.estimatedDays,
      estimatedDaysRange: shippingCalculation.recommended.estimatedDaysRange,  // NEW: Add range
      serviceName: shippingCalculation.recommended.service,
      carrier: shippingCalculation.recommended.carrier,
      currency: shippingCalculation.recommended.currency,
      freeShippingAvailable: shippingCalculation.freeShippingAvailable,
      freeShippingThreshold: shippingCalculation.freeShippingThreshold,
      allQuotes: shippingCalculation.quotes.map(q => ({
        carrier: q.carrier,
        service: q.service,
        cost: q.cost,
        currency: q.currency,
        estimatedDays: q.estimatedDays,
        estimatedDaysRange: q.estimatedDaysRange,  // NEW: Include range in all quotes
        trackingAvailable: q.trackingAvailable,
        insuranceIncluded: q.insuranceIncluded,
        signatureRequired: q.signatureRequired
      })),
      isEstimated: shippingCalculation.isEstimated,
      provider: shippingCalculation.provider,
      addressValidated: shippingCalculation.addressValidated,
    });

  } catch (error) {
    console.error('Error calculating shipping cost:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid address data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to calculate shipping cost' },
      { status: 500 }
    );
  }
}
