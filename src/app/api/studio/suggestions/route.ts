/**
 * Smart Suggestions API
 * Generates AI-powered improvement suggestions
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateAISuggestions } from '@/lib/studio/openai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { config, imageAnalysis, userContext } = await request.json();

    // Generate rule-based suggestions
    const ruleBased = generateRuleBasedSuggestions(config, imageAnalysis, userContext);

    // Generate AI suggestions
    const aiSuggestions = await generateAISuggestions(config, imageAnalysis, userContext);

    // Combine and rank
    const allSuggestions = [...ruleBased, ...aiSuggestions];
    const rankedSuggestions = rankSuggestions(allSuggestions, userContext);

    return NextResponse.json({
      suggestions: rankedSuggestions.slice(0, 3), // Top 3
    });
  } catch (error) {
    console.error('Error generating suggestions:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate suggestions',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Generate rule-based suggestions
 */
function generateRuleBasedSuggestions(
  config: any,
  imageAnalysis: any,
  userContext: any
) {
  const suggestions = [];

  // Mount suggestion for busy images
  if ((!config.mount || config.mount === 'none') && imageAnalysis?.complexity > 0.6) {
    suggestions.push({
      id: `mount-${Date.now()}`,
      type: 'add',
      target: 'mount',
      value: '2.4mm',
      reason: 'Busy images benefit from breathing room with a mount',
      impact: { price: 12, aesthetic: 0.15 },
      confidence: 0.85,
      priority: 1,
    });
  }

  // Glaze upgrade for bright rooms
  if (config.glaze === 'acrylic' && userContext?.budget > 200) {
    suggestions.push({
      id: `glaze-${Date.now()}`,
      type: 'upgrade',
      target: 'glaze',
      value: 'motheye',
      reason: 'Museum glass eliminates 99% of glare - perfect for bright rooms',
      impact: { price: 25, quality: 0.20 },
      confidence: 0.70,
      priority: 2,
    });
  }

  // Size optimization based on room
  if (userContext?.roomInfo?.wallWidth) {
    const optimalSize = calculateOptimalSize(
      userContext.roomInfo.wallWidth,
      userContext.roomInfo.viewingDistance || 8
    );
    
    if (optimalSize && optimalSize !== config.size) {
      const priceDiff = calculatePriceDiff(config.size, optimalSize);
      
      suggestions.push({
        id: `size-${Date.now()}`,
        type: 'change',
        target: 'size',
        value: optimalSize,
        reason: `${optimalSize} is optimal for your ${userContext.roomInfo.wallWidth}ft wall`,
        impact: { price: priceDiff },
        confidence: 0.90,
        priority: 1,
      });
    }
  }

  // Color harmony suggestion
  if (imageAnalysis?.dominantColors && imageAnalysis.dominantColors.length > 0) {
    const harmoniousColors = getHarmoniousColors(imageAnalysis.dominantColors);
    
    if (!harmoniousColors.includes(config.frameColor)) {
      suggestions.push({
        id: `color-${Date.now()}`,
        type: 'change',
        target: 'frameColor',
        value: harmoniousColors[0],
        reason: `${harmoniousColors[0]} complements your artwork's colors beautifully`,
        impact: { price: 0, aesthetic: 0.12 },
        confidence: 0.75,
        priority: 3,
      });
    }
  }

  // Budget-friendly alternative
  if (config.price > 150 && userContext?.budget < 150) {
    suggestions.push({
      id: `budget-${Date.now()}`,
      type: 'change',
      target: 'glaze',
      value: 'acrylic',
      reason: 'Standard acrylic saves money while maintaining great quality',
      impact: { price: -15, quality: -0.05 },
      confidence: 0.80,
      priority: 2,
    });
  }

  return suggestions;
}

/**
 * Calculate optimal size based on wall width and viewing distance
 */
function calculateOptimalSize(wallWidth: number, viewingDistance: number): string | null {
  // Rule of thumb: art should be 2/3 to 3/4 of wall width
  const optimalWidth = wallWidth * 0.7;
  
  // Standard sizes
  const sizes = ['16x20', '20x24', '20x30', '24x30', '24x36', '30x40', '36x48'];
  
  const sizeWidths: Record<string, number> = {
    '16x20': 16,
    '20x24': 20,
    '20x30': 20,
    '24x30': 24,
    '24x36': 24,
    '30x40': 30,
    '36x48': 36,
  };
  
  // Find closest size
  let closestSize = sizes[0];
  let smallestDiff = Math.abs(sizeWidths[sizes[0]] - optimalWidth);
  
  for (const size of sizes) {
    const diff = Math.abs(sizeWidths[size] - optimalWidth);
    if (diff < smallestDiff) {
      smallestDiff = diff;
      closestSize = size;
    }
  }
  
  return closestSize;
}

/**
 * Calculate price difference between two sizes
 */
function calculatePriceDiff(size1: string, size2: string): number {
  // Simplified pricing model
  const basePrices: Record<string, number> = {
    '16x20': 120,
    '20x24': 140,
    '20x30': 155,
    '24x30': 170,
    '24x36': 190,
    '30x40': 220,
    '36x48': 260,
  };
  
  const price1 = basePrices[size1] || 150;
  const price2 = basePrices[size2] || 150;
  
  return price2 - price1;
}

/**
 * Get harmonious frame colors for dominant image colors
 */
function getHarmoniousColors(dominantColors: string[]): string[] {
  // Simplified color harmony logic
  // In production, use proper color theory
  
  const firstColor = dominantColors[0].toLowerCase();
  
  // Warm colors → natural/gold
  if (firstColor.includes('ff') && firstColor.includes('a0')) {
    return ['natural', 'gold', 'white'];
  }
  
  // Cool colors → black/silver
  if (firstColor.includes('00') || firstColor.includes('blue')) {
    return ['black', 'silver', 'white'];
  }
  
  // Neutral/mixed → white/natural
  return ['white', 'natural', 'black'];
}

/**
 * Rank suggestions by priority, confidence, and context
 */
function rankSuggestions(suggestions: any[], userContext: any) {
  return suggestions
    .map((s) => ({
      ...s,
      score: calculateSuggestionScore(s, userContext),
    }))
    .sort((a, b) => b.score - a.score);
}

/**
 * Calculate suggestion score
 */
function calculateSuggestionScore(suggestion: any, userContext: any) {
  let score = 0;
  
  // Priority (40% weight)
  score += (4 - suggestion.priority) * 0.4;
  
  // Confidence (30% weight)
  score += suggestion.confidence * 0.3;
  
  // Impact (20% weight)
  const impact = suggestion.impact;
  if (impact.aesthetic) score += impact.aesthetic * 0.1;
  if (impact.quality) score += impact.quality * 0.1;
  
  // Budget consideration (10% weight)
  if (userContext?.budget) {
    if (impact.price < 0) {
      // Negative price is good if over budget
      score += 0.1;
    } else if (impact.price > 0 && impact.price < userContext.budget * 0.1) {
      // Small price increase is acceptable
      score += 0.05;
    }
  }
  
  return score;
}

