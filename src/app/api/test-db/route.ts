import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Test DB: Starting database test');
    const supabase = await createClient();
    
    // Test authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('🔍 Test DB: Auth check', { 
      hasUser: !!user, 
      userId: user?.id, 
      authError: authError?.message 
    });
    
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication failed',
        details: authError?.message
      });
    }

    // Test database connection by checking if orders table exists
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, status, created_at')
      .eq('user_id', user.id)
      .limit(1);

    if (ordersError) {
      console.error('❌ Test DB: Orders table error:', ordersError);
      return NextResponse.json({
        success: false,
        error: 'Database error',
        details: ordersError.message,
        code: ordersError.code
      });
    }

    // Test profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('id', user.id)
      .single();

    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      data: {
        user: {
          id: user.id,
          email: user.email
        },
        orders: {
          count: orders?.length || 0,
          sample: orders?.[0] || null
        },
        profile: profile || null,
        profileError: profileError?.message || null
      }
    });

  } catch (error) {
    console.error('❌ Test DB: Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
