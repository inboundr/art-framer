/**
 * Test API: Check Available Sizes for Each Product Type
 * 
 * This endpoint queries Prodigi v2 API to determine if different product types
 * have different available sizes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { ProdigiCatalogService } from '@/lib/prodigi-v2/catalog';
import { ProdigiClient } from '@/lib/prodigi-v2/client';

const PRODUCT_TYPES = [
  'framed-print',
  'canvas',
  'framed-canvas',
  'acrylic',
  'metal',
  'poster',
] as const;

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
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

    const results: Record<string, string[]> = {};

    // Test each product type
    for (const productType of PRODUCT_TYPES) {
      try {
        const sizes = await catalogService.getAvailableSizes(productType, 'US');
        results[productType] = sizes;
      } catch (error) {
        console.error(`Error testing ${productType}:`, error);
        results[productType] = [];
      }
    }

    // Get all unique sizes across all product types
    const allSizes = new Set<string>();
    Object.values(results).forEach(sizes => {
      sizes.forEach(size => allSizes.add(size));
    });

    const sortedAllSizes = Array.from(allSizes).sort((a, b) => {
      const [aw, ah] = a.split('x').map(Number);
      const [bw, bh] = b.split('x').map(Number);
      return (aw * ah) - (bw * bh);
    });

    // Check if all product types have the same sizes
    const firstProductType = PRODUCT_TYPES[0];
    const firstSizes = results[firstProductType];
    const allSame = PRODUCT_TYPES.every(type => {
      const sizes = results[type];
      if (sizes.length !== firstSizes.length) return false;
      return sizes.every(size => firstSizes.includes(size));
    });

    // Create a comparison matrix
    const comparisonMatrix = sortedAllSizes.map(size => ({
      size,
      availability: PRODUCT_TYPES.reduce((acc, type) => {
        acc[type] = results[type].includes(size);
        return acc;
      }, {} as Record<string, boolean>),
    }));

    return NextResponse.json({
      success: true,
      allSame,
      totalUniqueSizes: sortedAllSizes.length,
      allSizes: sortedAllSizes,
      results,
      comparisonMatrix,
      summary: PRODUCT_TYPES.map(type => ({
        type,
        count: results[type].length,
        sizes: results[type],
      })),
      recommendation: allSame
        ? 'All product types have the same sizes. Static FRAME_SIZES array is correct.'
        : 'Product types have different sizes. Size options should be dynamic based on product type.',
    });
  } catch (error) {
    console.error('Error testing product type sizes:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

