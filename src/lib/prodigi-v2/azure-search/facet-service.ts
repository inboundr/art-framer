/**
 * Facet Service for Dynamic Product Option Validation
 * 
 * This service queries Prodigi's Azure Search to determine which options
 * are valid for a given configuration, enabling dynamic UI updates.
 */

import { azureSearchClient } from './client';
import type { ProdigiSearchFilters, SearchResult } from './types';
import { getColorsForProductType, getColorDisplayName, hasColorAttribute } from '../constants/colors';

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
  hasFrameStyle: boolean;
  hasGlaze: boolean;
  hasMount: boolean;
  hasMountColor: boolean;
  hasPaperType: boolean;
  hasFinish: boolean;
  hasEdge: boolean;
  hasWrap: boolean;
  hasAspectRatio: boolean;
  
  // Available values for each option
  frameColors: string[];
  frameStyles: string[];
  glazes: string[];
  mounts: string[];
  mountColors: string[];
  paperTypes: string[];
  finishes: string[];
  edges: string[];
  wraps: string[];
  sizes: string[];
  aspectRatios: string[];
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
      const availableOptions = this.parseFacetsToOptions(facets, productType);

      // Check if facets are empty (Azure Search returned no facets)
      // This can happen even when products exist but facets aren't populated
      // When filters are applied, facets might be empty but that's OK - we'll merge with fallback
      const hasFacets = availableOptions.hasFrameColor || 
                       availableOptions.hasFrameStyle ||
                       availableOptions.hasGlaze || 
                       availableOptions.hasMount ||
                       availableOptions.hasFinish ||
                       availableOptions.hasEdge ||
                       availableOptions.hasWrap ||
                       availableOptions.hasAspectRatio;

      let finalOptions = availableOptions;
      
      // If no facets and no filters, use full fallback
      // If filters are applied but facets are empty, merge filtered fallback with facets
      if (!hasFacets && (!additionalFilters || Object.keys(additionalFilters).length === 0)) {
        console.log(`[Facets] No facets returned from Azure Search, using fallback for ${productType}`);
        finalOptions = this.getFallbackOptions(productType);
      } else if (!hasFacets && additionalFilters && Object.keys(additionalFilters).length > 0) {
        // Filters applied but no facets - merge fallback with empty facets to ensure we have options
        console.log(`[Facets] Filters applied but no facets returned, merging with fallback for ${productType}`);
        const fallback = this.getFallbackOptions(productType);
        // Keep the structure from parseFacetsToOptions but ensure we have fallback values
        finalOptions = {
          ...availableOptions,
          frameStyles: availableOptions.frameStyles.length > 0 ? availableOptions.frameStyles : fallback.frameStyles,
          glazes: availableOptions.glazes.length > 0 ? availableOptions.glazes : fallback.glazes,
          mounts: availableOptions.mounts.length > 0 ? availableOptions.mounts : fallback.mounts,
          mountColors: availableOptions.mountColors.length > 0 ? availableOptions.mountColors : fallback.mountColors,
          paperTypes: availableOptions.paperTypes.length > 0 ? availableOptions.paperTypes : fallback.paperTypes,
          finishes: availableOptions.finishes.length > 0 ? availableOptions.finishes : fallback.finishes,
          edges: availableOptions.edges.length > 0 ? availableOptions.edges : fallback.edges,
          frameColors: availableOptions.frameColors.length > 0 ? availableOptions.frameColors : fallback.frameColors,
          // Ensure flags are set correctly
          hasFrameColor: availableOptions.hasFrameColor || fallback.hasFrameColor,
          hasFrameStyle: availableOptions.hasFrameStyle || fallback.hasFrameStyle,
          hasGlaze: availableOptions.hasGlaze || fallback.hasGlaze,
          hasMount: availableOptions.hasMount || fallback.hasMount,
          hasMountColor: availableOptions.hasMountColor || fallback.hasMountColor,
          hasPaperType: availableOptions.hasPaperType || fallback.hasPaperType,
          hasFinish: availableOptions.hasFinish || fallback.hasFinish,
          hasEdge: availableOptions.hasEdge || fallback.hasEdge,
          hasWrap: availableOptions.hasWrap || fallback.hasWrap,
        };
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

    // Normalize aspect ratio label to Prodigi aspect ratio bounds
    let normalizedFilters: ProdigiSearchFilters = {
      country,
      category: 'Wall art', // Keep this - we only sell wall art
      productTypes: prodigiProductTypes,
    };

    if (additionalFilters) {
      normalizedFilters = { ...normalizedFilters, ...additionalFilters };

      const arLabel = (additionalFilters as any).aspectRatioLabel as
        | 'Landscape'
        | 'Portrait'
        | 'Square'
        | undefined;

      if (arLabel) {
        const arLower = arLabel.toLowerCase();
        if (arLower === 'landscape') {
          normalizedFilters.aspectRatioMin = 105;
          normalizedFilters.aspectRatioMax = 100000;
        } else if (arLower === 'portrait') {
          normalizedFilters.aspectRatioMin = 0;
          normalizedFilters.aspectRatioMax = 95;
        } else {
          // Square
          normalizedFilters.aspectRatioMin = 95;
          normalizedFilters.aspectRatioMax = 105;
        }
        // Remove helper prop so it doesn't get sent downstream
        delete (normalizedFilters as any).aspectRatioLabel;
      }
    }

    const result: SearchResult = await azureSearchClient.search(normalizedFilters, {
      top: 0, // We only need facets, not products
      includeFacets: true,
    });

    return (result.facets || {}) as ProductFacets;
  }

  /**
   * Process frame styles: extract pure frame styles and filter by product type
   * Removes thickness/stretcher bar info and duplicates
   */
  private processFrameStyles(frameStyles: string[], productType?: string): string[] {
    // Frame styles are only available for framed-print and framed-canvas
    // Return empty array immediately for non-framed product types
    if (productType) {
      const type = productType.toLowerCase();
      if (type !== 'framed-print' && type !== 'framed-canvas') {
        return [];
      }
    }
    
    const pureStyles = new Set<string>();
    
    // Frame styles that are valid for framed-print
    const framedPrintStyles = ['Classic', 'Box Frame', 'Float Frame', 'Ornate Frame', 'Aluminium', 'Budget', 'Spacer'];
    
    // Frame styles that are valid for framed-canvas
    const framedCanvasStyles = ['Classic', 'Box Frame', 'Float Frame', 'Ornate Frame', 'Aluminium', 'Budget', 'Spacer'];
    
    for (const style of frameStyles) {
      // Extract pure frame style from combined values like "Classic Frame, 19mm Standard Stretcher Bar"
      let pureStyle = style;
      
      // Remove thickness/stretcher bar information
      pureStyle = pureStyle
        .replace(/\s*,\s*\d+mm\s+(Standard|Premium)\s+Stretcher\s+Bar/gi, '')
        .replace(/\s*\d+mm\s+(Standard|Premium)\s+Stretcher\s+Bar/gi, '')
        .replace(/\s*Frame\s*$/i, '')
        .trim();
      
      // Normalize common variations
      if (pureStyle.toLowerCase().includes('classic')) {
        pureStyle = 'Classic';
      } else if (pureStyle.toLowerCase().includes('box frame') || (pureStyle.toLowerCase() === 'box' && !pureStyle.toLowerCase().includes('frame'))) {
        pureStyle = 'Box Frame';
      } else if (pureStyle.toLowerCase().includes('float')) {
        pureStyle = 'Float Frame';
      } else if (pureStyle.toLowerCase().includes('ornate')) {
        pureStyle = 'Ornate Frame';
      } else if (pureStyle.toLowerCase().includes('aluminium') || pureStyle.toLowerCase().includes('aluminum')) {
        pureStyle = 'Aluminium';
      } else if (pureStyle.toLowerCase().includes('budget')) {
        pureStyle = 'Budget';
      } else if (pureStyle.toLowerCase().includes('spacer')) {
        pureStyle = 'Spacer';
      } else if (pureStyle.toLowerCase().includes('rolled') || pureStyle.toLowerCase().includes('no frame')) {
        // Skip "Rolled / No Frame" - this is not a frame style
        continue;
      } else if (pureStyle.toLowerCase().includes('stretcher bar') && !pureStyle.toLowerCase().includes('frame')) {
        // Skip standalone stretcher bar options - these are edge options, not frame styles
        continue;
      }
      
      // Filter by product type
      if (productType === 'framed-print' && framedPrintStyles.includes(pureStyle)) {
        pureStyles.add(pureStyle);
      } else if (productType === 'framed-canvas' && framedCanvasStyles.includes(pureStyle)) {
        pureStyles.add(pureStyle);
      } else if (!productType) {
        // If no product type specified, include all valid styles
        if (framedPrintStyles.includes(pureStyle) || framedCanvasStyles.includes(pureStyle)) {
          pureStyles.add(pureStyle);
        }
      }
    }
    
    // Sort and return
    return Array.from(pureStyles).sort();
  }

  /**
   * Parse facets into a structured AvailableOptions object
   * Merges facets with fallback options to ensure all options are available
   */
  private parseFacetsToOptions(facets: ProductFacets, productType?: string): AvailableOptions {
    const frameColors = facets.frameColour?.map(f => f.value) || [];
    const frameStyles = facets.frame?.map(f => f.value) || [];
    const glazes = facets.glaze?.map(f => f.value) || [];
    const mounts = facets.mount?.map(f => f.value) || [];
    const mountColors = facets.mountColour?.map(f => f.value) || [];
    const paperTypes = facets.paperType?.map(f => f.value) || [];
    const finishes = facets.finish?.map(f => f.value) || [];
    const edges = facets.edge?.map(f => f.value) || [];
    const sizes = facets.size?.map(f => f.value) || [];

    // Extract aspect ratios from productAspectRatio facet
    // Azure productAspectRatio is (longer side / shorter side) * 100
    // Buckets typically: Portrait < 95, Square 95-105, Landscape >= 105
    const aspectRatios: string[] = [];
    if (facets.productAspectRatio) {
      facets.productAspectRatio.forEach(range => {
        const from = range.from ?? 0;
        const to = range.to ?? 0;

        // Classify based on bucket bounds
        // Landscape bucket: from >= 105
        if (from >= 105 || to >= 105) {
          aspectRatios.push('Landscape');
        }
        // Portrait bucket: to <= 95
        else if (to > 0 && to <= 95) {
          aspectRatios.push('Portrait');
        }
        // Square bucket: overlaps 95-105
        else {
          aspectRatios.push('Square');
        }
      });
      // Remove duplicates
      const uniqueAspectRatios = Array.from(new Set(aspectRatios));
      aspectRatios.length = 0;
      aspectRatios.push(...uniqueAspectRatios);
    }
    
    // If no aspect ratios from facets, add defaults based on product type
    if (aspectRatios.length === 0) {
      aspectRatios.push('Landscape', 'Portrait', 'Square');
    }

    // Get fallback options to merge with facets
    const fallback = productType ? this.getFallbackOptions(productType) : null;

    // Process frame styles: extract pure styles and filter by product type
    const processedFrameStyles = this.processFrameStyles(frameStyles, productType);
    const processedFallbackStyles = fallback?.frameStyles ? this.processFrameStyles(fallback.frameStyles, productType) : [];

    // Merge facets with fallback options - use facets if available, otherwise use fallback
    // This ensures we always have complete option lists
    const mergedFrameStyles = processedFrameStyles.length > 0 ? processedFrameStyles : processedFallbackStyles;
    const mergedGlazes = glazes.length > 0 ? glazes : (fallback?.glazes || []);
    const mergedMounts = mounts.length > 0 ? mounts : (fallback?.mounts || []);
    const mergedMountColors = mountColors.length > 0 ? mountColors : (fallback?.mountColors || []);
    const mergedPaperTypes = paperTypes.length > 0 ? paperTypes : (fallback?.paperTypes || []);
    const mergedFinishes = finishes.length > 0 ? finishes : (fallback?.finishes || []);
    const mergedEdges = edges.length > 0 ? edges : (fallback?.edges || []);

    // Check if wrap is available (for canvas products)
    // Wrap is not a facet, but we can infer it from the product type
    const hasWrap = fallback?.hasWrap || false;

    // Use colors from facets if available, otherwise use product-type-specific defaults
    let finalFrameColors = frameColors;
    if (frameColors.length === 0 && productType) {
      finalFrameColors = getColorsForProductType(productType).map((c: string) => getColorDisplayName(c));
    }

    // Determine availability flags - use fallback if facets are empty
    // But respect product type constraints: frame styles only for framed-print and framed-canvas
    const hasFrameColor = frameColors.length > 0 || (productType ? hasColorAttribute(productType) : false) || (fallback?.hasFrameColor || false);
    const hasFrameStyle = productType 
      ? (productType.toLowerCase() === 'framed-print' || productType.toLowerCase() === 'framed-canvas') 
        ? (mergedFrameStyles.length > 0 || (fallback?.hasFrameStyle || false))
        : false
      : (mergedFrameStyles.length > 0 || (fallback?.hasFrameStyle || false));
    const hasGlaze = mergedGlazes.length > 0 || (fallback?.hasGlaze || false);
    const hasMount = mergedMounts.length > 0 || (fallback?.hasMount || false);
    const hasMountColor = mergedMountColors.length > 0 || (fallback?.hasMountColor || false);
    const hasPaperType = mergedPaperTypes.length > 0 || (fallback?.hasPaperType || false);
    const hasFinish = mergedFinishes.length > 0 || (fallback?.hasFinish || false);
    const hasEdge = mergedEdges.length > 0 || (fallback?.hasEdge || false);

    return {
      hasFrameColor,
      hasFrameStyle,
      hasGlaze,
      hasMount,
      hasMountColor,
      hasPaperType,
      hasFinish,
      hasEdge,
      hasWrap,
      hasAspectRatio: aspectRatios.length > 0,
      
      frameColors: finalFrameColors,
      frameStyles: mergedFrameStyles,
      glazes: mergedGlazes,
      mounts: mergedMounts,
      mountColors: mergedMountColors,
      paperTypes: mergedPaperTypes,
      finishes: mergedFinishes,
      edges: mergedEdges,
      wraps: hasWrap ? ['Black', 'White', 'ImageWrap', 'MirrorWrap'] : [],
      sizes,
      aspectRatios,
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
        hasFrameStyle: type === 'framed-canvas',
        hasGlaze: false,
        hasMount: false,
        hasMountColor: false,
        hasPaperType: false,
        hasFinish: true,
        hasEdge: true,
        hasWrap: true,
        hasAspectRatio: true,
        
        frameColors: getColorsForProductType(type).map(c => getColorDisplayName(c)),
        frameStyles: type === 'framed-canvas' ? [
          'Classic',
          'Box Frame',
          'Float Frame',
          'Ornate Frame',
          'Aluminium',
          'Budget',
          'Spacer',
        ] : [],
        glazes: [],
        mounts: [],
        mountColors: [],
        paperTypes: [],
        finishes: ['Gloss', 'Lustre', 'Matte'],
        edges: ['19mm', '38mm', 'Rolled'],
        wraps: ['Black', 'White', 'ImageWrap', 'MirrorWrap'],
        sizes: [], // Sizes will be fetched separately via catalog service for accuracy
        aspectRatios: ['Landscape', 'Portrait', 'Square'],
      };
    }

    // Framed prints
    if (type === 'framed-print') {
      return {
        hasFrameColor: true,
        hasFrameStyle: true,
        hasGlaze: true,
        hasMount: true,
        hasMountColor: true,
        hasPaperType: true,
        hasFinish: true, // Finish is available for framed prints (Gloss, Lustre, Matte)
        hasEdge: true, // Edge is available for some frame styles
        hasWrap: false,
        hasAspectRatio: true,
        
        frameColors: getColorsForProductType(type).map(c => getColorDisplayName(c)),
        frameStyles: [
          'Classic',
          'Box Frame',
          'Float Frame',
          'Ornate Frame',
          'Aluminium',
          'Budget',
          'Spacer',
        ],
        glazes: [
          'Acrylic / Perspex',
          'Float Glass',
          'Gloss Varnish',
          'Motheye',
          'None',
        ],
        mounts: [
          '1.4mm',
          '2.0mm',
          '2.4mm',
          'No Mount / Mat',
          'No Mount/mat',
        ],
        mountColors: [
          'Black',
          'Off White',
          'Snow White',
        ],
        paperTypes: [
          'Acrylic',
          'Budget Art Paper',
          'Budget Photo Paper',
          'Cold Press Watercolour Paper',
          'Cork',
          'Dibond',
          'Enhanced Matte Art Paper',
          'Glow In The Dark',
          'Gold Foil',
          'Hahnemühle German Etching',
          'Hahnemühle Photo Rag',
          'Lustre Photo Paper',
          'Metallic Canvas (mc)',
          'Recycled Canvas',
          'Silk',
          'Silver Foil',
          'Smooth Art Paper',
          'Smooth Photo Rag',
          'Standard Canvas (sc)',
        ],
        finishes: ['Gloss', 'Lustre', 'Matte'], // Finish options for framed prints
        edges: ['19mm', '38mm', 'Rolled'],
        wraps: [],
        sizes: [], // Sizes will be fetched separately via catalog service for accuracy
        aspectRatios: ['Landscape', 'Portrait', 'Square'],
      };
    }

    // Acrylic
    if (type === 'acrylic') {
      return {
        hasFrameColor: false,
        hasFrameStyle: false,
        hasGlaze: false,
        hasMount: false,
        hasMountColor: false,
        hasPaperType: false,
        hasFinish: true,
        hasEdge: false,
        hasWrap: false,
        hasAspectRatio: true,
        
        frameColors: [],
        frameStyles: [],
        glazes: [],
        mounts: [],
        mountColors: [],
        paperTypes: [],
        finishes: ['Gloss', 'Lustre', 'Matte'],
        edges: [],
        wraps: [],
        sizes: [], // Sizes will be fetched separately via catalog service for accuracy
        aspectRatios: ['Landscape', 'Portrait', 'Square'],
      };
    }

    // Metal
    if (type === 'metal') {
      return {
        hasFrameColor: false,
        hasFrameStyle: false,
        hasGlaze: false,
        hasMount: false,
        hasMountColor: false,
        hasPaperType: false,
        hasFinish: true,
        hasEdge: false,
        hasWrap: false,
        hasAspectRatio: true,
        
        frameColors: [],
        frameStyles: [],
        glazes: [],
        mounts: [],
        mountColors: [],
        paperTypes: [],
        finishes: ['Gloss', 'Lustre', 'Matte'],
        edges: [],
        wraps: [],
        sizes: [], // Sizes will be fetched separately via catalog service for accuracy
        aspectRatios: ['Landscape', 'Portrait', 'Square'],
      };
    }

    // Default fallback
    return {
      hasFrameColor: false,
      hasFrameStyle: false,
      hasGlaze: false,
      hasMount: false,
      hasMountColor: false,
      hasPaperType: false,
      hasFinish: false,
      hasEdge: false,
      hasWrap: false,
      hasAspectRatio: true,
      
      frameColors: [],
      frameStyles: [],
      glazes: [],
      mounts: [],
      mountColors: [],
      paperTypes: [],
      finishes: [],
      edges: [],
      wraps: [],
      sizes: [],
      aspectRatios: ['Landscape', 'Portrait', 'Square'],
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

