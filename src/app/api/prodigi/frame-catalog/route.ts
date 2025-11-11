import { NextRequest, NextResponse } from 'next/server';
import { ProdigiFrameCatalog } from '@/lib/prodigi-frame-catalog';

/**
 * GET /api/prodigi/frame-catalog
 * 
 * Fetches all available frame options from Prodigi catalog
 * Returns frame colors, sizes, and all available combinations
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const frameColor = searchParams.get('frameColor');
    
    const catalog = new ProdigiFrameCatalog();

    // Handle different actions
    switch (action) {
      case 'stats':
        // Get catalog statistics
        const stats = await catalog.getCatalogStats();
        return NextResponse.json({
          success: true,
          stats
        });

      case 'colors':
        // Get all available frame colors
        const colors = await catalog.getAvailableColors();
        return NextResponse.json({
          success: true,
          colors
        });

      case 'sizes':
        // Get available sizes for a specific color
        if (!frameColor) {
          return NextResponse.json(
            { success: false, error: 'frameColor parameter required for sizes action' },
            { status: 400 }
          );
        }
        const sizes = await catalog.getAvailableSizes(frameColor);
        return NextResponse.json({
          success: true,
          frameColor,
          sizes
        });

      case 'combinations':
        // Get all combinations organized by color and size
        const combinations = await catalog.getFrameCombinations();
        return NextResponse.json({
          success: true,
          combinations
        });

      default:
        // Get all frame options (default behavior)
        const options = await catalog.getFrameOptions();
        
        console.log(`✅ Returning ${options.length} frame options from catalog`);
        
        return NextResponse.json({
          success: true,
          options,
          count: options.length
        });
    }

  } catch (error) {
    console.error('❌ Error fetching frame catalog:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch frame catalog',
        message: 'Using fallback data'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/prodigi/frame-catalog/clear-cache
 * 
 * Clears the frame catalog cache to force a fresh fetch
 */
export async function POST(request: NextRequest) {
  try {
    const catalog = new ProdigiFrameCatalog();
    catalog.clearCache();
    
    return NextResponse.json({
      success: true,
      message: 'Frame catalog cache cleared'
    });

  } catch (error) {
    console.error('❌ Error clearing cache:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to clear cache'
      },
      { status: 500 }
    );
  }
}

