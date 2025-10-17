import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
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
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    address1: z.string().optional(),
    address2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().min(2).max(2),
    phone: z.string().optional(),
    // Keep backward compatibility
    countryCode: z.string().min(2).max(2).optional(),
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
    
    // Debug: Check if we have session cookies
    const cookies = request.cookies.getAll();
    const authCookies = cookies.filter(cookie => 
      cookie.name.includes('sb-') || cookie.name.includes('supabase')
    );
    console.log('Checkout API: Auth cookies found', {
      totalCookies: cookies.length,
      authCookies: authCookies.length,
      cookieNames: authCookies.map(c => c.name)
    });
    
    if (!cookieError && cookieAuth.user) {
      user = cookieAuth.user;
    } else {
      // Method 2: Try Authorization header
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        console.log('Checkout API: Trying Authorization header authentication');
        // Use service client to verify the token
        const serviceSupabase = createServiceClient();
        const { data: headerAuth, error: headerError } = await serviceSupabase.auth.getUser(token);
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
          // Method 4: Try to refresh the session
          console.log('Checkout API: Attempting session refresh');
          try {
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
            if (!refreshError && refreshData.session?.user) {
              console.log('Checkout API: Session refreshed successfully');
              user = refreshData.session.user;
            } else {
              console.log('Checkout API: Session refresh failed', refreshError?.message);
              authError = cookieError || sessionError || refreshError;
            }
          } catch (refreshError) {
            console.log('Checkout API: Session refresh error', refreshError);
            authError = cookieError || sessionError || refreshError;
          }
        }
      }
    }
    
    if (authError || !user) {
      console.log('Checkout API: Authentication failed', { 
        authError: authError instanceof Error ? authError.message : String(authError),
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
    const { ProdigiClient } = await import('@/lib/prodigi');

    // Initialize Prodigi client for SKU regeneration
    const prodigiApiKey = process.env.PRODIGI_API_KEY;
    const prodigiEnvironment = process.env.PRODIGI_ENVIRONMENT as 'sandbox' | 'production' || 'production';
    
    if (!prodigiApiKey) {
      console.warn('⚠️ Prodigi API key not configured, using stored SKUs');
    }
    
    const prodigiClient = prodigiApiKey ? new ProdigiClient(prodigiApiKey, prodigiEnvironment) : null;

    // Generate fresh SKUs using our improved algorithm
    const processedItems = await Promise.all(
      cartItems.map(async (item: any) => {
        let finalSku = item.products.sku;
        
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
            
            console.log(`🔄 Regenerated SKU for checkout: ${item.products.sku} -> ${freshSku} (using base: ${baseProdigiSku})`);
            finalSku = baseProdigiSku; // Use base SKU for Prodigi API calls
          } catch (error) {
            console.warn(`⚠️ Failed to regenerate SKU for ${item.products.sku}, using stored SKU:`, error);
          }
        }
        
        // Extract base Prodigi SKU for API calls (remove image ID suffix if present)
        const baseFinalSku = prodigiClient ? prodigiClient.extractBaseProdigiSku(finalSku) : finalSku;
        
        return {
          ...item,
          finalSku: baseFinalSku // Use base SKU for Prodigi API calls
        };
      })
    );

    const pricingItems: PricingItem[] = processedItems.map((item: any) => ({
      id: item.id,
      sku: item.finalSku,
      price: item.products.price,
      quantity: item.quantity,
      name: item.products.name || `${item.products.frame_size} ${item.products.frame_style} Frame`,
    }));

    const shippingItems: ShippingItem[] = processedItems.map((item: any) => ({
      sku: item.finalSku,
      quantity: item.quantity,
    }));

    // Use the new country field or fall back to countryCode for backward compatibility
    const countryCode = validatedData.shippingAddress.country || validatedData.shippingAddress.countryCode || 'US';

    let shippingResult;
    try {
      // Create a compatible address object for the shipping service
      const shippingAddress = {
        countryCode: countryCode,
        stateOrCounty: validatedData.shippingAddress.state || validatedData.shippingAddress.stateOrCounty,
        postalCode: validatedData.shippingAddress.zip || validatedData.shippingAddress.postalCode,
        city: validatedData.shippingAddress.city,
      };
      
      const shippingCalculation = await defaultShippingService.calculateShipping(
        shippingItems,
        shippingAddress
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
    
    const currency = getCurrencyForCountry(countryCode);
    const pricingResult = defaultPricingCalculator.calculateTotal(pricingItems, shippingResult);
    const { subtotal, taxAmount, shippingAmount, total } = pricingResult;

    // Prepare shipping address for Stripe
    const stripeShippingAddress = {
      name: `${validatedData.shippingAddress.firstName || ''} ${validatedData.shippingAddress.lastName || ''}`.trim() || undefined,
      line1: validatedData.shippingAddress.address1 || undefined,
      line2: validatedData.shippingAddress.address2 || undefined,
      city: validatedData.shippingAddress.city || undefined,
      state: validatedData.shippingAddress.state || undefined,
      postal_code: validatedData.shippingAddress.zip || undefined,
      country: countryCode,
    };

    // Remove undefined values
    const cleanShippingAddress = Object.fromEntries(
      Object.entries(stripeShippingAddress).filter(([_, value]) => value !== undefined)
    );

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: user.email,
      shipping_address_collection: {
        allowed_countries: ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'PT', 'IE', 'FI', 'LU', 'JP', 'KR', 'SG', 'HK', 'CH', 'SE', 'NO', 'DK', 'PL', 'CZ', 'HU', 'MX', 'BR', 'IN', 'NZ'],
      },
      // Prefill shipping address if we have the data
      ...(Object.keys(cleanShippingAddress).length > 0 && {
        shipping_address: cleanShippingAddress,
      }),
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
