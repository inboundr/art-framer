import { createClient } from '@/lib/supabase/server';
import { prodigiClient } from '@/lib/prodigi';

interface RetryConfig {
  maxRetries: number;
  baseDelay: number; // in milliseconds
  maxDelay: number; // in milliseconds
  backoffMultiplier: number;
}

interface RetryableOperation {
  id: string;
  type: 'prodigi_order_creation' | 'prodigi_status_update' | 'stripe_webhook' | 'notification_send';
  orderId: string;
  payload: any;
  attempts: number;
  lastAttempt: Date;
  nextRetry: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  error?: string;
  result?: any;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 5,
  baseDelay: 1000, // 1 second
  maxDelay: 300000, // 5 minutes
  backoffMultiplier: 2,
};

export class OrderRetryManager {
  private config: RetryConfig;

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
  }

  /**
   * Calculate the delay for the next retry attempt
   */
  private calculateDelay(attempt: number): number {
    const delay = this.config.baseDelay * Math.pow(this.config.backoffMultiplier, attempt - 1);
    return Math.min(delay, this.config.maxDelay);
  }

  /**
   * Schedule a retryable operation
   */
  async scheduleOperation(
    type: RetryableOperation['type'],
    orderId: string,
    payload: any,
    immediate: boolean = false
  ): Promise<string> {
    const { createServiceClient } = await import('@/lib/supabase/server');
    const supabase = await createServiceClient();
    
    const operationId = `retry_${type}_${orderId}_${Date.now()}`;
    const nextRetry = immediate 
      ? new Date() 
      : new Date(Date.now() + this.calculateDelay(1));

    const operation: RetryableOperation = {
      id: operationId,
      type,
      orderId,
      payload,
      attempts: 0,
      lastAttempt: new Date(),
      nextRetry,
      status: 'pending',
    };

    // Store in database for persistence
    const { error } = await (supabase as any)
      .from('retry_operations')
      .insert({
        id: operationId,
        type,
        order_id: orderId,
        payload,
        attempts: 0,
        last_attempt: new Date().toISOString(),
        next_retry: nextRetry.toISOString(),
        status: 'pending',
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Error scheduling retry operation:', error);
      throw new Error(`Failed to schedule retry operation: ${error.message}`);
    }

    // If immediate, process right away
    if (immediate) {
      await this.processOperation(operationId);
    }

    return operationId;
  }

  /**
   * Process a retryable operation
   */
  async processOperation(operationId: string): Promise<boolean> {
    const { createServiceClient } = await import('@/lib/supabase/server');
    const supabase = await createServiceClient();
    
    // Fetch operation from database
    const { data: operation, error: fetchError } = await (supabase as any)
      .from('retry_operations')
      .select('*')
      .eq('id', operationId)
      .single();

    if (fetchError || !operation) {
      console.error('Operation not found:', operationId);
      return false;
    }

    // Check if operation should be retried
    if (operation.attempts >= this.config.maxRetries) {
      await this.markOperationFailed(operationId, 'Max retries exceeded');
      return false;
    }

    if (operation.status === 'completed' || operation.status === 'cancelled') {
      return true;
    }

    // Update operation status to processing
    await (supabase as any)
      .from('retry_operations')
      .update({
        status: 'processing',
        attempts: operation.attempts + 1,
        last_attempt: new Date().toISOString(),
      })
      .eq('id', operationId);

    try {
      let result: any;
      let success = false;

      // Execute the operation based on type
      switch (operation.type) {
        case 'prodigi_order_creation':
          result = await this.executeProdigiOrderCreation(operation.order_id, operation.payload);
          success = true;
          break;

        case 'prodigi_status_update':
          result = await this.executeProdigiStatusUpdate(operation.order_id, operation.payload);
          success = true;
          break;

        case 'stripe_webhook':
          result = await this.executeStripeWebhook(operation.order_id, operation.payload);
          success = true;
          break;

        case 'notification_send':
          result = await this.executeNotificationSend(operation.order_id, operation.payload);
          success = true;
          break;

        default:
          throw new Error(`Unknown operation type: ${operation.type}`);
      }

      if (success) {
        await this.markOperationCompleted(operationId, result);
        return true;
      }

    } catch (error) {
      console.error(`Error processing operation ${operationId}:`, error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.markOperationError(operationId, errorMessage);

      // Schedule next retry if not at max attempts
      if (operation.attempts + 1 < this.config.maxRetries) {
        const nextRetry = new Date(Date.now() + this.calculateDelay(operation.attempts + 1));
        
        await (supabase as any)
          .from('retry_operations')
          .update({
            status: 'pending',
            next_retry: nextRetry.toISOString(),
            error: errorMessage,
          })
          .eq('id', operationId);
      } else {
        await this.markOperationFailed(operationId, errorMessage);
      }

      return false;
    }

    return false;
  }

  /**
   * Execute Prodigi order creation
   */
  private async executeProdigiOrderCreation(orderId: string, payload: any): Promise<any> {
    const { createServiceClient } = await import('@/lib/supabase/server');
    const supabase = await createServiceClient();

    // Fetch order details
    const { data: order, error: orderError } = await (supabase as any)
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          products (
            *,
            images (
              image_url,
              thumbnail_url
            )
          )
        )
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      throw new Error(`Order not found: ${orderError?.message}`);
    }

    // Prepare Prodigi order data
    const prodigiOrderData = {
      orderReference: order.order_number || `ORDER-${orderId.slice(-8)}`,
      items: await Promise.all(order.order_items.map(async (item: any) => {
        // Extract base SKU from stored SKU (remove image ID suffix if present)
        const baseSku = prodigiClient.extractBaseProdigiSku(item.products?.sku || '');
        
        // Validate that we have a valid SKU
        if (!baseSku || baseSku.trim() === '') {
          throw new Error(`Invalid SKU for product ${item.products?.id}: ${item.products?.sku}`);
        }
        
        // CRITICAL: Convert image URL to public URL if it's a storage path
        // Prodigi requires publicly accessible absolute URLs
        const rawImageUrl = item.products?.images?.image_url || item.products?.images?.thumbnail_url || '';
        
        // Helper function to get public URL
        const getPublicImageUrl = (imageUrl: string | null | undefined): string | null => {
          if (!imageUrl) return null;
          if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) return imageUrl;
          
          // Try to determine bucket
          let bucket = 'images';
          if (imageUrl.includes('curated') || imageUrl.includes('public-')) {
            bucket = 'curated-images';
          }
          
          try {
            const { data } = supabase.storage.from(bucket).getPublicUrl(imageUrl);
            return data?.publicUrl || imageUrl;
          } catch {
            return imageUrl;
          }
        };
        
        const publicImageUrl = getPublicImageUrl(rawImageUrl);
        
        if (!publicImageUrl) {
          throw new Error(`Missing or invalid image URL for product ${item.products?.id}`);
        }
        
        return {
          productSku: baseSku,
          quantity: item.quantity,
          imageUrl: publicImageUrl, // Use public URL instead of raw path
          frameSize: item.products?.frame_size || 'medium',
          frameStyle: item.products?.frame_style || 'black',
          frameMaterial: item.products?.frame_material || 'wood',
        };
      })),
      shippingAddress: order.shipping_address,
      billingAddress: order.billing_address, // Include billing address for Prodigi
      customerEmail: order.customer_email,
      customerPhone: order.customer_phone,
    };

    // Create Prodigi order
    const prodigiOrder = await prodigiClient.convertToProdigiOrder(prodigiOrderData);
    const prodigiResponse = await prodigiClient.createOrder(prodigiOrder);

    // Update dropship order
    const { error: updateError } = await (supabase as any)
      .from('dropship_orders')
      .update({
        provider_order_id: prodigiResponse.id,
        tracking_number: prodigiResponse.trackingNumber,
        tracking_url: prodigiResponse.trackingUrl,
        estimated_delivery: prodigiResponse.estimatedDelivery ? new Date(prodigiResponse.estimatedDelivery) : null,
        provider_response: prodigiResponse,
        status: prodigiResponse.status.toLowerCase(),
        updated_at: new Date().toISOString(),
      })
      .eq('order_id', orderId)
      .eq('provider', 'prodigi');

    if (updateError) {
      throw new Error(`Failed to update dropship order: ${updateError.message}`);
    }

    // Update main order status
    await (supabase as any)
      .from('orders')
      .update({
        status: 'processing',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    return prodigiResponse;
  }

  /**
   * Execute Prodigi status update
   */
  private async executeProdigiStatusUpdate(orderId: string, payload: any): Promise<any> {
    const { createServiceClient } = await import('@/lib/supabase/server');
    const supabase = await createServiceClient();

    // Fetch dropship order
    const { data: dropshipOrder, error: dropshipError } = await (supabase as any)
      .from('dropship_orders')
      .select('*')
      .eq('order_id', orderId)
      .eq('provider', 'prodigi')
      .single();

    if (dropshipError || !dropshipOrder || !dropshipOrder.provider_order_id) {
      throw new Error('Prodigi order not found');
    }

    // Get updated status from Prodigi
    const prodigiOrder = await prodigiClient.getOrder(dropshipOrder.provider_order_id);

    // Update local record
    const { error: updateError } = await (supabase as any)
      .from('dropship_orders')
      .update({
        status: prodigiOrder.status.toLowerCase(),
        tracking_number: prodigiOrder.trackingNumber,
        tracking_url: prodigiOrder.trackingUrl,
        estimated_delivery: prodigiOrder.estimatedDelivery ? new Date(prodigiOrder.estimatedDelivery) : null,
        provider_response: prodigiOrder,
        updated_at: new Date().toISOString(),
      })
      .eq('id', dropshipOrder.id);

    if (updateError) {
      throw new Error(`Failed to update dropship order: ${updateError.message}`);
    }

    return prodigiOrder;
  }

  /**
   * Execute Stripe webhook processing
   */
  private async executeStripeWebhook(orderId: string, payload: any): Promise<any> {
    // This would contain the Stripe webhook processing logic
    // For now, just return success
    return { success: true };
  }

  /**
   * Execute notification sending
   */
  private async executeNotificationSend(orderId: string, payload: any): Promise<any> {
    const { createServiceClient } = await import('@/lib/supabase/server');
    const supabase = await createServiceClient();

    // Create notification using the stored function
    const { data, error } = await (supabase as any).rpc('create_order_notification', {
      p_order_id: orderId,
      p_type: payload.type,
      p_title: payload.title,
      p_message: payload.message,
      p_metadata: payload.metadata,
    });

    if (error) {
      throw new Error(`Failed to create notification: ${error.message}`);
    }

    return data;
  }

  /**
   * Mark operation as completed
   */
  private async markOperationCompleted(operationId: string, result: any): Promise<void> {
    const { createServiceClient } = await import('@/lib/supabase/server');
    const supabase = await createServiceClient();
    
    await (supabase as any)
      .from('retry_operations')
      .update({
        status: 'completed',
        result,
        completed_at: new Date().toISOString(),
      })
      .eq('id', operationId);
  }


  /**
   * Mark operation with error (for retry)
   */
  private async markOperationError(operationId: string, error: string): Promise<void> {
    const { createServiceClient } = await import('@/lib/supabase/server');
    const supabase = await createServiceClient();
    
    await (supabase as any)
      .from('retry_operations')
      .update({
        error,
      })
      .eq('id', operationId);
  }

  /**
   * Get pending operations
   */
  async getPendingOperations(): Promise<RetryableOperation[]> {
    const { createServiceClient } = await import('@/lib/supabase/server');
    const supabase = await createServiceClient();
    
    const { data, error } = await (supabase as any)
      .from('retry_operations')
      .select('*')
      .eq('status', 'pending')
      .lte('next_retry', new Date().toISOString())
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching pending operations:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Mark operation as complete (public method)
   */
  async markOperationComplete(operationId: string): Promise<boolean> {
    try {
      const { createServiceClient } = await import('@/lib/supabase/server');
      const supabase = await createServiceClient();
      
      const { error } = await (supabase as any)
        .from('retry_operations')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', operationId);

      if (error) {
        console.error('Error marking operation complete:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error marking operation complete:', error);
      return false;
    }
  }

  /**
   * Mark operation as failed (public method)
   */
  async markOperationFailed(operationId: string, error: string): Promise<boolean> {
    try {
      const { createServiceClient } = await import('@/lib/supabase/server');
      const supabase = await createServiceClient();
      
      const { error: updateError } = await (supabase as any)
        .from('retry_operations')
        .update({
          status: 'failed',
          error,
          failed_at: new Date().toISOString(),
        })
        .eq('id', operationId);

      if (updateError) {
        console.error('Error marking operation failed:', updateError);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error marking operation failed:', error);
      return false;
    }
  }

  /**
   * Process all pending retry operations
   */
  async processPendingOperations(): Promise<{ processed: number; failed: number }> {
    const { createServiceClient } = await import('@/lib/supabase/server');
    const supabase = await createServiceClient();
    
    // Fetch all pending operations that are due for retry
    const { data: operations, error } = await (supabase as any)
      .from('retry_operations')
      .select('*')
      .eq('status', 'pending')
      .lte('next_retry', new Date().toISOString())
      .order('next_retry', { ascending: true });

    if (error) {
      console.error('Error fetching pending operations:', error);
      return { processed: 0, failed: 0 };
    }

    let processed = 0;
    let failed = 0;

    for (const operation of operations || []) {
      try {
        const success = await this.processOperation(operation.id);
        if (success) {
          processed++;
        } else {
          failed++;
        }
      } catch (error) {
        console.error(`Error processing operation ${operation.id}:`, error);
        failed++;
      }
    }

    return { processed, failed };
  }

  /**
   * Get retry statistics
   */
  async getRetryStats(): Promise<{
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    cancelled: number;
  }> {
    const { createServiceClient } = await import('@/lib/supabase/server');
    const supabase = await createServiceClient();
    
    const { data, error } = await (supabase as any)
      .from('retry_operations')
      .select('status')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours

    if (error) {
      console.error('Error fetching retry stats:', error);
      return { total: 0, pending: 0, processing: 0, completed: 0, failed: 0, cancelled: 0 };
    }

    const stats = {
      total: data.length,
      pending: data.filter((op: any) => op.status === 'pending').length,
      processing: data.filter((op: any) => op.status === 'processing').length,
      completed: data.filter((op: any) => op.status === 'completed').length,
      failed: data.filter((op: any) => op.status === 'failed').length,
      cancelled: data.filter((op: any) => op.status === 'cancelled').length,
    };

    return stats;
  }
}

// Export singleton instance
export const orderRetryManager = new OrderRetryManager();
