/**
 * Prodigi Catalog Facets API
 * Get available filter options with counts
 */

import { NextRequest, NextResponse } from 'next/server';
import { prodigiService } from '@/lib/prodigi-v2/azure-search/service';
import type { ProdigiSearchFilters } from '@/lib/prodigi/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const filters = await request.json() as ProdigiSearchFilters;
    
    // Validate required filter
    if (!filters.country) {
      return NextResponse.json(
        { error: 'country is required in filters' },
        { status: 400 }
      );
    }
    
    console.log('📊 Fetching facets for filters:', filters);
    
    const facets = await prodigiService.getFacets(filters);
    
    console.log('✅ Facets retrieved:', {
      frameColors: facets.frameColors.length,
      frames: facets.frames.length,
      glazes: facets.glazes.length,
      dimensionRanges: facets.dimensionRanges.length,
    });
    
    return NextResponse.json(facets);
  } catch (error) {
    console.error('❌ Failed to fetch facets:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to fetch facets',
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
    
    if (searchParams.has('category')) {
      filters.category = searchParams.get('category')!;
    }
    
    if (searchParams.has('frameColors')) {
      filters.frameColors = searchParams.get('frameColors')!.split(',');
    }
    
    console.log('📊 Fetching facets (GET):', filters);
    
    const facets = await prodigiService.getFacets(filters);
    
    return NextResponse.json(facets);
  } catch (error) {
    console.error('❌ Failed to fetch facets:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to fetch facets',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

