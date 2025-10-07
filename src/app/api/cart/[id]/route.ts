import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";

const UpdateCartItemSchema = z.object({
  quantity: z.number().int().min(1).max(10),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Try to get user from Authorization header first
    const authHeader = request.headers.get('authorization');
    let user = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const supabase = createServiceClient();
        const token = authHeader.substring(7);
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
        if (!authError && authUser) {
          user = authUser;
        }
      } catch (error) {
        console.error('Error verifying token:', error);
      }
    }
    
    // Fallback: try to get user from cookies
    if (!user) {
      try {
        const supabase = await createClient();
        const { data: { user: cookieUser }, error: authError } = await supabase.auth.getUser();
        if (!authError && cookieUser) {
          user = cookieUser;
        }
      } catch (error) {
        console.error('Error getting user from cookies:', error);
      }
    }
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = UpdateCartItemSchema.parse(body);

    // Use service client for database operations
    const serviceSupabase = createServiceClient();

    // Verify cart item belongs to user
    const { data: cartItem, error: cartItemError } = await serviceSupabase
      .from('cart_items')
      .select('id, user_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (cartItemError || !cartItem) {
      return NextResponse.json(
        { error: 'Cart item not found or access denied' },
        { status: 404 }
      );
    }

    // Update cart item
    const updateData = { 
      quantity: validatedData.quantity,
      updated_at: new Date().toISOString()
    };
    const { data: updatedItem, error: updateError } = await serviceSupabase
      .from('cart_items')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        products (
          *,
          images (
            id,
            prompt,
            image_url,
            thumbnail_url,
            user_id,
            created_at
          )
        )
      `)
      .single();

    if (updateError) {
      console.error('Error updating cart item:', updateError);
      return NextResponse.json(
        { error: 'Failed to update cart item' },
        { status: 500 }
      );
    }

    return NextResponse.json({ cartItem: updatedItem });
  } catch (error) {
    console.error('Error in PUT /api/cart/[id]:', error);
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Try to get user from Authorization header first
    const authHeader = request.headers.get('authorization');
    let user = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const supabase = createServiceClient();
        const token = authHeader.substring(7);
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
        if (!authError && authUser) {
          user = authUser;
        }
      } catch (error) {
        console.error('Error verifying token:', error);
      }
    }
    
    // Fallback: try to get user from cookies
    if (!user) {
      try {
        const supabase = await createClient();
        const { data: { user: cookieUser }, error: authError } = await supabase.auth.getUser();
        if (!authError && cookieUser) {
          user = cookieUser;
        }
      } catch (error) {
        console.error('Error getting user from cookies:', error);
      }
    }
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Use service client for database operations
    const serviceSupabase = createServiceClient();

    // Verify cart item belongs to user
    const { data: cartItem, error: cartItemError } = await serviceSupabase
      .from('cart_items')
      .select('id, user_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (cartItemError || !cartItem) {
      return NextResponse.json(
        { error: 'Cart item not found or access denied' },
        { status: 404 }
      );
    }

    // Delete cart item
    const { error: deleteError } = await serviceSupabase
      .from('cart_items')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting cart item:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete cart item' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      message: 'Cart item deleted successfully' 
    });
  } catch (error) {
    console.error('Error in DELETE /api/cart/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
