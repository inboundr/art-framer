import { NextRequest, NextResponse } from 'next/server';
import { curatedImageAPI } from '@/lib/curated-images';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '12');

    console.log('🔍 Featured curated images API called with limit:', limit);

    const images = await curatedImageAPI.getFeaturedImages(limit);

    console.log('✅ Featured curated images API response:', { 
      imageCount: images.length
    });

    return NextResponse.json({ images });

  } catch (error) {
    console.error('❌ Featured curated images API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch featured images', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
