/**
 * Prodigi V2 API Route - Product Details
 * 
 * GET /api/prodigi-v2/products/[sku] - Get product details
 */

import { NextRequest, NextResponse } from 'next/server';
import { prodigiSDK } from '@/lib/prodigi-v2';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/prodigi-v2/products/[sku]
 * Get product details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { sku: string } }
) {
  try {
    const { sku } = params;
    
    const product = await prodigiSDK.products.get(sku);
    
    return NextResponse.json({
      success: true,
      product,
    });
  } catch (error) {
    console.error('[Prodigi V2] Get product error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get product',
    }, { status: 404 });
  }
}

