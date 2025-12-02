/**
 * V2 Cart API
 * 
 * GET - Fetch cart with real-time pricing
 * POST - Add item to cart
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { authenticateRequest } from '@/lib/auth/jwtAuth';
import { CartService } from '@/lib/checkout/services/cart.service';
import { PricingService } from '@/lib/checkout/services/pricing.service';
import { ProdigiClient as ProdigiClientV1 } from '@/lib/prodigi';
import { ProdigiClient as ProdigiClientV2 } from '@/lib/prodigi-v2/client';
import { currencyService } from '@/lib/currency';
import { validateCartItemInput } from '@/lib/checkout/validators/cart.validator';
import { CartError } from '@/lib/checkout/types/errors';

// Initialize Prodigi v1 client (for CartService - SKU generation)
const getProdigiClientV1 = () => {
  const apiKey = process.env.PRODIGI_API_KEY;
  const environment = (process.env.PRODIGI_ENVIRONMENT as 'sandbox' | 'production') || 'production';
  
  if (!apiKey) {
    return null;
  }
  
  return new ProdigiClientV1(apiKey, environment);
};

// Initialize Prodigi v2 client (for PricingService)
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

export async function GET(request: NextRequest) {
  try {
    // Authenticate
    const { user, error: authError } = await authenticateRequest(request);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const destinationCountry = searchParams.get('country') || 'US';
    const shippingMethod = (searchParams.get('shippingMethod') as any) || 'Standard';

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

    const pricingService = new PricingService(prodigiClientV2, currencyService);
    const cartService = new CartService(supabase, prodigiClientV1, pricingService);

    // Get cart
    const cart = await cartService.getCart(user.id, destinationCountry, shippingMethod);

    return NextResponse.json({ cart });
  } catch (error) {
    console.error('Error fetching cart:', error);
    if (error instanceof CartError) {
      return NextResponse.json(
        { error: error.message, details: error.details },
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      { error: 'Failed to fetch cart' },
      { status: 500 }
    );
  }
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
    const validatedInput = validateCartItemInput(body);

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

    const pricingService = new PricingService(prodigiClientV2, currencyService);
    const cartService = new CartService(supabase, prodigiClientV1, pricingService);

    // Add item to cart
    const item = await cartService.addItem(user.id, validatedInput);

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error('Error adding to cart:', error);
    if (error instanceof CartError) {
      return NextResponse.json(
        { error: error.message, details: error.details },
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      { error: 'Failed to add item to cart' },
      { status: 500 }
    );
  }
}

