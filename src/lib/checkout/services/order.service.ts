/**
 * Order Service for V2 Checkout
 * 
 * Handles order creation, management, and status synchronization
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { OrderError } from '../types/errors';
import type {
  Order,
  OrderItem,
  OrderFilters,
  OrderStatus,
} from '../types/order.types';
import type { Cart } from '../types/cart.types';
import type { ShippingAddress } from '../types/order.types';
import { ProdigiAdapter } from '../adapters/prodigi.adapter';
import type { StripeSession } from '../types/payment.types';

/**
 * Convert Supabase storage path to public URL
 */
function getPublicImageUrl(
  imageUrl: string | null | undefined,
  supabase: SupabaseClient
): string | null {
  if (!imageUrl) return null;

  // Already a full URL
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }

  // Determine bucket
  let bucket = 'images';
  if (imageUrl.includes('curated') || imageUrl.includes('public-')) {
    bucket = 'curated-images';
  }

  try {
    const { data } = supabase.storage.from(bucket).getPublicUrl(imageUrl);
    return data?.publicUrl || imageUrl;
  } catch (error) {
    console.error('Error converting image URL:', error);
    return imageUrl;
  }
}

export class OrderService {
  constructor(
    private supabase: SupabaseClient,
    private prodigiAdapter: ProdigiAdapter
  ) {}

  /**
   * Create order from cart and payment session
   */
  async createOrder(
    userId: string,
    cart: Cart,
    session: StripeSession,
    shippingAddress: ShippingAddress,
    billingAddress?: ShippingAddress
  ): Promise<Order> {
    try {
      // Generate order number
      const orderNumber = `ORD-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)
        .toUpperCase()}`;

      // Create order record
      const { data: order, error: orderError } = await this.supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          user_id: userId,
          stripe_session_id: session.id,
          stripe_payment_intent_id: session.payment_intent as string,
          status: 'paid',
          payment_status: 'paid',
          customer_email: session.customer_email || '',
          customer_name: session.customer_details?.name,
          customer_phone: session.customer_details?.phone,
          shipping_address: shippingAddress,
          billing_address: billingAddress || shippingAddress,
          subtotal: cart.totals.subtotal,
          tax_amount: cart.totals.tax,
          shipping_amount: cart.totals.shipping,
          total_amount: cart.totals.total,
          currency: cart.totals.currency,
          metadata: {
            stripe_session_id: session.id,
            payment_intent_id: session.payment_intent,
            originalCurrency: cart.totals.originalCurrency,
            originalTotal: cart.totals.originalTotal,
            exchangeRate: cart.totals.exchangeRate,
          },
        })
        .select()
        .single();

      if (orderError || !order) {
        throw new OrderError('Failed to create order', { error: orderError });
      }

      // Create order items
      const orderItemsData = cart.items.map((item) => ({
        order_id: order.id,
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity,
      }));

      const { data: orderItems, error: itemsError } = await this.supabase
        .from('order_items')
        .insert(orderItemsData)
        .select(
          `
          *,
          products (
            *,
            images (
              id,
              image_url,
              thumbnail_url
            )
          )
        `
        );

      if (itemsError || !orderItems) {
        throw new OrderError('Failed to create order items', {
          error: itemsError,
        });
      }

      // Create dropship orders
      for (const orderItem of orderItems) {
        await this.supabase.from('dropship_orders').insert({
          order_id: order.id,
          order_item_id: orderItem.id,
          provider: 'prodigi',
          status: 'pending',
        });
      }

