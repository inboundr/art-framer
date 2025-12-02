/**
 * Checkout Types for V2 Checkout System
 */

import type { ShippingAddress, ShippingMethod } from './order.types';
import type { Cart } from './cart.types';

export interface CheckoutSession {
  sessionId: string;
  url: string;
  expiresAt: Date;
}

export interface CheckoutRequest {
  cart: Cart;
  shippingAddress: ShippingAddress;
  billingAddress?: ShippingAddress;
  shippingMethod: ShippingMethod;
  sameAsShipping?: boolean;
}

export interface CheckoutResponse {
  sessionId: string;
  url: string;
  orderId?: string;
}

export interface AddressValidationResult {
  valid: boolean;
  address?: ShippingAddress;
  errors?: string[];
  suggestions?: ShippingAddress[];
}

