/**
 * V2 Cart Item API
 * 
 * DELETE - Remove item from cart
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { authenticateRequest } from '@/lib/auth/jwtAuth';
import { CartService } from '@/lib/checkout/services/cart.service';
import { PricingService } from '@/lib/checkout/services/pricing.service';
import { ProdigiClient as ProdigiClientV1 } from '@/lib/prodigi';
import { ProdigiClient as ProdigiClientV2 } from '@/lib/prodigi-v2/client';
import { currencyService } from '@/lib/currency';
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate
    const { user, error: authError } = await authenticateRequest(request);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: cartItemId } = await params;

    if (!cartItemId) {
      return NextResponse.json(
        { error: 'Cart item ID required' },
        { status: 400 }
      );
    }

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

    // Remove item from cart
    await cartService.removeItem(user.id, cartItemId);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error removing cart item:', error);
    if (error instanceof CartError) {
      return NextResponse.json(
        { error: error.message, details: error.details },
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      { error: 'Failed to remove cart item' },
      { status: 500 }
    );
  }
}


