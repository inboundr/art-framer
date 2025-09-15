import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const OrderStatusUpdateSchema = z.object({
  orderId: z.string().uuid(),
  status: z.enum(['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']),
  reason: z.string().optional(),
  trackingNumber: z.string().optional(),
  trackingUrl: z.string().optional(),
  estimatedDelivery: z.string().optional(),
  notes: z.string().optional(),
});

const OrderQuerySchema = z.object({
  status: z.string().optional(),
  userId: z.string().uuid().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  limit: z.string().transform(Number).optional(),
  offset: z.string().transform(Number).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate query parameters
    const queryParams = {
      status: searchParams.get('status'),
      userId: searchParams.get('userId'),
      dateFrom: searchParams.get('dateFrom'),
      dateTo: searchParams.get('dateTo'),
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
    };

    const validatedQuery = OrderQuerySchema.parse(queryParams);

    // Build query
    let query = supabase
      .from('order_details')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters
    if (validatedQuery.status) {
      query = query.eq('status', validatedQuery.status);
    }

    if (validatedQuery.userId) {
      query = query.eq('user_id', validatedQuery.userId);
    }

    if (validatedQuery.dateFrom) {
      query = query.gte('created_at', validatedQuery.dateFrom);
    }

    if (validatedQuery.dateTo) {
      query = query.lte('created_at', validatedQuery.dateTo);
    }

    // Apply pagination
    const limit = validatedQuery.limit || 50;
    const offset = validatedQuery.offset || 0;
    query = query.range(offset, offset + limit - 1);

    const { data: orders, error } = await query;

    if (error) {
      console.error('Error fetching orders:', error);
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
    }

    // Get total count for pagination
    const { count } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      orders,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (offset + limit) < (count || 0),
      },
    });

  } catch (error) {
    console.error('Error in GET /api/orders/management:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication (admin only for order updates)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin (you might want to implement proper admin check)
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = OrderStatusUpdateSchema.parse(body);

    // Update the order
    const updateData: any = {
      status: validatedData.status,
      updated_at: new Date().toISOString(),
    };

    if (validatedData.trackingNumber) {
      updateData.tracking_number = validatedData.trackingNumber;
    }

    if (validatedData.trackingUrl) {
      updateData.tracking_url = validatedData.trackingUrl;
    }

    if (validatedData.estimatedDelivery) {
      updateData.estimated_delivery_date = new Date(validatedData.estimatedDelivery);
    }

    if (validatedData.notes) {
      updateData.notes = validatedData.notes;
    }

    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', validatedData.orderId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating order:', updateError);
      return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
    }

    // Log the status change
    await supabase
      .from('order_logs')
      .insert({
        order_id: validatedData.orderId,
        action: 'status_updated',
        details: {
          new_status: validatedData.status,
          reason: validatedData.reason,
          tracking_number: validatedData.trackingNumber,
          tracking_url: validatedData.trackingUrl,
          estimated_delivery: validatedData.estimatedDelivery,
          notes: validatedData.notes,
          updated_by: user.id,
        },
      });

    // Create customer notification
    const notificationTypes = {
      'processing': { type: 'order_processing', title: 'Order Processing', message: 'Your order is now being processed.' },
      'shipped': { type: 'order_shipped', title: 'Order Shipped', message: 'Your order has been shipped and is on its way!' },
      'delivered': { type: 'order_delivered', title: 'Order Delivered', message: 'Your order has been delivered successfully.' },
      'cancelled': { type: 'order_cancelled', title: 'Order Cancelled', message: 'Your order has been cancelled.' },
      'refunded': { type: 'order_refunded', title: 'Order Refunded', message: 'Your order has been refunded.' },
    };

    const notification = notificationTypes[validatedData.status as keyof typeof notificationTypes];
    if (notification) {
      await supabase.rpc('create_order_notification', {
        p_order_id: validatedData.orderId,
        p_type: notification.type,
        p_title: notification.title,
        p_message: notification.message,
        p_metadata: {
          tracking_number: validatedData.trackingNumber,
          tracking_url: validatedData.trackingUrl,
          estimated_delivery: validatedData.estimatedDelivery,
          reason: validatedData.reason,
        },
      });
    }

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      message: 'Order updated successfully',
    });

  } catch (error) {
    console.error('Error in PATCH /api/orders/management:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
