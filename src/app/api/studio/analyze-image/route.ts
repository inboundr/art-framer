/**
 * Image Analysis API
 * Analyzes uploaded images and recommends frame options
 */

import { NextRequest, NextResponse } from 'next/server';
import { analyzeImageWithAI } from '@/lib/studio/openai';
import { prodigiService } from '@/lib/prodigi/service';
import sharp from 'sharp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { imageUrl } = await request.json();

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      );
    }

    // 1. Download and get image metadata
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    
    const metadata = await sharp(imageBuffer).metadata();
    
    // 2. Analyze with OpenAI Vision
    const aiAnalysis = await analyzeImageWithAI(imageUrl);
    
    // 3. Calculate image metrics
    const width = metadata.width || 0;
    const height = metadata.height || 0;
    const aspectRatio = height > 0 ? (width / height) * 100 : 100;
    const orientation = getOrientation(aspectRatio);
    
    // 4. Query Prodigi for matching products
    const country = request.geo?.country || 'US';
    
    const matchingProducts = await prodigiService.search(
      {
        country,
        category: 'Wall art',
      },
      {
        top: 50, // Get more products for scoring
      }
    );
    
    // 5. Score products based on AI analysis
    const scoredProducts = scoreProducts(
      matchingProducts.products,
      aiAnalysis,
      aspectRatio
    );
    
    // 6. Get optimal sizes
    const optimalSizes = calculateOptimalSizes(width, height);
    
    // 7. Build response
    return NextResponse.json({
      image: {
        width,
        height,
        aspectRatio,
        orientation,
        format: metadata.format,
        dpi: metadata.density || 72,
      },
      analysis: aiAnalysis,
      recommendations: {
        products: scoredProducts.slice(0, 10),
        topProduct: scoredProducts[0],
        sizes: optimalSizes,
      },
    });
  } catch (error) {
    console.error('Error analyzing image:', error);
    return NextResponse.json(
      {
        error: 'Failed to analyze image',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Get orientation from aspect ratio
 */
function getOrientation(aspectRatio: number): 'landscape' | 'portrait' | 'square' {
  if (aspectRatio > 110) return 'landscape';
  if (aspectRatio < 90) return 'portrait';
  return 'square';
}

/**
 * Score products based on AI analysis and image properties
 */
function scoreProducts(products: any[], analysis: any, imageAspectRatio: number) {
  return products
    .map((product) => {
      let score = 0;
      const reasons: string[] = [];

      // Color match (30% weight)
      const frameColors = product.frameColour || product.color || [];
      const hasMatchingColor = analysis.recommendedFrameColors?.some((recommended: string) =>
        frameColors.some((frameColor: string) =>
          frameColor.toLowerCase().includes(recommended.toLowerCase())
        )
      );
      
      if (hasMatchingColor) {
        score += 0.3;
        reasons.push('Color matches image tones');
      }

      // Style match (20% weight)
      const productStyle = (product.frame?.[0] || product.style?.[0] || '').toLowerCase();
      const recommendedStyle = (analysis.recommendedFrameStyle || '').toLowerCase();
      
      if (productStyle.includes(recommendedStyle) || recommendedStyle.includes(productStyle)) {
        score += 0.2;
        reasons.push('Style complements artwork');
      }

      // Aspect ratio match (20% weight)
      const productAspectRatio = product.productAspectRatio || 100;
      const ratioDiff = Math.abs(productAspectRatio - imageAspectRatio);
      const ratioScore = Math.max(0, 0.2 - (ratioDiff / 500));
      score += ratioScore;
      
      if (ratioScore > 0.15) {
        reasons.push('Perfect size proportion');
      }

      // Glaze match (15% weight)
      if (product.glaze && product.glaze.length > 0) {
        const hasRecommendedGlaze = product.glaze.some((g: string) =>
          g.toLowerCase().includes(analysis.recommendedGlazing?.toLowerCase() || '')
        );
        if (hasRecommendedGlaze) {
          score += 0.15;
          reasons.push('Optimal glazing option');
        }
      }

      // Production location (10% weight)
      // Prefer local production
      if (product.productionCountries?.includes('US')) {
        score += 0.1;
        reasons.push('Fast US production');
      }

      // Price factor (5% weight)
      // Slightly favor mid-range prices
      const price = product.basePriceFrom || 0;
      if (price >= 50 && price <= 200) {
        score += 0.05;
      }

      return {
        ...product,
        matchScore: score,
        matchReasons: reasons,
        aiConfidence: analysis.confidence,
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * Calculate optimal print sizes based on image dimensions
 */
function calculateOptimalSizes(width: number, height: number) {
  const aspectRatio = width / height;
  const sizes: Array<{ size: string; width: number; height: number; quality: string }> = [];

  // Calculate DPI at different sizes
  const sizesInInches = [
    { w: 8, h: Math.round(8 / aspectRatio) },
    { w: 12, h: Math.round(12 / aspectRatio) },
    { w: 16, h: Math.round(16 / aspectRatio) },
    { w: 20, h: Math.round(20 / aspectRatio) },
    { w: 24, h: Math.round(24 / aspectRatio) },
    { w: 30, h: Math.round(30 / aspectRatio) },
    { w: 36, h: Math.round(36 / aspectRatio) },
  ];

  sizesInInches.forEach(({ w, h }) => {
    const dpiWidth = width / w;
    const dpiHeight = height / h;
    const dpi = Math.min(dpiWidth, dpiHeight);

    let quality = 'poor';
    if (dpi >= 300) quality = 'excellent';
    else if (dpi >= 200) quality = 'good';
    else if (dpi >= 150) quality = 'acceptable';

    sizes.push({
      size: `${w}x${h}`,
      width: w,
      height: h,
      quality,
    });
  });

  return sizes.filter(s => s.quality !== 'poor');
}

