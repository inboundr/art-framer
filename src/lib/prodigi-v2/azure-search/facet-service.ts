/**
 * Facet Service for Dynamic Product Option Validation
 * 
 * This service queries Prodigi's Azure Search to determine which options
 * are valid for a given configuration, enabling dynamic UI updates.
 */

import { azureSearchClient } from './client';
import type { ProdigiSearchFilters, SearchResult } from './types';

export interface FacetOption {
  value: string;
  count: number;
}

export interface ProductFacets {
  // Frame options
  frame?: FacetOption[];
  frameColour?: FacetOption[];
  
  // Glazing
  glaze?: FacetOption[];
  
  // Mounts
  mount?: FacetOption[];
  mountColour?: FacetOption[];
  
  // Materials
  paperType?: FacetOption[];
  finish?: FacetOption[];
  edge?: FacetOption[];
  
  // Dimensions
  size?: FacetOption[];
  maxProductDimensionsMm?: Array<{ from?: number; to?: number; count: number }>;
  productAspectRatio?: Array<{ from?: number; to?: number; count: number }>;
  
  // Metadata
  category?: FacetOption[];
  style?: FacetOption[];
  brand?: FacetOption[];
}

export interface AvailableOptions {
  // What options are available for this configuration
  hasFrameColor: boolean;
  hasGlaze: boolean;
  hasMount: boolean;
  hasMountColor: boolean;
  hasPaperType: boolean;
  hasFinish: boolean;
  hasEdge: boolean;
  hasWrap: boolean;
  
  // Available values for each option
  frameColors: string[];
  glazes: string[];
  mounts: string[];
  mountColors: string[];
  paperTypes: string[];
  finishes: string[];
  edges: string[];
  wraps: string[];
  sizes: string[];
}

interface FacetCacheEntry {
  facets: ProductFacets;
  availableOptions: AvailableOptions;
  fetchedAt: number;
}

/**
 * Maps our internal product types to Prodigi's catalog types
 * Note: These MUST match exactly what's in Prodigi's Azure Search catalog
 * Verified from actual catalog data (see /tmp/discover-product-types.js)
 */
const PRODUCT_TYPE_MAP: Record<string, string[]> = {
  'framed-print': ['Framed prints'], // 2578 products
  'canvas': ['Stretched canvas'], // 1551 products
  'framed-canvas': ['Framed canvas'], // 1655 products
  'acrylic': ['Acrylic panels'], // 37 products
  'metal': ['Aluminium prints', 'Dibond prints'], // 33 + 51 products
  'poster': ['Rolled canvas'], // 1904 products (closest match for unframed prints)
};

/**
 * Facet Service Class
 * Handles querying and caching of product facets
 */
class FacetService {
  private cache: Map<string, FacetCacheEntry> = new Map();
  private readonly CACHE_TTL = 1000 * 60 * 5; // 5 minutes

  /**
   * Get available options for a product configuration
   */
  async getAvailableOptions(
    productType: string,
    country: string = 'US',
    additionalFilters?: Partial<ProdigiSearchFilters>
  ): Promise<AvailableOptions> {
    const cacheKey = this.buildCacheKey(productType, country, additionalFilters);
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.fetchedAt < this.CACHE_TTL) {
      console.log(`[Facets] Cache hit for ${productType}`);
      return cached.availableOptions;
    }

    console.log(`[Facets] Fetching facets for ${productType}`, {
      country,
      additionalFilters,
    });

