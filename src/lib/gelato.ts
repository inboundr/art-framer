interface GelatoProduct {
  productUid: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  dimensions: {
    width: number;
    height: number;
    depth: number;
  };
  weight: number;
  category: string;
}

interface GelatoOrderItem {
  productUid: string;
  quantity: number;
  imageUrl: string;
  personalization?: {
    text?: string;
    color?: string;
  };
}

interface GelatoOrder {
  orderReference: string;
  items: GelatoOrderItem[];
  shippingAddress: {
    firstName: string;
    lastName: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    phone?: string;
    email?: string;
  };
  billingAddress?: {
    firstName: string;
    lastName: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  currency: string;
  customerEmail: string;
  customerPhone?: string;
}

interface GelatoOrderResponse {
  orderId: string;
  status: string;
  trackingNumber?: string;
  trackingUrl?: string;
  estimatedDelivery?: string;
  totalPrice: number;
  currency: string;
}

export class GelatoClient {
  private apiKey: string;
  private baseUrl: string;
  private environment: 'sandbox' | 'production';

  constructor(apiKey: string, environment: 'sandbox' | 'production' = 'sandbox') {
    this.apiKey = apiKey;
    this.environment = environment;
    this.baseUrl = environment === 'production' 
      ? 'https://api.gelato.com/v1'
      : 'https://api.sandbox.gelato.com/v1';
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gelato API error: ${response.status} ${errorText}`);
    }

    return response.json();
  }

  async getProducts(): Promise<GelatoProduct[]> {
    try {
      const response = await this.request<{ products: GelatoProduct[] }>('/products');
      return response.products;
    } catch (error) {
      console.error('Error fetching Gelato products:', error);
      throw error;
    }
  }

  async getProduct(productUid: string): Promise<GelatoProduct> {
    try {
      const response = await this.request<GelatoProduct>(`/products/${productUid}`);
      return response;
    } catch (error) {
      console.error('Error fetching Gelato product:', error);
      throw error;
    }
  }

  async createOrder(order: GelatoOrder): Promise<GelatoOrderResponse> {
    try {
      const response = await this.request<GelatoOrderResponse>('/orders', {
        method: 'POST',
        body: JSON.stringify(order),
      });
      return response;
    } catch (error) {
      console.error('Error creating Gelato order:', error);
      throw error;
    }
  }

  async getOrder(orderId: string): Promise<GelatoOrderResponse> {
    try {
      const response = await this.request<GelatoOrderResponse>(`/orders/${orderId}`);
      return response;
    } catch (error) {
      console.error('Error fetching Gelato order:', error);
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
      console.error('Error cancelling Gelato order:', error);
      throw error;
    }
  }

  // Map our frame specifications to Gelato product UIDs
  getProductUid(frameSize: string, frameStyle: string, frameMaterial: string): string {
    const productMap: Record<string, string> = {
      // Small frames
      'small-black-wood': 'gelato-frame-small-black-wood',
      'small-white-wood': 'gelato-frame-small-white-wood',
      'small-natural-wood': 'gelato-frame-small-natural-wood',
      'small-gold-wood': 'gelato-frame-small-gold-wood',
      'small-silver-wood': 'gelato-frame-small-silver-wood',
      
      // Medium frames
      'medium-black-wood': 'gelato-frame-medium-black-wood',
      'medium-white-wood': 'gelato-frame-medium-white-wood',
      'medium-natural-wood': 'gelato-frame-medium-natural-wood',
      'medium-gold-wood': 'gelato-frame-medium-gold-wood',
      'medium-silver-wood': 'gelato-frame-medium-silver-wood',
      
      // Large frames
      'large-black-wood': 'gelato-frame-large-black-wood',
      'large-white-wood': 'gelato-frame-large-white-wood',
      'large-natural-wood': 'gelato-frame-large-natural-wood',
      'large-gold-wood': 'gelato-frame-large-gold-wood',
      'large-silver-wood': 'gelato-frame-large-silver-wood',
      
      // Extra large frames
      'extra_large-black-wood': 'gelato-frame-xl-black-wood',
      'extra_large-white-wood': 'gelato-frame-xl-white-wood',
      'extra_large-natural-wood': 'gelato-frame-xl-natural-wood',
      'extra_large-gold-wood': 'gelato-frame-xl-gold-wood',
      'extra_large-silver-wood': 'gelato-frame-xl-silver-wood',
    };

    const key = `${frameSize}-${frameStyle}-${frameMaterial}`;
    return productMap[key] || 'gelato-frame-medium-black-wood'; // Default fallback
  }

  // Convert our order format to Gelato format
  convertToGelatoOrder(
    orderData: {
      orderReference: string;
      items: Array<{
        productUid: string;
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
  ): GelatoOrder {
    return {
      orderReference: orderData.orderReference,
      items: orderData.items.map(item => ({
        productUid: this.getProductUid(item.frameSize, item.frameStyle, item.frameMaterial),
        quantity: item.quantity,
        imageUrl: item.imageUrl,
      })),
      shippingAddress: {
        firstName: orderData.shippingAddress.firstName || orderData.shippingAddress.first_name,
        lastName: orderData.shippingAddress.lastName || orderData.shippingAddress.last_name,
        address1: orderData.shippingAddress.address1 || orderData.shippingAddress.line1,
        address2: orderData.shippingAddress.address2 || orderData.shippingAddress.line2,
        city: orderData.shippingAddress.city,
        state: orderData.shippingAddress.state,
        zip: orderData.shippingAddress.zip || orderData.shippingAddress.postal_code,
        country: orderData.shippingAddress.country,
        phone: orderData.customerPhone,
        email: orderData.customerEmail,
      },
      currency: 'USD',
      customerEmail: orderData.customerEmail,
      customerPhone: orderData.customerPhone,
    };
  }
}

// Create singleton instance
export const gelatoClient = new GelatoClient(
  process.env.GELATO_API_KEY || '',
  (process.env.GELATO_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox'
);
