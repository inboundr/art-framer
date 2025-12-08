/**
 * Prodigi Product Catalog Service
 * 
 * USES AZURE SEARCH INTEGRATION to dynamically discover products
 * No more hardcoded SKUs - queries Prodigi's real catalog API
 */

import { ProdigiClient } from './client';
import type { Product } from './types';
import { azureSearchClient } from './azure-search/client';
import type { ProdigiCatalogProduct, ProdigiSearchFilters } from './azure-search/types';

/**
 * Maps our user-friendly product types to Prodigi's catalog product types
 */
const PRODUCT_TYPE_MAP: Record<string, string[]> = {
  // Note: These MUST match exactly what's in Prodigi's Azure Search catalog
  // Verified from actual catalog data (see /tmp/discover-product-types.js)
  'framed-print': ['Framed prints'], // 2578 products
  'canvas': ['Stretched canvas'], // 1551 products
  'framed-canvas': ['Framed canvas'], // 1655 products
  'acrylic': ['Acrylic panels'], // 37 products
  'metal': ['Aluminium prints', 'Dibond prints'], // 33 + 51 products
  'poster': ['Rolled canvas'], // Rolled canvas is the Prodigi product type for unframed posters/prints
  // Note: Prodigi doesn't have a separate "Poster" product type - they use "Rolled canvas" for unframed prints
};

/**
 * Convert inches (e.g., "36x48") to millimeters and aspect ratio range for precise matching
 */
function inchesToSearchParams(inches: string): {
  minDimensionMm: number;
  maxDimensionMm: number;
  aspectRatioMin: number;
  aspectRatioMax: number;
} {
  const [width, height] = inches.split('x').map(Number);
  const widthMm = width * 25.4;
  const heightMm = height * 25.4;
  const maxDimMm = Math.max(widthMm, heightMm);
  const minDimMm = Math.min(widthMm, heightMm);
  
  // IMPORTANT: Prodigi calculates aspect ratio as (shorter / longer) * 100
  // NOT (height / width). This matches standard aspect ratio calculations.
  // E.g., 18x24" → (18/24)*100 = 75%, A2 (42x59.4cm) → (42/59.4)*100 = 70.7%
  const aspectRatio = (minDimMm / maxDimMm) * 100;
  
  // Allow 10% tolerance for dimensions, 10% for aspect ratio
  return {
    minDimensionMm: Math.round(minDimMm * 0.9),
    maxDimensionMm: Math.round(maxDimMm * 1.1),
    aspectRatioMin: Math.round(aspectRatio * 0.9),
    aspectRatioMax: Math.round(aspectRatio * 1.1),
  };
}

interface CachedProduct {
  product: Product;
  catalogProduct: ProdigiCatalogProduct;
  fetchedAt: number;
}

/**
 * Prodigi Catalog Service
 * 
 * Uses Azure Search to dynamically discover products instead of hardcoded SKUs
 */
export class ProdigiCatalogService {
  private client: ProdigiClient;
  private cache: Map<string, CachedProduct> = new Map();
  private readonly CACHE_TTL = 1000 * 60 * 60; // 1 hour

  constructor(client: ProdigiClient) {
    this.client = client;
  }

