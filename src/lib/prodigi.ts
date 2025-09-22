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
  sku: string;
  quantity: number;
  imageUrl: string;
  personalization?: {
    text?: string;
    color?: string;
  };
}

interface ProdigiOrder {
  merchantReference: string;
  items: ProdigiOrderItem[];
  shippingAddress: {
    recipientName: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    stateOrCounty: string;
    postalCode: string;
    countryCode: string;
    phoneNumber?: string;
    email?: string;
  };
  billingAddress?: {
    recipientName: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    stateOrCounty: string;
    postalCode: string;
    countryCode: string;
  };
  currency: string;
  customerEmail: string;
  customerPhone?: string;
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
      const response = await this.request<ProdigiOrderResponse>('/orders', {
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
      const response = await this.request<ProdigiOrderResponse>(`/orders/${orderId}`);
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
    const productMap: Record<string, string> = {
      // Small frames (8" x 10")
      'small-black-wood': 'FRAME-SM-BLK-WD',
      'small-white-wood': 'FRAME-SM-WHT-WD',
      'small-natural-wood': 'FRAME-SM-NAT-WD',
      'small-gold-wood': 'FRAME-SM-GLD-WD',
      'small-silver-wood': 'FRAME-SM-SLV-WD',
      
      // Medium frames (12" x 16")
      'medium-black-wood': 'FRAME-MD-BLK-WD',
      'medium-white-wood': 'FRAME-MD-WHT-WD',
      'medium-natural-wood': 'FRAME-MD-NAT-WD',
      'medium-gold-wood': 'FRAME-MD-GLD-WD',
      'medium-silver-wood': 'FRAME-MD-SLV-WD',
      
      // Large frames (16" x 20")
      'large-black-wood': 'FRAME-LG-BLK-WD',
      'large-white-wood': 'FRAME-LG-WHT-WD',
      'large-natural-wood': 'FRAME-LG-NAT-WD',
      'large-gold-wood': 'FRAME-LG-GLD-WD',
      'large-silver-wood': 'FRAME-LG-SLV-WD',
      
      // Extra large frames (20" x 24")
      'extra_large-black-wood': 'FRAME-XL-BLK-WD',
      'extra_large-white-wood': 'FRAME-XL-WHT-WD',
      'extra_large-natural-wood': 'FRAME-XL-NAT-WD',
      'extra_large-gold-wood': 'FRAME-XL-GLD-WD',
      'extra_large-silver-wood': 'FRAME-XL-SLV-WD',
    };

    const key = `${frameSize}-${frameStyle}-${frameMaterial}`;
    return productMap[key] || 'FRAME-MD-BLK-WD'; // Default fallback
  }

  // Convert our order format to Prodigi format
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
      shippingAddress: any;
      customerEmail: string;
      customerPhone?: string;
    }
  ): ProdigiOrder {
    return {
      merchantReference: orderData.orderReference,
      items: orderData.items.map(item => ({
        sku: this.getProductSku(item.frameSize, item.frameStyle, item.frameMaterial),
        quantity: item.quantity,
        imageUrl: item.imageUrl,
      })),
      shippingAddress: {
        recipientName: `${orderData.shippingAddress.firstName || orderData.shippingAddress.first_name} ${orderData.shippingAddress.lastName || orderData.shippingAddress.last_name}`,
        addressLine1: orderData.shippingAddress.address1 || orderData.shippingAddress.line1,
        addressLine2: orderData.shippingAddress.address2 || orderData.shippingAddress.line2,
        city: orderData.shippingAddress.city,
        stateOrCounty: orderData.shippingAddress.state,
        postalCode: orderData.shippingAddress.zip || orderData.shippingAddress.postal_code,
        countryCode: orderData.shippingAddress.country,
        phoneNumber: orderData.customerPhone,
        email: orderData.customerEmail,
      },
      currency: 'USD',
      customerEmail: orderData.customerEmail,
      customerPhone: orderData.customerPhone,
    };
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
    items: { sku: string; quantity: number }[],
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
      const response = await this.request<{
        cost: number;
        currency: string;
        estimatedDays: number;
        serviceName: string;
      }>('/shipping/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: items,
          destination: shippingAddress
        })
      });
      return response;
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
