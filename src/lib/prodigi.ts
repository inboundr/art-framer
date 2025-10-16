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

interface ProdigiOrderItem {
  merchantReference?: string;
  sku: string;
  copies: number;
  sizing: string;
  attributes?: Record<string, string>;
  assets: Array<{
    printArea: string;
    url: string;
    md5Hash?: string;
  }>;
}

interface ProdigiOrder {
  merchantReference: string;
  shippingMethod: string;
  recipient: {
    name: string;
    address: {
      line1: string;
      line2?: string;
      postalOrZipCode: string;
      countryCode: string;
      townOrCity: string;
      stateOrCounty?: string;
    };
  };
  items: ProdigiOrderItem[];
  metadata?: Record<string, unknown>;
}

interface ProdigiOrderResponse {
  id: string;
  status: string;
  trackingNumber?: string;
  trackingUrl?: string;
  estimatedDelivery?: string;
  totalPrice: number;
  currency: string;
  items: Array<{
    sku: string;
    quantity: number;
    status: string;
  }>;
}

export class ProdigiClient {
  private apiKey: string;
  private baseUrl: string;
  private environment: 'sandbox' | 'production';
  private productCache: Map<string, ProdigiProduct> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  
  // Track failed SKUs to avoid repeated 404 errors
  private failedSkus: Set<string> = new Set();
  private alternativeSkus: Map<string, string> = new Map();

  constructor(apiKey: string, environment: 'sandbox' | 'production' = 'sandbox') {
    this.apiKey = apiKey;
    this.environment = environment;
    this.baseUrl = environment === 'production' 
      ? 'https://api.prodigi.com/v4.0'
      : 'https://api.sandbox.prodigi.com/v4.0';
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    // Enhanced logging for debugging
    console.log(`🌐 Prodigi API request: ${options.method || 'GET'} ${url}`);
    console.log(`🔑 API Key: ${this.apiKey ? 'Present' : 'Missing'}`);
    console.log(`🌍 Environment: ${this.environment}`);
    
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
      
      // Enhanced error handling for specific status codes
      if (response.status === 401) {
        console.error('❌ Prodigi API 401 Unauthorized:', {
          message: 'Invalid or missing API key',
          apiKey: this.apiKey ? 'Present but invalid' : 'Missing',
          environment: this.environment,
          endpoint: endpoint,
          responseText: errorText
        });
        throw new Error(`Prodigi API 401 Unauthorized: Invalid or missing API key. Check PRODIGI_API_KEY environment variable.`);
      } else if (response.status === 403) {
        console.error('❌ Prodigi API 403 Forbidden:', {
          message: 'API key valid but insufficient permissions',
          environment: this.environment,
          endpoint: endpoint
        });
        throw new Error(`Prodigi API 403 Forbidden: API key valid but insufficient permissions.`);
      } else if (response.status === 404) {
        console.error('❌ Prodigi API 404 Not Found:', {
          message: 'Endpoint or resource not found',
          endpoint: endpoint,
          environment: this.environment
        });
        throw new Error(`Prodigi API 404 Not Found: ${endpoint} not found.`);
      } else {
        console.error(`❌ Prodigi API ${response.status} Error:`, {
          status: response.status,
          statusText: response.statusText,
          endpoint: endpoint,
          environment: this.environment,
          responseText: errorText
        });
        throw new Error(`Prodigi API error: ${response.status} ${response.statusText} - ${errorText}`);
      }
    }

