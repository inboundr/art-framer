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

    // Validate the session ID
    const validatedData = RetrieveAddressSchema.parse({ sessionId });

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Retrieve the stored shipping address
    const { data: addressData, error: addressError } = await (supabase as any)
      .from('stripe_session_addresses')
      .select('shipping_address, created_at')
      .eq('stripe_session_id', validatedData.sessionId)
      .eq('user_id', user.id)
      .single();

    if (addressError) {
      console.error('Error retrieving shipping address:', addressError);
      return NextResponse.json(
        { error: 'Address not found' },
        { status: 404 }
      );
    }

    if (!addressData) {
      return NextResponse.json(
        { error: 'Address not found' },
        { status: 404 }
      );
    }

    console.log('✅ Retrieved shipping address for session:', validatedData.sessionId);

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
