import { NextRequest, NextResponse } from 'next/server';
import { ProdigiProductService } from '@/lib/prodigi-product-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const size = searchParams.get('size');
    const material = searchParams.get('material');
    const finish = searchParams.get('finish');

    const productService = new ProdigiProductService();

    let response;

    if (category || size || material || finish) {
      // Search products with criteria
      response = await productService.searchProducts({
        category: category || undefined,
        size: size || undefined,
        material: material || undefined,
        finish: finish || undefined,
      });
    } else {
      // Get all products
      response = await productService.getAllProducts();
    }

    console.log(`✅ Successfully fetched ${response.count} products${response.fallback ? ' (fallback mode)' : ''}`);

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Error fetching Prodigi products:', error);
    
    // Return fallback data on error
    const productService = new ProdigiProductService();
    const fallbackResponse = productService.getFallbackResponse();
    
    return NextResponse.json({
      ...fallbackResponse,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Using fallback data due to API error'
    });
  }
}

