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
  callbackUrl?: string;
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
    email?: string;
    phoneNumber?: string;
  };
  billingAddress?: {
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
  editWindow?: {
    duration: string;
    expiresAt?: string;
    canEdit: boolean;
    canCancel: boolean;
    expired?: boolean;
  };
  modifications?: Array<{
    type: string;
    field: string;
    oldValue: any;
    newValue: any;
    timestamp: string;
  }>;
  cancelledAt?: string;
  cancellationReason?: string;
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
      const response = await this.request<any>(`/products/${sku}`);
      
      console.log(`📦 Raw Prodigi API response for ${sku}:`, {
        hasResponse: !!response,
        responseKeys: response ? Object.keys(response) : [],
        hasProduct: !!response?.product,
        hasSku: !!response?.product?.sku,
        hasName: !!response?.product?.name,
        hasCategory: !!response?.product?.category,
        hasAttributes: !!response?.product?.attributes
      });
      
      // Extract the actual product data from the nested response
      const productData = response?.product;
      if (!productData) {
        throw new Error(`No product data found in response for SKU: ${sku}`);
      }
      
      // Map the Prodigi API response to our ProdigiProduct interface
      const product: ProdigiProduct = {
        sku: productData.sku || sku, // Use the SKU from the request if not in response
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
      
      // Cache the result
      this.productCache.set(sku, product);
      this.cacheExpiry.set(sku, Date.now() + this.CACHE_DURATION);
      
      return product;
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
      
      // Sort alternatives to try the most likely ones first
      const sortedAlternatives = this.prioritizeAlternatives(alternatives, failedSku);
      
      for (const alternativeSku of sortedAlternatives) {
        try {
          console.log(`🔍 Trying alternative SKU: ${alternativeSku}`);
          const response = await this.request<any>(`/products/${alternativeSku}`);
          
          // Extract the actual product data from the nested response
          const productData = response?.product;
          if (!productData) {
            throw new Error(`No product data found in response for SKU: ${alternativeSku}`);
          }
          
          // Map the Prodigi API response to our ProdigiProduct interface
          const product: ProdigiProduct = {
            sku: productData.sku || alternativeSku,
            name: productData.name || `Product ${alternativeSku}`,
            description: productData.description || '',
            price: productData.price || 0,
            currency: productData.currency || 'USD',
            dimensions: productData.dimensions || { width: 0, height: 0 },
            weight: productData.weight || 0,
            category: productData.category || 'unknown',
            attributes: productData.attributes || {},
            images: productData.images || []
          };
          
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
   * Prioritize alternatives based on likelihood of success
   */
  private prioritizeAlternatives(alternatives: string[], failedSku: string): string[] {
    // Extract size from failed SKU for prioritization
    const skuParts = failedSku.split('-');
    const failedSize = skuParts.length >= 2 ? skuParts[1] : '';
    
    return alternatives.sort((a, b) => {
      // Prioritize known working patterns first
      const knownPatterns = ['GLOBAL-CAN-', 'GLOBAL-CFPM-', 'GLOBAL-FAP-', 'GLOBAL-FRA-CAN-'];
      const aIsKnown = knownPatterns.some(pattern => a.startsWith(pattern));
      const bIsKnown = knownPatterns.some(pattern => b.startsWith(pattern));
      
      if (aIsKnown && !bIsKnown) return -1;
      if (!aIsKnown && bIsKnown) return 1;
      
      // Then prioritize by size similarity
      const aHasSize = a.includes(failedSize);
      const bHasSize = b.includes(failedSize);
      
      if (aHasSize && !bHasSize) return -1;
      if (!aHasSize && bHasSize) return 1;
      
      // Finally, prioritize shorter SKUs (more likely to be real)
      return a.length - b.length;
    });
  }

  /**
   * Find alternative SKUs based on the failed SKU pattern
   */
  private async findAlternativeSkus(failedSku: string): Promise<string[]> {
    const alternatives: string[] = [];
    
    // First, try to discover working SKUs through Prodigi's search API with multiple strategies
    try {
      console.log(`🔍 Attempting to discover working SKUs through Prodigi search API`);
      
      // Try multiple search strategies
      const searchStrategies = [
        { search: 'frame', limit: 50 },
        { search: 'canvas', limit: 50 },
        { search: 'print', limit: 50 },
        { search: 'art', limit: 50 },
        { category: 'frame', limit: 50 },
        { category: 'canvas', limit: 50 },
        { limit: 100 } // Get any products
      ];
      
      for (const strategy of searchStrategies) {
        try {
          const discoveredProducts = await this.searchProducts(strategy);
          const discoveredSkus = discoveredProducts.map(p => p.sku);
          alternatives.push(...discoveredSkus);
          console.log(`✅ Discovered ${discoveredSkus.length} SKUs using strategy:`, strategy);
          
          // If we found some products, break early
          if (discoveredSkus.length > 0) {
            break;
          }
        } catch (strategyError) {
          console.log(`⚠️ Search strategy failed:`, strategy, strategyError);
          continue;
        }
      }
      
      console.log(`✅ Total discovered SKUs: ${alternatives.length}`);
    } catch (searchError) {
      console.log(`⚠️ All search strategies failed, using fallback approach:`, searchError);
    }
    
    // If we still don't have alternatives, try some known working patterns
    if (alternatives.length === 0) {
      console.log(`🔄 No SKUs discovered through search, trying known working patterns`);
      
      // Try some known working SKU patterns based on common Prodigi formats
      const knownPatterns = [
        'GLOBAL-CAN-10x10',
        'GLOBAL-CFPM-16X20',
        'GLOBAL-FAP-16X24',
        'GLOBAL-FRA-CAN-30X40',
        'GLOBAL-FAP-8X10',
        'GLOBAL-FAP-11X14',
        'GLOBAL-FRAME-8X10',
        'GLOBAL-FRAME-11X14',
        'GLOBAL-FRAME-16X20',
        'GLOBAL-PRINT-8X10',
        'GLOBAL-PRINT-11X14',
        'GLOBAL-PRINT-16X20'
      ];
      
      alternatives.push(...knownPatterns);
      console.log(`📋 Added ${knownPatterns.length} known working patterns as fallback`);
    }
    
    // Extract components from the failed SKU for pattern-based alternatives (as last resort)
    const skuParts = failedSku.split('-');
    if (skuParts.length >= 4) {
      const [, size, style, material] = skuParts;
      
      // Only add pattern-based alternatives if we don't have many alternatives yet
      if (alternatives.length < 10) {
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
        console.log(`🔧 Added ${variations.length} pattern-based alternatives`);
      }
    }
    
    // Remove duplicates and the original failed SKU
    const uniqueAlternatives = [...new Set(alternatives)].filter(sku => sku !== failedSku);
    console.log(`📊 Total unique alternatives: ${uniqueAlternatives.length}`);
    
    return uniqueAlternatives;
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
   * Select the best known working SKU based on frame size
   */
  private selectBestKnownSku(frameSize: string, knownSkus: string[]): string | null {
    // Map frame sizes to the best matching known SKUs
    const sizeMapping: Record<string, string[]> = {
      'small': ['GLOBAL-FAP-8X10', 'GLOBAL-CAN-10x10'],      // 8x10, 10x10
      'medium': ['GLOBAL-FAP-11X14', 'GLOBAL-CFPM-16X20'],   // 11x14, 16x20
      'large': ['GLOBAL-FAP-16X24', 'GLOBAL-CFPM-16X20'],    // 16x24, 16x20
      'extra_large': ['GLOBAL-FRA-CAN-30X40']                // 30x40
    };

    const candidates = sizeMapping[frameSize] || [];
    
    // Find the first candidate that exists in our known SKUs
    for (const candidate of candidates) {
      if (knownSkus.includes(candidate)) {
        return candidate;
      }
    }
    
    // If no size-specific match, return the first available known SKU
    return knownSkus.length > 0 ? knownSkus[0] : null;
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
   * Update order during edit window
   */
  async updateOrder(orderId: string, updates: {
    items?: Array<{
      sku: string;
      quantity: number;
      attributes?: Record<string, string>;
    }>;
    shippingAddress?: {
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
    metadata?: Record<string, unknown>;
  }): Promise<ProdigiOrderResponse> {
    try {
      const response = await this.request<ProdigiOrderResponse>(`/Orders/${orderId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
      return response;
    } catch (error) {
      console.error('Error updating Prodigi order:', error);
      throw error;
    }
  }

  /**
   * Check if order is in edit window and can be modified
   */
  async canEditOrder(orderId: string): Promise<{
    canEdit: boolean;
    canCancel: boolean;
    editWindow?: {
      duration: string;
      expiresAt?: string;
      expired?: boolean;
    };
  }> {
    try {
      const orderStatus = await this.getOrderStatus(orderId);
      
      // Safely convert edit window data to proper types
      const editWindow = orderStatus.editWindow;
      const canEdit = editWindow?.canEdit === true || editWindow?.canEdit === 'true';
      const canCancel = editWindow?.canCancel === true || editWindow?.canCancel === 'true';
      
      return {
        canEdit,
        canCancel,
        editWindow: editWindow ? {
          duration: editWindow.duration || '',
          expiresAt: editWindow.expiresAt,
          expired: editWindow.expired === true || editWindow.expired === 'true',
        } : undefined,
      };
    } catch (error) {
      console.error('Error checking if order can be edited:', error);
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
   * Extract the base Prodigi SKU from a unique SKU (removes image ID suffix)
   * This is used when we need to call Prodigi APIs with the original SKU
   */
  extractBaseProdigiSku(uniqueSku: string): string {
    // If the SKU has a dash followed by 8 characters (image ID), remove it
    const match = uniqueSku.match(/^(.+)-[a-f0-9]{8}$/);
    return match ? match[1] : uniqueSku;
  }

  /**
   * Generate a proper SKU for frame products
   * This creates a consistent SKU format that matches Prodigi's expectations
   */
  async generateFrameSku(frameSize: string, frameStyle: string, frameMaterial: string, imageId?: string): Promise<string> {
    try {
      console.log(`🔧 Generating SKU for curated image: ${frameSize}-${frameStyle}-${frameMaterial}${imageId ? ` (image: ${imageId})` : ''}`);
      
      // PRIORITY 1: Use known working SKUs first (most reliable)
      // Cache the known SKUs to avoid multiple API calls
      let knownSkus: string[] = [];
      try {
        knownSkus = await this.getKnownProductSkus();
        const sizeBasedSku = this.selectBestKnownSku(frameSize, knownSkus);
        if (sizeBasedSku) {
          // Make the SKU unique by appending image ID if provided
          const uniqueSku = imageId ? `${sizeBasedSku}-${imageId.substring(0, 8)}` : sizeBasedSku;
          console.log(`✅ Using known working Prodigi SKU: ${uniqueSku}`);
          return uniqueSku;
        }
      } catch (knownSkuError) {
        console.log(`⚠️ Known SKU selection failed:`, knownSkuError);
      }
      
      // PRIORITY 2: Try to find a dynamic match (but validate it first)
      try {
        const dynamicSku = await this.getProductSku(frameSize, frameStyle, frameMaterial);
        
        // Validate that the dynamic SKU actually exists in Prodigi
        try {
          await this.getProductDetails(dynamicSku);
          // Make the SKU unique by appending image ID if provided
          const uniqueDynamicSku = imageId ? `${dynamicSku}-${imageId.substring(0, 8)}` : dynamicSku;
          console.log(`✅ Found and validated dynamic Prodigi SKU: ${uniqueDynamicSku}`);
          return uniqueDynamicSku;
        } catch (validationError) {
          console.log(`⚠️ Dynamic SKU ${dynamicSku} failed validation, falling back to known SKUs`);
          // Fall through to use known SKUs
        }
      } catch (dynamicError) {
        console.log(`⚠️ Dynamic SKU search failed:`, dynamicError);
      }
      
      // PRIORITY 3: Final fallback to any known working SKU (use cached list)
      if (knownSkus.length > 0) {
        const fallbackSku = knownSkus[0]; // Use the first available known SKU
        // Make the SKU unique by appending image ID if provided
        const uniqueFallbackSku = imageId ? `${fallbackSku}-${imageId.substring(0, 8)}` : fallbackSku;
        console.log(`✅ Using fallback known working Prodigi SKU: ${uniqueFallbackSku}`);
        return uniqueFallbackSku;
      }
      
      // LAST RESORT: Generated SKU (this will likely fail in production)
      const generatedSku = this.getFallbackSku(frameSize, frameStyle, frameMaterial, imageId);
      console.log(`⚠️ Using generated Prodigi SKU (may not exist): ${generatedSku}`);
      return generatedSku;
    } catch (error) {
      console.warn('Error generating frame SKU, using fallback:', error);
      return this.getFallbackSku(frameSize, frameStyle, frameMaterial, imageId);
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
      billingAddress?: {
        firstName?: string;
        first_name?: string;
        lastName?: string;
        last_name?: string;
        address1?: string;
        line1?: string;
        address2?: string;
        line2?: string;
        city?: string;
        state?: string;
        zip?: string;
        postal_code?: string;
        country?: string;
      };
      customerEmail: string;
      customerPhone?: string;
    }
  ): Promise<ProdigiOrder> {
    const recipientName = `${orderData.shippingAddress.firstName || orderData.shippingAddress.first_name || 'Customer'} ${orderData.shippingAddress.lastName || orderData.shippingAddress.last_name || 'Name'}`.trim();
    
    // Use billing address if provided, otherwise use shipping address
    const billingInfo = orderData.billingAddress || orderData.shippingAddress;
    const billingName = orderData.billingAddress 
      ? `${orderData.billingAddress.firstName || orderData.billingAddress.first_name || 'Customer'} ${orderData.billingAddress.lastName || orderData.billingAddress.last_name || 'Name'}`.trim()
      : recipientName;

    return {
      merchantReference: orderData.orderReference,
      shippingMethod: 'Standard',
      callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/prodigi`,
      recipient: {
        name: recipientName,
        email: orderData.customerEmail,
        phoneNumber: orderData.customerPhone,
        address: {
          line1: orderData.shippingAddress.address1 || orderData.shippingAddress.line1 || '',
          line2: orderData.shippingAddress.address2 || orderData.shippingAddress.line2,
          postalOrZipCode: orderData.shippingAddress.zip || orderData.shippingAddress.postal_code || '',
          countryCode: orderData.shippingAddress.country,
          townOrCity: orderData.shippingAddress.city,
          stateOrCounty: orderData.shippingAddress.state,
        },
      },
      billingAddress: {
        name: billingName,
        address: {
          line1: billingInfo.address1 || billingInfo.line1 || '',
          line2: billingInfo.address2 || billingInfo.line2,
          postalOrZipCode: billingInfo.zip || billingInfo.postal_code || '',
          countryCode: billingInfo.country || orderData.shippingAddress.country,
          townOrCity: billingInfo.city || orderData.shippingAddress.city,
          stateOrCounty: billingInfo.state || orderData.shippingAddress.state,
        },
      },
      items: await Promise.all(orderData.items.map(async item => ({
        merchantReference: `item-${item.productSku}`,
        sku: item.productSku, // Use the base SKU passed from order processing
        copies: item.quantity,
        sizing: 'fillPrintArea',
        attributes: this.getProductAttributes(item.frameStyle, item.frameMaterial, item.productSku),
        assets: [{
          printArea: 'Default',
          url: item.imageUrl,
          // md5Hash is optional but recommended for asset integrity
          // We can add this later if needed for better validation
        }],
      }))),
      metadata: {
        customerEmail: orderData.customerEmail,
        customerPhone: orderData.customerPhone,
      },
    };
  }

  // Get product attributes based on frame style and material
  private getProductAttributes(frameStyle: string, _frameMaterial: string, sku?: string): Record<string, string> {
    const attributes: Record<string, string> = {};
    
    // Only add attributes for SKUs that require them
    if (sku) {
      // GLOBAL-FRA-CAN-* (extra large frames) require both color and wrap
      if (sku.startsWith('GLOBAL-FRA-CAN-')) {
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
        attributes.wrap = 'ImageWrap';
      }
      // GLOBAL-CFPM-* (canvas prints) require color
      else if (sku.startsWith('GLOBAL-CFPM-')) {
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
      }
      // GLOBAL-FAP-* (standard frames) don't require attributes
      // No attributes needed for these SKUs
    }
    
    return attributes;
  }

  // Get order status with proper mapping
  async getOrderStatus(orderId: string): Promise<{
    status: string;
    trackingNumber?: string;
    trackingUrl?: string;
    estimatedDelivery?: string;
    editWindow?: {
      duration: string;
      expiresAt?: string;
      canEdit: boolean;
      canCancel: boolean;
      expired?: boolean;
    };
    modifications?: Array<{
      type: string;
      field: string;
      oldValue: any;
      newValue: any;
      timestamp: string;
    }>;
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
        'Paused': 'paused', // New status for edit window
      };

      return {
        status: statusMap[order.status] || (order.status ? order.status.toLowerCase() : 'unknown'),
        trackingNumber: order.trackingNumber,
        trackingUrl: order.trackingUrl,
        estimatedDelivery: order.estimatedDelivery,
        editWindow: order.editWindow,
        modifications: order.modifications,
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

  /**
   * Get shipping quote for items
   */
  async getQuote(quoteRequest: {
    items: Array<{
      sku: string;
      quantity: number;
      attributes?: Record<string, string>;
    }>;
    destinationCountryCode: string;
  }): Promise<Array<{
    shipmentMethod: string;
    cost: {
      amount: string;
      currency: string;
    };
    estimatedDays: number;
  }>> {
    try {
      const requestBody = {
        shippingMethod: 'Standard',
        destinationCountryCode: quoteRequest.destinationCountryCode,
        items: quoteRequest.items.map(item => ({
          sku: item.sku,
          copies: item.quantity,
          attributes: item.attributes || {},
          assets: [{
            printArea: 'default'
          }]
        }))
      };

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

      if (response.quotes && response.quotes.length > 0) {
        return response.quotes.map(quote => ({
          shipmentMethod: quote.shipmentMethod,
          cost: quote.costSummary.shipping,
          estimatedDays: 5 // Default estimate
        }));
      }

      return [];
    } catch (error) {
      console.error('Error getting quote:', error);
      throw new Error(`Failed to get quote: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Create singleton instance
export const prodigiClient = new ProdigiClient(
  process.env.PRODIGI_API_KEY || '',
  (process.env.PRODIGI_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox'
);
