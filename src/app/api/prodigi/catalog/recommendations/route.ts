/**
 * Prodigi Product Recommendations API
 * AI-powered product matching for images
 */

import { NextRequest, NextResponse } from 'next/server';
import { prodigiService } from '@/lib/prodigi-v2/azure-search/service';
import type { UserPreferences } from '@/lib/prodigi/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RecommendationRequest {
  imageData: {
    width: number;
    height: number;
    dpi?: number;
    url?: string;
  };
  country: string;
  userPreferences?: UserPreferences;
  topN?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as RecommendationRequest;
    
    const { imageData, country, userPreferences, topN = 5 } = body;
    
    // Validate required fields
    if (!imageData || !imageData.width || !imageData.height) {
      return NextResponse.json(
        { error: 'imageData with width and height is required' },
        { status: 400 }
      );
    }
    
    if (!country) {
      return NextResponse.json(
        { error: 'country is required' },
        { status: 400 }
      );
    }
    
    console.log('🎯 Getting recommendations:', {
      imageSize: `${imageData.width}x${imageData.height}`,
      dpi: imageData.dpi || 'unknown',
      country,
      topN,
      hasPreferences: !!userPreferences,
    });
    
    const recommendations = await prodigiService.getImageRecommendations(
      imageData,
      country,
      userPreferences,
      topN
    );
    
    console.log('✅ Recommendations generated:', {
      count: recommendations.length,
      topScore: recommendations[0]?.matchScore,
      topReasons: recommendations[0]?.matchReasons.length,
    });
    
    // Return recommendations with metadata
    return NextResponse.json({
      recommendations,
      imageAnalysis: {
        width: imageData.width,
        height: imageData.height,
        aspectRatio: (imageData.height / imageData.width) * 100,
        orientation: imageData.height < imageData.width ? 'landscape' :
                     imageData.height > imageData.width ? 'portrait' : 'square',
        dpi: imageData.dpi,
      },
      metadata: {
        country,
        requestedCount: topN,
        returnedCount: recommendations.length,
      },
    });
  } catch (error) {
    console.error('❌ Failed to generate recommendations:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to generate recommendations',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

