import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { supabase as supabaseClient } from "@/lib/supabase/client";
import { z } from "zod";
import Stripe from "stripe";
import type { PricingItem } from "@/lib/pricing";
import type { ShippingItem } from "@/lib/shipping";

// Initialize Stripe with fallback for build time
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder_for_build';
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-08-27.basil',
});

const CreateCheckoutSessionSchema = z.object({
  cartItemIds: z.array(z.string().uuid()).min(1),
  shippingAddress: z.object({
    countryCode: z.string().min(2).max(2),
    stateOrCounty: z.string().optional(),
    postalCode: z.string().optional(),
  }),
});

// Currency mapping based on country
const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  'US': 'usd',
  'CA': 'cad', 
  'GB': 'gbp',
  'AU': 'aud',
  'DE': 'eur',
  'FR': 'eur',
  'IT': 'eur',
  'ES': 'eur',
  'NL': 'eur',
  'BE': 'eur',
  'AT': 'eur',
  'PT': 'eur',
  'IE': 'eur',
  'FI': 'eur',
  'LU': 'eur',
  'JP': 'jpy',
  'KR': 'krw',
  'SG': 'sgd',
  'HK': 'hkd',
  'CH': 'chf',
  'SE': 'sek',
  'NO': 'nok',
  'DK': 'dkk',
  'PL': 'pln',
  'CZ': 'czk',
  'HU': 'huf',
  'MX': 'mxn',
  'BR': 'brl',
  'IN': 'inr',
  'NZ': 'nzd',
};

function getCurrencyForCountry(countryCode: string): string {
  return COUNTRY_CURRENCY_MAP[countryCode.toUpperCase()] || 'usd';
}

