/**
 * Prodigi API v4 - Webhooks Module
 * 
 * Handler for Prodigi webhook/callback events
 */

import type { CallbackPayload, CallbackEvent, Order } from './types';
import { WEBHOOK_EVENTS } from './constants';

/**
 * Webhook event handler type
 */
export type WebhookHandler = (event: CallbackEvent, order: Order) => void | Promise<void>;

/**
 * Webhooks Manager
 * 
 * Handles incoming webhook events from Prodigi:
 * - order.created
 * - order.shipment.shipped
 * - order.complete
 * - order.cancelled
 * - order.error
 */
export class WebhooksManager {
  private handlers: Map<CallbackEvent, WebhookHandler[]> = new Map();

  /**
   * Register a handler for a specific event
   * 
   * @param event - Event type to listen for
   * @param handler - Handler function
   * 
   * @example
   * ```ts
   * webhooks.on('order.complete', async (event, order) => {
   *   console.log(`Order ${order.id} is complete!`);
   *   await sendNotificationToCustomer(order);
   * });
   * ```
   */
  on(event: CallbackEvent, handler: WebhookHandler): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)!.push(handler);
  }

  /**
   * Remove a handler for a specific event
   * 
   * @param event - Event type
   * @param handler - Handler function to remove
   */
  off(event: CallbackEvent, handler: WebhookHandler): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Remove all handlers for an event
   * 
   * @param event - Event type
   */
  removeAllListeners(event: CallbackEvent): void {
    this.handlers.delete(event);
  }

  /**
   * Process incoming webhook payload
   * 
   * @param payload - Webhook payload from Prodigi
   * @returns Promise that resolves when all handlers complete
   * 
   * @example
   * ```ts
   * // In your API route:
   * export async function POST(request: Request) {
   *   const payload = await request.json();
   *   await webhooks.handleWebhook(payload);
   *   return new Response('OK', { status: 200 });
   * }
   * ```
   */
  async handleWebhook(payload: CallbackPayload): Promise<void> {
    const { event, order } = payload;

    console.log(`[Prodigi Webhook] Received ${event} for order ${order.id}`);

    const handlers = this.handlers.get(event);
    if (!handlers || handlers.length === 0) {
      console.warn(`[Prodigi Webhook] No handlers registered for event: ${event}`);
      return;
    }

    // Execute all handlers for this event
    await Promise.all(
      handlers.map(async (handler) => {
        try {
          await handler(event, order);
        } catch (error) {
          console.error(`[Prodigi Webhook] Handler error for ${event}:`, error);
          // Don't throw - continue processing other handlers
        }
      })
    );
  }

  /**
   * Validate webhook payload
   * 
   * @param payload - Raw webhook payload
   * @returns true if valid
   * 
   * @example
   * ```ts
   * if (webhooks.validate(payload)) {
   *   await webhooks.handleWebhook(payload);
   * }
   * ```
   */
  validate(payload: any): payload is CallbackPayload {
    if (!payload || typeof payload !== 'object') {
      return false;
    }

    if (!payload.event || typeof payload.event !== 'string') {
      return false;
    }

    if (!payload.order || typeof payload.order !== 'object') {
      return false;
    }

    if (!payload.order.id || typeof payload.order.id !== 'string') {
      return false;
    }

    // Verify event is a valid type
    const validEvents: string[] = Object.values(WEBHOOK_EVENTS);
    if (!validEvents.includes(payload.event)) {
      return false;
    }

    return true;
  }

  /**
   * Get list of registered events
   * 
   * @returns Array of events with registered handlers
   */
  getRegisteredEvents(): CallbackEvent[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Get number of handlers for an event
   * 
   * @param event - Event type
   * @returns Number of registered handlers
   */
  getHandlerCount(event: CallbackEvent): number {
    return this.handlers.get(event)?.length || 0;
  }
}

/**
 * Helper functions for common webhook scenarios
 */
export const WebhookHelpers = {
  /**
   * Check if order is complete
   */
  isOrderComplete(event: CallbackEvent): boolean {
    return event === 'order.complete';
  },

  /**
   * Check if order has shipped
   */
  isOrderShipped(event: CallbackEvent): boolean {
    return event === 'order.shipment.shipped';
  },

  /**
   * Check if order was cancelled
   */
  isOrderCancelled(event: CallbackEvent): boolean {
    return event === 'order.cancelled';
  },

  /**
   * Check if order has an error
   */
  isOrderError(event: CallbackEvent): boolean {
    return event === 'order.error';
  },

  /**
   * Extract tracking information from shipped order
   */
  getTrackingInfo(order: Order): Array<{
    trackingNumber: string;
    trackingUrl: string;
    carrier: string;
  }> {
    return order.shipments
      .filter(shipment => shipment.tracking)
      .map(shipment => ({
        trackingNumber: shipment.tracking!.number,
        trackingUrl: shipment.tracking!.url,
        carrier: shipment.carrier.name,
      }));
  },

  /**
   * Get order issues/errors
   */
  getOrderIssues(order: Order): string[] {
    return order.status.issues.map(issue => issue.description);
  },

  /**
   * Check if order needs payment authorization
   */
  needsPaymentAuthorization(order: Order): boolean {
    return order.status.stage === 'AwaitingPaymentAuthorisation';
  },

  /**
   * Get payment authorization URL if needed
   */
  getAuthorizationUrl(order: Order): string | null {
    const authIssue = order.status.issues.find(
      issue => issue.authorisationDetails?.authorisationUrl
    );
    return authIssue?.authorisationDetails?.authorisationUrl || null;
  },
};

/**
 * Create webhook handler middleware for Express/Next.js
 * 
 * @param webhooks - WebhooksManager instance
 * @returns Middleware function
 * 
 * @example
 * ```ts
 * // Next.js API Route
 * const webhooks = new WebhooksManager();
 * webhooks.on('order.complete', handleOrderComplete);
 * 
 * export async function POST(request: Request) {
 *   const payload = await request.json();
 *   
 *   if (!webhooks.validate(payload)) {
 *     return new Response('Invalid payload', { status: 400 });
   *   }
 *   
 *   await webhooks.handleWebhook(payload);
 *   return new Response('OK', { status: 200 });
 * }
 * ```
 */
export function createWebhookMiddleware(webhooks: WebhooksManager) {
  return async (payload: any): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!webhooks.validate(payload)) {
        return {
          success: false,
          error: 'Invalid webhook payload',
        };
      }

      await webhooks.handleWebhook(payload);

      return { success: true };
    } catch (error) {
      console.error('[Prodigi Webhook] Middleware error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  };
}

