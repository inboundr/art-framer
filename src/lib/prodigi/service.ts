/**
 * Prodigi Service - Main API Class
 */

import { azureSearchClient } from './azure-search-client';
import { productMatcher } from './product-matcher';
import { createImageMatchQuery } from './query-builder';
import type {
  ProdigiSearchFilters,
  ProdigiSearchOptions,
  SearchResult,
  ProcessedFacets,
  ProductMatch,
  ImageAnalysisData,
  UserPreferences,
} from './types';

export class ProdigiService {
  /**
   * Search products with filters
   */
  async search(
    filters: ProdigiSearchFilters,
    options?: ProdigiSearchOptions
  ): Promise<SearchResult> {
    return azureSearchClient.search(filters, options);
  }
  
  /**
   * Get facets for current filters (for filter UI)
   */
  async getFacets(filters: ProdigiSearchFilters): Promise<ProcessedFacets> {
    return azureSearchClient.getFacets(filters);
  }
  
  /**
   * Get intelligent recommendations for an image
   */
  async getImageRecommendations(
    imageData: {
      width: number;
      height: number;
      dpi?: number;
      url?: string;
    },
    country: string,
    userPreferences?: UserPreferences,
    topN: number = 5
  ): Promise<ProductMatch[]> {
    // Build query optimized for this image
    const queryBuilder = createImageMatchQuery(imageData, country);
    
    // Get matching products
    const result = await azureSearchClient.search(
      queryBuilder['filters'],
      { top: 50, includeFacets: false }
    );
    
    // Create image analysis
    const imageAnalysis: ImageAnalysisData = {
      width: imageData.width,
      height: imageData.height,
      aspectRatio: (imageData.height / imageData.width) * 100,
      orientation: imageData.height < imageData.width ? 'landscape' :
                   imageData.height > imageData.width ? 'portrait' : 'square',
      dpi: imageData.dpi,
    };
    
    // Score and return top matches
    return productMatcher.getTopRecommendations(
      result.products,
      imageAnalysis,
      userPreferences,
      topN
    );
  }
  
  /**
   * Get products by category with smart filtering
   */
  async getProductsByCategory(
    category: string,
    country: string,
    additionalFilters?: Partial<ProdigiSearchFilters>,
    options?: ProdigiSearchOptions
  ): Promise<SearchResult> {
    const filters: ProdigiSearchFilters = {
      country,
      category,
      ...additionalFilters,
    };
    
    return this.search(filters, options);
  }
  
  /**
   * Get all frame products (wall art category)
   */
  async getFrameProducts(
    country: string,
    filters?: Partial<ProdigiSearchFilters>
  ): Promise<SearchResult> {
    return this.getProductsByCategory('Wall art', country, filters, {
      includeFacets: true,
      top: 100,
    });
  }
  
  /**
   * Get product by SKU
   */
  async getProductBySku(sku: string, country: string) {
    return azureSearchClient.getProductBySku(sku, country);
  }
  
  /**
   * Get products by multiple SKUs
   */
  async getProductsBySku(skus: string[], country: string) {
    return azureSearchClient.getProductsBySku(skus, country);
  }
  
  /**
   * Clear all caches
   */
  clearCache(): void {
    azureSearchClient.clearCache();
  }
}

// Create singleton instance
export const prodigiService = new ProdigiService();

