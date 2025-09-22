import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prodigiClient } from "@/lib/prodigi";
import { z } from "zod";

const OrderIdSchema = z.object({
  id: z.string().uuid(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const validatedParams = OrderIdSchema.parse({ id });

    // Fetch order with all related data
    const { data: order, error: orderError } = await supabase
      .from('order_details')
      .select('*')
      .eq('id', validatedParams.id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Check if user owns this order or is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if ((order as any).user_id !== user.id && !(profile as any)?.is_admin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Fetch order status history
    const { data: statusHistory, error: historyError } = await supabase
      .from('order_status_history')
      .select('*')
      .eq('order_id', validatedParams.id)
      .order('created_at', { ascending: true });

    if (historyError) {
      console.error('Error fetching status history:', historyError);
    }

    // Fetch order logs
    const { data: orderLogs, error: logsError } = await supabase
      .from('order_logs')
      .select('*')
      .eq('order_id', validatedParams.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (logsError) {
      console.error('Error fetching order logs:', logsError);
    }

    // Fetch dropship order details
    const { data: dropshipOrders, error: dropshipError } = await supabase
      .from('dropship_orders')
      .select('*')
      .eq('order_id', validatedParams.id);

    if (dropshipError) {
      console.error('Error fetching dropship orders:', dropshipError);
    }

    // If there's a Prodigi order, try to get updated status
    let prodigiStatus = null;
    if (dropshipOrders && dropshipOrders.length > 0) {
      const prodigiOrder = dropshipOrders.find((d: any) => d.provider === 'prodigi' && d.provider_order_id);
      
      if (prodigiOrder) {
        try {
          const updatedProdigiOrder = await prodigiClient.getOrder((prodigiOrder as any).provider_order_id);
          prodigiStatus = {
            id: updatedProdigiOrder.id,
            status: updatedProdigiOrder.status,
            trackingNumber: updatedProdigiOrder.trackingNumber,
            trackingUrl: updatedProdigiOrder.trackingUrl,
            estimatedDelivery: updatedProdigiOrder.estimatedDelivery,
            lastUpdated: new Date().toISOString(),
          };

          // Update local dropship order if status changed
          if ((prodigiOrder as any).status !== updatedProdigiOrder.status.toLowerCase()) {
            await (supabase as any)
              .from('dropship_orders')
              .update({
                status: updatedProdigiOrder.status.toLowerCase(),
                tracking_number: updatedProdigiOrder.trackingNumber,
                tracking_url: updatedProdigiOrder.trackingUrl,
                estimated_delivery: updatedProdigiOrder.estimatedDelivery ? new Date(updatedProdigiOrder.estimatedDelivery) : null,
                provider_response: updatedProdigiOrder,
                updated_at: new Date().toISOString(),
              })
              .eq('id', (prodigiOrder as any).id);

            // Log the status update
            await (supabase as any)
              .from('order_logs')
              .insert({
                order_id: validatedParams.id,
                action: 'prodigi_status_updated',
                details: {
                  old_status: (prodigiOrder as any).status,
                  new_status: updatedProdigiOrder.status.toLowerCase(),
                  tracking_number: updatedProdigiOrder.trackingNumber,
                  tracking_url: updatedProdigiOrder.trackingUrl,
                },
              });

            // Update main order if it has tracking info
            if (updatedProdigiOrder.trackingNumber && !(order as any).tracking_number) {
              await (supabase as any)
                .from('orders')
                .update({
                  tracking_number: updatedProdigiOrder.trackingNumber,
                  tracking_url: updatedProdigiOrder.trackingUrl,
                  estimated_delivery_date: updatedProdigiOrder.estimatedDelivery ? new Date(updatedProdigiOrder.estimatedDelivery) : null,
                  status: updatedProdigiOrder.status.toLowerCase() === 'shipped' ? 'shipped' : (order as any).status,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', validatedParams.id);
            }
          }
        } catch (error) {
          console.error('Error fetching Prodigi order status:', error);
          prodigiStatus = {
            error: 'Failed to fetch latest status from Prodigi',
            lastAttempt: new Date().toISOString(),
          };
        }
      }
    }

    // Fetch order items with product details
    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select(`
        *,
        products (
          *,
          images (
            image_url,
            thumbnail_url
          )
        )
      `)
      .eq('order_id', validatedParams.id);

    if (itemsError) {
      console.error('Error fetching order items:', itemsError);
    }

    return NextResponse.json({
      order: {
        ...(order as any),
        items: orderItems || [],
      },
      statusHistory: statusHistory || [],
      orderLogs: orderLogs || [],
      dropshipOrders: dropshipOrders || [],
      prodigiStatus,
      lastUpdated: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error in GET /api/orders/[id]/status:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid order ID', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    
    // Check authentication (admin only for manual status updates)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!(profile as any)?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const validatedParams = OrderIdSchema.parse({ id });
    const body = await request.json();
    
    const { action } = body;

    if (action === 'refresh_prodigi_status') {
      // Manually refresh Prodigi status
      const { data: dropshipOrders, error: dropshipError } = await supabase
        .from('dropship_orders')
        .select('*')
        .eq('order_id', validatedParams.id)
        .eq('provider', 'prodigi');

      if (dropshipError || !dropshipOrders || dropshipOrders.length === 0) {
        return NextResponse.json({ error: 'No Prodigi order found' }, { status: 404 });
      }

      const prodigiOrder = dropshipOrders[0];
      if (!(prodigiOrder as any).provider_order_id) {
        return NextResponse.json({ error: 'No Prodigi order ID found' }, { status: 404 });
      }

      try {
        const updatedProdigiOrder = await prodigiClient.getOrder((prodigiOrder as any).provider_order_id);
        
        // Update dropship order
        await (supabase as any)
          .from('dropship_orders')
          .update({
            status: updatedProdigiOrder.status.toLowerCase(),
            tracking_number: updatedProdigiOrder.trackingNumber,
            tracking_url: updatedProdigiOrder.trackingUrl,
            estimated_delivery: updatedProdigiOrder.estimatedDelivery ? new Date(updatedProdigiOrder.estimatedDelivery) : null,
            provider_response: updatedProdigiOrder,
            updated_at: new Date().toISOString(),
          })
          .eq('id', (prodigiOrder as any).id);

        // Log the manual refresh
        await (supabase as any)
          .from('order_logs')
          .insert({
            order_id: validatedParams.id,
            action: 'manual_prodigi_refresh',
            details: {
              old_status: (prodigiOrder as any).status,
              new_status: updatedProdigiOrder.status.toLowerCase(),
              tracking_number: updatedProdigiOrder.trackingNumber,
              tracking_url: updatedProdigiOrder.trackingUrl,
              refreshed_by: user.id,
            },
          });

        return NextResponse.json({
          success: true,
          message: 'Prodigi status refreshed successfully',
          prodigiStatus: {
            id: updatedProdigiOrder.id,
            status: updatedProdigiOrder.status,
            trackingNumber: updatedProdigiOrder.trackingNumber,
            trackingUrl: updatedProdigiOrder.trackingUrl,
            estimatedDelivery: updatedProdigiOrder.estimatedDelivery,
            lastUpdated: new Date().toISOString(),
          },
        });

      } catch (error) {
        console.error('Error refreshing Prodigi status:', error);
        return NextResponse.json(
          { error: 'Failed to refresh Prodigi status', details: error instanceof Error ? error.message : 'Unknown error' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Error in POST /api/orders/[id]/status:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid order ID', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
