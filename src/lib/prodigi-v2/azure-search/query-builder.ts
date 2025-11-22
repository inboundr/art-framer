/**
 * Azure Search Query Builder for Prodigi Catalog
 * Constructs OData filter expressions and facet queries
 */

import type {
  ProdigiSearchFilters,
  ProdigiSearchOptions,
  PRODIGI_CONSTANTS,
} from './types';

export class ProdigiQueryBuilder {
  private filters: ProdigiSearchFilters;
  private options: ProdigiSearchOptions;
  
  constructor(filters: ProdigiSearchFilters, options: ProdigiSearchOptions = {}) {
    this.filters = filters;
    this.options = {
      top: 50,
      includeFacets: true,
      ...options,
    };
  }
  
  /**
   * Build complete query string for Azure Search
   */
  build(): string {
    const params = new URLSearchParams();
    
    // Required parameters
    params.append('api-version', '2016-09-01');
    params.append('search', '*');
    params.append('$count', 'true');
    params.append('$top', String(this.options.top));
    
    // Skip (pagination)
    if (this.options.skip) {
      params.append('$skip', String(this.options.skip));
    }
    
    // Build and add filter expression
    const filterExpression = this.buildFilterExpression();
    if (filterExpression) {
      params.append('$filter', filterExpression);
    }
    
    // Field selection
    if (this.options.selectFields?.length) {
      params.append('$select', this.options.selectFields.join(','));
    }
    
    // Facets
    if (this.options.includeFacets) {
      this.buildFacets().forEach(facet => {
        params.append('facet', facet);
      });
    }
    
    // Scoring profile (for production location optimization)
    if (this.options.scoringProfile) {
      params.append('scoringProfile', this.options.scoringProfile);
    }
    if (this.options.scoringParameter) {
      params.append('scoringParameter', this.options.scoringParameter);
    }
    
    return params.toString();
  }
  
  /**
   * Build OData filter expression
   */
  private buildFilterExpression(): string {
    const filterParts: string[] = [];
    
    // REQUIRED: Destination country
    filterParts.push(
      `destinationCountries/any(c: c eq '${this.escapeOData(this.filters.country)}')`
    );
    
    // Category
    if (this.filters.category) {
      filterParts.push(`category eq '${this.escapeOData(this.filters.category)}'`);
    }
    
    // Frame colors (using search.in like Prodigi dashboard)
    if (this.filters.frameColors?.length) {
      const colorValues = this.filters.frameColors.map(c => this.escapeOData(c)).join('|');
      filterParts.push(`frameColour/any(t: search.in(t, '${colorValues}', '|'))`);
    }
    
    // Frame styles (using search.in like Prodigi dashboard)
    if (this.filters.frameStyles?.length) {
      const styleValues = this.filters.frameStyles.map(s => this.escapeOData(s)).join('|');
      filterParts.push(`frame/any(t: search.in(t, '${styleValues}', '|'))`);
    }
    
    // Glazes (using search.in like Prodigi dashboard)
    if (this.filters.glazes?.length) {
      const glazeValues = this.filters.glazes.map(g => this.escapeOData(g)).join('|');
      filterParts.push(`glaze/any(t: search.in(t, '${glazeValues}', '|'))`);
    }
    
    // Mounts (using search.in like Prodigi dashboard)
    if (this.filters.mounts?.length) {
      const mountValues = this.filters.mounts.map(m => this.escapeOData(m)).join('|');
      filterParts.push(`mount/any(t: search.in(t, '${mountValues}', '|'))`);
    }
    
    // Mount colors (using search.in like Prodigi dashboard)
    if (this.filters.mountColors?.length) {
      const mountColorValues = this.filters.mountColors.map(c => this.escapeOData(c)).join('|');
      filterParts.push(`mountColour/any(t: search.in(t, '${mountColorValues}', '|'))`);
    }
    
    // Paper types (using search.in like Prodigi dashboard)
    if (this.filters.paperTypes?.length) {
      const paperValues = this.filters.paperTypes.map(p => this.escapeOData(p)).join('|');
      filterParts.push(`paperType/any(t: search.in(t, '${paperValues}', '|'))`);
    }
    
    // Finishes (using search.in like Prodigi dashboard)
    if (this.filters.finishes?.length) {
      const finishValues = this.filters.finishes.map(f => this.escapeOData(f)).join('|');
      filterParts.push(`finish/any(t: search.in(t, '${finishValues}', '|'))`);
    }
    
    // Edges (using search.in like Prodigi dashboard)
    if (this.filters.edges?.length) {
      const edgeValues = this.filters.edges.map(e => this.escapeOData(e)).join('|');
      filterParts.push(`edge/any(t: search.in(t, '${edgeValues}', '|'))`);
    }
    
    // Product types (NOT an array field - use simple OR logic)
    if (this.filters.productTypes?.length) {
      if (this.filters.productTypes.length === 1) {
        filterParts.push(`productType eq '${this.escapeOData(this.filters.productTypes[0])}'`);
      } else {
        const typeFilters = this.filters.productTypes
          .map(type => `productType eq '${this.escapeOData(type)}'`)
          .join(' or ');
        filterParts.push(`(${typeFilters})`);
      }
    }
    
    // Size range filtering
    if (this.filters.minDimensionMm !== undefined) {
      filterParts.push(`maxProductDimensionsMm ge ${this.filters.minDimensionMm}`);
    }
    if (this.filters.maxDimensionMm !== undefined) {
      filterParts.push(`maxProductDimensionsMm le ${this.filters.maxDimensionMm}`);
    }
    
    // Aspect ratio filtering
    if (this.filters.aspectRatioMin !== undefined) {
      filterParts.push(`productAspectRatio ge ${this.filters.aspectRatioMin}`);
    }
    if (this.filters.aspectRatioMax !== undefined) {
      filterParts.push(`productAspectRatio le ${this.filters.aspectRatioMax}`);
    }
    
    // Combine all filters with AND
    return filterParts.join(' and ');
  }
  
