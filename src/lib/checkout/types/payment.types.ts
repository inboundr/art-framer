/**
 * Payment Types for V2 Checkout System
 */

import type { Stripe } from 'stripe';

export interface StripeCheckoutSession {
  id: string;
  url: string;
  paymentStatus: 'unpaid' | 'paid' | 'no_payment_required';
  status: 'open' | 'complete' | 'expired';
  customerEmail?: string;
  metadata?: Record<string, string>;
}

export interface StripeSession extends Stripe.Checkout.Session {
  // Extended with our custom fields
}

export interface PaymentIntent {
  id: string;
  status: string;
  amount: number;
  currency: string;
  metadata?: Record<string, string>;
}

export interface PaymentError {
  code: string;
  message: string;
  type: 'card_error' | 'api_error' | 'invalid_request_error';
  details?: any;
}




