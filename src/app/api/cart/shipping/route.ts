import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import type { ShippingItem } from '@/lib/shipping';

const ShippingAddressSchema = z.object({
  countryCode: z.string().min(2).max(2),
  stateOrCounty: z.string().optional(),
  postalCode: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedAddress = ShippingAddressSchema.parse(body);

    // Get cart items
    const { data: cartItems, error: cartError } = await supabase
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
    
    const shippingItems: ShippingItem[] = cartItems.map((item: { products: { sku: string }; quantity: number }) => ({
      sku: item.products.sku,
      quantity: item.quantity,
    }));

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
      serviceName: shippingCalculation.recommended.service,
      carrier: shippingCalculation.recommended.carrier,
      currency: shippingCalculation.recommended.currency,
      freeShippingAvailable: shippingCalculation.freeShippingAvailable,
      freeShippingThreshold: shippingCalculation.freeShippingThreshold,
      allQuotes: shippingCalculation.quotes,
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
