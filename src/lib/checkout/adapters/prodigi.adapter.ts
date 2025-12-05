/**
 * Prodigi Adapter for V2 Checkout
 * 
 * Converts our order format to Prodigi API format
 */

import { ProdigiClient } from '@/lib/prodigi';
import { buildProdigiAttributesHeuristic } from '../utils/attribute-builder';
import type { Order, OrderItem } from '../types/order.types';
import type { ShippingAddress } from '../types/order.types';

export interface ProdigiOrderRequest {
  merchantReference: string;
  shippingMethod: string;
  recipient: {
    name: string;
    email: string;
    phoneNumber?: string;
    address: {
      line1: string;
      line2?: string;
      postalOrZipCode: string;
      countryCode: string;
      townOrCity: string;
      stateOrCounty?: string;
    };
  };
  billingAddress: {
    name: string;
    address: {
      line1: string;
      line2?: string;
      postalOrZipCode: string;
      countryCode: string;
      townOrCity: string;
      stateOrCounty?: string;
    };
  };
  items: Array<{
    merchantReference: string;
    sku: string;
    copies: number;
    sizing: string;
    attributes: Record<string, string>;
    assets: Array<{
      printArea: string;
      url: string;
    }>;
  }>;
  metadata?: Record<string, string>;
}

export interface ProdigiOrderResponse {
  id: string;
  merchantReference: string;
  status: {
    stage: string;
  };
  trackingNumber?: string;
  trackingUrl?: string;
  estimatedDelivery?: string;
}

export class ProdigiAdapter {
  constructor(private prodigiClient: ProdigiClient) {}

  /**
   * Convert order to Prodigi format
   */
  async convertOrderToProdigi(
    order: Order,
    items: OrderItem[]
  ): Promise<ProdigiOrderRequest> {
    // Extract recipient name
    const recipientName = `${order.shipping.address.firstName || ''} ${order.shipping.address.lastName || ''}`.trim() || order.customer.name || 'Customer';

    // Build Prodigi order
    return {
      merchantReference: order.orderNumber,
      shippingMethod: order.shipping.method,
      recipient: {
        name: recipientName,
        email: order.customer.email,
        phoneNumber: order.customer.phone,
        address: this.convertAddress(order.shipping.address),
      },
      billingAddress: {
        name: `${order.billing.address.firstName || ''} ${order.billing.address.lastName || ''}`.trim() || recipientName,
        address: this.convertAddress(order.billing.address),
      },
      items: await Promise.all(
        items.map(async (item) => {
          // Extract base SKU (remove image ID suffix if present)
          const baseSku = this.prodigiClient.extractBaseProdigiSku(item.sku);

          // Build attributes
          const attributes = this.buildAttributes(item.frameConfig, baseSku);

          return {
            merchantReference: `item-${item.id}`,
            sku: baseSku,
            copies: item.quantity,
            sizing: 'fillPrintArea',
            attributes,
            assets: [
              {
                printArea: 'Default',
                url: item.imageUrl, // Should already be public URL
              },
            ],
          };
        })
      ),
      metadata: {
        customerEmail: order.customer.email,
        orderNumber: order.orderNumber,
      },
    };
  }

  /**
   * Create Prodigi order
   */
  async createOrder(
    request: ProdigiOrderRequest
  ): Promise<ProdigiOrderResponse> {
    try {
      const response = await this.prodigiClient.convertToProdigiOrder({
        orderReference: request.merchantReference,
        items: request.items.map((item) => ({
          productSku: item.sku,
          quantity: item.copies,
          imageUrl: item.assets[0].url,
          frameSize: '16x20', // V2 sizing: Extract from SKU if needed, default to "16x20"
          frameStyle: 'black', // Extract from SKU if needed
          frameMaterial: 'wood', // Extract from SKU if needed
        })),
        shippingAddress: {
          address1: request.recipient.address.line1,
          address2: request.recipient.address.line2,
          city: request.recipient.address.townOrCity,
          state: request.recipient.address.stateOrCounty,
          zip: request.recipient.address.postalOrZipCode,
          country: request.recipient.address.countryCode,
        },
        billingAddress: {
          address1: request.billingAddress.address.line1,
          address2: request.billingAddress.address.line2,
          city: request.billingAddress.address.townOrCity,
          state: request.billingAddress.address.stateOrCounty,
          zip: request.billingAddress.address.postalOrZipCode,
          country: request.billingAddress.address.countryCode,
        },
        customerEmail: request.recipient.email,
        customerPhone: request.recipient.phoneNumber,
      });

      const prodigiOrder = await this.prodigiClient.createOrder(response);

      return {
        id: prodigiOrder.id,
        merchantReference: prodigiOrder.merchantReference || request.merchantReference,
        status: {
          stage: prodigiOrder.status?.stage || 'InProgress',
        },
        trackingNumber: prodigiOrder.trackingNumber,
        trackingUrl: prodigiOrder.trackingUrl,
        estimatedDelivery: prodigiOrder.estimatedDelivery,
      };
    } catch (error) {
      throw new Error(`Failed to create Prodigi order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert address to Prodigi format
   */
  private convertAddress(address: ShippingAddress): ProdigiOrderRequest['recipient']['address'] {
    return {
      line1: address.address1,
      line2: address.address2,
      postalOrZipCode: address.zip || '',
      countryCode: address.country,
      townOrCity: address.city,
      stateOrCounty: address.state,
    };
  }

  /**
   * Build Prodigi attributes from frame config
   * Uses heuristic approach since we don't have product API access here
   */
  private buildAttributes(frameConfig: OrderItem['frameConfig'], sku?: string): Record<string, string> {
    if (!frameConfig) {
      return {};
    }

    // Use unified attribute builder with heuristic approach
    return buildProdigiAttributesHeuristic(
      {
        frameColor: frameConfig.color,
        wrap: frameConfig.wrap,
        glaze: frameConfig.glaze,
        mount: frameConfig.mount,
        mountColor: frameConfig.mountColor,
        paperType: frameConfig.paperType,
        finish: frameConfig.finish,
        edge: frameConfig.edge,
        frameStyle: frameConfig.style,
      },
      sku
    );
  }
}

