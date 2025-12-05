/**
 * Studio Sizes API Route
 * 
 * Returns available sizes for a product type by querying Prodigi catalog
 * More reliable than facets as it extracts sizes from actual products
 */

import { NextRequest, NextResponse } from 'next/server';
import { ProdigiCatalogService } from '@/lib/prodigi-v2/catalog';
import { ProdigiClient } from '@/lib/prodigi-v2/client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productType = searchParams.get('productType');
    const country = searchParams.get('country') || 'US';

    if (!productType) {
      return NextResponse.json(
        { error: 'Product type is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.PRODIGI_API_KEY;
    const environment = (process.env.PRODIGI_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox';

    if (!apiKey) {
      return NextResponse.json(
        { error: 'PRODIGI_API_KEY environment variable is required' },
        { status: 500 }
      );
    }

    const client = new ProdigiClient({
      apiKey,
      environment,
    });

    const catalogService = new ProdigiCatalogService(client);

    console.log(`[Sizes API] Fetching sizes for ${productType} in ${country}`);

    const sizes = await catalogService.getAvailableSizes(productType, country);

    console.log(`[Sizes API] Found ${sizes.length} sizes for ${productType}:`, sizes);

    return NextResponse.json({
      productType,
      country,
      sizes,
      count: sizes.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Sizes API] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch available sizes',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productType, country = 'US' } = body;

    if (!productType) {
      return NextResponse.json(
        { error: 'Product type is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.PRODIGI_API_KEY;
    const environment = (process.env.PRODIGI_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox';

    if (!apiKey) {
      return NextResponse.json(
        { error: 'PRODIGI_API_KEY environment variable is required' },
        { status: 500 }
      );
    }

    const client = new ProdigiClient({
      apiKey,
      environment,
    });

    const catalogService = new ProdigiCatalogService(client);

    console.log(`[Sizes API] POST: Fetching sizes for ${productType} in ${country}`);

    const sizes = await catalogService.getAvailableSizes(productType, country);

    console.log(`[Sizes API] Found ${sizes.length} sizes for ${productType}:`, sizes);

    return NextResponse.json({
      productType,
      country,
      sizes,
      count: sizes.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Sizes API] POST Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch available sizes',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

