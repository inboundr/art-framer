/**
 * Simplified Prodigi Client
 * 
 * This is a streamlined version of the Prodigi client that focuses on:
 * 1. Basic product fetching with proper response parsing
 * 2. Simple SKU validation
 * 3. Minimal complexity and better performance
 */

export interface ProdigiProduct {
  sku: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  dimensions: {
    width: number;
    height: number;
    depth?: number;
  };
  weight: number;
  category: string;
  attributes: {
    size?: string;
    material?: string;
    finish?: string;
  };
  images?: {
    url: string;
    type: 'preview' | 'thumbnail' | 'full';
    width: number;
    height: number;
  }[];
}

export class SimpleProdigiClient {
  private apiKey: string;
  private baseUrl: string;
  private environment: 'sandbox' | 'production';

  constructor(apiKey: string, environment: 'sandbox' | 'production' = 'sandbox') {
    this.apiKey = apiKey;
    this.environment = environment;
    this.baseUrl = environment === 'production' 
      ? 'https://api.prodigi.com/v4.0'
      : 'https://api.sandbox.prodigi.com/v4.0';
  }

  /**
   * Make a request to the Prodigi API
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Prodigi API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Get product details with proper response parsing
   */
  async getProductDetails(sku: string): Promise<ProdigiProduct> {
    try {
      const response = await this.request<any>(`/products/${sku}`);
      
      // Extract the actual product data from the nested response
      const productData = response?.product;
      if (!productData) {
        throw new Error(`No product data found in response for SKU: ${sku}`);
      }
      
      // Map the Prodigi API response to our ProdigiProduct interface
      const product: ProdigiProduct = {
        sku: productData.sku || sku,
        name: productData.name || `Product ${sku}`,
        description: productData.description || '',
        price: productData.price || 0,
        currency: productData.currency || 'USD',
        dimensions: productData.dimensions || { width: 0, height: 0 },
        weight: productData.weight || 0,
        category: productData.category || 'unknown',
        attributes: productData.attributes || {},
        images: productData.images || []
      };
      
      return product;
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        throw new Error(`Product not found: ${sku}`);
      }
      throw error;
    }
  }

  /**
   * Validate if a SKU exists in Prodigi
   */
  async validateSku(sku: string): Promise<boolean> {
    try {
      await this.getProductDetails(sku);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get a list of known working SKUs
   */
  getKnownWorkingSkus(): string[] {
    return [
      'GLOBAL-FAP-8X10',
      'GLOBAL-FAP-11X14', 
      'GLOBAL-FAP-16X24',
      'GLOBAL-CAN-10x10',
      'GLOBAL-CFPM-16X20',
      'GLOBAL-FRA-CAN-30X40'
    ];
  }

  /**
   * Get the best SKU for a given frame specification
   */
  getBestSkuForFrame(frameSize: string, frameStyle: string, frameMaterial: string): string {
    // V2 sizing: Map actual sizes (e.g., "8x10", "16x20") to known SKUs
    // Legacy compatibility: Still handles old enum values during migration
    
    let candidates: string[] = [];
    
    // If in v2 format (e.g., "8x10"), map directly
    if (/^\d+x\d+$/.test(frameSize)) {
      const sizeMapping: Record<string, string[]> = {
        '8x10': ['GLOBAL-FAP-8X10', 'GLOBAL-CAN-10x10'],
        '11x14': ['GLOBAL-FAP-11X14'],
        '12x16': ['GLOBAL-CAN-12X16'],
        '16x20': ['GLOBAL-FAP-16X20', 'GLOBAL-CFPM-16X20'],
        '20x24': ['GLOBAL-FAP-20X24'],
        '24x30': ['GLOBAL-FAP-24X30'],
        '30x40': ['GLOBAL-FRA-CAN-30X40', 'GLOBAL-FAP-30X40'],
      };
      candidates = sizeMapping[frameSize] || sizeMapping['16x20'];
    } else {
      // Legacy compatibility: Map old enum values
      const legacySizeMap: Record<string, string[]> = {
        'small': ['GLOBAL-FAP-8X10', 'GLOBAL-CAN-10x10'],
        'medium': ['GLOBAL-FAP-11X14', 'GLOBAL-CFPM-16X20'],
        'large': ['GLOBAL-FAP-16X24', 'GLOBAL-CFPM-16X20'],
        'extra_large': ['GLOBAL-FRA-CAN-30X40']
      };
      candidates = legacySizeMap[frameSize] || legacySizeMap['medium'];
    }

    return candidates[0]; // Return the first (best) candidate
  }

  /**
   * Calculate shipping cost
   */
  async calculateShippingCost(
    items: Array<{ sku: string; copies: number }>,
    destinationCountryCode: string,
    shippingMethod: string = 'Standard'
  ): Promise<{
    cost: number;
    currency: string;
    estimatedDays: number;
    service: string;
  }> {
    const requestBody = {
      shippingMethod,
      destinationCountryCode,
      items: items.map(item => ({
        sku: item.sku,
        copies: item.copies,
        attributes: {},
        assets: [{ printArea: 'default' }]
      }))
    };

    const response = await this.request<any>('/quotes', {
      method: 'POST',
      body: JSON.stringify(requestBody)
    });

    // Extract shipping information from the response
    const quote = response?.quotes?.[0];
    if (!quote) {
      throw new Error('No shipping quote available');
    }

    return {
      cost: quote.cost?.amount || 0,
      currency: quote.cost?.currency || 'USD',
      estimatedDays: quote.estimatedDays || 0,
      service: quote.service || 'Standard'
    };
  }
}

// Export a singleton instance
export const simpleProdigiClient = new SimpleProdigiClient(
  process.env.PRODIGI_API_KEY || '',
  (process.env.NODE_ENV === 'production' ? 'production' : 'sandbox') as 'sandbox' | 'production'
);
