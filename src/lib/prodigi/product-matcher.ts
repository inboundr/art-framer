/**
 * Product Matching and Scoring Engine
 * Intelligently matches products to user images and preferences
 */

import type {
  ProdigiCatalogProduct,
  ProductMatch,
  ImageAnalysisData,
  ProdigiSearchFilters,
  UserPreferences,
} from './types';
import { calculateAspectRatio, getOrientation } from './query-builder';

export class ProductMatcher {
  /**
   * Score and rank products for an image
   */
  scoreProducts(
    products: ProdigiCatalogProduct[],
    imageAnalysis: ImageAnalysisData,
    userPreferences: UserPreferences = {}
  ): ProductMatch[] {
    const scored = products.map(product => {
      const matchScore = this.calculateMatchScore(product, imageAnalysis, userPreferences);
      const matchReasons = this.generateMatchReasons(product, imageAnalysis, userPreferences);
      const confidence = this.calculateConfidence(matchScore, matchReasons.length);
      
      return {
        product,
        matchScore,
        matchReasons,
        confidence,
      };
    });
    
    // Sort by match score (highest first)
    return scored.sort((a, b) => b.matchScore - a.matchScore);
  }
  
  /**
   * Calculate overall match score (0-100)
   */
  private calculateMatchScore(
    product: ProdigiCatalogProduct,
    imageAnalysis: ImageAnalysisData,
    userPreferences: UserPreferences
  ): number {
    let score = 0;
    const weights = {
      aspectRatio: 30,    // Most important - must fit image
      size: 20,           // Important - optimal print size
      price: 15,          // Important - budget fit
      production: 15,     // Important - delivery speed
      style: 10,          // Nice to have - aesthetic match
      quality: 10,        // Nice to have - material quality
    };
    
    // 1. Aspect Ratio Match (0-30 points)
    score += this.scoreAspectRatioMatch(product, imageAnalysis) * weights.aspectRatio;
    
    // 2. Size Appropriateness (0-20 points)
    score += this.scoreSizeMatch(product, imageAnalysis) * weights.size;
    
    // 3. Price Fit (0-15 points)
    score += this.scorePriceFit(product, userPreferences) * weights.price;
    
    // 4. Production & Delivery (0-15 points)
    score += this.scoreProduction(product, userPreferences) * weights.production;
    
    // 5. Style Match (0-10 points)
    score += this.scoreStyleMatch(product, imageAnalysis, userPreferences) * weights.style;
    
    // 6. Quality Score (0-10 points)
    score += this.scoreQuality(product) * weights.quality;
    
    return Math.round(score);
  }
  
  /**
   * Score aspect ratio match (0-1)
   */
  private scoreAspectRatioMatch(
    product: ProdigiCatalogProduct,
    imageAnalysis: ImageAnalysisData
  ): number {
    const imageRatio = imageAnalysis.aspectRatio;
    const productRatio = product.productAspectRatio;
    
    // Calculate difference
    const diff = Math.abs(imageRatio - productRatio);
    
    // Perfect match = 1.0, decreases with difference
    if (diff < 2) return 1.0;        // Perfect match
    if (diff < 5) return 0.95;       // Excellent match
    if (diff < 10) return 0.85;      // Good match
    if (diff < 20) return 0.65;      // Acceptable match
    if (diff < 30) return 0.40;      // Marginal match
    return 0.1;                       // Poor match
  }
  
  /**
   * Score size appropriateness (0-1)
   */
  private scoreSizeMatch(
    product: ProdigiCatalogProduct,
    imageAnalysis: ImageAnalysisData
  ): number {
    // If we have DPI info, calculate optimal print size
    if (imageAnalysis.dpi) {
      const imageWidthMm = (imageAnalysis.width / imageAnalysis.dpi) * 25.4;
      const imageHeightMm = (imageAnalysis.height / imageAnalysis.dpi) * 25.4;
      const imageMaxDimMm = Math.max(imageWidthMm, imageHeightMm);
      
      const productMaxDim = product.maxProductDimensionsMm;
      
      // Optimal is to print at 90-110% of image's optimal size
      const ratio = productMaxDim / imageMaxDimMm;
      
      if (ratio >= 0.9 && ratio <= 1.1) return 1.0;  // Perfect
      if (ratio >= 0.8 && ratio <= 1.2) return 0.9;  // Excellent
      if (ratio >= 0.7 && ratio <= 1.3) return 0.7;  // Good
      if (ratio >= 0.5 && ratio <= 1.5) return 0.5;  // Acceptable
      return 0.3;                                      // Suboptimal
    }
    
    // Without DPI, prefer medium-large sizes (most versatile)
    const maxDim = product.maxProductDimensionsMm;
    if (maxDim >= 500 && maxDim <= 1000) return 1.0;  // Medium-large to large
    if (maxDim >= 300 && maxDim <= 1500) return 0.8;  // Medium to extra-large
    if (maxDim < 300 || maxDim > 1500) return 0.5;    // Small or oversized
    return 0.5;
  }
  