  /**
   * Get SKU for a product type and size by querying Azure Search
   * 
   * @param productType - Product type (e.g., 'framed-print', 'canvas')
   * @param size - Size in inches format like '16x20', '8x10'
   * @param country - Country code for shipping
   * @param preferences - Optional preferences for edge depth, canvas type, etc.
   * @returns SKU if found, null otherwise
   */
  async getSKU(
    productType: string, 
    size: string, 
    country: string = 'US',
    preferences?: {
      edge?: '19mm' | '38mm' | 'auto';
      canvasType?: 'standard' | 'slim' | 'eco' | 'auto';
    }
  ): Promise<string | null> {
    // Include preferences in cache key to ensure different preferences get different results
    const prefsKey = preferences 
      ? `-${preferences.edge || 'auto'}-${preferences.canvasType || 'auto'}`
      : '';
    const cacheKey = `${productType}-${size}-${country}${prefsKey}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.fetchedAt < this.CACHE_TTL) {
      console.log(`[Catalog] Cache hit for ${productType} ${size}: ${cached.catalogProduct.sku}`);
      return cached.catalogProduct.sku;
    }

    try {
      // Get product types to search for
      const prodigiProductTypes = PRODUCT_TYPE_MAP[productType.toLowerCase()] || [productType];
      
      // Convert size to search parameters (dimensions + aspect ratio)
      const searchParams = inchesToSearchParams(size);
      
      console.log(`[Catalog] Searching Azure for ${productType} ${size}`, {
        prodigiProductTypes,
        searchParams,
      });

      // Search Azure catalog with precise dimension AND aspect ratio filtering
      const filters: ProdigiSearchFilters = {
        country,
        category: 'Wall art', // Keep this - we only sell wall art
        productTypes: prodigiProductTypes,
        ...searchParams, // Includes both dimension and aspect ratio filters
      };

      // IMPORTANT: Exclude Cork products when searching for regular framed prints
      // Cork pin boards are classified as "Framed prints" but have different attributes
      if (productType.toLowerCase() === 'framed-print') {
        // We'll use the query builder to add a NOT filter for cork
        // This will be handled in the search results filtering below
      }

      // Enable production country optimization for better pricing
      const result = await azureSearchClient.search(filters, {
        top: 20, // Increased to ensure we get non-cork products
        includeFacets: false,
        scoringProfile: 'Boost by production country', // ✅ Optimize for local production
        scoringParameter: `prodCountry-${country}`, // ✅ Boost products produced in destination country
      });

      // Filter out incompatible products
      let products = result.products;
      
      if (productType.toLowerCase() === 'framed-print') {
        // Filter out Cork products for framed-print searches
        // Cork pin boards are classified as "Framed prints" but have incompatible attributes
        const originalCount = products.length;
        products = products.filter(p => {
          const isCork = p.paperType?.some(pt => pt.toLowerCase().includes('cork'));
          return !isCork;
        });
        console.log(`[Catalog] Filtered out ${originalCount - products.length} cork products from ${originalCount} total`);
      }
      // Note: We no longer filter out slim canvas - it's a valid configuration option

      if (products.length === 0) {
        console.warn(`[Catalog] No products found for ${productType} ${size}`);
        return null;
      }

      // Score and rank products for optimal selection
      // Also prioritize exact size matches and user preferences
      const [requestedWidth, requestedHeight] = size.split('x').map(Number);
      const scoredProducts = products.map(product => {
        let score = this.calculateProductScore(product, country);
        
        // Bonus for exact size match
        const productWidth = product.fullProductHorizontalDimensions;
        const productHeight = product.fullProductVerticalDimensions;
        const isExactSizeMatch = (
          (Math.abs(productWidth - requestedWidth) < 0.5 && Math.abs(productHeight - requestedHeight) < 0.5) ||
          (Math.abs(productWidth - requestedHeight) < 0.5 && Math.abs(productHeight - requestedWidth) < 0.5)
        );
        if (isExactSizeMatch) {
          score += 50; // Significant bonus for exact size match
        }
        
        // Apply user preferences for edge depth and canvas type
        if (preferences) {
          // Edge preference (19mm = slim, 38mm = standard)
          if (preferences.edge && preferences.edge !== 'auto') {
            const productEdge = product.edge?.[0];
            const isSlimCanvas = product.sku?.toLowerCase().includes('slimcan') || 
                                product.sku?.toLowerCase().includes('slim-can');
            
            if (preferences.edge === '19mm') {
              // Prefer slim canvas (19mm edge)
              if (isSlimCanvas || productEdge === '19mm') {
                score += 30; // Bonus for matching slim preference
              } else {
                score -= 20; // Penalty for not matching
              }
            } else if (preferences.edge === '38mm') {
              // Prefer standard canvas (38mm edge)
              if (!isSlimCanvas && (productEdge === '38mm' || !productEdge)) {
                score += 30; // Bonus for matching standard preference
              } else {
                score -= 20; // Penalty for not matching
              }
            }
          }
          
          // Canvas type preference
          if (preferences.canvasType && preferences.canvasType !== 'auto') {
            const isSlim = product.sku?.toLowerCase().includes('slimcan') || 
                          product.sku?.toLowerCase().includes('slim-can');
            const isEco = product.sku?.toLowerCase().includes('eco') ||
                         product.paperType?.some(pt => pt.toLowerCase().includes('eco'));
            
            if (preferences.canvasType === 'slim' && isSlim) {
              score += 25; // Bonus for matching slim preference
            } else if (preferences.canvasType === 'slim' && !isSlim) {
              score -= 15; // Penalty for not matching
            } else if (preferences.canvasType === 'eco' && isEco) {
              score += 25; // Bonus for matching eco preference
            } else if (preferences.canvasType === 'eco' && !isEco) {
              score -= 15; // Penalty for not matching
            } else if (preferences.canvasType === 'standard' && !isSlim && !isEco) {
              score += 25; // Bonus for matching standard preference
            } else if (preferences.canvasType === 'standard' && (isSlim || isEco)) {
              score -= 15; // Penalty for not matching
            }
          }
        }
        
        return { product, score };
      });
      
      // Sort by score (highest first)
      scoredProducts.sort((a, b) => b.score - a.score);
      
      const bestMatch = scoredProducts[0].product;
      console.log(`[Catalog] Found SKU: ${bestMatch.sku} for ${productType} ${size}`, {
        productType: bestMatch.productType,
        dimensions: `${bestMatch.fullProductHorizontalDimensions}x${bestMatch.fullProductVerticalDimensions}${bestMatch.sizeUnits}`,
        productionCountries: bestMatch.productionCountries,
        score: scoredProducts[0].score,
      });

      // Fetch full product details from Prodigi API
      const product = await this.getProductFromApi(bestMatch.sku);
      
      if (product) {
        // Cache it
        this.cache.set(cacheKey, {
          product,
          catalogProduct: bestMatch,
          fetchedAt: Date.now(),
        });
      }

      return bestMatch.sku;
    } catch (error) {
      console.error(`[Catalog] Error searching for ${productType} ${size}:`, error);
      return null;
    }
  }

  /**
   * Get product details from Prodigi API
   */
  private async getProductFromApi(sku: string): Promise<Product | null> {
    try {
      console.log(`[Catalog] Fetching product details from Prodigi API: ${sku}`);
      
      const response = await this.client.request<{ product: Product }>({
        method: 'GET',
        endpoint: `/products/${sku}`,
      });

      console.log(`[Catalog] Successfully fetched product details: ${sku}`);
      return response.product;
    } catch (error) {
      console.error(`[Catalog] Error fetching product ${sku}:`, error);
      return null;
    }
  }

  /**
   * Get full product details for a product type and size
   * 
   * @param productType - Product type
   * @param size - Size in inches
   * @param country - Country code
   * @returns Product details with both catalog and API data
   */
  async getProduct(productType: string, size: string, country: string = 'US'): Promise<{
    sku: string;
    product: Product;
    catalogProduct: ProdigiCatalogProduct;
  } | null> {
    const cacheKey = `${productType}-${size}-${country}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.fetchedAt < this.CACHE_TTL) {
      return {
        sku: cached.catalogProduct.sku,
        product: cached.product,
        catalogProduct: cached.catalogProduct,
      };
    }

