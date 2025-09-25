// API Types - Comprehensive type definitions for better type safety

export interface SupabaseClient {
  from: (table: string) => any;
  auth: {
    getUser: () => Promise<{ data: { user: any }, error: any }>;
  };
  rpc: (fn: string, params?: any) => Promise<{ data: any, error: any }>;
}

export interface DatabaseRow {
  id: string;
  created_at: string;
  updated_at?: string;
  [key: string]: any;
}

export interface CartItem extends DatabaseRow {
  user_id: string;
  product_id: string;
  quantity: number;
  products: Product;
}

export interface Product extends DatabaseRow {
  name: string;
  price: number;
  sku: string;
  frame_size: string;
  frame_style: string;
  frame_material: string;
  images: ProductImage;
}

export interface ProductImage extends DatabaseRow {
  url: string;
  prompt?: string;
  width?: number;
  height?: number;
}

export interface Order extends DatabaseRow {
  user_id: string;
  status: string;
  total_amount: number;
  shipping_address: any;
  items: OrderItem[];
}

export interface OrderItem extends DatabaseRow {
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  products: Product;
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Stripe/Payment types
export interface PaymentIntent {
  id: string;
  client_secret: string;
  amount: number;
  currency: string;
  status: string;
  [key: string]: any;
}

// Prodigi types
export interface ProdigiProduct {
  id: string;
  name: string;
  description: string;
  variants: ProdigiVariant[];
}

export interface ProdigiVariant {
  id: string;
  name: string;
  price: number;
  attributes: Record<string, any>;
}

export interface ProdigiOrder {
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
    email?: string;
    phoneNumber?: string;
  };
  items: ProdigiOrderItem[];
  metadata?: Record<string, unknown>;
}

export interface ProdigiOrderItem {
  merchantReference?: string;
  sku: string;
  copies: number;
  sizing?: 'fillPrintArea' | 'fitPrintArea' | 'custom';
  attributes?: Record<string, string>;
  assets: Array<{
    printArea: string;
    url?: string;
    id?: string;
  }>;
}

// Utility types
export type DatabaseOperationResult<T = any> = {
  data: T | null;
  error: any | null;
};

export type ApiHandler<T = any> = (
  request: Request,
  context?: { params: any }
) => Promise<Response>;