  /**
   * Score price fit (0-1)
   */
  private scorePriceFit(
    product: ProdigiCatalogProduct,
    userPreferences: UserPreferences
  ): number {
    if (!userPreferences.budget) return 0.5; // Neutral if no budget specified
    
    const price = product.basePriceFrom / 100; // Convert from pence/cents
    const { min, max } = userPreferences.budget;
    
    if (price >= min && price <= max) return 1.0;        // Within budget
    if (price < min) return 0.9;                         // Under budget (good!)
    if (price > max && price <= max * 1.2) return 0.6;   // Slightly over
    if (price > max && price <= max * 1.5) return 0.3;   // Moderately over
    return 0.1;                                          // Way over budget
  }
  
  /**
   * Score production and delivery (0-1)
   */
  private scoreProduction(
    product: ProdigiCatalogProduct,
    userPreferences: UserPreferences
  ): number {
    let score = 0.5; // Base score
    
    // Faster SLA is better
    if (product.sla <= 48) score += 0.5;        // 48 hours or less
    else if (product.sla <= 120) score += 0.3;  // 5 days or less
    else if (product.sla <= 168) score += 0.1;  // 7 days or less
    
    // Boost if speed is a priority
    if (userPreferences.priority === 'speed' && product.sla <= 48) {
      score = Math.min(1.0, score + 0.2);
    }
    
    return Math.min(1.0, score);
  }
  
  /**
   * Score style match (0-1)
   */
  private scoreStyleMatch(
    product: ProdigiCatalogProduct,
    imageAnalysis: ImageAnalysisData,
    userPreferences: UserPreferences
  ): number {
    let score = 0.5; // Base neutral score
    
    // Match frame color to image color temperature
    if (imageAnalysis.colorTemperature && product.frameColour) {
      const frameColors = product.frameColour;
      
      if (imageAnalysis.colorTemperature === 'warm') {
        if (frameColors.includes('natural') || frameColors.includes('brown') || frameColors.includes('gold')) {
          score += 0.3;
        }
      } else if (imageAnalysis.colorTemperature === 'cool') {
        if (frameColors.includes('black') || frameColors.includes('white') || frameColors.includes('silver')) {
          score += 0.3;
        }
      }
    }
    
    // Match user style preference
    if (userPreferences.style) {
      const productType = product.productType.toLowerCase();
      const description = product.description.toLowerCase();
      
      switch (userPreferences.style) {
        case 'modern':
          if (productType.includes('float') || description.includes('contemporary')) {
            score += 0.2;
          }
          break;
        case 'classic':
          if (productType.includes('frame') && !productType.includes('float')) {
            score += 0.2;
          }
          break;
        case 'ornate':
          if (description.includes('ornate') || description.includes('decorative')) {
            score += 0.2;
          }
          break;
        case 'minimal':
          if (description.includes('simple') || description.includes('clean')) {
            score += 0.2;
          }
          break;
      }
    }
    
    return Math.min(1.0, score);
  }
  
  /**
   * Score product quality (0-1)
   */
  private scoreQuality(product: ProdigiCatalogProduct): number {
    let score = 0.5; // Base score
    
    // Higher search weighting indicates higher quality/popularity
    if (product.searchWeighting > 75) score += 0.3;
    else if (product.searchWeighting > 50) score += 0.2;
    else if (product.searchWeighting > 25) score += 0.1;
    
    // Premium materials boost score
    if (product.glaze?.includes('motheye')) score += 0.1;        // Museum glass
    if (product.paperType?.includes('ema')) score += 0.1;        // Premium paper
    if (product.mount && product.mount.length > 0) score += 0.1; // Has mount options
    
    return Math.min(1.0, score);
  }
  