    try {
      const facets = await this.queryFacets(productType, country, additionalFilters);
      const availableOptions = this.parseFacetsToOptions(facets);

      // Check if facets are empty (Azure Search returned no facets)
      // This can happen even when products exist but facets aren't populated
      const hasFacets = availableOptions.hasFrameColor || 
                       availableOptions.hasGlaze || 
                       availableOptions.hasMount ||
                       availableOptions.hasFinish ||
                       availableOptions.hasEdge ||
                       availableOptions.hasWrap;

      let finalOptions = availableOptions;
      
      if (!hasFacets) {
        console.log(`[Facets] No facets returned from Azure Search, using fallback for ${productType}`);
        finalOptions = this.getFallbackOptions(productType);
      }

      // Cache the result
      this.cache.set(cacheKey, {
        facets,
        availableOptions: finalOptions,
        fetchedAt: Date.now(),
      });

      console.log(`[Facets] Available options for ${productType}:`, finalOptions);
      return finalOptions;
    } catch (error) {
      console.error(`[Facets] Error fetching facets for ${productType}:`, error);
      // Return fallback options
      return this.getFallbackOptions(productType);
    }
  }

  /**
   * Query facets from Azure Search
   */
  private async queryFacets(
    productType: string,
    country: string,
    additionalFilters?: Partial<ProdigiSearchFilters>
  ): Promise<ProductFacets> {
    const prodigiProductTypes = PRODUCT_TYPE_MAP[productType.toLowerCase()] || [productType];

    const filters: ProdigiSearchFilters = {
      country,
      category: 'Wall art', // Keep this - we only sell wall art
      productTypes: prodigiProductTypes,
      ...additionalFilters,
    };

    const result: SearchResult = await azureSearchClient.search(filters, {
      top: 0, // We only need facets, not products
      includeFacets: true,
    });

    return (result.facets || {}) as ProductFacets;
  }

  /**
   * Parse facets into a structured AvailableOptions object
   */
  private parseFacetsToOptions(facets: ProductFacets): AvailableOptions {
    const frameColors = facets.frameColour?.map(f => f.value) || [];
    const glazes = facets.glaze?.map(f => f.value) || [];
    const mounts = facets.mount?.map(f => f.value) || [];
    const mountColors = facets.mountColour?.map(f => f.value) || [];
    const paperTypes = facets.paperType?.map(f => f.value) || [];
    const finishes = facets.finish?.map(f => f.value) || [];
    const edges = facets.edge?.map(f => f.value) || [];
    const sizes = facets.size?.map(f => f.value) || [];

    // Check if wrap is available (for canvas products)
    // Wrap is not a facet, but we can infer it from the product type
    const hasWrap = edges.length > 0 || finishes.length > 0;

    return {
      hasFrameColor: frameColors.length > 0,
      hasGlaze: glazes.length > 0,
      hasMount: mounts.length > 0,
      hasMountColor: mountColors.length > 0,
      hasPaperType: paperTypes.length > 0,
      hasFinish: finishes.length > 0,
      hasEdge: edges.length > 0,
      hasWrap, // Canvas products have wrap options
      
      frameColors,
      glazes,
      mounts,
      mountColors,
      paperTypes,
      finishes,
      edges,
      wraps: hasWrap ? ['Black', 'White', 'ImageWrap', 'MirrorWrap'] : [],
      sizes,
    };
  }

  /**
   * Get fallback options when facet query fails
   * Based on known product type characteristics
   */
  private getFallbackOptions(productType: string): AvailableOptions {
    const type = productType.toLowerCase();

    // Canvas products
    if (type === 'canvas' || type === 'framed-canvas') {
      return {
        hasFrameColor: type === 'framed-canvas',
        hasGlaze: false,
        hasMount: false,
        hasMountColor: false,
        hasPaperType: false,
        hasFinish: true,
        hasEdge: true,
        hasWrap: true,
        
        frameColors: type === 'framed-canvas' ? ['Black', 'White', 'Natural'] : [],
        glazes: [],
        mounts: [],
        mountColors: [],
        paperTypes: [],
        finishes: ['Gloss', 'Matte'],
        edges: ['19mm', '38mm'],
        wraps: ['Black', 'White', 'ImageWrap', 'MirrorWrap'],
        sizes: [], // Sizes will be fetched separately via catalog service for accuracy
      };
    }

    // Framed prints
    if (type === 'framed-print') {
      return {
        hasFrameColor: true,
        hasGlaze: true,
        hasMount: true,
        hasMountColor: true,
        hasPaperType: true,
        hasFinish: false,
        hasEdge: false,
        hasWrap: false,
        
        frameColors: ['Black', 'White', 'Natural', 'Gold', 'Silver'],
        glazes: ['Acrylic / Perspex', 'Float Glass', 'Motheye'],
        mounts: ['No Mount / Mat', '1.4mm', '2.0mm', '2.4mm'], // All mount options from Prodigi catalog
        mountColors: ['Snow White', 'Off White', 'Black'], // Most common mount colors
        paperTypes: ['Budget Photo Paper', 'Enhanced Matte'],
        finishes: [],
        edges: [],
        wraps: [],
        sizes: [], // Sizes will be fetched separately via catalog service for accuracy
      };
    }

    // Acrylic
    if (type === 'acrylic') {
      return {
        hasFrameColor: false,
        hasGlaze: false,
        hasMount: false,
        hasMountColor: false,
        hasPaperType: false,
        hasFinish: true,
        hasEdge: false,
        hasWrap: false,
        
        frameColors: [],
        glazes: [],
        mounts: [],
        mountColors: [],
        paperTypes: [],
        finishes: ['Gloss', 'High Gloss'],
        edges: [],
        wraps: [],
        sizes: [], // Sizes will be fetched separately via catalog service for accuracy
      };
    }

    // Metal
    if (type === 'metal') {
      return {
        hasFrameColor: false,
        hasGlaze: false,
        hasMount: false,
        hasMountColor: false,
        hasPaperType: false,
        hasFinish: true,
        hasEdge: false,
        hasWrap: false,
        
        frameColors: [],
        glazes: [],
        mounts: [],
        mountColors: [],
        paperTypes: [],
        finishes: ['Gloss', 'Matte'],
        edges: [],
        wraps: [],
        sizes: [], // Sizes will be fetched separately via catalog service for accuracy
      };
    }

    // Default fallback
    return {
      hasFrameColor: false,
      hasGlaze: false,
      hasMount: false,
      hasMountColor: false,
      hasPaperType: false,
      hasFinish: false,
      hasEdge: false,
      hasWrap: false,
      
      frameColors: [],
      glazes: [],
      mounts: [],
      mountColors: [],
      paperTypes: [],
      finishes: [],
      edges: [],
      wraps: [],
      sizes: [],
    };
  }

  /**
   * Build cache key from configuration
   */
  private buildCacheKey(
    productType: string,
    country: string,
    additionalFilters?: Partial<ProdigiSearchFilters>
  ): string {
    const filterKey = additionalFilters
      ? JSON.stringify(additionalFilters)
      : 'default';
    return `${productType}-${country}-${filterKey}`;
  }

  /**
   * Clear cache (useful for testing or forced refresh)
   */
  clearCache(): void {
    this.cache.clear();
    console.log('[Facets] Cache cleared');
  }

  /**
   * Validate a configuration against available options
   */
  async validateConfiguration(
    productType: string,
    config: Record<string, any>,
    country: string = 'US'
  ): Promise<{ valid: boolean; errors: string[] }> {
    const options = await this.getAvailableOptions(productType, country);
    const errors: string[] = [];

    // Helper to check if a value is meaningful (not empty, undefined, or "none")
    const hasValue = (val: any) => val && val !== 'none';

    // Check frame color (only if it's a real value, not just a default)
    if (hasValue(config.frameColor) && !options.hasFrameColor) {
      errors.push('Frame color is not available for this product type');
    } else if (
      hasValue(config.frameColor) &&
      options.frameColors.length > 0 &&
      !options.frameColors.some(c => c.toLowerCase() === config.frameColor.toLowerCase())
    ) {
      errors.push(`Frame color "${config.frameColor}" is not available`);
    }

    // Check glaze (only if not "none")
    if (hasValue(config.glaze) && !options.hasGlaze) {
      errors.push('Glaze is not available for this product type');
    }

    // Check mount (already handles "none")
    if (config.mount && config.mount !== 'none' && !options.hasMount) {
      errors.push('Mount is not available for this product type');
    }

    // Check wrap (only if it's a real value)
    if (hasValue(config.wrap) && !options.hasWrap) {
      errors.push('Wrap is not available for this product type');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// Export singleton instance
export const facetService = new FacetService();

