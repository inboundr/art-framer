import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabase as supabaseClient } from '@/lib/supabase/client';
import { z } from 'zod';
import type { ShippingItem } from '@/lib/shipping';

const ShippingAddressSchema = z.object({
  countryCode: z.string().min(2).max(2),
  stateOrCounty: z.string().optional(),
  postalCode: z.string().optional(),
});

async function authenticateUser(request: NextRequest) {
  // First try server-side client (cookies)
  const supabaseServer = await createClient();
  const { data: { user: serverUser }, error: serverError } = await supabaseServer.auth.getUser();
  
  if (serverUser && !serverError) {
    console.log('Cart Shipping API: Authenticated via server client');
    return { user: serverUser, supabase: supabaseServer };
  }
  
  // If server auth fails, try Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    console.log('Cart Shipping API: Trying Authorization header authentication');
    
    // Use the imported supabase client
    const { data: { user: clientUser }, error: clientError } = await supabaseClient.auth.getUser(token);
    
    if (clientUser && !clientError) {
      console.log('Cart Shipping API: Authenticated via Authorization header');
      return { user: clientUser, supabase: supabaseClient };
    }
  }
  
  console.log('Cart Shipping API: Authentication failed', { 
    serverError: serverError?.message,
    hasAuthHeader: !!authHeader 
  });
  
  return { user: null, error: 'Authentication failed' };
}

export async function POST(request: NextRequest) {
  try {
    console.log('Cart Shipping API: Starting request');
    console.log('Cart Shipping API: Request headers', {
      authorization: request.headers.get('authorization'),
      cookie: request.headers.get('cookie'),
      userAgent: request.headers.get('user-agent')
    });
    
    // Authenticate user with both cookies and Authorization header support
    const authResult = await authenticateUser(request);
    
    if (!authResult.user) {
      console.log('Cart Shipping API: Authentication failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { user, supabase } = authResult;
    console.log('Cart Shipping API: Authenticated user', { 
      userId: user.id, 
      userEmail: user.email 
    });

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
    
    const shippingItems: ShippingItem[] = cartItems.map((item: { products: { sku: string; price: number }; quantity: number }) => ({
      sku: item.products.sku,
      quantity: item.quantity,
      price: item.products.price, // Include actual product price
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
