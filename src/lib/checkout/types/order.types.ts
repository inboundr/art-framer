/**
 * Order Types for V2 Checkout System
 */

export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'failed'
  | 'disputed'
  | 'refunded';

export type PaymentStatus =
  | 'pending'
  | 'paid'
  | 'failed'
  | 'requires_action'
  | 'disputed'
  | 'refunded';

export interface ShippingAddress {
  firstName?: string;
  lastName?: string;
  address1: string;
  address2?: string;
  city: string;
  state?: string;
  zip?: string;
  country: string; // ISO 3166-1 alpha-2
  phone?: string;
  // Google Maps data
  lat?: number;
  lng?: number;
  formattedAddress?: string;
}

export interface BillingAddress {
  firstName?: string;
  lastName?: string;
  address1: string;
  address2?: string;
  city: string;
  state?: string;
  zip?: string;
  country: string;
}

export interface SavedAddress {
  id: string;
  userId: string;
  label: string;
  address: ShippingAddress;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  sku: string;
  name: string;
  imageUrl: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  frameConfig: {
    size: string;
    color: string;
    style: string;
    material: string;
    productType?: string;
    mount?: string;
    mountColor?: string;
    glaze?: string;
    wrap?: string;
    paperType?: string;
    finish?: string;
    edge?: string;
  };
  createdAt: Date;
}

export interface DropshipOrder {
  id: string;
  orderId: string;
  orderItemId: string;
  provider: 'prodigi';
  providerOrderId?: string;
  status: string;
  trackingNumber?: string;
  trackingUrl?: string;
  estimatedDelivery?: Date;
  actualDelivery?: Date;
  shippingCost?: number;
  providerResponse?: any;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  customer: {
    email: string;
    name?: string;
    phone?: string;
  };
  shipping: {
    address: ShippingAddress;
    method: ShippingMethod;
    cost: number;
    estimatedDays: number;
  };
  billing: {
    address: BillingAddress;
  };
  items: OrderItem[];
  pricing: {
    subtotal: number;
    shipping: number;
    tax: number;
    total: number;
    currency: string;
    originalCurrency?: string;
    originalTotal?: number;
    exchangeRate?: number;
  };
  payment: {
    stripeSessionId: string;
    stripePaymentIntentId?: string;
    paidAt?: Date;
  };
  prodigi?: {
    orderId?: string;
    status?: string;
    trackingNumber?: string;
    trackingUrl?: string;
    estimatedDelivery?: Date;
  };
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderFilters {
  status?: OrderStatus;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}

export type ShippingMethod = 'Budget' | 'Standard' | 'Express' | 'Overnight';

