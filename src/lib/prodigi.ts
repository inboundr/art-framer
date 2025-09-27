interface ProdigiProduct {
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

  async getProductDetails(sku: string): Promise<ProdigiProduct> {
    try {
      const response = await this.request<ProdigiProduct>(`/products/${sku}`);
      return response;
    } catch (error) {
      console.error('Error fetching Prodigi product details:', error);
      throw error;
    }
  }

  async getProduct(sku: string): Promise<ProdigiProduct> {
    try {
      const response = await this.request<ProdigiProduct>(`/products/${sku}`);
      return response;
    } catch (error) {
      console.error('Error fetching Prodigi product:', error);
      throw error;
    }
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

  // Map our frame specifications to Prodigi SKUs
  getProductSku(frameSize: string, frameStyle: string, frameMaterial: string): string {
    // Updated to use real Prodigi SKUs from the official Postman collection
    const productMap: Record<string, string> = {
      // Small frames - Canvas prints (10" x 10")
      'small-black-wood': 'GLOBAL-CAN-10x10',
      'small-white-wood': 'GLOBAL-CAN-10x10',
      'small-natural-wood': 'GLOBAL-CAN-10x10',
      'small-gold-wood': 'GLOBAL-CAN-10x10',
      'small-silver-wood': 'GLOBAL-CAN-10x10',
      
      // Medium frames - Canvas prints (16" x 20")
      'medium-black-wood': 'GLOBAL-CFPM-16X20',
      'medium-white-wood': 'GLOBAL-CFPM-16X20',
      'medium-natural-wood': 'GLOBAL-CFPM-16X20',
      'medium-gold-wood': 'GLOBAL-CFPM-16X20',
      'medium-silver-wood': 'GLOBAL-CFPM-16X20',
      
      // Large frames - Framed art prints (16" x 24")
      'large-black-wood': 'GLOBAL-FAP-16X24',
      'large-white-wood': 'GLOBAL-FAP-16X24',
      'large-natural-wood': 'GLOBAL-FAP-16X24',
      'large-gold-wood': 'GLOBAL-FAP-16X24',
      'large-silver-wood': 'GLOBAL-FAP-16X24',
      
      // Extra large frames - Frame canvas (30" x 40")
      'extra_large-black-wood': 'GLOBAL-FRA-CAN-30X40',
      'extra_large-white-wood': 'GLOBAL-FRA-CAN-30X40',
      'extra_large-natural-wood': 'GLOBAL-FRA-CAN-30X40',
      'extra_large-gold-wood': 'GLOBAL-FRA-CAN-30X40',
      'extra_large-silver-wood': 'GLOBAL-FRA-CAN-30X40',
    };

    const key = `${frameSize}-${frameStyle}-${frameMaterial}`;
    return productMap[key] || 'GLOBAL-CFPM-16X20'; // Default to medium canvas print
  }

  // Convert our order format to Prodigi format (updated to match Postman collection)
  convertToProdigiOrder(
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
  ): ProdigiOrder {
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
      items: orderData.items.map(item => ({
        merchantReference: `item-${item.productSku}`,
        sku: this.getProductSku(item.frameSize, item.frameStyle, item.frameMaterial),
        copies: item.quantity,
        sizing: 'fillPrintArea',
        attributes: this.getProductAttributes(item.frameStyle, item.frameMaterial),
        assets: [{
          printArea: 'default',
          url: item.imageUrl,
        }],
      })),
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