  /**
   * Generate human-readable match reasons
   */
  private generateMatchReasons(
    product: ProdigiCatalogProduct,
    imageAnalysis: ImageAnalysisData,
    userPreferences: UserPreferences
  ): string[] {
    const reasons: string[] = [];
    
    // Aspect ratio
    const aspectScore = this.scoreAspectRatioMatch(product, imageAnalysis);
    if (aspectScore >= 0.95) {
      reasons.push(`Perfect aspect ratio match for your ${imageAnalysis.orientation} image`);
    } else if (aspectScore >= 0.85) {
      reasons.push(`Excellent fit for your ${imageAnalysis.orientation} image`);
    }
    
    // Size
    if (imageAnalysis.dpi) {
      const sizeScore = this.scoreSizeMatch(product, imageAnalysis);
      if (sizeScore >= 0.9) {
        reasons.push('Optimal print size for your image resolution');
      }
    }
    
    // Production speed
    if (product.sla <= 48) {
      reasons.push('Fast production (ships within 48 hours)');
    }
    
    // Quality features
    if (product.glaze?.includes('motheye')) {
      reasons.push('Premium museum-quality glass (99% glare reduction)');
    }
    
    if (product.mount && product.mount.length > 0 && product.mount[0] !== 'no mount / mat') {
      reasons.push('Professional matting available');
    }
    
    // Style match
    if (imageAnalysis.colorTemperature && product.frameColour) {
      const frameColors = product.frameColour;
      if (imageAnalysis.colorTemperature === 'warm' && 
          (frameColors.includes('natural') || frameColors.includes('brown'))) {
        reasons.push('Frame color complements warm tones in your image');
      } else if (imageAnalysis.colorTemperature === 'cool' && 
                 (frameColors.includes('black') || frameColors.includes('silver'))) {
        reasons.push('Frame color complements cool tones in your image');
      }
    }
    
    // Popular choice
    if (product.searchWeighting > 75) {
      reasons.push('Popular choice among customers');
    }
    
    // Budget fit
    if (userPreferences.budget) {
      const price = product.basePriceFrom / 100;
      const { min, max } = userPreferences.budget;
      if (price <= max) {
        reasons.push('Within your budget');
      }
    }
    
    return reasons;
  }
  
  /**
   * Calculate confidence level (0-1)
   */
  private calculateConfidence(matchScore: number, reasonCount: number): number {
    // Base confidence on score
    let confidence = matchScore / 100;
    
    // Boost confidence if we have multiple strong reasons
    if (reasonCount >= 4) confidence = Math.min(1.0, confidence + 0.1);
    if (reasonCount >= 6) confidence = Math.min(1.0, confidence + 0.1);
    
    return confidence;
  }
  
  /**
   * Get top N recommendations
   */
  getTopRecommendations(
    products: ProdigiCatalogProduct[],
    imageAnalysis: ImageAnalysisData,
    userPreferences: UserPreferences = {},
    count: number = 3
  ): ProductMatch[] {
    const scored = this.scoreProducts(products, imageAnalysis, userPreferences);
    return scored.slice(0, count);
  }
  
  /**
   * Find the single best match
   */
  getBestMatch(
    products: ProdigiCatalogProduct[],
    imageAnalysis: ImageAnalysisData,
    userPreferences: UserPreferences = {}
  ): ProductMatch | null {
    const recommendations = this.getTopRecommendations(products, imageAnalysis, userPreferences, 1);
    return recommendations[0] || null;
  }
}

// Singleton instance
export const productMatcher = new ProductMatcher();

/**
 * Helper function to analyze image and get recommendations in one call
 */
export async function getRecommendationsForImage(
  imageUrl: string,
  width: number,
  height: number,
  dpi?: number,
  userPreferences: UserPreferences = {}
): Promise<{
  imageAnalysis: ImageAnalysisData;
  recommendations: ProductMatch[];
}> {
  // Create image analysis
  const imageAnalysis: ImageAnalysisData = {
    width,
    height,
    aspectRatio: calculateAspectRatio(width, height),
    orientation: getOrientation(calculateAspectRatio(width, height)),
    dpi,
  };
  
  // TODO: In future, integrate with AI vision API for:
  // - dominantColors
  // - colorTemperature
  // - complexity
  // For now, we'll work with basic dimensions
  
  // This function would be called with products from Azure Search
  // Return structure for use in API routes
  return {
    imageAnalysis,
    recommendations: [], // Will be populated with scored products
  };
}

