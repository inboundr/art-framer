/**
 * Unified Pricing API
 * 
 * Works for both Studio (country-only) and Cart (full address optional)
 * 
 * Requirements for accurate pricing:
 * - Country (required): For shipping destination
 * - Full address (optional): For address validation, but Prodigi quotes only need country
 * 
 * Returns:
 * - Real-time Prodigi pricing
 * - All shipping method options
 * - Currency conversion
 * - Delivery estimates
 */

import { NextRequest, NextResponse } from 'next/server';
import { prodigiSDK } from '@/lib/prodigi-v2';
import { estimateDeliveryTime, formatDeliveryEstimate } from '@/lib/prodigi-v2/delivery-estimator';
import { detectUserLocation } from '@/lib/location-detection';
import { currencyService } from '@/lib/currency';
import { getCountry } from '@/lib/countries';
import { buildProdigiAttributes } from '@/lib/checkout/utils/attribute-builder';
import { getUserFriendlyError } from '@/lib/error-handling/user-friendly-errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface PricingRequest {
  // Items to price
  items: Array<{
    sku?: string;
    productType?: string;
    size?: string;
    quantity?: number;
    frameConfig?: {
      color?: string;
      style?: string;
      material?: string;
      wrap?: string;
      glaze?: string;
      mount?: string;
      mountColor?: string;
      paperType?: string;
      finish?: string;
      edge?: string;
    };
  }>;
  
  // Location (country is required, full address is optional)
  country?: string; // ISO 3166-1 alpha-2 country code
  address?: {
    address1?: string;
    address2?: string;
    city?: string;
    state?: string;
    zip?: string;
    country: string; // Required if address provided
  };
  
  // Shipping preferences
  shippingMethod?: 'Budget' | 'Standard' | 'Express' | 'Overnight';
  
  // Currency preferences
  currency?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: PricingRequest = await request.json();
    
    // Determine country: address.country > country > detected > default
    let country = 'US';
    if (body.address?.country) {
      country = body.address.country;
    } else if (body.country) {
      country = body.country;
    } else {
      const location = await detectUserLocation(request);
      country = location.country;
    }
    
    console.log('[Unified Pricing] Request received:', {
      itemsCount: body.items.length,
      country,
      hasAddress: !!body.address,
    });

    // Process all items and get quotes
    const itemQuotes = await Promise.all(
      body.items.map(async (item) => {
        // Get SKU
        let sku: string | null = null;
        
        if (item.productType && item.size) {
          sku = await prodigiSDK.catalog.getSKU(item.productType, item.size, country);
          if (!sku) {
            throw new Error(`No ${item.productType} available in size ${item.size}`);
          }
        } else if (item.sku) {
          sku = item.sku;
        } else {
          throw new Error('SKU or productType+size required');
        }

        // Get product details
        const product = await prodigiSDK.products.get(sku);
        if (!product) {
          throw new Error(`SKU ${sku} not found`);
        }

        // Build attributes
        const config = {
          productType: item.productType,
          frameColor: item.frameConfig?.color,
          frameStyle: item.frameConfig?.style,
          wrap: item.frameConfig?.wrap,
          glaze: item.frameConfig?.glaze,
          mount: item.frameConfig?.mount,
          mountColor: item.frameConfig?.mountColor,
          paperType: item.frameConfig?.paperType,
          finish: item.frameConfig?.finish,
          edge: item.frameConfig?.edge,
        };

        const attributes = buildProdigiAttributes(config, {
          validAttributes: product.attributes,
          sku,
        });

        // Get quotes for all shipping methods
        const shippingMethods: Array<'Budget' | 'Standard' | 'Express' | 'Overnight'> = 
          ['Budget', 'Standard', 'Express', 'Overnight'];
        
        const quotePromises = shippingMethods.map(method =>
          prodigiSDK.quotes.create({
            destinationCountryCode: country,
            shippingMethod: method,
            items: [
              {
                sku,
                copies: item.quantity || 1,
                ...(Object.keys(attributes).length > 0 && { attributes }),
                assets: [{ printArea: 'default' }],
              },
            ],
          }).catch(error => {
            console.warn(`[Unified Pricing] Failed to get quote for ${method}:`, error.message);
            return [];
          })
        );

        const quoteResults = await Promise.all(quotePromises);
        const quotes = quoteResults.flat().filter(Boolean);

        if (quotes.length === 0) {
          throw new Error('No shipping quotes available');
        }

        // Get user's currency
        const userCountry = getCountry(country);
        const userCurrency = body.currency || userCountry?.currency || 'USD';

        // Process quotes with currency conversion
        const shippingOptions = await Promise.all(quotes.map(async (quote) => {
          const productionCountry = quote.shipments?.[0]?.fulfillmentLocation?.countryCode || 'US';
          const deliveryEstimate = estimateDeliveryTime(productionCountry, country, quote.shipmentMethod);
          
          const prodigiCurrency = quote.costSummary.totalCost?.currency || 'USD';
          const prodigiPrices = {
            items: Number(quote.costSummary.items?.amount) || 0,
            shipping: Number(quote.costSummary.shipping?.amount) || 0,
            total: Number(quote.costSummary.totalCost?.amount) || 0,
          };

          let displayCurrency = prodigiCurrency;
          let displayPrices = prodigiPrices;

          if (prodigiCurrency !== userCurrency) {
            try {
              displayCurrency = userCurrency;
              displayPrices = {
                items: await currencyService.convert(prodigiPrices.items, prodigiCurrency, userCurrency),
                shipping: await currencyService.convert(prodigiPrices.shipping, prodigiCurrency, userCurrency),
                total: await currencyService.convert(prodigiPrices.total, prodigiCurrency, userCurrency),
              };
            } catch (error) {
              console.warn(`[Unified Pricing] Currency conversion failed, using Prodigi currency:`, error);
            }
          }

          return {
            method: quote.shipmentMethod,
            cost: {
              items: displayPrices.items,
              shipping: displayPrices.shipping,
              total: displayPrices.total,
              currency: displayCurrency,
            },
            originalCost: {
              items: prodigiPrices.items,
              shipping: prodigiPrices.shipping,
              total: prodigiPrices.total,
              currency: prodigiCurrency,
            },
            delivery: {
              min: deliveryEstimate.totalDays.min,
              max: deliveryEstimate.totalDays.max,
              formatted: formatDeliveryEstimate(deliveryEstimate),
            },
            productionCountry,
          };
        }));

        // Find selected or recommended method
        const selectedMethod = body.shippingMethod || 'Standard';
        const selectedOption = shippingOptions.find(o => o.method === selectedMethod) || shippingOptions[0];
        const recommended = shippingOptions.reduce((best, current) => 
          current.cost.total < best.cost.total ? current : best
        );

        return {
          sku,
          shippingOptions,
          selected: selectedOption,
          recommended,
        };
      })
    );

    // Combine all items
    const allShippingOptions = itemQuotes[0]?.shippingOptions || [];
    const selectedOption = itemQuotes[0]?.selected;
    const recommended = itemQuotes[0]?.recommended;

    // Calculate totals
    const userCountry = getCountry(country);
    const userCurrency = body.currency || userCountry?.currency || 'USD';
    const taxRate = getTaxRate(country);
    
    const itemsCost = itemQuotes.reduce((sum, item) => 
      sum + (item.selected?.cost.items || 0) * (body.items[0]?.quantity || 1), 0
    );
    const shippingCost = selectedOption?.cost.shipping || 0;
    const taxAmount = itemsCost * taxRate;
    const total = itemsCost + shippingCost + taxAmount;

    return NextResponse.json({
      pricing: {
        subtotal: itemsCost,
        tax: taxAmount,
        shipping: shippingCost,
        total,
        currency: userCurrency,
        originalCurrency: selectedOption?.originalCost.currency,
        originalTotal: selectedOption?.originalCost.total,
        sla: selectedOption?.delivery.max,
        productionCountry: selectedOption?.productionCountry,
      },
      shippingOptions: allShippingOptions,
      recommended: recommended?.method,
      country,
    });
  } catch (error) {
    console.error('[Unified Pricing] Error:', error);
    
    // Get user-friendly error message
    const friendlyError = getUserFriendlyError(error);
    
    return NextResponse.json(
      { 
        error: friendlyError.title,
        message: friendlyError.message,
        action: friendlyError.action,
        retryable: friendlyError.retryable,
        technicalError: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined,
      },
      { status: error instanceof Error && 'statusCode' in error ? (error.statusCode as number) : 500 }
    );
  }
}

function getTaxRate(country: string): number {
  const taxRates: Record<string, number> = {
    US: 0.08,
    CA: 0.13,
    GB: 0.20,
    AU: 0.10,
    DE: 0.19,
  };
  return taxRates[country.toUpperCase()] || 0.0;
}

