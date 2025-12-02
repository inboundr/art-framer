/**
 * V2 Pricing API
 * 
 * POST - Calculate pricing for cart items
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth/jwtAuth';
import { PricingService } from '@/lib/checkout/services/pricing.service';
import { ProdigiClient } from '@/lib/prodigi-v2/client';
import { currencyService } from '@/lib/currency';
import { PricingError } from '@/lib/checkout/types/errors';
import { z } from 'zod';

const PricingRequestSchema = z.object({
  items: z.array(
    z.object({
      sku: z.string(),
      quantity: z.number().int().min(1),
      price: z.number(),
      frameConfig: z.object({
        size: z.string().optional(),
        color: z.string().optional(),
        style: z.string().optional(),
        material: z.string().optional(),
      }).optional(),
    })
  ),
  destinationCountry: z.string().length(2),
  shippingMethod: z.enum(['Budget', 'Standard', 'Express', 'Overnight']).optional(),
  currency: z.string().optional(),
});

// Initialize Prodigi v2 client
const getProdigiClient = () => {
  const apiKey = process.env.PRODIGI_API_KEY;
  const environment = (process.env.PRODIGI_ENVIRONMENT as 'sandbox' | 'production') || 'production';
  
  if (!apiKey) {
    return null;
  }
  
  return new ProdigiClient({
    apiKey,
    environment,
  });
};

export async function POST(request: NextRequest) {
  try {
    // Authenticate
    const { user, error: authError } = await authenticateRequest(request);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate body
    const body = await request.json();
    const validated = PricingRequestSchema.parse(body);

    // Initialize services
    const prodigiClient = getProdigiClient();
    
    if (!prodigiClient) {
      return NextResponse.json(
        { error: 'Prodigi client not configured' },
        { status: 500 }
      );
    }

    const pricingService = new PricingService(prodigiClient, currencyService);

    // Convert items to CartItem format
    const cartItems = validated.items.map((item, index) => ({
      id: `temp-${index}`,
      productId: `temp-${index}`,
      sku: item.sku,
      name: 'Framed Print',
      imageUrl: '',
      quantity: item.quantity,
      price: item.price,
      originalPrice: item.price,
      currency: 'USD',
      frameConfig: {
        size: item.frameConfig?.size || 'medium',
        color: item.frameConfig?.color || 'black',
        style: item.frameConfig?.style || 'black',
        material: item.frameConfig?.material || 'wood',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    // Calculate pricing
    const pricing = await pricingService.calculatePricing(
      cartItems,
      validated.destinationCountry,
      validated.shippingMethod || 'Standard',
      validated.currency
    );

    return NextResponse.json({ pricing });
  } catch (error) {
    console.error('Error calculating pricing:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }
    if (error instanceof PricingError) {
      return NextResponse.json(
        { error: error.message, details: error.details },
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      { error: 'Failed to calculate pricing' },
      { status: 500 }
    );
  }
}

