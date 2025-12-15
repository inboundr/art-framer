/**
 * V2 Shipping API
 * 
 * POST - Calculate shipping options for cart items
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth/jwtAuth';
import { ShippingService } from '@/lib/checkout/services/shipping.service';
import { ProdigiClient } from '@/lib/prodigi-v2/client';
import { ShippingError } from '@/lib/checkout/types/errors';
import { z } from 'zod';
import { validateShippingAddress } from '@/lib/checkout/validators/address.validator';

const ShippingRequestSchema = z.object({
  items: z.array(
    z.object({
      sku: z.string(),
      quantity: z.number().int().min(1),
      frameConfig: z.object({
        size: z.string().optional(),
        color: z.string().optional(),
        style: z.string().optional(),
        material: z.string().optional(),
      }).optional(),
    })
  ),
  address: z.object({
    address1: z.string(),
    address2: z.string().optional(),
    city: z.string(),
    state: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().length(2),
  }),
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
    console.log('📥 Shipping API received request:', JSON.stringify(body, null, 2));
    const validated = ShippingRequestSchema.parse(body);
    console.log('✅ Shipping API request validated:', JSON.stringify(validated, null, 2));
    const address = validateShippingAddress(validated.address);

    // Initialize services
    const prodigiClient = getProdigiClient();
    
    if (!prodigiClient) {
      return NextResponse.json(
        { error: 'Prodigi client not configured' },
        { status: 500 }
      );
    }

    const shippingService = new ShippingService(prodigiClient);

    // Validate address
    const validation = await shippingService.validateAddress(address);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Invalid address', errors: validation.errors },
        { status: 400 }
      );
    }

    // Convert items to CartItem format
    const cartItems = validated.items.map((item, index) => ({
      id: `temp-${index}`,
      productId: `temp-${index}`,
      sku: item.sku,
      name: 'Framed Print',
      imageUrl: '',
      quantity: item.quantity,
      price: 0,
      originalPrice: 0,
      currency: 'USD',
      frameConfig: {
        size: item.frameConfig?.size || '16x20', // V2 sizing: default to "16x20" instead of 'medium'
        color: item.frameConfig?.color || 'black',
        style: item.frameConfig?.style || 'black',
        material: item.frameConfig?.material || 'wood',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    // Calculate shipping options
    try {
    const options = await shippingService.calculateShipping(cartItems, address);
    const recommended = shippingService.getRecommendedMethod(options);

    return NextResponse.json({
      options,
      recommended,
      addressValidated: true,
    });
    } catch (shippingError) {
      console.error('❌ Error calculating shipping:', shippingError);
      
      // If it's a quote error (no quotes available), provide more helpful error message
      if (shippingError instanceof ShippingError) {
        const errorMessage = shippingError.message;
        const errorDetails = shippingError.details;
        
        // Check if it's a "no quotes" error
        if (errorMessage.includes('No shipping quotes') || errorMessage.includes('No quotes')) {
          console.warn('⚠️ No shipping quotes available - this may be due to invalid SKUs or Prodigi service issues');
          return NextResponse.json(
            { 
              error: 'Unable to calculate shipping at this time. Please verify your items and try again.',
              details: {
                message: errorMessage,
                originalError: errorDetails?.originalError,
                suggestion: 'This may be due to invalid product SKUs or temporary Prodigi service issues. Please try again in a moment.',
              }
            },
            { status: 400 }
          );
        }
        
        return NextResponse.json(
          { 
            error: errorMessage || 'Failed to calculate shipping',
            details: errorDetails || {}
          },
          { status: shippingError.statusCode || 400 }
        );
      }
      
      // Re-throw to be caught by outer catch
      throw shippingError;
    }
  } catch (error) {
    console.error('❌ Error in shipping API:', error);
    if (error instanceof z.ZodError) {
      console.error('❌ Validation error details:', JSON.stringify(error.issues, null, 2));
      return NextResponse.json(
        { 
          error: 'Invalid request data', 
          details: error.issues.map(issue => ({
            path: issue.path.join('.'),
            message: issue.message,
            code: issue.code,
          }))
        },
        { status: 400 }
      );
    }
    if (error instanceof ShippingError) {
      console.error('❌ Shipping error:', error.message, error.details);
      return NextResponse.json(
        { 
          error: error.message || 'Failed to calculate shipping',
          details: error.details || {}
        },
        { status: error.statusCode || 400 }
      );
    }
    console.error('❌ Unexpected error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to calculate shipping', 
        details: error instanceof Error ? { message: error.message, name: error.name } : { error: String(error) }
      },
      { status: 500 }
    );
  }
}