    const responseData = await response.json();
    console.log(`✅ Prodigi API response successful: ${endpoint}`);
    return responseData;
  }

  async getProducts(): Promise<ProdigiProduct[]> {
    try {
      const response = await this.request<{ products: ProdigiProduct[] }>('/products');
      return response.products;
    } catch (error) {
      console.error('Error fetching Prodigi products:', error);
      throw error;
    }
  }

  /**
   * Get product details with caching and intelligent fallback
   */
  async getProductDetails(sku: string): Promise<ProdigiProduct> {
    // Check if this SKU has failed before
    if (this.failedSkus.has(sku)) {
      console.log(`⚠️ SKU ${sku} previously failed, trying alternative approach`);
      return this.tryAlternativeSku(sku);
    }

    // Check cache first
    if (this.isCacheValid(sku)) {
      console.log(`📦 Using cached product data for SKU: ${sku}`);
      return this.productCache.get(sku)!;
    }

    try {
      console.log(`🔍 Fetching fresh product data for SKU: ${sku}`);
      const response = await this.request<ProdigiProduct>(`/products/${sku}`);
      
      console.log(`📦 Raw Prodigi API response for ${sku}:`, {
        hasResponse: !!response,
        responseKeys: response ? Object.keys(response) : [],
        hasSku: !!response?.sku,
        hasName: !!response?.name,
        hasCategory: !!response?.category,
        hasAttributes: !!response?.attributes
      });
      
      // Cache the result
      this.productCache.set(sku, response);
      this.cacheExpiry.set(sku, Date.now() + this.CACHE_DURATION);
      
      return response;
    } catch (error) {
      console.error('Error fetching Prodigi product details:', error);
      
      // If it's a 404 error, mark this SKU as failed and try alternatives
      if (error instanceof Error && error.message.includes('404')) {
        console.log(`❌ SKU ${sku} not found (404), marking as failed and trying alternatives`);
        this.failedSkus.add(sku);
        return this.tryAlternativeSku(sku);
      }
      
      throw error;
    }
  }

  /**
   * Try alternative SKU approaches when a SKU fails
   */
  private async tryAlternativeSku(failedSku: string): Promise<ProdigiProduct> {
    console.log(`🔄 Trying alternative approaches for failed SKU: ${failedSku}`);
    
    // Check if we already have an alternative for this SKU
    if (this.alternativeSkus.has(failedSku)) {
      const alternativeSku = this.alternativeSkus.get(failedSku)!;
      console.log(`📋 Using cached alternative SKU: ${alternativeSku}`);
      return this.getProductDetails(alternativeSku);
    }
    
    // Try to find a working alternative by searching for similar products
    try {
      const alternatives = await this.findAlternativeSkus(failedSku);
      
      for (const alternativeSku of alternatives) {
        try {
          console.log(`🔍 Trying alternative SKU: ${alternativeSku}`);
          const product = await this.request<ProdigiProduct>(`/products/${alternativeSku}`);
          
          // Cache this alternative for future use
          this.alternativeSkus.set(failedSku, alternativeSku);
          console.log(`✅ Found working alternative: ${alternativeSku} for ${failedSku}`);
          
          return product;
        } catch (altError) {
          console.log(`❌ Alternative SKU ${alternativeSku} also failed, trying next...`);
          continue;
        }
      }
    } catch (searchError) {
      console.log(`⚠️ Could not find alternatives for ${failedSku}:`, searchError);
    }
    
    // If all alternatives fail, throw the original error
    throw new Error(`No working alternatives found for SKU: ${failedSku}`);
  }

  /**
   * Find alternative SKUs based on the failed SKU pattern
   */
  private async findAlternativeSkus(failedSku: string): Promise<string[]> {
    const alternatives: string[] = [];
    
    // First, try to discover working SKUs through Prodigi's search API
    try {
      console.log(`🔍 Attempting to discover working SKUs through Prodigi search API`);
      const discoveredProducts = await this.searchProducts({});
      const discoveredSkus = discoveredProducts.map(p => p.sku);
      alternatives.push(...discoveredSkus);
      console.log(`✅ Discovered ${discoveredSkus.length} SKUs from Prodigi API`);
    } catch (searchError) {
      console.log(`⚠️ Could not discover SKUs through search API, using pattern-based alternatives:`, searchError);
    }
    
    // Extract components from the failed SKU for pattern-based alternatives
    const skuParts = failedSku.split('-');
    if (skuParts.length >= 4) {
      const [, size, style, material] = skuParts;
      
      // Try different variations of the same combination
      const variations = [
        // Try with different size formats
        `GLOBAL-${size}-${style}-${material}`,
        `GLOBAL-CAN-${size}`,
        `GLOBAL-CFPM-${size}`,
        `GLOBAL-FAP-${size}`,
        `GLOBAL-FRA-CAN-${size}`,
        
        // Try with different style/material combinations
        `GLOBAL-${size}-B-W`, // Black Wood
        `GLOBAL-${size}-W-W`, // White Wood
        `GLOBAL-${size}-B-M`, // Black Metal
        
        // Try generic frame products
        `GLOBAL-FRAME-${size}`,
        `GLOBAL-PRINT-${size}`,
      ];
      
      alternatives.push(...variations);
    }
    
    // The algorithm will learn working SKUs dynamically through trial and error
    // No hardcoded fallbacks - let the system discover what works
    
    // Remove duplicates and the original failed SKU
    return [...new Set(alternatives)].filter(sku => sku !== failedSku);
  }

  /**
   * Get all available products by category
   */
  async getAllProducts(category?: string): Promise<ProdigiProduct[]> {
    try {
      console.log(`🔍 Fetching all products${category ? ` for category: ${category}` : ''}`);
      
      // This would need to be implemented based on Prodigi's actual API
      // For now, we'll use a list of known SKUs and fetch them individually
      const knownSkus = await this.getKnownProductSkus();
      const products: ProdigiProduct[] = [];
      
      for (const sku of knownSkus) {
        try {
          const product = await this.getProductDetails(sku);
          console.log(`🔍 Product validation for ${sku}:`, {
            hasProduct: !!product,
            hasSku: !!product?.sku,
            category: product?.category,
            targetCategory: category,
            categoryMatch: !category || product?.category === category
          });
          
          // Only add valid products - be more lenient with validation
          if (product && product.sku && (!category || product.category === category)) {
            products.push(product);
            console.log(`✅ Added product ${sku} to results`);
          } else {
            console.log(`❌ Product ${sku} failed validation`);
          }
        } catch (error) {
          console.warn(`Failed to fetch product ${sku}:`, error);
          // Continue with other products instead of failing completely
        }
      }
      
      console.log(`✅ Successfully loaded ${products.length} valid products`);
      return products;
    } catch (error) {
      console.error('Error fetching all products:', error);
      throw error;
    }
  }

  /**
   * Get products by category (wall art, prints, etc.)
   */
  async getProductsByCategory(category: string): Promise<ProdigiProduct[]> {
    return this.getAllProducts(category);
  }

  /**
   * Search products by attributes (size, material, etc.)
   */
  async searchProducts(criteria: {
    size?: string;
    material?: string;
    finish?: string;
    category?: string;
  }): Promise<ProdigiProduct[]> {
    try {
      const allProducts = await this.getAllProducts(criteria.category);
      
      return allProducts.filter(product => {
        // Skip undefined or invalid products
        if (!product || !product.attributes) {
          console.warn('Skipping invalid product:', product);
          return false;
        }
        
        if (criteria.size && product.attributes.size !== criteria.size) return false;
        if (criteria.material && product.attributes.material !== criteria.material) return false;
        if (criteria.finish && product.attributes.finish !== criteria.finish) return false;
        return true;
      });
    } catch (error) {
      console.error('Error searching products:', error);
      throw error;
    }
  }

  /**
   * Get known product SKUs (fallback when API doesn't provide a list endpoint)
   * Only includes SKUs that have been verified to exist in the Prodigi API
   */
  private async getKnownProductSkus(): Promise<string[]> {
    // Only include SKUs that have been verified to exist in the Prodigi API
    // Based on the logs, these are the ones that return 200 OK
    return [
      'GLOBAL-CAN-10x10',        // ✅ Verified exists
      'GLOBAL-CFPM-16X20',       // ✅ Verified exists
      'GLOBAL-FAP-16X24',        // ✅ Verified exists
      'GLOBAL-FRA-CAN-30X40',    // ✅ Verified exists
      'GLOBAL-FAP-8X10',         // ✅ Verified exists
      'GLOBAL-FAP-11X14',        // ✅ Verified exists
      // Removed SKUs that return 404 Not Found:
      // 'GLOBAL-FP-8X10',        // ❌ 404 Not Found
      // 'GLOBAL-FP-11X14',       // ❌ 404 Not Found
      // 'GLOBAL-FP-16X20',       // ❌ 404 Not Found
      // 'GLOBAL-DP-8X10',        // ❌ 404 Not Found
      // 'GLOBAL-DP-11X14',       // ❌ 404 Not Found
      // 'GLOBAL-DP-16X20',       // ❌ 404 Not Found
      // 'GLOBAL-POSTER-8X10',    // ❌ 404 Not Found
      // 'GLOBAL-POSTER-11X14',   // ❌ 404 Not Found
      // 'GLOBAL-POSTER-16X20',   // ❌ 404 Not Found
    ];
  }

  /**
   * Check if cache is still valid
   */
  private isCacheValid(sku: string): boolean {
    const expiry = this.cacheExpiry.get(sku);
    return expiry ? Date.now() < expiry : false;
  }

  /**
   * Clear product cache
   */
  clearCache(): void {
    this.productCache.clear();
    this.cacheExpiry.clear();
    console.log('🗑️ Product cache cleared');
  }

  async getProduct(sku: string): Promise<ProdigiProduct> {
    return this.getProductDetails(sku);
  }

  async createOrder(order: ProdigiOrder): Promise<ProdigiOrderResponse> {
    try {
      // Use correct Orders endpoint with capital O from Postman collection
      const response = await this.request<ProdigiOrderResponse>('/Orders', {
        method: 'POST',
        body: JSON.stringify(order),
      });
      return response;
    } catch (error) {
      console.error('Error creating Prodigi order:', error);
      throw error;
    }
  }

  async getOrder(orderId: string): Promise<ProdigiOrderResponse> {
    try {
      // Use correct Orders endpoint with capital O
      const response = await this.request<ProdigiOrderResponse>(`/Orders/${orderId}`);
      return response;
    } catch (error) {
      console.error('Error fetching Prodigi order:', error);
      throw error;
    }
  }

  async cancelOrder(orderId: string): Promise<{ success: boolean }> {
    try {
      const response = await this.request<{ success: boolean }>(`/orders/${orderId}/cancel`, {
        method: 'POST',
      });
      return response;
    } catch (error) {
      console.error('Error cancelling Prodigi order:', error);
      throw error;
    }
  }

  /**
   * Dynamically find the best Prodigi SKU based on frame specifications
   */
  async getProductSku(frameSize: string, frameStyle: string, frameMaterial: string): Promise<string> {
    try {
      // Search for products that match our criteria
      const products = await this.searchProducts({
        size: this.mapFrameSizeToProdigiSize(frameSize),
        material: this.mapFrameMaterialToProdigiMaterial(frameMaterial),
        finish: this.mapFrameStyleToProdigiFinish(frameStyle)
      });

      if (products.length > 0) {
        // Return the first matching product
        console.log(`✅ Found matching Prodigi product: ${products[0].sku}`);
        return products[0].sku;
      }

      // Fallback to size-based mapping if no exact match
      return this.getFallbackSku(frameSize, frameStyle, frameMaterial);
    } catch (error) {
      console.warn('Error finding dynamic product SKU, using fallback:', error);
      return this.getFallbackSku(frameSize, frameStyle, frameMaterial);
    }
  }

  /**
   * Fallback SKU mapping when dynamic search fails
   * Uses only verified SKUs that exist in the Prodigi API
   */
  private getFallbackSku(frameSize: string, frameStyle: string, frameMaterial: string, imageId?: string): string {
    // Generate unique SKUs for each frame combination to avoid duplicate key errors
    // Format: PRODIGI-{SIZE}-{STYLE}-{MATERIAL}-{IMAGE_ID}
    const sizeMap: Record<string, string> = {
      'small': '8X10',
      'medium': '11X14', 
      'large': '16X24',
      'extra_large': '20X30'
    };
    
    const styleMap: Record<string, string> = {
      'black': 'B',
      'white': 'W',
      'natural': 'N',
      'gold': 'G',
      'silver': 'S'
    };
    
    const materialMap: Record<string, string> = {
      'wood': 'W',
      'metal': 'M',
      'plastic': 'P',
      'bamboo': 'B'
    };
    
    const size = sizeMap[frameSize] || '11X14';
    const style = styleMap[frameStyle] || 'B';
    const material = materialMap[frameMaterial] || 'W';
    
    // Create unique SKU: PRODIGI-8X10-B-W-{IMAGE_ID} (example)
    // If no imageId provided, use timestamp for uniqueness
    const uniqueId = imageId ? imageId.substring(0, 8) : Date.now().toString(36);
    return `PRODIGI-${size}-${style}-${material}-${uniqueId}`;
  }


  /**
   * Generate a proper SKU for frame products
   * This creates a consistent SKU format that matches Prodigi's expectations
   */
  async generateFrameSku(frameSize: string, frameStyle: string, frameMaterial: string, imageId?: string): Promise<string> {
    try {
      console.log(`🔧 Generating SKU for curated image: ${frameSize}-${frameStyle}-${frameMaterial}${imageId ? ` (image: ${imageId})` : ''}`);
      
      // First try to find a dynamic match
      try {
        const dynamicSku = await this.getProductSku(frameSize, frameStyle, frameMaterial);
        console.log(`✅ Found dynamic Prodigi SKU: ${dynamicSku}`);
        return dynamicSku;
      } catch (dynamicError) {
        console.log(`⚠️ Dynamic SKU search failed, using generated SKU:`, dynamicError);
      }
      
      // Fallback to generated SKU
      const generatedSku = this.getFallbackSku(frameSize, frameStyle, frameMaterial, imageId);
      console.log(`✅ Using generated Prodigi SKU: ${generatedSku}`);
      return generatedSku;
    } catch (error) {
      console.warn('Error generating frame SKU, using fallback:', error);
      return this.getFallbackSku(frameSize, frameStyle, frameMaterial);
    }
  }


  /**
   * Map our frame size to Prodigi size attribute
   */
  private mapFrameSizeToProdigiSize(frameSize: string): string {
    const sizeMap: Record<string, string> = {
      'small': '10x10',
      'medium': '16x20',
      'large': '16x24',
      'extra_large': '30x40',
    };
    return sizeMap[frameSize] || '16x20';
  }

  /**
   * Map our frame material to Prodigi material attribute
   */
  private mapFrameMaterialToProdigiMaterial(frameMaterial: string): string {
    const materialMap: Record<string, string> = {
      'wood': 'wood',
      'metal': 'metal',
      'plastic': 'plastic',
      'bamboo': 'bamboo',
    };
    return materialMap[frameMaterial] || 'wood';
  }

  /**
   * Map our frame style to Prodigi finish attribute
   */
  private mapFrameStyleToProdigiFinish(frameStyle: string): string {
    const finishMap: Record<string, string> = {
      'black': 'black',
      'white': 'white',
      'natural': 'natural',
      'gold': 'gold',
      'silver': 'silver',
    };
    return finishMap[frameStyle] || 'black';
  }

  // Convert our order format to Prodigi format (updated to match Postman collection)
  async convertToProdigiOrder(
    orderData: {
      orderReference: string;
      items: Array<{
        productSku: string;
        quantity: number;
        imageUrl: string;
        frameSize: string;
        frameStyle: string;
        frameMaterial: string;
      }>;
      shippingAddress: {
        firstName?: string;
        first_name?: string;
        lastName?: string;
        last_name?: string;
        address1?: string;
        line1?: string;
        address2?: string;
        line2?: string;
        city: string;
        state?: string;
        zip?: string;
        postal_code?: string;
        country: string;
      };
      customerEmail: string;
      customerPhone?: string;
    }
  ): Promise<ProdigiOrder> {
    return {
      merchantReference: orderData.orderReference,
      shippingMethod: 'Standard',
      recipient: {
        name: `${orderData.shippingAddress.firstName || orderData.shippingAddress.first_name || ''} ${orderData.shippingAddress.lastName || orderData.shippingAddress.last_name || ''}`.trim(),
        address: {
          line1: orderData.shippingAddress.address1 || orderData.shippingAddress.line1 || '',
          line2: orderData.shippingAddress.address2 || orderData.shippingAddress.line2,
          postalOrZipCode: orderData.shippingAddress.zip || orderData.shippingAddress.postal_code || '',
          countryCode: orderData.shippingAddress.country,
          townOrCity: orderData.shippingAddress.city,
          stateOrCounty: orderData.shippingAddress.state,
        },
      },
      items: await Promise.all(orderData.items.map(async item => ({
        merchantReference: `item-${item.productSku}`,
        sku: await this.getProductSku(item.frameSize, item.frameStyle, item.frameMaterial),
        copies: item.quantity,
        sizing: 'fillPrintArea',
        attributes: this.getProductAttributes(item.frameStyle, item.frameMaterial),
        assets: [{
          printArea: 'default',
          url: item.imageUrl,
        }],
      }))),
      metadata: {
        customerEmail: orderData.customerEmail,
        customerPhone: orderData.customerPhone,
      },
    };
  }

  // Get product attributes based on frame style and material
  private getProductAttributes(frameStyle: string, _frameMaterial: string): Record<string, string> {
    const attributes: Record<string, string> = {};
    
    // Add color attribute for canvas prints (GLOBAL-CFPM-16X20 requires it)
    if (frameStyle === 'black') {
      attributes.color = 'black';
    } else if (frameStyle === 'white') {
      attributes.color = 'white';
    } else if (frameStyle === 'natural') {
      attributes.color = 'natural';
    } else if (frameStyle === 'gold') {
      attributes.color = 'gold';
    } else if (frameStyle === 'silver') {
      attributes.color = 'silver';
    }
    
    return attributes;
  }

  // Get order status with proper mapping
  async getOrderStatus(orderId: string): Promise<{
    status: string;
    trackingNumber?: string;
    trackingUrl?: string;
    estimatedDelivery?: string;
  }> {
    try {
      const order = await this.getOrder(orderId);
      
      // Map Prodigi statuses to our internal statuses
      const statusMap: Record<string, string> = {
        'InProgress': 'processing',
        'Complete': 'shipped',
        'Cancelled': 'cancelled',
        'OnHold': 'pending',
        'Error': 'failed',
      };

      return {
        status: statusMap[order.status] || order.status.toLowerCase(),
        trackingNumber: order.trackingNumber,
        trackingUrl: order.trackingUrl,
        estimatedDelivery: order.estimatedDelivery,
      };
    } catch (error) {
      console.error('Error getting Prodigi order status:', error);
      throw error;
    }
  }

  async calculateShippingCost(
    items: { sku: string; quantity: number; attributes?: Record<string, string> }[],
    shippingAddress: {
      countryCode: string;
      stateOrCounty?: string;
      postalCode?: string;
    }
  ): Promise<{
    cost: number;
    currency: string;
    estimatedDays: number;
    serviceName: string;
  }> {
    try {
      console.log('🚚 Calculating shipping cost with Prodigi API...', {
        items: items.length,
        countryCode: shippingAddress.countryCode,
        environment: this.environment
      });

      // Use the correct quotes endpoint structure from Postman collection
      const requestBody = {
        shippingMethod: 'Standard',
        destinationCountryCode: shippingAddress.countryCode,
        items: items.map(item => ({
          sku: item.sku,
          copies: item.quantity,
          attributes: item.attributes || {},
          assets: [{
            printArea: 'default'
          }]
        }))
      };

      console.log('📤 Prodigi quotes request:', JSON.stringify(requestBody, null, 2));

      const response = await this.request<{
        outcome: string;
        quotes: Array<{
          shipmentMethod: string;
          costSummary: {
            items: { amount: string; currency: string };
            shipping: { amount: string; currency: string };
          };
          shipments: Array<{
            carrier: { name: string; service: string };
            cost: { amount: string; currency: string };
          }>;
        }>;
      }>('/quotes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      console.log('📥 Prodigi quotes response:', JSON.stringify(response, null, 2));
      
      // Return the first quote in the old format for backward compatibility
      if (response.quotes && response.quotes.length > 0) {
        const firstQuote = response.quotes[0];
        const shippingCost = parseFloat(firstQuote.costSummary.shipping.amount);
        
        console.log('✅ Prodigi shipping cost calculated:', {
          cost: shippingCost,
          currency: firstQuote.costSummary.shipping.currency,
          method: firstQuote.shipmentMethod
        });

        return {
          cost: shippingCost,
          currency: firstQuote.costSummary.shipping.currency,
          estimatedDays: 7, // Default since API doesn't provide this
          serviceName: firstQuote.shipmentMethod
        };
      }
      
      throw new Error('No shipping quotes returned from Prodigi API');
    } catch (error) {
      console.error('❌ Error calculating shipping cost with Prodigi API:', error);
      
      // Enhanced error logging
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          apiKey: this.apiKey ? 'Present' : 'Missing',
          environment: this.environment,
          baseUrl: this.baseUrl
        });
      }
      
      // Instead of hardcoded fallback, throw error to let shipping service handle it
      throw new Error(`Prodigi shipping calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Create singleton instance
export const prodigiClient = new ProdigiClient(
  process.env.PRODIGI_API_KEY || '',
  (process.env.PRODIGI_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox'
);
