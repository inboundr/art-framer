import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const GetOrdersSchema = z.object({
  status: z.string().optional().refine((val) => {
    if (!val) return true; // Allow empty/undefined
    return ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'].includes(val);
  }, {
    message: "Invalid status: expected one of 'pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'"
  }),
  limit: z.string().optional().transform((val) => {
    if (!val) return 20; // Default value
    const num = parseInt(val, 10);
    if (isNaN(num) || num < 1) return 20;
    return Math.min(num, 100); // Cap at 100
  }),
  offset: z.string().optional().transform((val) => {
    if (!val) return 0; // Default value
    const num = parseInt(val, 10);
    if (isNaN(num) || num < 0) return 0;
    return num;
  }),
});

export async function GET(request: NextRequest) {
  try {
    console.log('Orders API: Starting request');
    console.log('Orders API: Request headers', {
      authorization: request.headers.get('authorization'),
      cookie: request.headers.get('cookie'),
      userAgent: request.headers.get('user-agent')
    });
    
    const supabase = await createClient();
    
    // Try to get session first, then user
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    console.log('Orders API: Session check', { 
      hasSession: !!session, 
      sessionError: sessionError?.message,
      accessToken: session?.access_token ? 'present' : 'missing'
    });
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('Orders API: Auth check', { 
      hasUser: !!user, 
      userId: user?.id, 
      userEmail: user?.email,
      authError: authError?.message 
    });
    
    // If no user from session, try to refresh session
    let authenticatedUser = user;
    if (authError || !user) {
      console.log('Orders API: No user found, attempting session refresh');
      try {
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        if (!refreshError && refreshData.session) {
          console.log('Orders API: Session refreshed successfully');
          const { data: { user: refreshedUser }, error: refreshedError } = await supabase.auth.getUser();
          if (refreshedUser) {
            console.log('Orders API: User found after refresh', { userId: refreshedUser.id });
            authenticatedUser = refreshedUser;
          } else {
            console.log('Orders API: Still no user after refresh', { refreshedError });
            return NextResponse.json(
              { error: 'Unauthorized' },
              { status: 401 }
            );
          }
        } else {
          console.log('Orders API: Session refresh failed', { refreshError });
          return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
          );
        }
      } catch (refreshError) {
        console.log('Orders API: Session refresh error', { refreshError });
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    // Final check - ensure we have a user
    if (!authenticatedUser) {
      console.log('Orders API: No authenticated user found');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    
    // Handle query parameters safely
    const statusParam = searchParams.get('status');
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');
    
    const params = GetOrdersSchema.parse({
      status: statusParam || undefined,
      limit: limitParam || undefined,
      offset: offsetParam || undefined,
    });

    let query = supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          products (
            *,
            images (
              id,
              prompt,
              image_url,
              thumbnail_url
            )
          )
        ),
        dropship_orders (
          *,
          order_items (
            products (
              images (
                image_url,
                thumbnail_url
              )
            )
          )
        )
      `)
      .eq('user_id', authenticatedUser.id)
      .order('created_at', { ascending: false })
      .range(params.offset, params.offset + params.limit - 1);

    if (params.status) {
      query = query.eq('status', params.status);
    }

    console.log('Orders API: Executing query for user', authenticatedUser.id);
    const { data: orders, error } = await query;

    if (error) {
      console.error('Orders API: Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch orders', details: error.message },
        { status: 500 }
      );
    }

    console.log('Orders API: Successfully fetched orders', { count: orders?.length || 0 });
    return NextResponse.json({ orders });
  } catch (error) {
    console.error('Error in GET /api/orders:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
