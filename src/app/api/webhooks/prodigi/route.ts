import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";

// CloudEvents schema for Prodigi webhooks
const CloudEventSchema = z.object({
  specversion: z.string(),
  type: z.string(),
  source: z.string(),
  id: z.string(),
  time: z.string(),
  datacontenttype: z.string(),
  data: z.object({
    id: z.string(),
    created: z.string(),
    status: z.object({
      stage: z.string(),
      issues: z.array(z.any()).optional(),
      details: z.object({
        downloadAssets: z.string().optional(),
        printReadyAssetsPrepared: z.string().optional(),
        allocateProductionLocation: z.string().optional(),
        inProduction: z.string().optional(),
        shipping: z.string().optional(),
      }).optional(),
    }),
    shipments: z.array(z.object({
      id: z.string(),
      status: z.string(),
      carrier: z.object({
        name: z.string(),
        service: z.string(),
      }).optional(),
      tracking: z.object({
        url: z.string().optional(),
        number: z.string().optional(),
      }).optional(),
      dispatchDate: z.string().optional(),
    })).optional(),
    merchantReference: z.string().optional(),
  }),
  subject: z.string(),
});

// Validate CloudEvent source
function validateCloudEventSource(source: string): boolean {
  const allowedSources = [
    'http://api.prodigi.com/v4.0/Orders/',
    'https://api.prodigi.com/v4.0/Orders/',
    'http://api.sandbox.prodigi.com/v4.0/Orders/',
    'https://api.sandbox.prodigi.com/v4.0/Orders/',
  ];
  
  return allowedSources.includes(source);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const webhookData = JSON.parse(body);
    
    // Validate CloudEvent format
    const cloudEvent = CloudEventSchema.parse(webhookData);
    
    // Validate source (security check)
    if (!validateCloudEventSource(cloudEvent.source)) {
      console.error('Invalid CloudEvent source:', cloudEvent.source);
      return NextResponse.json({ error: 'Invalid source' }, { status: 401 });
    }
    
    // Validate content type
    if (cloudEvent.datacontenttype !== 'application/json') {
      console.error('Invalid content type:', cloudEvent.datacontenttype);
      return NextResponse.json({ error: 'Invalid content type' }, { status: 400 });
    }

    console.log('Received Prodigi CloudEvent:', {
      type: cloudEvent.type,
      id: cloudEvent.id,
      orderId: cloudEvent.data.id,
      stage: cloudEvent.data.status.stage,
    });

    const supabase = createServiceClient();

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
      .eq('provider_order_id', cloudEvent.data.id)
      .eq('provider', 'prodigi')
      .single();

    if (dropshipError || !dropshipOrder) {
      console.error('Dropship order not found for Prodigi order:', cloudEvent.data.id);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const orderId = (dropshipOrder as any).order_id;
    const oldStatus = (dropshipOrder as any).status;
    
    // Map Prodigi stage to our status
    let newStatus: string;
    switch (cloudEvent.data.status.stage) {
      case 'InProgress':
        newStatus = 'processing';
        break;
      case 'Complete':
        newStatus = 'delivered';
        break;
      case 'Cancelled':
        newStatus = 'cancelled';
        break;
      default:
        newStatus = oldStatus;
    }

    // Update dropship order
    const updateData: any = {
      status: newStatus,
      updated_at: new Date().toISOString(),
      provider_response: cloudEvent,
    };

    // Handle shipments if available
    if (cloudEvent.data.shipments && cloudEvent.data.shipments.length > 0) {
      const shipment = cloudEvent.data.shipments[0]; // Take first shipment
      if (shipment.tracking?.number) {
        updateData.tracking_number = shipment.tracking.number;
      }
      if (shipment.tracking?.url) {
        updateData.tracking_url = shipment.tracking.url;
      }
      if (shipment.dispatchDate) {
        updateData.estimated_delivery = new Date(shipment.dispatchDate);
      }
    }

    const { error: updateError } = await (supabase as any)
      .from('dropship_orders')
      .update(updateData)
      .eq('id', (dropshipOrder as any).id);

    if (updateError) {
      console.error('Error updating dropship order:', updateError);
      return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
    }

    // Update main order status
    const orderStatusUpdate: any = {
      updated_at: new Date().toISOString(),
    };

    switch (newStatus) {
      case 'processing':
        orderStatusUpdate.status = 'processing';
        break;
      case 'delivered':
        orderStatusUpdate.status = 'delivered';
        break;
      case 'cancelled':
        orderStatusUpdate.status = 'cancelled';
        break;
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
          cloud_event_type: cloudEvent.type,
          cloud_event_id: cloudEvent.id,
          prodigi_order_id: cloudEvent.data.id,
          old_status: oldStatus,
          new_status: newStatus,
          stage: cloudEvent.data.status.stage,
          shipments: cloudEvent.data.shipments,
        },
      });

    // Create customer notification based on stage
    const notificationTypes = {
      'InProgress': {
        type: 'order_processing',
        title: 'Order Processing Started',
        message: 'Your order is now being processed and will be ready for shipping soon.',
      },
      'Complete': {
        type: 'order_delivered',
        title: 'Order Delivered!',
        message: 'Your order has been delivered successfully. Thank you for your purchase!',
      },
      'Cancelled': {
        type: 'order_cancelled',
        title: 'Order Cancelled',
        message: 'Your order has been cancelled. If you have any questions, please contact support.',
      },
    };

    const notification = notificationTypes[cloudEvent.data.status.stage as keyof typeof notificationTypes];
    if (notification) {
      await (supabase as any).rpc('create_order_notification', {
        p_order_id: orderId,
        p_type: notification.type,
        p_title: notification.title,
        p_message: notification.message,
        p_metadata: {
          prodigi_order_id: cloudEvent.data.id,
          cloud_event_id: cloudEvent.id,
          stage: cloudEvent.data.status.stage,
          shipments: cloudEvent.data.shipments,
        },
      });
    }

    console.log(`✅ Prodigi CloudEvent processed successfully: ${oldStatus} → ${newStatus}`);

    return NextResponse.json({ 
      success: true, 
      message: 'CloudEvent processed successfully',
      orderId,
      statusChange: `${oldStatus} → ${newStatus}`,
      cloudEventId: cloudEvent.id,
    });

  } catch (error) {
    console.error('Error processing Prodigi CloudEvent:', error);
    
    if (error instanceof z.ZodError) {
      console.error('CloudEvent validation error:', error.issues);
      return NextResponse.json(
        { error: 'Invalid CloudEvent payload', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'CloudEvent processing failed' },
      { status: 500 }
    );
  }
}

// Handle GET requests for webhook verification
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const challenge = searchParams.get('challenge');
    
    if (challenge) {
      return NextResponse.json({ challenge });
    }

    return NextResponse.json({ 
      message: 'Prodigi webhook endpoint is active',
      timestamp: new Date().toISOString(),
      format: 'CloudEvents',
    });

  } catch (error) {
    console.error('Error in GET /api/webhooks/prodigi:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
