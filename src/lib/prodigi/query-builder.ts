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
    
    // Frame colors (OR logic)
    if (this.filters.frameColors?.length) {
      const colorFilters = this.filters.frameColors
        .map(color => `frameColour/any(c: c eq '${this.escapeOData(color)}')`)
        .join(' or ');
      filterParts.push(`(${colorFilters})`);
    }
    
    // Frame styles
    if (this.filters.frameStyles?.length) {
      const styleFilters = this.filters.frameStyles
        .map(style => `frame/any(f: f eq '${this.escapeOData(style)}')`)
        .join(' or ');
      filterParts.push(`(${styleFilters})`);
    }
    
    // Glazes (OR logic)
    if (this.filters.glazes?.length) {
      const glazeFilters = this.filters.glazes
        .map(glaze => `glaze/any(g: g eq '${this.escapeOData(glaze)}')`)
        .join(' or ');
      filterParts.push(`(${glazeFilters})`);
    }
    
    // Mounts (OR logic)
    if (this.filters.mounts?.length) {
      const mountFilters = this.filters.mounts
        .map(mount => `mount/any(m: m eq '${this.escapeOData(mount)}')`)
        .join(' or ');
      filterParts.push(`(${mountFilters})`);
    }
    
    // Mount colors (OR logic)
    if (this.filters.mountColors?.length) {
      const mountColorFilters = this.filters.mountColors
        .map(color => `mountColour/any(c: c eq '${this.escapeOData(color)}')`)
        .join(' or ');
      filterParts.push(`(${mountColorFilters})`);
    }
    
    // Paper types (OR logic)
    if (this.filters.paperTypes?.length) {
      const paperFilters = this.filters.paperTypes
        .map(paper => `paperType/any(p: p eq '${this.escapeOData(paper)}')`)
        .join(' or ');
      filterParts.push(`(${paperFilters})`);
    }
    
    // Finishes (OR logic)
    if (this.filters.finishes?.length) {
      const finishFilters = this.filters.finishes
        .map(finish => `finish/any(f: f eq '${this.escapeOData(finish)}')`)
        .join(' or ');
      filterParts.push(`(${finishFilters})`);
    }
    
    // Edges (OR logic)
    if (this.filters.edges?.length) {
      const edgeFilters = this.filters.edges
        .map(edge => `edge/any(e: e eq '${this.escapeOData(edge)}')`)
        .join(' or ');
      filterParts.push(`(${edgeFilters})`);
    }
    
    // Product types (OR logic)
    if (this.filters.productTypes?.length) {
      const typeFilters = this.filters.productTypes
        .map(type => `productType eq '${this.escapeOData(type)}'`)
        .join(' or ');
      filterParts.push(`(${typeFilters})`);
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
      'facet=frame,count:100',
      'facet=frameColour,count:100',
      
      // Glazing
      'facet=glaze,count:100',
      
      // Mounts
      'facet=mount,count:100',
      'facet=mountColour,count:100',
      
      // Paper & materials
      'facet=paperType,count:100',
      'facet=finish,count:100',
      'facet=edge',
      
      // Size & dimensions
      'facet=size,count:100',
      'facet=maxProductDimensionsMm,values:300|500|700|1000|1500',
      
      // Aspect ratio
      'facet=productAspectRatio,values:95|105',
      
      // Metadata
      'facet=category',
      'facet=style,count:100',
      'facet=brand',
      'facet=gender',
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

