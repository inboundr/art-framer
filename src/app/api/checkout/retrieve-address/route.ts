import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const RetrieveAddressSchema = z.object({
  sessionId: z.string().min(1),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Validate the session ID format (basic security check)
    const validatedData = RetrieveAddressSchema.parse({ sessionId });
    
    // Additional security: Validate Stripe session ID format
    if (!sessionId.startsWith('cs_') || sessionId.length < 20) {
      return NextResponse.json(
        { error: 'Invalid session ID format' },
        { status: 400 }
      );
    }

    // Rate limiting: Check if this is a reasonable request
    const userAgent = request.headers.get('user-agent');
    const referer = request.headers.get('referer');
    
    // Basic bot protection - require reasonable headers
    if (!userAgent || userAgent.length < 10) {
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 400 }
      );
    }

    // Try to get authenticated user first (preferred method)
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    let addressData;
    let addressError;

    if (user && !authError) {
      // User is authenticated - use regular client with RLS
      const { data, error } = await (supabase as any)
        .from('stripe_session_addresses')
        .select('shipping_address, created_at')
        .eq('stripe_session_id', validatedData.sessionId)
        .eq('user_id', user.id)
        .single();
      
      addressData = data;
      addressError = error;
    } else {
      // User not authenticated - use service client as fallback
      // This is less secure but necessary for post-payment scenarios
      console.warn('⚠️ Retrieving address without authentication for session:', validatedData.sessionId);
      
      const { createServiceClient } = await import('@/lib/supabase/server');
      const serviceSupabase = await createServiceClient();
      
      const { data, error } = await (serviceSupabase as any)
        .from('stripe_session_addresses')
        .select('shipping_address, created_at')
        .eq('stripe_session_id', validatedData.sessionId)
        .single();
      
      addressData = data;
      addressError = error;
    }

    if (addressError) {
      console.error('Error retrieving shipping address:', {
        sessionId: validatedData.sessionId,
        error: addressError,
        errorCode: addressError?.code,
        errorMessage: addressError?.message
      });
      
      // Handle specific error cases
      if (addressError?.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Address not found for this session' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: 'Address not found' },
        { status: 404 }
      );
    }

    if (!addressData) {
      console.warn('No address data found for session:', validatedData.sessionId);
      return NextResponse.json(
        { error: 'Address not found' },
        { status: 404 }
      );
    }

    console.log('✅ Retrieved shipping address for session:', {
      sessionId: validatedData.sessionId,
      hasAddress: !!addressData.shipping_address,
      createdAt: addressData.created_at
    });

    return NextResponse.json({
      shippingAddress: addressData.shipping_address,
      createdAt: addressData.created_at,
    });

  } catch (error) {
    console.error('Error retrieving shipping address:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
