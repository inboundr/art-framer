import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { authenticateRequest } from "@/lib/auth/jwtAuth";
import { z } from "zod";
import Stripe from "stripe";
import type { PricingItem } from "@/lib/pricing";
import type { ShippingItem } from "@/lib/shipping";
import { currencyService } from "@/lib/currency";

// Helper function to get product attributes based on SKU type
function getProductAttributesForSku(sku: string, frameStyle: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  
  // Only add attributes for SKUs that require them
  // GLOBAL-FRA-CAN-* (extra large frames) require both color and wrap
  if (sku.startsWith('GLOBAL-FRA-CAN-')) {
    if (frameStyle === 'black') {
      attributes.color = 'black';
    } else if (frameStyle === 'white') {
      attributes.color = 'white';
    } else if (frameStyle === 'natural') {
      attributes.color = 'natural';
    } else if (frameStyle === 'gold') {
      attributes.color = 'gold';
    } else if (frameStyle === 'silver') {
      attributes.color = 'silver';
    }
    attributes.wrap = 'ImageWrap';
  }
  // GLOBAL-CFPM-* (canvas prints) require color
  else if (sku.startsWith('GLOBAL-CFPM-')) {
    if (frameStyle === 'black') {
      attributes.color = 'black';
    } else if (frameStyle === 'white') {
      attributes.color = 'white';
    } else if (frameStyle === 'natural') {
      attributes.color = 'natural';
    } else if (frameStyle === 'gold') {
      attributes.color = 'gold';
    } else if (frameStyle === 'silver') {
      attributes.color = 'silver';
    }
  }
  // GLOBAL-FAP-* (standard frames) don't require attributes
  // No attributes needed for these SKUs
  
  return attributes;
}

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

/**
 * Convert USD amount to target currency using live exchange rates
 * Falls back to hardcoded rates if the API fails
 */
async function convertUSDToTargetCurrency(amountUSD: number, targetCurrency: string): Promise<number> {
  try {
    // Use the currency service for live rates
    return await currencyService.convertFromUSD(amountUSD, targetCurrency);
  } catch (error) {
    console.error('❌ Currency conversion failed, using fallback rate:', error);
    
    // Fallback to simple hardcoded rates
    const fallbackRates: Record<string, number> = {
      'usd': 1.0,
      'cad': 1.35,
      'eur': 0.92,
      'gbp': 0.79,
      'aud': 1.52,
    };
    
    const rate = fallbackRates[targetCurrency.toLowerCase()] || 1.0;
    return Math.round(amountUSD * rate * 100) / 100;
  }
}

