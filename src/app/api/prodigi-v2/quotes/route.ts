/**
 * Prodigi V2 API Route - Quotes
 * 
 * POST /api/prodigi-v2/quotes - Create quote
 */

import { NextRequest, NextResponse } from 'next/server';
import { prodigiSDK } from '@/lib/prodigi-v2';
import type { CreateQuoteRequest } from '@/lib/prodigi-v2';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/prodigi-v2/quotes
 * Create a quote
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as CreateQuoteRequest;
    
    const quotes = await prodigiSDK.quotes.create(body);
    
    return NextResponse.json({
      success: true,
      quotes,
    });
  } catch (error) {
    console.error('[Prodigi V2] Create quote error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create quote',
    }, { status: 500 });
  }
}

