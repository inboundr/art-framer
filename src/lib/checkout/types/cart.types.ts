/**
 * Cart Types for V2 Checkout System
 */

import type { ShippingMethod } from './order.types';

export interface CartItem {
  id: string;
  productId: string;
  sku: string;
  name: string;
  imageUrl: string;
  quantity: number;
  price: number; // Display price (converted currency)
  originalPrice: number; // Original USD price
  currency: string;
  frameConfig: {
    size: string;
    color: string;
    style: string;
    material: string;
    mount?: string;
    mountColor?: string;
    glaze?: string;
    wrap?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface CartItemInput {
  productId: string;
  quantity: number;
  frameConfig?: {
    size?: string;
    color?: string;
    style?: string;
    material?: string;
    mount?: string;
    glaze?: string;
    wrap?: string;
  };
}

export interface CartTotals {
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  currency: string;
  originalCurrency?: string;
  originalTotal?: number;
  exchangeRate?: number;
}

export interface Cart {
  items: CartItem[];
  totals: CartTotals;
  shippingMethod?: ShippingMethod;
  destinationCountry: string;
  updatedAt: Date;
}

export interface PriceValidationResult {
  isValid: boolean;
  mismatches: Array<{
    itemId: string;
    sku: string;
    catalogPrice: number;
    quotedPrice: number;
    difference: number;
    percentDifference: number;
  }>;
}