// Get base URL from request headers (handles production/development dynamically)
function getBaseUrl(request: NextRequest): string {
  // Try to get the origin from headers first (most reliable in production)
  const origin = request.headers.get("origin");
  if (origin) {
    return origin;
  }

  // Fallback to host header
  const host = request.headers.get("host");
  if (host) {
    // Determine protocol based on host
    const protocol =
      host.includes("localhost") || host.includes("127.0.0.1")
        ? "http"
        : "https";
    return `${protocol}://${host}`;
  }

  // Final fallback to environment variable
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
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

    console.log('Checkout API: Starting checkout session creation');
    
    // JWT-only authentication
    const { user, error: authError } = await authenticateRequest(request);
    
    if (authError || !user) {
      console.log('Checkout API: Authentication failed', { error: authError });
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.log('Checkout API: User authenticated', { userId: user.id, email: user.email });
    
    console.log('Checkout API: Authenticated user', { 
      userId: user.id, 
      userEmail: user.email 
    });

    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      console.error('Checkout API: JSON parsing error:', jsonError);
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }
    
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
      attributes: getProductAttributesForSku(item.finalSku, item.products.frame_style)
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

    // 🔍 PHASE 1: Validate prices with Prodigi real-time quote
    console.log('🔍 Validating item prices with Prodigi real-time quote...');
    try {
      const prodigiClient = new ProdigiClient(
        process.env.PRODIGI_API_KEY || '',
        (process.env.PRODIGI_ENVIRONMENT as 'sandbox' | 'production') || 'production'
      );

      // Prepare quote request items (use processedItems which has finalSku)
      const quoteItems = processedItems.map((item: any) => ({
        sku: item.finalSku,
        quantity: item.quantity,
        attributes: getProductAttributesForSku(item.finalSku, item.products.frame_style)
      }));

      console.log('📤 Requesting Prodigi full quote for items:', quoteItems.map(i => `${i.sku} x${i.quantity}`).join(', '));

      // Get real-time quote from Prodigi (using getFullQuote to get items AND shipping costs)
      const quotes = await prodigiClient.getFullQuote({
        items: quoteItems,
        destinationCountryCode: countryCode
      });

      if (quotes && quotes.length > 0) {
        const quote = quotes[0];
        console.log('📥 Prodigi quote received:', {
          itemsCost: quote.costSummary.items.amount,
          shippingCost: quote.costSummary.shipping.amount,
          totalCost: quote.costSummary.totalCost.amount,
          currency: quote.costSummary.items.currency,
          method: quote.shipmentMethod
        });

        // Compare catalog price (from database) vs real-time Prodigi price
        for (let i = 0; i < processedItems.length; i++) {
          const cartItem = processedItems[i];
          const catalogPriceUSD = cartItem.products.price; // Price from database (USD)
          
          // Prodigi returns total items cost, so we need to divide by quantity if multiple items
          // For simplicity, we'll validate the first item (most common case is 1 item)
          // TODO: Handle multiple different items in cart
          const realtimeQuotedPrice = parseFloat(quote.costSummary.items.amount); // ✅ Now using ITEMS cost, not shipping!
          
          // Calculate per-item price if quantity > 1
          const perItemQuotePrice = realtimeQuotedPrice / cartItem.quantity;
          
          const priceDifference = Math.abs(perItemQuotePrice - catalogPriceUSD);
          const percentDifference = (priceDifference / catalogPriceUSD) * 100;

          console.log(`📊 Price validation for item ${i + 1}:`, {
            sku: cartItem.finalSku,
            catalogPrice: `$${catalogPriceUSD.toFixed(2)} USD`,
            quotedPrice: `$${perItemQuotePrice.toFixed(2)} USD`,
            difference: `$${priceDifference.toFixed(2)}`,
            percentDiff: `${percentDifference.toFixed(2)}%`,
            threshold: '5%'
          });

          // If price difference is significant (>5%), handle it
          if (percentDifference > 5) {
            console.warn(`⚠️ PRICE MISMATCH DETECTED for ${cartItem.finalSku}!`, {
              catalogPrice: catalogPriceUSD,
              realtimePrice: perItemQuotePrice,
              difference: priceDifference,
              percentDiff: `${percentDifference.toFixed(2)}%`
            });

            // Option A: Auto-update to real-time price (safer for customer)
            console.log(`✅ Auto-updating price from $${catalogPriceUSD} to $${perItemQuotePrice} (real-time Prodigi price)`);
            cartItem.products.price = perItemQuotePrice;
            
            // Option B (commented): Block checkout and alert user
            // return NextResponse.json({
            //   success: false,
            //   error: 'PRICE_MISMATCH',
            //   message: `Price has changed from $${catalogPriceUSD.toFixed(2)} to $${perItemQuotePrice.toFixed(2)}. Please review your cart.`,
            //   catalogPrice: catalogPriceUSD,
            //   realtimePrice: perItemQuotePrice,
            //   percentDifference: percentDifference.toFixed(2)
            // }, { status: 409 });
          } else {
            console.log(`✅ Price validation passed for ${cartItem.finalSku}: difference ${percentDifference.toFixed(2)}% is within 5% threshold`);
          }
        }
      } else {
        console.warn('⚠️ No quotes returned from Prodigi, proceeding with catalog prices');
      }
    } catch (quoteError) {
      // Don't block checkout if quote fails, but log the error
      console.error('⚠️ Failed to get Prodigi quote for price validation:', quoteError);
      console.log('⚠️ Proceeding with catalog prices (quote validation failed)');
    }

    console.log(`💱 Converting prices from USD to ${currency.toUpperCase()} using live rates...`);
    
    // Convert all prices to target currency
    // Database stores prices in USD, must convert to customer's currency
    // Use processedItems (which may have auto-corrected prices from quote validation)
    const convertedItems = await Promise.all(
      processedItems.map(async (item: any) => {
        const priceConverted = await convertUSDToTargetCurrency(item.products.price, currency);
        
        console.log(`💱 Item: ${item.products.frame_size} - USD ${item.products.price} → ${currency.toUpperCase()} ${priceConverted}`);
        
        return {
          ...item,
          convertedPrice: priceConverted,
        };
      })
    );
    
    // Convert tax and shipping
    const taxConverted = await convertUSDToTargetCurrency(taxAmount, currency);
    const shippingConverted = await convertUSDToTargetCurrency(shippingAmount, currency);
    
    console.log(`💱 Tax: USD ${taxAmount} → ${currency.toUpperCase()} ${taxConverted}`);
    console.log(`💱 Shipping: USD ${shippingAmount} → ${currency.toUpperCase()} ${shippingConverted}`);
    console.log(`💱 Total converted: ${currency.toUpperCase()} ${(convertedItems.reduce((sum, item) => sum + (item.convertedPrice * item.quantity), 0) + taxConverted + shippingConverted).toFixed(2)}`);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: user.email,
      line_items: [
        ...convertedItems.map((item: any) => ({
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
                sku: item.finalSku,
                price_usd: item.products.price.toString(), // Store original USD price for reference
              },
            },
            unit_amount: Math.round(item.convertedPrice * 100),
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
            unit_amount: Math.round(taxConverted * 100),
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
            unit_amount: Math.round(shippingConverted * 100),
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
        currency: currency,
        baseCurrency: 'USD',
      },
      success_url: `${getBaseUrl(request)}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${getBaseUrl(request)}/cart`,
    });

    // Store shipping address with Stripe session ID for later retrieval
    try {
      console.log('💾 Storing shipping address for session:', {
        sessionId: session.id,
        userId: user.id,
        address: {
          firstName: validatedData.shippingAddress.firstName || '',
          lastName: validatedData.shippingAddress.lastName || '',
          address1: validatedData.shippingAddress.address1 || '',
          address2: validatedData.shippingAddress.address2 || '',
          city: validatedData.shippingAddress.city || '',
          state: validatedData.shippingAddress.state || '',
          zip: validatedData.shippingAddress.zip || '',
          country: countryCode,
          phone: validatedData.shippingAddress.phone || '',
        }
      });

      const { error: addressError } = await (serviceSupabase as any)
        .from('stripe_session_addresses')
        .insert({
          stripe_session_id: session.id,
          user_id: user.id,
          shipping_address: {
            firstName: validatedData.shippingAddress.firstName || '',
            lastName: validatedData.shippingAddress.lastName || '',
            address1: validatedData.shippingAddress.address1 || '',
            address2: validatedData.shippingAddress.address2 || '',
            city: validatedData.shippingAddress.city || '',
            state: validatedData.shippingAddress.state || '',
            zip: validatedData.shippingAddress.zip || '',
            country: countryCode,
            phone: validatedData.shippingAddress.phone || '',
          },
          created_at: new Date().toISOString(),
        });

      if (addressError) {
        console.error('❌ Error storing shipping address:', {
          sessionId: session.id,
          error: addressError,
          errorCode: addressError.code,
          errorMessage: addressError.message,
          errorDetails: addressError.details,
          errorHint: addressError.hint
        });
        // Don't fail the checkout if address storage fails, but log the issue
      } else {
        console.log('✅ Shipping address stored successfully for session:', session.id);
      }
    } catch (error) {
      console.error('❌ Exception storing shipping address:', {
        sessionId: session.id,
        error: error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined
      });
      // Don't fail the checkout if address storage fails
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    console.error('Error type:', typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
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
