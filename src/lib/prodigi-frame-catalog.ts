import { ProdigiClient } from './prodigi';

export interface FrameCatalogOption {
  sku: string;
  size: 'small' | 'medium' | 'large' | 'extra_large';
  sizeLabel: string; // e.g., "30x40cm"
  style: string; // Frame color: black, white, natural, etc.
  material: string;
  price: number;
  currency: string;
  dimensions: {
    width: number;
    height: number;
    depth?: number;
    unit: string;
  };
  category: string;
  productType: string;
  wrapColor?: string;
  glaze?: string;
  mount?: string;
  available: boolean;
}

export interface FrameCombinationsMap {
  [frameColor: string]: {
    [size: string]: FrameCatalogOption[];
  };
}

/**
 * Service to fetch and organize frame options from Prodigi catalog
 * This replaces hardcoded frame options with dynamic data from the API
 */
export class ProdigiFrameCatalog {
  private prodigiClient: ProdigiClient;
  private cache: FrameCatalogOption[] | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 60 * 60 * 1000; // 1 hour

  constructor() {
    const apiKey = process.env.PRODIGI_API_KEY || '';
    const environment = (process.env.PRODIGI_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox';
    this.prodigiClient = new ProdigiClient(apiKey, environment);
  }

  /**
   * Get all available frame options from Prodigi catalog
   */
  async getFrameOptions(): Promise<FrameCatalogOption[]> {
    // Return cached data if valid
    if (this.cache && this.isCacheValid()) {
      console.log(`📦 Using cached frame options: ${this.cache.length} options`);
      return this.cache;
    }

    try {
      console.log('🔍 Fetching frame products from Prodigi catalog...');
      
      // Fetch all products from Prodigi
      const allProducts = await this.prodigiClient.getAllProducts();
      console.log(`📊 getAllProducts returned: ${allProducts.length} total products`);
      
      // Filter for frame products
      const frameProducts = this.filterFrameProducts(allProducts);
      
      console.log(`✅ Found ${frameProducts.length} frame products in Prodigi catalog`);
      
      // Map to our format - EXPAND each product into multiple options (one per color)
      const options: FrameCatalogOption[] = [];
      for (const product of frameProducts) {
        const expandedOptions = this.expandProductIntoOptions(product);
        options.push(...expandedOptions);
      }
      
      console.log(`✅ Expanded ${frameProducts.length} products into ${options.length} frame options`);
      
      // Cache the results
      this.cache = options;
      this.cacheTimestamp = Date.now();
      
      return options;
    } catch (error) {
      console.error('❌ Error fetching frame options from Prodigi:', error);
      console.error('❌ Error details:', error instanceof Error ? error.message : error);
      
      // Return fallback options if API fails
      const fallback = this.getFallbackOptions();
      console.log(`⚠️ Returning ${fallback.length} fallback options`);
      return fallback;
    }
  }

  /**
   * Expand a single product into multiple options (one per color)
   */
  private expandProductIntoOptions(product: any): FrameCatalogOption[] {
    const options: FrameCatalogOption[] = [];
    
    // Get all available colors for this product
    const colors = 
      product.color || 
      product.frameColour || 
      product.attributes?.color || 
      [];
    
    if (!Array.isArray(colors) || colors.length === 0) {
      // If no colors array, create a single option
      const option = this.mapProdigiToFrameOption(product, null);
      if (option) options.push(option);
      return options;
    }
    
    // Create one option for each color
    for (const color of colors) {
      const option = this.mapProdigiToFrameOption(product, color);
      if (option) {
        options.push(option);
      }
    }
    
    console.log(`🎨 Expanded ${product.sku} into ${options.length} color options:`, colors.join(', '));
    return options;
  }

  /**
   * Get available combinations organized by frame color and size
   * Returns: { "black": { "small": [...], "medium": [...] }, "white": { ... } }
   */
  async getFrameCombinations(): Promise<FrameCombinationsMap> {
    const options = await this.getFrameOptions();
    const combinations: FrameCombinationsMap = {};

    options.forEach(option => {
      const color = option.style;
      const size = option.size;

      if (!combinations[color]) {
        combinations[color] = {};
      }

      if (!combinations[color][size]) {
        combinations[color][size] = [];
      }

      combinations[color][size].push(option);
    });

    return combinations;
  }

  /**
   * Get all available frame colors
   */
  async getAvailableColors(): Promise<string[]> {
    const options = await this.getFrameOptions();
    const colors = new Set<string>();
    
    options.forEach(option => colors.add(option.style));
    
    return Array.from(colors).sort();
  }

  /**
   * Get all available sizes for a specific frame color
   */
  async getAvailableSizes(frameColor: string): Promise<string[]> {
    const options = await this.getFrameOptions();
    const sizes = new Set<string>();
    
    options
      .filter(option => option.style === frameColor)
      .forEach(option => sizes.add(option.size));
    
    return Array.from(sizes).sort(this.sortSizes);
  }

  /**
   * Check if a specific combination is available
   */
  async isCombinAvailable(frameColor: string, size: string): Promise<boolean> {
    const options = await this.getFrameOptions();
    return options.some(option => 
      option.style === frameColor && 
      option.size === size &&
      option.available
    );
  }

  /**
   * Get catalog statistics for debugging
   */
  async getCatalogStats(): Promise<{
    totalProducts: number;
    frameColors: number;
    sizes: number;
    combinations: number;
    priceRange: { min: number; max: number };
  }> {
    const options = await this.getFrameOptions();
    const colors = new Set(options.map(o => o.style));
    const sizes = new Set(options.map(o => o.size));
    const prices = options.map(o => o.price);

    return {
      totalProducts: options.length,
      frameColors: colors.size,
      sizes: sizes.size,
      combinations: options.length,
      priceRange: {
        min: Math.min(...prices),
        max: Math.max(...prices)
      }
    };
  }

  /**
   * Clear the cache and force a fresh fetch
   */
  clearCache(): void {
    this.cache = null;
    this.cacheTimestamp = 0;
    console.log('🗑️ Frame catalog cache cleared');
  }

  /**
   * Filter products to only include frames
   */
  private filterFrameProducts(products: any[]): any[] {
    console.log(`🔍 Filtering ${products.length} products. First product structure:`, products[0] ? {
      sku: products[0].sku,
      category: products[0].category,
      hasFrameColour: !!products[0].frameColour,
      hasColor: !!products[0].color,
      hasProductType: !!products[0].productType,
      hasAttributesFinish: !!products[0].attributes?.finish,
      attributes: products[0].attributes
    } : 'No products');

    return products.filter(product => {
      // Check if product is a frame based on multiple criteria
      const hasFrameInCategory = 
        product.category?.toLowerCase().includes('wall art') ||
        product.category?.toLowerCase().includes('frame');
      
      const hasFrameInType = 
        product.productType?.toLowerCase().includes('frame');
      
      const hasFrameInSku = 
        product.sku?.toLowerCase().includes('fra-can') || // Framed canvas
        product.sku?.toLowerCase().includes('cfpm') ||    // Classic frame with mount
        product.sku?.toLowerCase().includes('global-fra');
      
      // Prodigi uses both 'frameColour' and 'color' attributes
      const hasFrameColor = 
        (product.frameColour && Array.isArray(product.frameColour) && product.frameColour.length > 0) ||
        (product.color && Array.isArray(product.color) && product.color.length > 0) ||
        (product.attributes?.color && Array.isArray(product.attributes.color) && product.attributes.color.length > 0);
      
      // Must have frame indicator AND color options
      const isFrame = (hasFrameInCategory || hasFrameInType || hasFrameInSku) && hasFrameColor;
      
      if (isFrame) {
        console.log(`✅ Identified frame product: ${product.sku}`, {
          hasFrameInCategory,
          hasFrameInType,
          hasFrameInSku,
          hasFrameColor
        });
      }

      return isFrame;
    });
  }

  /**
   * Map Prodigi product to our FrameCatalogOption format
   * @param product The Prodigi product
   * @param specificColor Optional specific color to use (when expanding products)
   */
  private mapProdigiToFrameOption(product: any, specificColor: string | null = null): FrameCatalogOption | null {
    try {
      // Extract frame attributes - Prodigi uses both 'frameColour' and 'color'
      const frameColor = specificColor || 
        product.frameColour?.[0] || 
        product.color?.[0] || 
        product.attributes?.color?.[0] || 
        'black';
      const sizeValue = product.size?.[0] || product.fullProductHorizontalDimensions + 'x' + product.fullProductVerticalDimensions;
      const wrapColor = product.wrap?.[0] || product.attributes?.wrap?.[0];
      const glaze = product.glaze?.[0] || product.attributes?.glaze?.[0];
      const mount = product.mount?.[0] || product.attributes?.mount?.[0];

      // Map size to our categories
      const mappedSize = this.mapSizeToCategory(
        product.fullProductHorizontalDimensions,
        product.fullProductVerticalDimensions,
        product.sizeUnits
      );

      // Calculate price (convert from base currency to USD)
      const priceInUSD = this.convertPrice(
        product.basePriceFrom,
        product.priceCurrency
      );

      return {
        sku: product.sku,
        size: mappedSize,
        sizeLabel: sizeValue,
        style: this.normalizeFrameColor(frameColor),
        material: this.extractMaterial(product),
        price: priceInUSD,
        currency: 'USD',
        dimensions: {
          width: product.fullProductHorizontalDimensions,
          height: product.fullProductVerticalDimensions,
          depth: product.productDepthMm ? product.productDepthMm / 10 : 3,
          unit: product.sizeUnits || 'cm'
        },
        category: product.category,
        productType: product.productType,
        wrapColor,
        glaze,
        mount,
        available: this.isProductAvailable(product)
      };
    } catch (error) {
      console.warn(`⚠️ Failed to map product ${product.sku}:`, error);
      return null;
    }
  }

  /**
   * Map product dimensions to our size categories
   */
  private mapSizeToCategory(
    width: number,
    height: number,
    unit: string
  ): 'small' | 'medium' | 'large' | 'extra_large' {
    // Debug log first few calls
    if (!this.sizeDebugCount || this.sizeDebugCount < 3) {
      console.log(`🔍 mapSizeToCategory: width=${width}, height=${height}, unit="${unit}"`);
      this.sizeDebugCount = (this.sizeDebugCount || 0) + 1;
    }

    // Convert to cm if needed
    let widthCm = width;
    let heightCm = height;
    
    if (unit === 'in') {
      widthCm = width * 2.54;
      heightCm = height * 2.54;
    } else if (unit === 'mm') {
      widthCm = width / 10;
      heightCm = height / 10;
    }

    // Calculate diagonal for size categorization
    const diagonal = Math.sqrt(widthCm * widthCm + heightCm * heightCm);

    // Debug log first few calculations
    if (this.sizeDebugCount <= 3) {
      console.log(`  ➡️ widthCm=${widthCm}, heightCm=${heightCm}, diagonal=${diagonal.toFixed(1)}cm`);
    }

    // Adjusted thresholds for more balanced distribution
    // Based on actual Prodigi catalog data analysis
    if (diagonal < 45) return 'small';        // < 45cm diagonal (~8x10", 10x12")
    if (diagonal < 70) return 'medium';       // 45-70cm diagonal (~12x16", 16x20")
    if (diagonal < 100) return 'large';       // 70-100cm diagonal (~20x30", 24x36")
    return 'extra_large';                      // > 100cm diagonal (30x40"+)
  }

  private sizeDebugCount = 0;

  /**
   * Normalize frame color names to match our standard colors
   * Now preserves brown and grey variants instead of mapping them away
   */
  private normalizeFrameColor(color: string): string {
    const colorMap: { [key: string]: string } = {
      // Black variants
      'black': 'black',
      'blk': 'black',
      
      // White variants
      'white': 'white',
      'wht': 'white',
      
      // Grey variants - now preserved!
      'grey': 'grey',
      'gray': 'grey',
      'light grey': 'grey',
      'light gray': 'grey',
      'dark grey': 'grey',
      'dark gray': 'grey',
      
      // Natural/wood variants
      'natural': 'natural',
      'nat': 'natural',
      'oak': 'natural',
      'walnut': 'natural',
      
      // Brown variants - now preserved!
      'brown': 'brown',
      'espresso': 'brown',
      
      // Gold variants
      'gold': 'gold',
      'gold fitting': 'gold',
      
      // Silver variants
      'silver': 'silver',
      'silver fitting': 'silver'
    };

    const normalized = color.toLowerCase().trim();
    return colorMap[normalized] || normalized;
  }

  /**
   * Extract material from product attributes
   * Enhanced to detect more material types from SKU patterns and product attributes
   */
  private extractMaterial(product: any): string {
    const sku = product.sku?.toLowerCase() || '';
    const productType = product.productType?.toLowerCase() || '';
    const paperType = product.paperType?.[0]?.toLowerCase() || '';
    const attributes = product.attributes?.material?.toLowerCase() || product.frame?.[0]?.toLowerCase() || '';
    
    // Debug: Log first few products to see what material data exists
    if (this.materialDebugCount < 3) {
      console.log('🔍 Material extraction debug:', {
        sku: product.sku,
        productType: product.productType,
        paperType: product.paperType,
        frame: product.frame,
        'attributes.material': product.attributes?.material,
        'attributes.finish': product.attributes?.finish,
        allAttributes: product.attributes
      });
      this.materialDebugCount++;
    }
    
    // Check for canvas (highest priority for canvas frames)
    if (sku.includes('fra-can') || 
        sku.includes('slimcan') || 
        productType.includes('canvas') || 
        paperType.includes('canvas')) {
      return 'canvas';
    }
    
    // Check for metal frames
    if (productType.includes('metal') || 
        attributes.includes('metal') ||
        sku.includes('metal')) {
      return 'metal';
    }
    
    // Check for acrylic
    if (productType.includes('acrylic') || 
        attributes.includes('acrylic') ||
        sku.includes('acry')) {
      return 'acrylic';
    }
    
    // Check for bamboo
    if (productType.includes('bamboo') || 
        attributes.includes('bamboo') ||
        sku.includes('bamboo') ||
        sku.includes('bap')) {
      return 'bamboo';
    }
    
    // Check for plastic
    if (productType.includes('plastic') || 
        attributes.includes('plastic')) {
      return 'plastic';
    }
    
    // Default to wood for all frame products
    return 'wood';
  }
  
  private materialDebugCount = 0;

  /**
   * Convert price from base currency to USD
   */
  private convertPrice(basePrice: number, currency: string): number {
    // Base price is typically in smallest currency unit (pence, cents)
    const priceInMajorUnit = basePrice / 100;

    // Simple currency conversion (in production, use real exchange rates)
    const conversionRates: { [key: string]: number } = {
      'GBP': 1.27,
      'EUR': 1.09,
      'USD': 1.00,
      'CAD': 0.74,
      'AUD': 0.66
    };

    const rate = conversionRates[currency] || 1.0;
    const priceInUSD = priceInMajorUnit * rate;

    // Add 50% markup for retail price
    return Math.round(priceInUSD * 1.5 * 100) / 100;
  }

  /**
   * Check if product is available for ordering
   */
  private isProductAvailable(product: any): boolean {
    // Check if product is available in US
    const availableInUS = product.destinationCountries?.includes('US');
    
    // Check if product has required attributes - Prodigi uses both 'frameColour' and 'color'
    const hasFrameColor = 
      (product.frameColour?.length > 0) ||
      (product.color?.length > 0) ||
      (product.attributes?.color?.length > 0);
    const hasSize = product.size?.length > 0 || 
                    (product.fullProductHorizontalDimensions && product.fullProductVerticalDimensions);
    
    return availableInUS && hasFrameColor && hasSize;
  }

  /**
   * Sort sizes in logical order
   */
  private sortSizes(a: string, b: string): number {
    const order = ['small', 'medium', 'large', 'extra_large'];
    return order.indexOf(a) - order.indexOf(b);
  }

  /**
   * Check if cache is still valid
   */
  private isCacheValid(): boolean {
    return Date.now() - this.cacheTimestamp < this.CACHE_DURATION;
  }

  /**
   * Fallback options if API is unavailable
   */
  private getFallbackOptions(): FrameCatalogOption[] {
    return [
      {
        sku: 'GLOBAL-FRA-CAN-20X25-BLK',
        size: 'small',
        sizeLabel: '20x25cm',
        style: 'black',
        material: 'canvas',
        price: 29.99,
        currency: 'USD',
        dimensions: { width: 20, height: 25, depth: 2, unit: 'cm' },
        category: 'Wall art',
        productType: 'Framed canvas',
        available: true
      },
      {
        sku: 'GLOBAL-FRA-CAN-30X40-BLK',
        size: 'medium',
        sizeLabel: '30x40cm',
        style: 'black',
        material: 'canvas',
        price: 39.99,
        currency: 'USD',
        dimensions: { width: 30, height: 40, depth: 2, unit: 'cm' },
        category: 'Wall art',
        productType: 'Framed canvas',
        available: true
      },
      {
        sku: 'GLOBAL-FRA-CAN-40X50-BLK',
        size: 'large',
        sizeLabel: '40x50cm',
        style: 'black',
        material: 'canvas',
        price: 59.99,
        currency: 'USD',
        dimensions: { width: 40, height: 50, depth: 3, unit: 'cm' },
        category: 'Wall art',
        productType: 'Framed canvas',
        available: true
      },
      {
        sku: 'GLOBAL-FRA-CAN-50X70-BLK',
        size: 'extra_large',
        sizeLabel: '50x70cm',
        style: 'black',
        material: 'canvas',
        price: 89.99,
        currency: 'USD',
        dimensions: { width: 50, height: 70, depth: 3, unit: 'cm' },
        category: 'Wall art',
        productType: 'Framed canvas',
        available: true
      }
    ];
  }
}

// Export singleton instance
export const prodigiFrameCatalog = new ProdigiFrameCatalog();

