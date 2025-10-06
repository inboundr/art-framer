import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabase as supabaseClient } from "@/lib/supabase/client";
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

async function authenticateUser(request: NextRequest) {
  // First try server-side client (cookies)
  const supabaseServer = await createClient();
  const { data: { user: serverUser }, error: serverError } = await supabaseServer.auth.getUser();
  
  if (serverUser && !serverError) {
    console.log('Orders API: Authenticated via server client');
    return { user: serverUser, supabase: supabaseServer };
  }
  
  // If server auth fails, try Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    console.log('Orders API: Trying Authorization header authentication');
    
    const { data: { user: clientUser }, error: clientError } = await supabaseClient.auth.getUser(token);
    
    if (clientUser && !clientError) {
      console.log('Orders API: Authenticated via Authorization header');
      return { user: clientUser, supabase: supabaseClient };
    }
  }
  
  console.log('Orders API: Authentication failed', { 
    serverError: serverError?.message,
    hasAuthHeader: !!authHeader 
  });
  
  return { user: null, error: 'Authentication failed' };
}

export async function GET(request: NextRequest) {
  try {
    console.log('Orders API: Starting request');
    console.log('Orders API: Request headers', {
      authorization: request.headers.get('authorization'),
      cookie: request.headers.get('cookie'),
      userAgent: request.headers.get('user-agent')
    });
    
    // Authenticate user with both cookies and Authorization header support
    const authResult = await authenticateUser(request);
    
    if (!authResult.user) {
      console.log('Orders API: Authentication failed');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { user: authenticatedUser, supabase } = authResult;
    console.log('Orders API: Authenticated user', { 
      userId: authenticatedUser.id, 
      userEmail: authenticatedUser.email 
    });

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
