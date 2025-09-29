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
    console.log('🔍 Orders API: Starting request');
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('🔍 Orders API: Auth check', { 
      hasUser: !!user, 
      userId: user?.id, 
      authError: authError?.message 
    });
    
    if (authError || !user) {
      console.log('❌ Orders API: Authentication failed', { authError });
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
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(params.offset, params.offset + params.limit - 1);

    if (params.status) {
      query = query.eq('status', params.status);
    }

    console.log('🔍 Orders API: Executing query for user', user.id);
    const { data: orders, error } = await query;

    if (error) {
      console.error('❌ Orders API: Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch orders', details: error.message },
        { status: 500 }
      );
    }

    console.log('✅ Orders API: Successfully fetched orders', { count: orders?.length || 0 });
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