  /**
   * Build facet queries
   */
  private buildFacets(): string[] {
    return [
      // Frame options
      'frame,count:100',
      'frameColour,count:100',
      
      // Glazing
      'glaze,count:100',
      
      // Mounts
      'mount,count:100',
      'mountColour,count:100',
      
      // Paper & materials
      'paperType,count:100',
      'finish,count:100',
      'edge',
      
      // Size & dimensions
      'size,count:100',
      'maxProductDimensionsMm,values:300|500|700|1000|1500',
      
      // Aspect ratio
      'productAspectRatio,values:95|105',
      
      // Metadata
      'category',
      'style,count:100',
      'brand',
      'gender',
    ];
  }
  
  /**
   * Escape special characters in OData strings
   */
  private escapeOData(value: string): string {
    return value.replace(/'/g, "''");
  }
  
  /**
   * Get the full URL for the Azure Search request
   */
  getFullUrl(): string {
    const baseUrl = 'https://pwintylive.search.windows.net/indexes/live-catalogue/docs';
    return `${baseUrl}?${this.build()}`;
  }
}

/**
 * Helper functions for common query patterns
 */

/**
 * Calculate aspect ratio from dimensions
 */
export function calculateAspectRatio(width: number, height: number): number {
  return (height / width) * 100;
}

/**
 * Determine orientation from aspect ratio
 */
export function getOrientation(aspectRatio: number): 'portrait' | 'square' | 'landscape' {
  if (aspectRatio < 95) return 'portrait';
  if (aspectRatio > 105) return 'landscape';
  return 'square';
}

/**
 * Get aspect ratio filters for an image with tolerance
 */
export function getAspectRatioFilters(
  imageWidth: number,
  imageHeight: number,
  tolerance: number = 5
): { aspectRatioMin: number; aspectRatioMax: number } {
  const ratio = calculateAspectRatio(imageWidth, imageHeight);
  return {
    aspectRatioMin: ratio - tolerance,
    aspectRatioMax: ratio + tolerance,
  };
}

/**
 * Get size range for a size category
 */
export function getSizeRangeForCategory(
  category: string
): { minDimensionMm: number; maxDimensionMm: number } | null {
  const ranges: Record<string, { min: number; max: number }> = {
    'small': { min: 0, max: 300 },
    'medium': { min: 300, max: 500 },
    'medium-large': { min: 500, max: 700 },
    'large': { min: 700, max: 1000 },
    'extra-large': { min: 1000, max: 1500 },
    'oversized': { min: 1500, max: 10000 },
  };
  
  const range = ranges[category];
  if (!range) return null;
  
  return {
    minDimensionMm: range.min,
    maxDimensionMm: range.max,
  };
}

/**
 * Recommend size category based on image dimensions and DPI
 */
export function recommendSizeCategory(
  widthPx: number,
  heightPx: number,
  dpi: number = 300
): string {
  // Convert to physical dimensions in inches
  const widthInches = widthPx / dpi;
  const heightInches = heightPx / dpi;
  
  // Calculate max dimension in mm
  const maxInches = Math.max(widthInches, heightInches);
  const maxMm = maxInches * 25.4;
  
  // Categorize
  if (maxMm < 300) return 'small';
  if (maxMm < 500) return 'medium';
  if (maxMm < 700) return 'medium-large';
  if (maxMm < 1000) return 'large';
  if (maxMm < 1500) return 'extra-large';
  return 'oversized';
}

/**
 * Build filters for production location scoring
 */
export function buildScoringOptions(country: string): {
  scoringProfile: string;
  scoringParameter: string;
} {
  return {
    scoringProfile: 'Boost by production country',
    scoringParameter: `prodCountry-${country}`,
  };
}

/**
 * Create a query builder with smart defaults for image matching
 */
export function createImageMatchQuery(
  imageData: {
    width: number;
    height: number;
    dpi?: number;
  },
  country: string,
  additionalFilters?: Partial<ProdigiSearchFilters>
): ProdigiQueryBuilder {
  const aspectRatioFilters = getAspectRatioFilters(imageData.width, imageData.height);
  const sizeCategory = recommendSizeCategory(
    imageData.width,
    imageData.height,
    imageData.dpi
  );
  const sizeRange = getSizeRangeForCategory(sizeCategory);
  
  const filters: ProdigiSearchFilters = {
    country,
    category: 'Wall art',
    ...aspectRatioFilters,
    ...sizeRange,
    ...additionalFilters,
  };
  
  const options: ProdigiSearchOptions = {
    includeFacets: true,
    ...buildScoringOptions(country),
  };
  
  return new ProdigiQueryBuilder(filters, options);
}

