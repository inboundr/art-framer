/**
 * Payment Service for V2 Checkout
 * 
 * Handles Stripe integration for payments
 */

import Stripe from 'stripe';
import { PaymentError } from '../types/errors';
import type {
  StripeCheckoutSession,
  StripeSession,
} from '../types/payment.types';
import type { Cart } from '../types/cart.types';
import type { ShippingAddress } from '../types/order.types';
import type { ShippingMethod } from '../types/order.types';

export class PaymentService {
  private stripe: Stripe;

  constructor(stripeSecretKey: string) {
    if (!stripeSecretKey || stripeSecretKey === 'sk_test_placeholder_for_build') {
      throw new PaymentError('Stripe secret key is required');
    }
    this.stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-08-27.basil',
    });
  }

  /**
   * Create checkout session
   */
  async createCheckoutSession(
    cart: Cart,
    address: ShippingAddress,
    shippingMethod: ShippingMethod,
    userEmail: string,
    successUrl: string,
    cancelUrl: string,
    metadata: Record<string, string> = {}
  ): Promise<StripeCheckoutSession> {
    try {
      // Build line items from cart
      const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
        cart.items.map((item) => ({
          price_data: {
            currency: cart.totals.currency.toLowerCase(),
            product_data: {
              name: item.name,
              description: `Framed print: ${item.name}`,
              images: item.imageUrl ? [item.imageUrl] : undefined,
              metadata: {
                productId: item.productId,
                sku: item.sku,
                frameSize: item.frameConfig.size,
                frameStyle: item.frameConfig.style,
                frameMaterial: item.frameConfig.material,
                price_usd: item.originalPrice.toString(),
              },
            },
            unit_amount: Math.round(item.price * 100),
          },
          quantity: item.quantity,
        }));

      // Add shipping as line item
      if (cart.totals.shipping > 0) {
        lineItems.push({
          price_data: {
            currency: cart.totals.currency.toLowerCase(),
            product_data: {
              name: 'Shipping',
              description: `${shippingMethod} shipping`,
            },
            unit_amount: Math.round(cart.totals.shipping * 100),
          },
          quantity: 1,
        });
      }

      // Add tax as line item
      if (cart.totals.tax > 0) {
        lineItems.push({
          price_data: {
            currency: cart.totals.currency.toLowerCase(),
            product_data: {
              name: 'Tax',
              description: 'Sales tax',
            },
            unit_amount: Math.round(cart.totals.tax * 100),
          },
          quantity: 1,
        });
      }

      // Create Stripe session
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        customer_email: userEmail,
        line_items: lineItems,
        metadata: {
          ...metadata,
          currency: cart.totals.currency,
          originalCurrency: cart.totals.originalCurrency || cart.totals.currency,
          originalTotal: cart.totals.originalTotal?.toString() || cart.totals.total.toString(),
          exchangeRate: cart.totals.exchangeRate?.toString() || '1',
        },
        success_url: successUrl,
        cancel_url: cancelUrl,
        shipping_address_collection: {
          allowed_countries: [
            'US',
            'CA',
            'GB',
            'AU',
            'DE',
            'FR',
            'IT',
            'ES',
            'NL',
            'BE',
            'AT',
            'PT',
            'IE',
            'FI',
            'LU',
            'JP',
            'KR',
            'SG',
            'HK',
            'CH',
            'SE',
            'NO',
            'DK',
            'PL',
            'CZ',
            'HU',
            'MX',
            'BR',
            'IN',
            'NZ',
          ],
        },
        billing_address_collection: 'required',
      });

      return {
        id: session.id,
        url: session.url || '',
        paymentStatus: session.payment_status,
        status: session.status as 'expired' | 'open' | 'complete',
        customerEmail: session.customer_email || undefined,
        metadata: session.metadata || {},
      };
    } catch (error) {
      if (error instanceof Stripe.errors.StripeError) {
        throw new PaymentError(`Stripe error: ${error.message}`, {
          code: error.type,
          originalError: error,
        });
      }
      throw new PaymentError('Failed to create checkout session', {
        originalError: error,
      });
    }
  }

  /**
   * Retrieve session
   */
  async retrieveSession(sessionId: string): Promise<StripeSession> {
    try {
      const session = await this.stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['payment_intent', 'customer'],
      });
      return session as StripeSession;
    } catch (error) {
      if (error instanceof Stripe.errors.StripeError) {
        throw new PaymentError(`Stripe error: ${error.message}`, {
          code: error.type,
          originalError: error,
        });
      }
      throw new PaymentError('Failed to retrieve session', {
        originalError: error,
      });
    }
  }
}




