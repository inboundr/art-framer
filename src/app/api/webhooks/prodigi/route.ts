import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

// Prodigi webhook payload schema
const ProdigiWebhookSchema = z.object({
  id: z.string(),
  type: z.string(),
  data: z.object({
    id: z.string(),
    status: z.string(),
    trackingNumber: z.string().optional(),
    trackingUrl: z.string().optional(),
    estimatedDeliveryDate: z.string().optional(),
    merchantReference: z.string().optional(),
  }),
  created: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-prodigi-signature');

    // Verify webhook signature (you should implement proper signature verification)
    if (!signature) {
      console.warn('Prodigi webhook received without signature');
      // In production, you might want to reject unsigned webhooks
    }

    const webhookData = JSON.parse(body);
    const validatedData = ProdigiWebhookSchema.parse(webhookData);

    console.log('Received Prodigi webhook:', validatedData.type, validatedData.data.id);

    const supabase = await createClient();

    // Find the order by Prodigi order ID
    const { data: dropshipOrder, error: dropshipError } = await supabase
      .from('dropship_orders')
      .select(`
        *,
        orders (
          id,
          user_id,
          order_number,
          status
        )
      `)
      .eq('provider_order_id', validatedData.data.id)
      .eq('provider', 'prodigi')
      .single();

    if (dropshipError || !dropshipOrder) {
      console.error('Dropship order not found for Prodigi order:', validatedData.data.id);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const orderId = (dropshipOrder as any).order_id;
    const oldStatus = (dropshipOrder as any).status;
    const newStatus = validatedData.data.status.toLowerCase();

    // Update dropship order
    const updateData: any = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    if (validatedData.data.trackingNumber) {
      updateData.tracking_number = validatedData.data.trackingNumber;
    }

    if (validatedData.data.trackingUrl) {
      updateData.tracking_url = validatedData.data.trackingUrl;
    }

    if (validatedData.data.estimatedDeliveryDate) {
      updateData.estimated_delivery = new Date(validatedData.data.estimatedDeliveryDate);
    }

    // Store the full webhook response
    updateData.provider_response = validatedData;

    const { error: updateError } = await (supabase as any)
      .from('dropship_orders')
      .update(updateData)
      .eq('id', (dropshipOrder as any).id);

    if (updateError) {
      console.error('Error updating dropship order:', updateError);
      return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
    }

    // Update main order status based on Prodigi status
      const orderStatusUpdate: any = {
      updated_at: new Date().toISOString(),
    };

    switch (newStatus) {
      case 'inprogress':
        orderStatusUpdate.status = 'processing';
        break;
      case 'shipped':
        orderStatusUpdate.status = 'shipped';
        if (validatedData.data.trackingNumber) {
          orderStatusUpdate.tracking_number = validatedData.data.trackingNumber;
        }
        if (validatedData.data.trackingUrl) {
          orderStatusUpdate.tracking_url = validatedData.data.trackingUrl;
        }
        break;
      case 'delivered':
        orderStatusUpdate.status = 'delivered';
        break;
      case 'cancelled':
        orderStatusUpdate.status = 'cancelled';
        break;
      case 'failed':
        orderStatusUpdate.status = 'cancelled';
        break;
    }

    if (validatedData.data.estimatedDeliveryDate) {
      orderStatusUpdate.estimated_delivery_date = new Date(validatedData.data.estimatedDeliveryDate);
    }

    // Update main order
    const { error: orderUpdateError } = await (supabase as any)
      .from('orders')
      .update(orderStatusUpdate)
      .eq('id', orderId);

    if (orderUpdateError) {
      console.error('Error updating main order:', orderUpdateError);
    }

    // Log the status change
    await (supabase as any)
      .from('order_logs')
      .insert({
        order_id: orderId,
        action: 'prodigi_webhook_update',
        details: {
          webhook_type: validatedData.type,
          prodigi_order_id: validatedData.data.id,
          old_status: oldStatus,
          new_status: newStatus,
          tracking_number: validatedData.data.trackingNumber,
          tracking_url: validatedData.data.trackingUrl,
          estimated_delivery: validatedData.data.estimatedDeliveryDate,
        },
      });

    // Create customer notification
    const notificationTypes = {
      'inprogress': {
        type: 'order_processing',
        title: 'Order Processing Started',
        message: 'Your order is now being processed and will be ready for shipping soon.',
      },
      'shipped': {
        type: 'order_shipped',
        title: 'Order Shipped!',
        message: `Your order has been shipped! Track your package using tracking number: ${validatedData.data.trackingNumber || 'Check your order details'}`,
      },
      'delivered': {
        type: 'order_delivered',
        title: 'Order Delivered!',
        message: 'Your order has been delivered successfully. Thank you for your purchase!',
      },
      'cancelled': {
        type: 'order_cancelled',
        title: 'Order Cancelled',
        message: 'Your order has been cancelled. If you have any questions, please contact support.',
      },
      'failed': {
        type: 'order_failed',
        title: 'Order Failed',
        message: 'There was an issue processing your order. Our team will contact you shortly.',
      },
    };

    const notification = notificationTypes[newStatus as keyof typeof notificationTypes];
    if (notification) {
      await (supabase as any).rpc('create_order_notification', {
        p_order_id: orderId,
        p_type: notification.type,
        p_title: notification.title,
        p_message: notification.message,
        p_metadata: {
          prodigi_order_id: validatedData.data.id,
          tracking_number: validatedData.data.trackingNumber,
          tracking_url: validatedData.data.trackingUrl,
          estimated_delivery: validatedData.data.estimatedDeliveryDate,
          webhook_type: validatedData.type,
        },
      });
    }

    console.log(`✅ Prodigi webhook processed successfully: ${oldStatus} → ${newStatus}`);

    return NextResponse.json({ 
      success: true, 
      message: 'Webhook processed successfully',
      orderId,
      statusChange: `${oldStatus} → ${newStatus}`,
    });

  } catch (error) {
    console.error('Error processing Prodigi webhook:', error);
    
    if (error instanceof z.ZodError) {
      console.error('Webhook validation error:', error.issues);
      return NextResponse.json(
        { error: 'Invalid webhook payload', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// Handle GET requests for webhook verification (if Prodigi requires it)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const challenge = searchParams.get('challenge');
    
    if (challenge) {
      // Echo back the challenge for webhook verification
      return NextResponse.json({ challenge });
    }

    return NextResponse.json({ 
      message: 'Prodigi webhook endpoint is active',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error in GET /api/webhooks/prodigi:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
