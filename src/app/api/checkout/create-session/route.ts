import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";
import Stripe from "stripe";
import type { PricingItem } from "@/lib/pricing";
import type { ShippingItem } from "@/lib/shipping";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
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

// Get currency for country, default to USD
function getCurrencyForCountry(countryCode: string): string {
  return COUNTRY_CURRENCY_MAP[countryCode.toUpperCase()] || 'usd';
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication - try both cookie and header methods
    let user = null;
    let authError = null;
    
    // Method 1: Try cookie-based auth
    const { data: cookieAuth, error: cookieError } = await supabase.auth.getUser();
    if (!cookieError && cookieAuth.user) {
      user = cookieAuth.user;
    } else {
      // Method 2: Try Authorization header
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const { data: headerAuth, error: headerError } = await supabase.auth.getUser(token);
        if (!headerError && headerAuth.user) {
          user = headerAuth.user;
        } else {
          authError = headerError;
        }
      } else {
        authError = cookieError;
      }
    }
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = CreateCheckoutSessionSchema.parse(body);

    // Use service client to fetch cart items
    const serviceSupabase = createServiceClient();
    
    // Fetch cart items with product and image details
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

    // Calculate totals using robust pricing and shipping services
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

    // Calculate shipping cost using enhanced shipping service
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
    
    // Determine currency based on shipping country
    const currency = getCurrencyForCountry(validatedData.shippingAddress.countryCode);
    
    // Calculate final pricing with shipping
    const pricingResult = defaultPricingCalculator.calculateTotal(pricingItems, shippingResult);
    
    const { subtotal, taxAmount, shippingAmount, total } = pricingResult;

    // Create Stripe checkout session
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
            unit_amount: Math.round(item.products.price * 100), // Convert to cents
          },
          quantity: item.quantity,
        })),
        // Tax line item
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
        // Shipping line item
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