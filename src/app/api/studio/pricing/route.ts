/**
 * Real-time Pricing API
 * Calculates pricing for frame configurations
 */

import { NextRequest, NextResponse } from 'next/server';
import { prodigiSDK } from '@/lib/prodigi-v2';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { config } = await request.json();

    if (!config || !config.sku) {
      // If no SKU yet, return estimated pricing
      return NextResponse.json({
        pricing: {
          total: 0,
          shipping: 0,
          subtotal: 0,
          sla: 5,
          productionCountry: 'US',
          currency: 'USD',
          estimated: true,
        }
      });
    }

    // Get quote from Prodigi
    const country = request.geo?.country || 'US';
    
    const quoteRequest = {
      destinationCountryCode: country,
      shippingMethod: 'Standard' as const,
      items: [
        {
          sku: config.sku,
          copies: 1,
          attributes: buildProductAttributes(config),
        },
      ],
    };

    const quote = await prodigiSDK.quotes.create(quoteRequest);

    // Find the standard shipping quote
    const standardQuote = quote.quotes?.find(
      (q) => q.shipmentMethod === 'Standard'
    );

    if (!standardQuote) {
      throw new Error('No standard shipping quote available');
    }

    // Calculate totals
    const itemsCost = standardQuote.costSummary.items?.amount || 0;
    const shippingCost = standardQuote.costSummary.shipping?.amount || 0;

    return NextResponse.json({
      pricing: {
        total: itemsCost,
        shipping: shippingCost,
        subtotal: itemsCost,
        sla: standardQuote.shipment?.sla || 5,
        productionCountry: standardQuote.shipment?.dispatchCountryCode || 'US',
        currency: standardQuote.costSummary.totalCost?.currency || 'USD',
        estimated: false,
      }
    });
  } catch (error) {
    console.error('Error calculating pricing:', error);
    
    // Return fallback pricing
    return NextResponse.json({
      pricing: {
        total: 0,
        shipping: 0,
        subtotal: 0,
        sla: 5,
        productionCountry: 'US',
        currency: 'USD',
        estimated: true,
      },
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Build product attributes from configuration
 */
function buildProductAttributes(config: any): Record<string, string> {
  const attributes: Record<string, string> = {};

  if (config.frameColor) {
    attributes.color = config.frameColor;
  }

  if (config.wrap) {
    attributes.wrap = config.wrap;
  }

  if (config.mount && config.mount !== 'none') {
    attributes.mount = config.mount;
  }

  if (config.mountColor) {
    attributes.mountColor = config.mountColor;
  }

  if (config.glaze && config.glaze !== 'none') {
    attributes.glaze = config.glaze;
  }

  if (config.finish) {
    attributes.finish = config.finish;
  }

  if (config.paperType) {
    attributes.paperType = config.paperType;
  }

  return attributes;
}

