import { NextResponse } from 'next/server';
import { ProdigiProductService } from '@/lib/prodigi-product-service';

export async function POST() {
  try {
    const productService = new ProdigiProductService();
    productService.clearCache();
    
    console.log('🗑️ Prodigi product cache cleared');
    
    return NextResponse.json({
      success: true,
      message: 'Cache cleared successfully'
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
