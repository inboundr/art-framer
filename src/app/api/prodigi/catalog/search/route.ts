/**
 * Prodigi Catalog Search API
 * Advanced search with filters and facets
 */

import { NextRequest, NextResponse } from 'next/server';
import { prodigiService } from '@/lib/prodigi/service';
import type { ProdigiSearchFilters, ProdigiSearchOptions } from '@/lib/prodigi/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { filters, options } = body as {
      filters: ProdigiSearchFilters;
      options?: ProdigiSearchOptions;
    };
    
    // Validate required filter
    if (!filters.country) {
      return NextResponse.json(
        { error: 'country is required in filters' },
        { status: 400 }
      );
    }
    
    console.log('🔍 Prodigi catalog search:', {
      filters,
      options,
    });
    
    const result = await prodigiService.search(filters, options);
    
    console.log('✅ Search complete:', {
      totalCount: result.totalCount,
      returnedCount: result.products.length,
      hasFacets: !!result.facets,
    });
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('❌ Prodigi catalog search error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to search catalog',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Build filters from query params
    const filters: ProdigiSearchFilters = {
      country: searchParams.get('country') || 'US',
    };
    
    // Add optional filters
    if (searchParams.has('category')) {
      filters.category = searchParams.get('category')!;
    }
    
    if (searchParams.has('frameColors')) {
      filters.frameColors = searchParams.get('frameColors')!.split(',');
    }
    
    if (searchParams.has('glazes')) {
      filters.glazes = searchParams.get('glazes')!.split(',');
    }
    
    if (searchParams.has('minDimension')) {
      filters.minDimensionMm = parseInt(searchParams.get('minDimension')!);
    }
    
    if (searchParams.has('maxDimension')) {
      filters.maxDimensionMm = parseInt(searchParams.get('maxDimension')!);
    }
    
    if (searchParams.has('aspectRatioMin')) {
      filters.aspectRatioMin = parseFloat(searchParams.get('aspectRatioMin')!);
    }
    
    if (searchParams.has('aspectRatioMax')) {
      filters.aspectRatioMax = parseFloat(searchParams.get('aspectRatioMax')!);
    }
    
    // Build options
    const options: ProdigiSearchOptions = {};
    
    if (searchParams.has('top')) {
      options.top = parseInt(searchParams.get('top')!);
    }
    
    if (searchParams.has('skip')) {
      options.skip = parseInt(searchParams.get('skip')!);
    }
    
    if (searchParams.has('includeFacets')) {
      options.includeFacets = searchParams.get('includeFacets') === 'true';
    }
    
    console.log('🔍 Prodigi catalog search (GET):', {
      filters,
      options,
    });
    
    const result = await prodigiService.search(filters, options);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('❌ Prodigi catalog search error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to search catalog',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