export async function POST(request: NextRequest) {
  try {
    // Check if Stripe is properly configured
    if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'sk_test_placeholder_for_build') {
      return NextResponse.json(
        { error: 'Stripe is not properly configured. Please set STRIPE_SECRET_KEY environment variable.' },
        { status: 500 }
      );
    }

    const supabase = await createClient();
    
    // Check authentication - try multiple methods
    let user = null;
    let authError = null;
    
    // Method 1: Try cookie-based auth
    const { data: cookieAuth, error: cookieError } = await supabase.auth.getUser();
    console.log('Checkout API: Cookie auth check', { 
      hasUser: !!cookieAuth.user, 
      userId: cookieAuth.user?.id, 
      userEmail: cookieAuth.user?.email,
      cookieError: cookieError?.message 
    });
    
    if (!cookieError && cookieAuth.user) {
      user = cookieAuth.user;
    } else {
      // Method 2: Try Authorization header
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        console.log('Checkout API: Trying Authorization header authentication');
        const { data: headerAuth, error: headerError } = await supabaseClient.auth.getUser(token);
        if (!headerError && headerAuth.user) {
          console.log('Checkout API: Authenticated via Authorization header');
          user = headerAuth.user;
        } else {
          authError = headerError;
        }
      } else {
        // Method 3: Try to get session from cookies directly
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (!sessionError && sessionData.session?.user) {
          console.log('Checkout API: Authenticated via session');
          user = sessionData.session.user;
        } else {
          authError = cookieError || sessionError;
        }
      }
    }
    
    if (authError || !user) {
      console.log('Checkout API: Authentication failed', { 
        authError: authError?.message,
        hasUser: !!user 
      });
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.log('Checkout API: Authenticated user', { 
      userId: user.id, 
      userEmail: user.email 
    });

    const body = await request.json();
    const validatedData = CreateCheckoutSessionSchema.parse(body);

    const serviceSupabase = createServiceClient();
    
    const { data: cartItems, error: cartItemsError } = await serviceSupabase
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
      .eq('user_id', user.id)
      .in('id', validatedData.cartItemIds);

    if (cartItemsError || !cartItems || cartItems.length === 0) {
      return NextResponse.json(
        { error: 'Cart items not found' },
        { status: 404 }
      );
    }

    const { defaultPricingCalculator } = await import('@/lib/pricing');
    const { defaultShippingService } = await import('@/lib/shipping');
    
    const pricingItems: PricingItem[] = cartItems.map((item: any) => ({
      id: item.id,
      sku: item.products.sku,
      price: item.products.price,
      quantity: item.quantity,
      name: item.products.name || `${item.products.frame_size} ${item.products.frame_style} Frame`,
    }));

    const shippingItems: ShippingItem[] = cartItems.map((item: any) => ({
      sku: item.products.sku,
      quantity: item.quantity,
    }));

    let shippingResult;
    try {
      const shippingCalculation = await defaultShippingService.calculateShipping(
        shippingItems,
        validatedData.shippingAddress
      );
      shippingResult = {
        cost: shippingCalculation.recommended.cost,
        currency: shippingCalculation.recommended.currency,
        estimatedDays: shippingCalculation.recommended.estimatedDays,
        serviceName: shippingCalculation.recommended.service,
        carrier: shippingCalculation.recommended.carrier,
        trackingAvailable: shippingCalculation.recommended.trackingAvailable,
      };
    } catch (error) {
      console.error('Error calculating shipping cost:', error);
      return NextResponse.json(
        { error: 'Failed to calculate shipping cost. Please check your address and try again.' },
        { status: 400 }
      );
    }
    
    const currency = getCurrencyForCountry(validatedData.shippingAddress.countryCode);
    const pricingResult = defaultPricingCalculator.calculateTotal(pricingItems, shippingResult);
    const { subtotal, taxAmount, shippingAmount, total } = pricingResult;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: user.email,
      line_items: [
        ...cartItems.map((item: any) => ({
          price_data: {
            currency: currency,
            product_data: {
              name: `${item.products.images.prompt} - ${getFrameSizeLabel(item.products.frame_size)} ${getFrameStyleLabel(item.products.frame_style)} ${getFrameMaterialLabel(item.products.frame_material)}`,
              description: `Framed print: ${item.products.images.prompt}`,
              images: [item.products.images.image_url],
              metadata: {
                image_id: item.products.images.id,
                frame_size: item.products.frame_size,
                frame_style: item.products.frame_style,
                frame_material: item.products.frame_material,
                sku: item.products.sku,
              },
            },
            unit_amount: Math.round(item.products.price * 100),
          },
          quantity: item.quantity,
        })),
        {
          price_data: {
            currency: currency,
            product_data: {
              name: 'Tax',
              description: 'Sales tax',
            },
            unit_amount: Math.round(taxAmount * 100),
          },
          quantity: 1,
        },
        {
          price_data: {
            currency: currency,
            product_data: {
              name: 'Shipping',
              description: shippingResult.serviceName || 'Standard shipping',
            },
            unit_amount: Math.round(shippingAmount * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId: user.id,
        cartItemIds: validatedData.cartItemIds.join(','),
        subtotal: subtotal.toString(),
        taxAmount: taxAmount.toString(),
        shippingAmount: shippingAmount.toString(),
        total: total.toString(),
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/cart`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
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

function getFrameSizeLabel(size: string): string {
  const labels = {
    small: 'Small (8" × 10")',
    medium: 'Medium (12" × 16")',
    large: 'Large (16" × 20")',
    extra_large: 'Extra Large (20" × 24")',
  };
  return labels[size as keyof typeof labels] || size;
}

function getFrameStyleLabel(style: string): string {
  const labels = {
    black: 'Black',
    white: 'White',
    natural: 'Natural Wood',
    gold: 'Gold',
    silver: 'Silver',
  };
  return labels[style as keyof typeof labels] || style;
}

function getFrameMaterialLabel(material: string): string {
  const labels = {
    wood: 'Wood',
    metal: 'Metal',
    plastic: 'Plastic',
    bamboo: 'Bamboo',
  };
  return labels[material as keyof typeof labels] || material;
}
