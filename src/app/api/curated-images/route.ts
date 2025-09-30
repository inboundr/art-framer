import { NextRequest, NextResponse } from 'next/server';
import { curatedImageAPI } from '@/lib/curated-images';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const category = searchParams.get('category') || undefined;
    const featured_only = searchParams.get('featured_only') === 'true';
    const aspect_ratio = searchParams.get('aspect_ratio') || undefined;
    const tags = searchParams.get('tags')?.split(',').filter(Boolean) || undefined;

    console.log('🔍 Curated images API called with:', { 
      page, 
      limit, 
      category, 
      featured_only, 
      aspect_ratio, 
      tags 
    });

    const filters = {
      category,
      featured_only,
      aspect_ratio,
      tags,
    };

    const response = await curatedImageAPI.getGallery(page, limit, filters);

    console.log('✅ Curated images API response:', { 
      imageCount: response.images.length,
      total: response.pagination.total,
      page: response.pagination.page
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Curated images API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch curated images', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
