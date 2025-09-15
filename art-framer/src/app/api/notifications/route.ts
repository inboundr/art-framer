import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const NotificationQuerySchema = z.object({
  unreadOnly: z.string().transform(val => val === 'true').optional(),
  type: z.string().optional(),
  limit: z.string().transform(Number).optional(),
  offset: z.string().transform(Number).optional(),
});

const MarkAsReadSchema = z.object({
  notificationIds: z.array(z.string().uuid()),
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
      unreadOnly: searchParams.get('unreadOnly'),
      type: searchParams.get('type'),
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
    };

    const validatedQuery = NotificationQuerySchema.parse(queryParams);

    // Build query
    let query = supabase
      .from('customer_notifications')
      .select(`
        *,
        orders (
          id,
          order_number,
          status
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    // Apply filters
    if (validatedQuery.unreadOnly) {
      query = query.eq('is_read', false);
    }

    if (validatedQuery.type) {
      query = query.eq('type', validatedQuery.type);
    }

    // Apply pagination
    const limit = validatedQuery.limit || 20;
    const offset = validatedQuery.offset || 0;
    query = query.range(offset, offset + limit - 1);

    const { data: notifications, error } = await query;

    if (error) {
      console.error('Error fetching notifications:', error);
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
    }

    // Get unread count
    const { count: unreadCount } = await supabase
      .from('customer_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    return NextResponse.json({
      notifications,
      unreadCount: unreadCount || 0,
      pagination: {
        limit,
        offset,
        hasMore: (offset + limit) < (notifications?.length || 0),
      },
    });

  } catch (error) {
    console.error('Error in GET /api/notifications:', error);
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
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = MarkAsReadSchema.parse(body);

    // Mark notifications as read
    const { error: updateError } = await supabase
      .from('customer_notifications')
      .update({ is_read: true })
      .in('id', validatedData.notificationIds)
      .eq('user_id', user.id); // Ensure user can only update their own notifications

    if (updateError) {
      console.error('Error marking notifications as read:', updateError);
      return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Notifications marked as read',
    });

  } catch (error) {
    console.error('Error in PATCH /api/notifications:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const action = searchParams.get('action');

    if (action === 'mark_all_read') {
      // Mark all notifications as read
      const { error: updateError } = await supabase
        .from('customer_notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (updateError) {
        console.error('Error marking all notifications as read:', updateError);
        return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'All notifications marked as read',
      });
    }

    if (action === 'delete_read') {
      // Delete all read notifications
      const { error: deleteError } = await supabase
        .from('customer_notifications')
        .delete()
        .eq('user_id', user.id)
        .eq('is_read', true);

      if (deleteError) {
        console.error('Error deleting read notifications:', deleteError);
        return NextResponse.json({ error: 'Failed to delete notifications' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Read notifications deleted',
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Error in DELETE /api/notifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