    const sku = await this.getSKU(productType, size, country);
    if (!sku) return null;

    const cached2 = this.cache.get(cacheKey);
    if (cached2) {
      return {
        sku: cached2.catalogProduct.sku,
        product: cached2.product,
        catalogProduct: cached2.catalogProduct,
      };
    }

    return null;
  }

  /**
   * Get available sizes for a product type by querying Azure Search
   */
  async getAvailableSizes(productType: string, country: string = 'US'): Promise<string[]> {
    try {
      const prodigiProductTypes = PRODUCT_TYPE_MAP[productType.toLowerCase()] || [productType];
      
      const filters: ProdigiSearchFilters = {
        country,
        category: 'Wall art', // Keep this - we only sell wall art
        productTypes: prodigiProductTypes,
      };

      const result = await azureSearchClient.search(filters, {
        top: 100,
        includeFacets: true,
      });

      // Extract unique sizes from the results
      const sizes = new Set<string>();
      result.products.forEach(product => {
        const width = Math.round(product.fullProductHorizontalDimensions);
        const height = Math.round(product.fullProductVerticalDimensions);
        
        // Convert to inches if in cm
        if (product.sizeUnits === 'cm') {
          const widthInches = Math.round(width / 2.54);
          const heightInches = Math.round(height / 2.54);
          sizes.add(`${widthInches}x${heightInches}`);
        } else {
          sizes.add(`${width}x${height}`);
        }
      });

      const sizeArray = Array.from(sizes).sort((a, b) => {
        const [aw, ah] = a.split('x').map(Number);
        const [bw, bh] = b.split('x').map(Number);
        return (aw * ah) - (bw * bh);
      });

      console.log(`[Catalog] Found ${sizeArray.length} sizes for ${productType}:`, sizeArray);
      return sizeArray;
    } catch (error) {
      console.error(`[Catalog] Error getting sizes for ${productType}:`, error);
      return [];
    }
  }

  /**
   * Get all supported product types
   */
  getProductTypes(): string[] {
    return Object.keys(PRODUCT_TYPE_MAP);
  }

  /**
   * Check if a product type and size combination is available
   */
  async isAvailable(productType: string, size: string, country: string = 'US'): Promise<boolean> {
    const sku = await this.getSKU(productType, size, country);
    return sku !== null;
  }

  /**
   * Calculate product score for optimal selection
   * Prioritizes local production, then regional, then price
   */
  private calculateProductScore(
    product: ProdigiCatalogProduct,
    destinationCountry: string
  ): number {
    let score = 0;
    
    // Helper to get shipping region
    const getShippingRegion = (countryCode: string): string => {
      const euCountries = [
        'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
        'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
        'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
      ];
      if (countryCode === 'GB') return 'GB';
      if (countryCode === 'US') return 'US';
      if (countryCode === 'AU') return 'AU';
      if (euCountries.includes(countryCode)) return 'EU';
      return 'INTL';
    };
    
    // Priority 1: Prefer local production (highest priority - 100 points)
    if (product.productionCountries?.includes(destinationCountry)) {
      score += 100;
    }
    
    // Priority 2: Prefer regional production (50 points)
    const destinationRegion = getShippingRegion(destinationCountry);
    const hasRegionalProduction = product.productionCountries?.some(country => 
      getShippingRegion(country) === destinationRegion
    );
    if (hasRegionalProduction) {
      score += 50;
    }
    
    // Priority 3: Prefer lower base price (inverse price - lower is better)
    // Normalize price score (assume max price is 10000 cents = 100 USD)
    if (product.basePriceFrom) {
      const normalizedPrice = Math.min(product.basePriceFrom / 100, 100); // Convert to USD equivalent
      score += (100 - normalizedPrice) / 10; // Max 10 points for price
    }
    
    // Priority 4: Prefer higher search weighting (if available)
    if (product.searchWeighting) {
      score += product.searchWeighting;
    }
    
    return score;
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
    azureSearchClient.clearCache();
    console.log('[Catalog] All caches cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
    };
  }
}
