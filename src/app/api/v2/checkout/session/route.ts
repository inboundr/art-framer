/**
 * V2 Checkout Session API
 * 
 * POST - Create Stripe checkout session
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { authenticateRequest } from '@/lib/auth/jwtAuth';
import { CartService } from '@/lib/checkout/services/cart.service';
import { PricingService } from '@/lib/checkout/services/pricing.service';
import { PaymentService } from '@/lib/checkout/services/payment.service';
import { ProdigiClient as ProdigiClientV1 } from '@/lib/prodigi';
import { ProdigiClient as ProdigiClientV2 } from '@/lib/prodigi-v2/client';
import { currencyService } from '@/lib/currency';
import { validateShippingAddress } from '@/lib/checkout/validators/address.validator';
import { PaymentError } from '@/lib/checkout/types/errors';
import { z } from 'zod';

const CreateSessionSchema = z.object({
  cartItemIds: z.array(z.string().uuid()).min(1),
  shippingAddress: z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    address1: z.string(),
    address2: z.string().optional(),
    city: z.string(),
    state: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().length(2),
    phone: z.string().optional(),
  }),
  shippingMethod: z.enum(['Budget', 'Standard', 'Express', 'Overnight']).optional(),
  currency: z.string().optional(),
});

// Initialize Prodigi v1 client (for CartService - SKU generation)
const getProdigiClientV1 = () => {
  const apiKey = process.env.PRODIGI_API_KEY;
  const environment = (process.env.PRODIGI_ENVIRONMENT as 'sandbox' | 'production') || 'production';
  
  if (!apiKey) {
    return null;
  }
  
  return new ProdigiClientV1(apiKey, environment);
};

// Initialize Prodigi v2 client (for PricingService and ShippingService)
const getProdigiClientV2 = () => {
  const apiKey = process.env.PRODIGI_API_KEY;
  const environment = (process.env.PRODIGI_ENVIRONMENT as 'sandbox' | 'production') || 'production';
  
  if (!apiKey) {
    return null;
  }
  
  return new ProdigiClientV2({
    apiKey,
    environment,
  });
};

function getBaseUrl(request: NextRequest): string {
  const origin = request.headers.get('origin');
  if (origin) return origin;

  const host = request.headers.get('host');
  if (host) {
    const protocol = host.includes('localhost') ? 'http' : 'https';
    return `${protocol}://${host}`;
  }

  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate
    const { user, error: authError } = await authenticateRequest(request);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate body
    const body = await request.json();
    const validated = CreateSessionSchema.parse(body);
    const shippingAddress = validateShippingAddress(validated.shippingAddress);

    // Initialize services
    const supabase = createServiceClient();
    const prodigiClientV1 = getProdigiClientV1();
    const prodigiClientV2 = getProdigiClientV2();
    
    if (!prodigiClientV1 || !prodigiClientV2) {
      return NextResponse.json(
        { error: 'Prodigi client not configured' },
        { status: 500 }
      );
    }

    if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'sk_test_placeholder_for_build') {
      return NextResponse.json(
        { error: 'Stripe is not properly configured' },
        { status: 500 }
      );
    }

    const pricingService = new PricingService(prodigiClientV2, currencyService);
    const cartService = new CartService(supabase, prodigiClientV1, pricingService);
    const paymentService = new PaymentService(process.env.STRIPE_SECRET_KEY);

    // Get cart with real-time pricing
    const cart = await cartService.getCart(
      user.id,
      shippingAddress.country,
      validated.shippingMethod || 'Standard'
    );

    // Filter cart to only include requested items
    const requestedItems = cart.items.filter((item) =>
      validated.cartItemIds.includes(item.id)
    );

    if (requestedItems.length === 0) {
      return NextResponse.json(
        { error: 'No valid cart items found' },
        { status: 400 }
      );
    }

    // Recalculate pricing for filtered items
    const filteredCart: typeof cart = {
      ...cart,
      items: requestedItems,
    };

    const pricing = await pricingService.calculatePricing(
      requestedItems,
      shippingAddress.country,
      validated.shippingMethod || 'Standard',
      validated.currency
    );

    filteredCart.totals = {
      subtotal: pricing.subtotal,
      shipping: pricing.shipping,
      tax: pricing.tax,
      total: pricing.total,
      currency: pricing.currency,
      originalCurrency: pricing.originalCurrency,
      originalTotal: pricing.originalTotal,
      exchangeRate: pricing.exchangeRate,
    };

    // Create Stripe checkout session
    const baseUrl = getBaseUrl(request);
    const session = await paymentService.createCheckoutSession(
      filteredCart,
      shippingAddress,
      validated.shippingMethod || 'Standard',
      user.email || '',
      `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      `${baseUrl}/cart`,
      {
        userId: user.id,
        cartItemIds: validated.cartItemIds.join(','),
        subtotal: pricing.subtotal.toString(),
        taxAmount: pricing.tax.toString(),
        shippingAmount: pricing.shipping.toString(),
        total: pricing.total.toString(),
        currency: pricing.currency,
        originalCurrency: pricing.originalCurrency || pricing.currency,
        originalTotal: pricing.originalTotal?.toString() || pricing.total.toString(),
      }
    );

    // Store shipping address with session
    await (supabase.from('stripe_session_addresses') as any).insert({
      stripe_session_id: session.id,
      user_id: user.id,
      shipping_address: shippingAddress,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }
    if (error instanceof PaymentError) {
      return NextResponse.json(
        { error: error.message, details: error.details },
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