      // Format and return order
      return this.formatOrder(order, orderItems);
    } catch (error) {
      if (error instanceof OrderError) {
        throw error;
      }
      throw new OrderError('Failed to create order', {
        originalError: error,
      });
    }
  }

  /**
   * Get order with all relations
   */
  async getOrder(orderId: string): Promise<Order> {
    try {
      const { data: order, error } = await this.supabase
        .from('orders')
        .select(
          `
          *,
          order_items (
            *,
            products (
              *,
              images (
                id,
                image_url,
                thumbnail_url
              )
            )
          ),
          dropship_orders (
            *
          )
        `
        )
        .eq('id', orderId)
        .single();

      if (error || !order) {
        throw new OrderError('Order not found', { error });
      }

      return this.formatOrder(order, order.order_items || []);
    } catch (error) {
      if (error instanceof OrderError) {
        throw error;
      }
      throw new OrderError('Failed to get order', {
        originalError: error,
      });
    }
  }

  /**
   * List orders for user
   */
  async listOrders(userId: string, filters?: OrderFilters): Promise<Order[]> {
    try {
      let query = this.supabase
        .from('orders')
        .select(
          `
          *,
          order_items (
            *,
            products (
              *,
              images (
                id,
                image_url,
                thumbnail_url
              )
            )
          )
        `
        )
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.dateFrom) {
        query = query.gte('created_at', filters.dateFrom.toISOString());
      }

      if (filters?.dateTo) {
        query = query.lte('created_at', filters.dateTo.toISOString());
      }

      const limit = filters?.limit || 50;
      const offset = filters?.offset || 0;
      query = query.range(offset, offset + limit - 1);

      const { data: orders, error } = await query;

      if (error) {
        throw new OrderError('Failed to list orders', { error });
      }

      return (orders || []).map((order: any) =>
        this.formatOrder(order, order.order_items || [])
      );
    } catch (error) {
      if (error instanceof OrderError) {
        throw error;
      }
      throw new OrderError('Failed to list orders', {
        originalError: error,
      });
    }
  }

  /**
   * Update order status
   */
  async updateStatus(
    orderId: string,
    status: OrderStatus,
    previousStatus?: OrderStatus
  ): Promise<Order> {
    try {
      const { data: order, error } = await this.supabase
        .from('orders')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)
        .select()
        .single();

      if (error || !order) {
        throw new OrderError('Failed to update order status', { error });
      }

      // Create status history entry
      await this.supabase.from('order_status_history').insert({
        order_id: orderId,
        status,
        previous_status: previousStatus,
        source: 'system',
      });

      return this.getOrder(orderId);
    } catch (error) {
      if (error instanceof OrderError) {
        throw error;
      }
      throw new OrderError('Failed to update order status', {
        originalError: error,
      });
    }
  }

  /**
   * Sync order status with Prodigi
   */
  async syncWithProdigi(orderId: string): Promise<Order> {
    try {
      const order = await this.getOrder(orderId);

      // Get dropship order
      const { data: dropshipOrder } = await this.supabase
        .from('dropship_orders')
        .select('*')
        .eq('order_id', orderId)
        .eq('provider', 'prodigi')
        .single();

      if (!dropshipOrder || !dropshipOrder.provider_order_id) {
        throw new OrderError('Prodigi order not found');
      }

      // Get Prodigi order status from stored response or fetch fresh
      let prodigiOrder = dropshipOrder.provider_response;
      
      // If we have a provider_order_id but no response, we could fetch it
      // For now, we'll use the stored response
      if (!prodigiOrder && dropshipOrder.provider_order_id) {
        // Note: Would need ProdigiClient instance to fetch fresh status
        // For now, use stored response or return error
        throw new OrderError('Prodigi order status not available');
      }

      // Map Prodigi status to internal status
      const statusMap: Record<string, OrderStatus> = {
        InProgress: 'processing',
        Complete: 'shipped',
        Cancelled: 'cancelled',
        OnHold: 'pending',
        Error: 'failed',
      };

      const newStatus =
        statusMap[prodigiOrder.status?.stage || ''] || 'processing';

      // Update dropship order
      await this.supabase
        .from('dropship_orders')
        .update({
          status: newStatus,
          tracking_number: prodigiOrder.trackingNumber,
          tracking_url: prodigiOrder.trackingUrl,
          estimated_delivery: prodigiOrder.estimatedDelivery
            ? new Date(prodigiOrder.estimatedDelivery)
            : null,
          provider_response: prodigiOrder,
          updated_at: new Date().toISOString(),
        })
        .eq('id', dropshipOrder.id);

      // Update main order status
      return await this.updateStatus(orderId, newStatus, order.status);
    } catch (error) {
      if (error instanceof OrderError) {
        throw error;
      }
      throw new OrderError('Failed to sync with Prodigi', {
        originalError: error,
      });
    }
  }

  /**
   * Format database order to Order type
   */
  private formatOrder(dbOrder: any, orderItems: any[]): Order {
    return {
      id: dbOrder.id,
      orderNumber: dbOrder.order_number,
      userId: dbOrder.user_id,
      status: dbOrder.status,
      paymentStatus: dbOrder.payment_status,
      customer: {
        email: dbOrder.customer_email,
        name: dbOrder.customer_name,
        phone: dbOrder.customer_phone,
      },
      shipping: {
        address: dbOrder.shipping_address as ShippingAddress,
        method: dbOrder.shipping_method || 'Standard',
        cost: parseFloat(dbOrder.shipping_amount || '0'),
        estimatedDays: 7, // Calculate from Prodigi if available
      },
      billing: {
        address: (dbOrder.billing_address || dbOrder.shipping_address) as ShippingAddress,
      },
      items: orderItems.map((item: any) => ({
        id: item.id,
        orderId: item.order_id,
        productId: item.product_id,
        sku: item.products?.sku || '',
        name: item.products?.name || 'Framed Print',
        imageUrl:
          item.products?.images?.image_url ||
          item.products?.images?.thumbnail_url ||
          '',
        quantity: item.quantity,
        unitPrice: parseFloat(item.unit_price || '0'),
        totalPrice: parseFloat(item.total_price || '0'),
        frameConfig: {
          size: item.products?.frame_size || '16x20', // V2 sizing: default to "16x20" instead of 'medium'
          color: item.products?.frame_style || 'black',
          style: item.products?.frame_style || 'black',
          material: item.products?.frame_material || 'wood',
        },
        createdAt: new Date(item.created_at),
      })),
      pricing: {
        subtotal: parseFloat(dbOrder.subtotal || '0'),
        shipping: parseFloat(dbOrder.shipping_amount || '0'),
        tax: parseFloat(dbOrder.tax_amount || '0'),
        total: parseFloat(dbOrder.total_amount || '0'),
        currency: dbOrder.currency || 'USD',
        originalCurrency: dbOrder.metadata?.originalCurrency,
        originalTotal: dbOrder.metadata?.originalTotal,
        exchangeRate: dbOrder.metadata?.exchangeRate,
      },
      payment: {
        stripeSessionId: dbOrder.stripe_session_id,
        stripePaymentIntentId: dbOrder.stripe_payment_intent_id,
        paidAt: dbOrder.payment_status === 'paid' ? new Date(dbOrder.updated_at) : undefined,
      },
      prodigi: dbOrder.dropship_orders?.[0]
        ? {
            orderId: dbOrder.dropship_orders[0].provider_order_id,
            status: dbOrder.dropship_orders[0].status,
            trackingNumber: dbOrder.dropship_orders[0].tracking_number,
            trackingUrl: dbOrder.dropship_orders[0].tracking_url,
            estimatedDelivery: dbOrder.dropship_orders[0].estimated_delivery
              ? new Date(dbOrder.dropship_orders[0].estimated_delivery)
              : undefined,
          }
        : undefined,
      metadata: dbOrder.metadata || {},
      createdAt: new Date(dbOrder.created_at),
      updatedAt: new Date(dbOrder.updated_at || dbOrder.created_at),
    };
  }
}

