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
      throw new Error(`Prodigi API error: ${response.status} ${errorText}`);
    }

    return response.json();
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
      // Use the correct quotes endpoint structure from Postman collection
      const response = await this.request<{
        outcome: string;
        quotes: Array<{
          shipmentMethod: string;
          costSummary: {
            items: { amount: string; currency: string };
            shipping: { amount: string; currency: string };
          };
        }>;
      }>('/quotes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
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
        })
      });
      
      // Return the first quote in the old format for backward compatibility
      if (response.quotes && response.quotes.length > 0) {
        const firstQuote = response.quotes[0];
        return {
          cost: parseFloat(firstQuote.costSummary.shipping.amount),
          currency: firstQuote.costSummary.shipping.currency,
          estimatedDays: 7, // Default since API doesn't provide this
          serviceName: firstQuote.shipmentMethod
        };
      }
      
      throw new Error('No shipping quotes returned');
    } catch (error) {
      console.error('Error calculating shipping cost:', error);
      // Fallback to default shipping cost if API fails
      return {
        cost: 9.99,
        currency: 'USD',
        estimatedDays: 7,
        serviceName: 'Standard Shipping'
      };
    }
  }
}

// Create singleton instance
export const prodigiClient = new ProdigiClient(
  process.env.PRODIGI_API_KEY || '',
  (process.env.PRODIGI_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox'
);
