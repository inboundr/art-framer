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
  try {
    const cart = await cartService.getCart(user.id, destinationCountry, shippingMethod);
    return NextResponse.json({ cart });
  } catch (error) {
    console.error('Error fetching cart:', error);
      
      // If it's a pricing error, try to return cart items without pricing
      // This allows users to see their cart even if pricing temporarily fails
      const isPricingError = error instanceof CartError && 
        (error.message.includes('pricing') || error.message.includes('quote') || error.message.includes('No quotes'));
      
      if (isPricingError) {
        try {
          // Try to get cart items without pricing
          const supabase = createServiceClient();
          const { data: cartItems, error: dbError } = await supabase
            .from('cart_items')
            .select(`
              *,
              products (*)
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

          if (dbError) {
            throw dbError;
          }

          if (!cartItems || cartItems.length === 0) {
            return NextResponse.json({ 
              cart: {
                items: [],
                totals: {
                  subtotal: 0,
                  shipping: 0,
                  tax: 0,
                  total: 0,
                  currency: 'USD',
                  originalCurrency: 'USD',
                  originalTotal: 0,
                  exchangeRate: 1,
                },
                shippingMethod,
                destinationCountry,
                updatedAt: new Date().toISOString(),
              },
              pricingError: error instanceof CartError ? error.message : 'Pricing unavailable',
              warning: 'Pricing temporarily unavailable. Please try again in a moment.',
            });
          }

          // Format items without pricing
          const items = cartItems.map((item: any) => ({
            id: item.id,
            productId: item.product_id,
            sku: item.sku || item.products?.sku || '',
            quantity: item.quantity,
            price: 0, // Pricing unavailable
            currency: 'USD',
            frameConfig: item.frame_config || item.products?.frame_config || {},
            imageUrl: item.products?.images?.[0]?.image_url || '',
            name: item.products?.name || `Frame ${item.products?.frame_size || ''}`,
            createdAt: item.created_at,
            updatedAt: item.updated_at,
          }));

          return NextResponse.json({
            cart: {
              items,
              totals: {
                subtotal: 0,
                shipping: 0,
                tax: 0,
                total: 0,
                currency: 'USD',
                originalCurrency: 'USD',
                originalTotal: 0,
                exchangeRate: 1,
              },
              shippingMethod,
              destinationCountry,
              updatedAt: new Date().toISOString(),
            },
            pricingError: error instanceof CartError ? error.message : 'Pricing unavailable',
            warning: 'Pricing temporarily unavailable. Please try again in a moment.',
          });
        } catch (fallbackError) {
          console.error('Error in fallback cart fetch:', fallbackError);
          // If fallback also fails, return the original error
          if (error instanceof CartError) {
            return NextResponse.json(
              { 
                error: error.message || 'Failed to fetch cart', 
                details: error.details || {},
                statusCode: error.statusCode || 500
              },
              { status: error.statusCode || 500 }
            );
          }
          return NextResponse.json(
            { 
              error: 'Failed to fetch cart', 
              details: fallbackError instanceof Error ? { message: fallbackError.message, stack: fallbackError.stack } : { error: String(fallbackError) }
            },
            { status: 500 }
          );
        }
      }

      // For other errors, return error response
    if (error instanceof CartError) {
      return NextResponse.json(
          { 
            error: error.message || 'Failed to fetch cart', 
            details: error.details || {},
            statusCode: error.statusCode || 500
          },
          { status: error.statusCode || 500 }
      );
    }
    return NextResponse.json(
        { 
          error: 'Failed to fetch cart', 
          details: error instanceof Error ? { message: error.message, name: error.name } : { error: String(error) }
        },
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
    console.log('Cart API: Received request body:', body);
    
    let validatedInput;
    try {
      validatedInput = validateCartItemInput(body);
      console.log('Cart API: Validated input:', validatedInput);
    } catch (validationError) {
      console.error('Cart API: Validation error:', validationError);
      console.error('Cart API: Validation error type:', validationError?.constructor?.name);
      console.error('Cart API: Validation error details:', JSON.stringify(validationError, null, 2));
      
      if (validationError instanceof CartError) {
        console.error('Cart API: CartError details:', JSON.stringify(validationError.details, null, 2));
        return NextResponse.json(
          { error: validationError.message, details: validationError.details },
          { status: validationError.statusCode || 400 }
        );
      }
      // If it's a ZodError, return 400 with details
      if (validationError && typeof validationError === 'object' && 'issues' in validationError) {
        console.error('Cart API: ZodError issues:', JSON.stringify((validationError as any).issues, null, 2));
        return NextResponse.json(
          { error: 'Invalid cart item input', details: (validationError as any).issues },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: 'Invalid request data', details: validationError instanceof Error ? validationError.message : String(validationError) },
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

    // Add item to cart
    const item = await cartService.addItem(user.id, validatedInput);

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error('Error adding to cart:', error);
    if (error instanceof CartError) {
      return NextResponse.json(
        { error: error.message, details: error.details },
        { status: error.statusCode || 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to add item to cart', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Authenticate
    const { user, error: authError } = await authenticateRequest(request);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate body
    const body = await request.json();
    const { cartItemId, quantity } = body;

    if (!cartItemId || typeof quantity !== 'number' || quantity < 1 || quantity > 10) {
      return NextResponse.json(
        { error: 'Invalid request: cartItemId and quantity (1-10) required' },
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

    // Update item quantity
    const item = await cartService.updateItem(user.id, cartItemId, quantity);

    return NextResponse.json({ item }, { status: 200 });
  } catch (error) {
    console.error('Error updating cart item:', error);
    if (error instanceof CartError) {
      return NextResponse.json(
        { error: error.message, details: error.details },
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update cart item' },
      { status: 500 }
    );
  }
}

