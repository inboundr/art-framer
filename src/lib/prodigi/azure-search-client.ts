/**
 * Azure Search Client for Prodigi Catalog
 * Handles all interactions with the Azure Cognitive Search index
 */

import type {
  AzureSearchResponse,
  ProdigiCatalogProduct,
  ProdigiSearchFilters,
  ProdigiSearchOptions,
  SearchResult,
  ProcessedFacets,
  SearchFacets,
} from './types';
import { ProdigiQueryBuilder } from './query-builder';

const AZURE_SEARCH_ENDPOINT = 'https://pwintylive.search.windows.net/indexes/live-catalogue/docs';
const AZURE_API_KEY = '9142D85CE18C3AE0349B1FB21956B072';
const CACHE_TTL = 60 * 60 * 1000; // 1 hour for facet data

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export class AzureSearchClient {
  private cache = new Map<string, CacheEntry<any>>();
  
  /**
   * Search the Prodigi catalog with filters
   */
  async search(
    filters: ProdigiSearchFilters,
    options: ProdigiSearchOptions = {}
  ): Promise<SearchResult> {
    const cacheKey = this.getCacheKey(filters, options);
    
    // Check cache for facet-only queries
    if (options.top === 0 && this.isCacheValid(cacheKey)) {
      console.log('📦 Using cached facet data');
      return this.cache.get(cacheKey)!.data;
    }
    
    const queryBuilder = new ProdigiQueryBuilder(filters, options);
    const url = queryBuilder.getFullUrl();
    
    console.log('🔍 Azure Search query:', {
      filters,
      options,
      url: url.substring(0, 200) + '...',
    });
    
    try {
      const response = await fetch(`${AZURE_SEARCH_ENDPOINT}?${queryBuilder.build()}`, {
        method: 'GET',
        headers: {
          'api-key': AZURE_API_KEY,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Azure Search error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        });
        throw new Error(
          `Azure Search API error: ${response.status} ${response.statusText}`
        );
      }
      
      const data: AzureSearchResponse<ProdigiCatalogProduct> = await response.json();
      
      console.log('✅ Azure Search results:', {
        totalCount: data['@odata.count'],
        returnedCount: data.value.length,
        hasFacets: !!data['@search.facets'],
      });
      
      const result: SearchResult = {
        products: data.value,
        totalCount: data['@odata.count'] || 0,
        facets: data['@search.facets']
          ? this.processFacets(data['@search.facets'])
          : undefined,
        appliedFilters: filters,
      };
      
      // Cache facet-only queries
      if (options.top === 0) {
        this.cache.set(cacheKey, {
          data: result,
          timestamp: Date.now(),
        });
      }
      
      return result;
    } catch (error) {
      console.error('❌ Azure Search request failed:', error);
      throw error;
    }
  }
  
  /**
   * Get only facets (no products) - fast for filter UI updates
   */
  async getFacets(filters: ProdigiSearchFilters): Promise<ProcessedFacets> {
    const result = await this.search(filters, {
      top: 0,
      includeFacets: true,
    });
    
    return result.facets!;
  }
  
  /**
   * Get products by SKUs
   */
  async getProductsBySku(skus: string[], country: string): Promise<ProdigiCatalogProduct[]> {
    if (skus.length === 0) return [];
    
    // Build OR filter for SKUs
    const skuFilter = skus.map(sku => `sku eq '${sku}'`).join(' or ');
    
    const url = new URL(AZURE_SEARCH_ENDPOINT);
    url.searchParams.append('api-version', '2016-09-01');
    url.searchParams.append('search', '*');
    url.searchParams.append('$count', 'true');
    url.searchParams.append('$top', String(skus.length));
    url.searchParams.append(
      '$filter',
      `(${skuFilter}) and destinationCountries/any(c: c eq '${country}')`
    );
    
    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'api-key': AZURE_API_KEY,
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.statusText}`);
      }
      
      const data: AzureSearchResponse<ProdigiCatalogProduct> = await response.json();
      return data.value;
    } catch (error) {
      console.error('❌ Failed to fetch products by SKU:', error);
      throw error;
    }
  }
  
  /**
   * Get a single product by SKU
   */
  async getProductBySku(sku: string, country: string): Promise<ProdigiCatalogProduct | null> {
    const products = await this.getProductsBySku([sku], country);
    return products[0] || null;
  }
  
  /**
   * Process raw facets into user-friendly format
   */
  private processFacets(rawFacets: SearchFacets): ProcessedFacets {
    return {
      frames: this.processFacetValues(rawFacets.frame),
      frameColors: this.processFacetValues(rawFacets.frameColour),
      glazes: this.processFacetValues(rawFacets.glaze),
      mounts: this.processFacetValues(rawFacets.mount),
      mountColors: this.processFacetValues(rawFacets.mountColour),
      paperTypes: this.processFacetValues(rawFacets.paperType),
      finishes: this.processFacetValues(rawFacets.finish),
      edges: this.processFacetValues(rawFacets.edge),
      sizes: this.processFacetValues(rawFacets.size),
      dimensionRanges: this.processRangeFacets(rawFacets.maxProductDimensionsMm),
      aspectRatios: this.processRangeFacets(rawFacets.productAspectRatio),
    };
  }
  
  /**
   * Process value facets
   */
  private processFacetValues(facets: Array<{ value: string; count: number }> | undefined) {
    if (!facets) return [];
    
    return facets.map(facet => ({
      value: facet.value,
      label: this.getFacetLabel(facet.value),
      count: facet.count,
      available: facet.count > 0,
    }));
  }
  
  /**
   * Process range facets
   */
  private processRangeFacets(
    facets: Array<{ from?: number; to?: number; count: number }> | undefined
  ) {
    if (!facets) return [];
    
    return facets.map(facet => ({
      from: facet.from,
      to: facet.to,
      label: this.getRangeLabel(facet.from, facet.to),
      count: facet.count,
      available: facet.count > 0,
    }));
  }
  
  /**
   * Get user-friendly label for facet values
   */
  private getFacetLabel(value: string): string {
    // Expand common abbreviations
    const expansions: Record<string, string> = {
      'sc': 'Standard Canvas',
      'mc': 'Metallic Canvas',
      'ema': 'Enhanced Matte Art',
      'lpp': 'Lustre Photo Paper',
      'hpr': 'High Gloss Photo',
      'hge': 'German Etching',
      'cpwp': 'Cold Press Watercolour',
      'sap': 'Standard Art Paper',
      'bap': 'Budget Art Paper',
      'spr': 'Standard Photo Paper',
      'bpp': 'Budget Photo Paper',
    };
    
    // Check if it's an abbreviation
    if (expansions[value.toLowerCase()]) {
      return expansions[value.toLowerCase()];
    }
    
    // Capitalize each word
    return value
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  
  /**
   * Get label for range facets
   */
  private getRangeLabel(from?: number, to?: number): string {
    if (from === undefined && to !== undefined) {
      return `Under ${this.formatDimension(to)}`;
    }
    if (to === undefined && from !== undefined) {
      return `Over ${this.formatDimension(from)}`;
    }
    if (from !== undefined && to !== undefined) {
      return `${this.formatDimension(from)} - ${this.formatDimension(to)}`;
    }
    return 'Unknown range';
  }
  
  /**
   * Format dimension for display
   */
  private formatDimension(mm: number): string {
    const cm = mm / 10;
    if (cm >= 100) {
      return `${(cm / 100).toFixed(1)}m`;
    }
    return `${cm}cm`;
  }
  
  /**
   * Generate cache key
   */
  private getCacheKey(filters: ProdigiSearchFilters, options: ProdigiSearchOptions): string {
    return JSON.stringify({ filters, options });
  }
  
  /**
   * Check if cache entry is still valid
   */
  private isCacheValid(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    return Date.now() - entry.timestamp < CACHE_TTL;
  }
  
  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🗑️ Azure Search cache cleared');
  }
}

// Singleton instance
export const azureSearchClient = new AzureSearchClient();

