/**
 * Studio Facets API Route
 * 
 * Returns available options for a product configuration
 * Used to dynamically show/hide UI elements based on what's actually available
 */

import { NextRequest, NextResponse } from 'next/server';
import { facetService } from '@/lib/prodigi-v2/azure-search/facet-service';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productType, country = 'US', filters = {} } = body;

    if (!productType) {
      return NextResponse.json(
        { error: 'Product type is required' },
        { status: 400 }
      );
    }

    console.log('[Facets API] Request:', { productType, country, filters });

    // Get available options from facet service
    const availableOptions = await facetService.getAvailableOptions(
      productType,
      country,
      filters
    );

    console.log('[Facets API] Response:', availableOptions);

    return NextResponse.json({
      productType,
      availableOptions,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Facets API] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch available options',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for simple queries
 */
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

    console.log('[Facets API] GET Request:', { productType, country });

    const availableOptions = await facetService.getAvailableOptions(
      productType,
      country
    );

    return NextResponse.json({
      productType,
      availableOptions,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Facets API] GET Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch available options',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

