/**
 * Prodigi V2 API Route - Webhooks
 * 
 * POST /api/prodigi-v2/webhooks - Receive webhook from Prodigi
 */

import { NextRequest, NextResponse } from 'next/server';
import { prodigiSDK } from '@/lib/prodigi-v2';
import type { CallbackPayload } from '@/lib/prodigi-v2';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Configure webhook handlers
prodigiSDK.webhooks.on('order.created', async (event, order) => {
  console.log(`[Webhook] Order created: ${order.id}`);
  // Add your custom logic here
});

prodigiSDK.webhooks.on('order.shipment.shipped', async (event, order) => {
  console.log(`[Webhook] Order shipped: ${order.id}`);
  // Add your custom logic here
  // Example: Send tracking email to customer
});

prodigiSDK.webhooks.on('order.complete', async (event, order) => {
  console.log(`[Webhook] Order complete: ${order.id}`);
  // Add your custom logic here
  // Example: Update order status in database
});

prodigiSDK.webhooks.on('order.cancelled', async (event, order) => {
  console.log(`[Webhook] Order cancelled: ${order.id}`);
  // Add your custom logic here
});

prodigiSDK.webhooks.on('order.error', async (event, order) => {
  console.error(`[Webhook] Order error: ${order.id}`, order.status.issues);
  // Add your custom logic here
  // Example: Alert admin of order issues
});

/**
 * POST /api/prodigi-v2/webhooks
 * Receive webhook callbacks from Prodigi
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json() as CallbackPayload;
    
    // Validate payload
    if (!prodigiSDK.webhooks.validate(payload)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid webhook payload',
      }, { status: 400 });
    }
    
    // Process webhook
    await prodigiSDK.webhooks.handleWebhook(payload);
    
    return NextResponse.json({
      success: true,
      message: 'Webhook processed',
    });
  } catch (error) {
    console.error('[Prodigi V2] Webhook error:', error);
    
    // Return 200 to prevent Prodigi from retrying
    // (we've logged the error for investigation)
    return NextResponse.json({
      success: false,
      error: 'Webhook processing failed',
    }, { status: 200 });
  }
}

