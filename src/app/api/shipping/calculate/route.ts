import { NextRequest, NextResponse } from 'next/server';
import { prodigiClient } from '@/lib/prodigi';
import { z } from 'zod';

const ShippingCalculationSchema = z.object({
  items: z.array(z.object({
    sku: z.string(),
    quantity: z.number().min(1),
  })),
  destination: z.object({
    countryCode: z.string().min(2).max(2),
    stateOrCounty: z.string().optional(),
    postalCode: z.string().optional(),
  }),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = ShippingCalculationSchema.parse(body);

    // Calculate shipping cost using Prodigi
    const shippingInfo = await prodigiClient.calculateShippingCost(
      validatedData.items,
      validatedData.destination
    );

    return NextResponse.json({
      success: true,
      shipping: shippingInfo,
    });
  } catch (error) {
    console.error('Error calculating shipping cost:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to calculate shipping cost' },
      { status: 500 }
    );
  }
}
