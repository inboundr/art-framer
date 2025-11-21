/**
 * Prodigi Product by SKU API
 * Get detailed product information by SKU
 */

import { NextRequest, NextResponse } from 'next/server';
import { prodigiService } from '@/lib/prodigi/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { sku: string } }
) {
  try {
    const { sku } = params;
    const searchParams = request.nextUrl.searchParams;
    const country = searchParams.get('country') || 'US';
    
    if (!sku) {
      return NextResponse.json(
        { error: 'SKU is required' },
        { status: 400 }
      );
    }
    
    console.log(`🔍 Fetching product: ${sku} (country: ${country})`);
    
    const product = await prodigiService.getProductBySku(sku, country);
    
    if (!product) {
      return NextResponse.json(
        { error: `Product not found: ${sku}` },
        { status: 404 }
      );
    }
    
    console.log('✅ Product found:', {
      sku: product.sku,
      category: product.category,
      price: product.basePriceFrom,
    });
    
    return NextResponse.json(product);
  } catch (error) {
    console.error('❌ Failed to fetch product:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to fetch product',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

