import Stripe from 'stripe';

// Initialize Stripe with fallback for build time
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder_for_build';
export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-08-27.basil',
});

export interface CreateCheckoutSessionParams {
  lineItems: Array<{
    price_data: {
      currency: string;
      product_data: {
        name: string;
        description?: string;
        images?: string[];
      };
      unit_amount: number;
    };
    quantity: number;
  }>;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  metadata?: Record<string, string>;
}

export async function createCheckoutSession(params: CreateCheckoutSessionParams) {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: params.lineItems,
      mode: 'payment',
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      customer_email: params.customerEmail,
      metadata: params.metadata,
      shipping_address_collection: {
        allowed_countries: ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE'],
      },
      billing_address_collection: 'required',
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: {
              amount: 999, // $9.99 in cents
              currency: 'usd',
            },
            display_name: 'Standard Shipping',
            delivery_estimate: {
              minimum: {
                unit: 'business_day',
                value: 5,
              },
              maximum: {
                unit: 'business_day',
                value: 10,
              },
            },
          },
        },
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: {
              amount: 1999, // $19.99 in cents
              currency: 'usd',
            },
            display_name: 'Express Shipping',
            delivery_estimate: {
              minimum: {
                unit: 'business_day',
                value: 2,
              },
              maximum: {
                unit: 'business_day',
                value: 5,
              },
            },
          },
        },
      ],
    });

    return session;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
}

export async function createPaymentIntent(amount: number, metadata: Record<string, string>) {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      metadata,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return paymentIntent;
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw error;
  }
}

export async function retrievePaymentIntent(paymentIntentId: string) {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return paymentIntent;
  } catch (error) {
    console.error('Error retrieving payment intent:', error);
    throw error;
  }
}

export async function constructWebhookEvent(payload: any, signature: string) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_placeholder_for_build';
  
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.warn('⚠️ STRIPE_WEBHOOK_SECRET is not set, using placeholder for build');
  }

  // Convert to Buffer if needed
  let processedPayload: string | Buffer;
  if (payload instanceof ArrayBuffer) {
    processedPayload = Buffer.from(payload);
  } else if (payload instanceof Uint8Array) {
    processedPayload = Buffer.from(payload);
  } else {
    processedPayload = payload;
  }

  console.log('🔍 Webhook signature verification details:', {
    hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
    webhookSecretLength: webhookSecret.length,
    payloadType: typeof payload,
    payloadLength: processedPayload instanceof Buffer ? processedPayload.length : (processedPayload as string).length,
    signatureLength: signature.length,
    signaturePrefix: signature.substring(0, 20) + '...'
  });

  try {
    const event = stripe.webhooks.constructEvent(
      processedPayload,
      signature,
      webhookSecret
    );
    
    console.log('✅ Webhook signature verification successful');
    return event;
  } catch (error) {
    console.error('❌ Error constructing webhook event:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      type: error instanceof Error ? error.constructor.name : typeof error,
      webhookSecret: webhookSecret.substring(0, 10) + '...',
      signature: signature.substring(0, 20) + '...',
      payloadPreview: processedPayload instanceof Buffer ? 
        processedPayload.toString('utf8', 0, 100) + '...' : 
        (processedPayload as string).substring(0, 100) + '...'
    });
    throw error;
  }
}

export function formatAmountForStripe(amount: number): number {
  return Math.round(amount * 100);
}

export function formatAmountFromStripe(amount: number): number {
  return amount / 100;
}
