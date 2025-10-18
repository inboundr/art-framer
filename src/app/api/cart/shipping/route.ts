import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';
import type { ShippingItem } from '@/lib/shipping';

const ShippingAddressSchema = z.object({
  countryCode: z.string().min(2).max(2),
  stateOrCounty: z.string().optional(),
  postalCode: z.string().optional(),
  city: z.string().optional(),
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
    
    // Create a new client with the token
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseWithToken = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );
    
    const { data: { user: clientUser }, error: clientError } = await supabaseWithToken.auth.getUser();
    
    if (clientUser && !clientError) {
      console.log('Cart Shipping API: Authenticated via Authorization header');
      return { user: clientUser, supabase: supabaseWithToken };
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
    
    const { user } = authResult;
    console.log('Cart Shipping API: Authenticated user', { 
      userId: user.id, 
      userEmail: user.email 
    });

    const body = await request.json();
    const validatedAddress = ShippingAddressSchema.parse(body);

    // Use service client to bypass RLS for cart operations
    const serviceSupabase = createServiceClient();
    
    // Get cart items
    const { data: cartItems, error: cartError } = await serviceSupabase
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
    const { ProdigiClient } = await import('@/lib/prodigi');
    
    // Initialize Prodigi client for SKU regeneration
    const prodigiApiKey = process.env.PRODIGI_API_KEY;
    const prodigiEnvironment = process.env.PRODIGI_ENVIRONMENT as 'sandbox' | 'production' || 'production';
    
    if (!prodigiApiKey) {
      console.warn('⚠️ Prodigi API key not configured, using stored SKUs');
    }
    
    const prodigiClient = prodigiApiKey ? new ProdigiClient(prodigiApiKey, prodigiEnvironment) : null;
    
    // Generate fresh SKUs using our improved algorithm instead of using stored ones
    const shippingItems: ShippingItem[] = await Promise.all(
      cartItems.map(async (item: { 
        products: { 
          sku: string; 
          price: number; 
          frame_size: string; 
          frame_style: string; 
          frame_material: string;
          image_id?: string;
        }; 
        quantity: number 
      }) => {
        // Try to generate a fresh SKU using our improved algorithm
        if (prodigiClient) {
          try {
            const freshSku = await prodigiClient.generateFrameSku(
              item.products.frame_size,
              item.products.frame_style,
              item.products.frame_material,
              item.products.image_id
            );
            
            // Extract base Prodigi SKU for API calls (remove image ID suffix)
            const baseProdigiSku = prodigiClient.extractBaseProdigiSku(freshSku);
            
            console.log(`🔄 Regenerated SKU for shipping: ${item.products.sku} -> ${freshSku} (using base: ${baseProdigiSku})`);
            
            return {
              sku: baseProdigiSku, // Use base SKU for Prodigi API calls
              quantity: item.quantity,
              price: item.products.price,
              attributes: {
                color: item.products.frame_style,
                wrap: 'ImageWrap'
              }
            };
          } catch (error) {
            console.warn(`⚠️ Failed to regenerate SKU for ${item.products.sku}, using stored SKU:`, error);
          }
        }
        
        // Fallback to stored SKU if regeneration fails
        // Extract base Prodigi SKU for API calls (remove image ID suffix if present)
        const baseStoredSku = prodigiClient ? prodigiClient.extractBaseProdigiSku(item.products.sku) : item.products.sku;
        
        return {
          sku: baseStoredSku, // Use base SKU for Prodigi API calls
          quantity: item.quantity,
          price: item.products.price,
          attributes: {
            color: item.products.frame_style,
            wrap: 'ImageWrap'
          }
        };
      })
    );

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
