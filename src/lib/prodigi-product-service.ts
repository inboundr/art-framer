import { ProdigiClient } from './prodigi';

export interface ProductSearchCriteria {
  category?: string;
  size?: string;
  material?: string;
  finish?: string;
  priceMin?: number;
  priceMax?: number;
}

export interface ProductServiceResponse {
  success: boolean;
  products: any[];
  count: number;
  fallback: boolean;
  error?: string;
}

export class ProdigiProductService {
  private prodigiClient: ProdigiClient;
  private cache: Map<string, any> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_DURATION = 60 * 60 * 1000; // 1 hour

  constructor() {
    const apiKey = process.env.PRODIGI_API_KEY;
    const environment = (process.env.PRODIGI_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox';
    
    if (!apiKey || apiKey === 'your_prodigi_api_key_here' || apiKey === 'your-prodigi-api-key-here') {
      console.warn('⚠️ Prodigi API key not configured, using fallback mode');
    }
    
    this.prodigiClient = new ProdigiClient(apiKey || '', environment);
  }

  /**
   * Get all available products
   */
  async getAllProducts(category?: string): Promise<ProductServiceResponse> {
    const cacheKey = `all_products_${category || 'all'}`;
    
    if (this.isCacheValid(cacheKey)) {
      console.log('📦 Using cached products');
      return this.cache.get(cacheKey);
    }

    try {
      const products = await this.prodigiClient.getAllProducts(category);
      
      const response: ProductServiceResponse = {
        success: true,
        products,
        count: products.length,
        fallback: false
      };

      this.setCache(cacheKey, response);
      return response;
    } catch (error) {
      console.error('Error fetching products:', error);
      return this.getFallbackResponse();
    }
  }

  /**
   * Search products by criteria
   */
  async searchProducts(criteria: ProductSearchCriteria): Promise<ProductServiceResponse> {
    const cacheKey = `search_${JSON.stringify(criteria)}`;
    
    if (this.isCacheValid(cacheKey)) {
      console.log('📦 Using cached search results');
      return this.cache.get(cacheKey);
    }

    try {
      const products = await this.prodigiClient.searchProducts(criteria);
      
      const response: ProductServiceResponse = {
        success: true,
        products,
        count: products.length,
        fallback: false
      };

      this.setCache(cacheKey, response);
      return response;
    } catch (error) {
      console.error('Error searching products:', error);
      return this.getFallbackResponse();
    }
  }

  /**
   * Get products by category
   */
  async getProductsByCategory(category: string): Promise<ProductServiceResponse> {
    return this.getAllProducts(category);
  }

  /**
   * Get product details by SKU
   */
  async getProductDetails(sku: string): Promise<any> {
    try {
      return await this.prodigiClient.getProductDetails(sku);
    } catch (error) {
      console.error(`Error fetching product ${sku}:`, error);
      return this.getFallbackProduct(sku);
    }
  }

  /**
   * Find best matching product for frame specifications
   */
  async findBestProduct(frameSize: string, frameStyle: string, frameMaterial: string): Promise<string> {
    try {
      return await this.prodigiClient.getProductSku(frameSize, frameStyle, frameMaterial);
    } catch (error) {
      console.error('Error finding best product:', error);
      return this.getFallbackSku(frameSize);
    }
  }

  /**
   * Get available categories
   */
  async getCategories(): Promise<string[]> {
    try {
      const products = await this.prodigiClient.getAllProducts();
      const categories = [...new Set(products.map(p => p.category))];
      return categories.filter(Boolean);
    } catch (error) {
      console.error('Error fetching categories:', error);
      return ['canvas', 'framed', 'prints', 'posters'];
    }
  }

  /**
   * Get available sizes
   */
  async getSizes(): Promise<string[]> {
    try {
      const products = await this.prodigiClient.getAllProducts();
      const sizes = [...new Set(products.map(p => p.attributes.size))];
      return sizes.filter((size): size is string => Boolean(size));
    } catch (error) {
      console.error('Error fetching sizes:', error);
      return ['10x10', '16x20', '16x24', '30x40'];
    }
  }

  /**
   * Get available materials
   */
  async getMaterials(): Promise<string[]> {
    try {
      const products = await this.prodigiClient.getAllProducts();
      const materials = [...new Set(products.map(p => p.attributes.material))];
      return materials.filter((material): material is string => Boolean(material));
    } catch (error) {
      console.error('Error fetching materials:', error);
      return ['canvas', 'wood', 'metal', 'paper'];
    }
  }

  /**
   * Get available finishes
   */
  async getFinishes(): Promise<string[]> {
    try {
      const products = await this.prodigiClient.getAllProducts();
      const finishes = [...new Set(products.map(p => p.attributes.finish))];
      return finishes.filter((finish): finish is string => Boolean(finish));
    } catch (error) {
      console.error('Error fetching finishes:', error);
      return ['matte', 'glossy', 'satin'];
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
    this.prodigiClient.clearCache();
    console.log('🗑️ Product service cache cleared');
  }

  private isCacheValid(key: string): boolean {
    const expiry = this.cacheExpiry.get(key);
    return expiry ? Date.now() < expiry : false;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, data);
    this.cacheExpiry.set(key, Date.now() + this.CACHE_DURATION);
  }

  getFallbackResponse(): ProductServiceResponse {
    return {
      success: true,
      products: this.getFallbackProducts(),
      count: 4,
      fallback: true,
      error: 'Prodigi API unavailable'
    };
  }

  private getFallbackProducts() {
    return [
      {
        sku: 'GLOBAL-CAN-10x10',
        name: 'Canvas Print 10x10',
        description: 'Gallery-quality canvas print',
        price: 29.99,
        currency: 'USD',
        dimensions: { width: 10, height: 10, depth: 1 },
        weight: 400,
        category: 'canvas',
        attributes: { size: '10x10', material: 'canvas', finish: 'matte' },
        images: []
      },
      {
        sku: 'GLOBAL-CFPM-16X20',
        name: 'Canvas Print 16x20',
        description: 'Gallery-quality canvas print',
        price: 39.99,
        currency: 'USD',
        dimensions: { width: 16, height: 20, depth: 1 },
        weight: 600,
        category: 'canvas',
        attributes: { size: '16x20', material: 'canvas', finish: 'matte' },
        images: []
      },
      {
        sku: 'GLOBAL-FAP-16X24',
        name: 'Framed Art Print 16x24',
        description: 'Framed art print with premium frame',
        price: 49.99,
        currency: 'USD',
        dimensions: { width: 16, height: 24, depth: 2 },
        weight: 800,
        category: 'framed',
        attributes: { size: '16x24', material: 'wood', finish: 'black' },
        images: []
      },
      {
        sku: 'GLOBAL-FRA-CAN-30X40',
        name: 'Framed Canvas 30x40',
        description: 'Large framed canvas print',
        price: 89.99,
        currency: 'USD',
        dimensions: { width: 30, height: 40, depth: 3 },
        weight: 1200,
        category: 'framed',
        attributes: { size: '30x40', material: 'wood', finish: 'natural' },
        images: []
      }
    ];
  }

  private getFallbackProduct(sku: string): any {
    const fallbackProducts = this.getFallbackProducts();
    return fallbackProducts.find(p => p.sku === sku) || fallbackProducts[0];
  }

  private getFallbackSku(frameSize: string): string {
    const fallbackMap: Record<string, string> = {
      'small': 'GLOBAL-CAN-10x10',
      'medium': 'GLOBAL-CFPM-16X20',
      'large': 'GLOBAL-FAP-16X24',
      'extra_large': 'GLOBAL-FRA-CAN-30X40',
    };
    return fallbackMap[frameSize] || 'GLOBAL-CFPM-16X20';
  }
}
