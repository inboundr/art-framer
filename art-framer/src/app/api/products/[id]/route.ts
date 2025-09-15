import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const UpdateProductSchema = z.object({
  price: z.number().positive().optional(),
  cost: z.number().positive().optional(),
  status: z.enum(['active', 'inactive', 'discontinued']).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;
    
    const { data: product, error } = await supabase
      .from('products')
      .select(`
        *,
        images (
          id,
          prompt,
          image_url,
          thumbnail_url,
          user_id,
          created_at
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Product not found' },
          { status: 404 }
        );
      }
      console.error('Error fetching product:', error);
      return NextResponse.json(
        { error: 'Failed to fetch product' },
        { status: 500 }
      );
    }

    return NextResponse.json({ product });
  } catch (error) {
    console.error('Error in GET /api/products/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = UpdateProductSchema.parse(body);

    // Verify the product belongs to the user (through the image)
    const { data: product, error: productError } = await supabase
      .from('products')
      .select(`
        *,
        images!inner (
          user_id
        )
      `)
      .eq('id', id)
      .eq('images.user_id', user.id)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: 'Product not found or access denied' },
        { status: 404 }
      );
    }

    // Update product
    const { data: updatedProduct, error: updateError } = await supabase
      .from('products')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        images (
          id,
          prompt,
          image_url,
          thumbnail_url,
          user_id,
          created_at
        )
      `)
      .single();

    if (updateError) {
      console.error('Error updating product:', updateError);
      return NextResponse.json(
        { error: 'Failed to update product' },
        { status: 500 }
      );
    }

    return NextResponse.json({ product: updatedProduct });
  } catch (error) {
    console.error('Error in PUT /api/products/[id]:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
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
    const supabase = await createClient();
    const { id } = await params;
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify the product belongs to the user (through the image)
    const { data: product, error: productError } = await supabase
      .from('products')
      .select(`
        *,
        images!inner (
          user_id
        )
      `)
      .eq('id', id)
      .eq('images.user_id', user.id)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: 'Product not found or access denied' },
        { status: 404 }
      );
    }

    // Check if product has any orders
    const { data: orderItems, error: orderItemsError } = await supabase
      .from('order_items')
      .select('id')
      .eq('product_id', params.id)
      .limit(1);

    if (orderItemsError) {
      console.error('Error checking order items:', orderItemsError);
      return NextResponse.json(
        { error: 'Failed to check product usage' },
        { status: 500 }
      );
    }

    if (orderItems && orderItems.length > 0) {
      // If product has orders, mark as discontinued instead of deleting
      const { error: updateError } = await supabase
        .from('products')
        .update({ 
          status: 'discontinued',
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (updateError) {
        console.error('Error updating product status:', updateError);
        return NextResponse.json(
          { error: 'Failed to update product status' },
          { status: 500 }
        );
      }

      return NextResponse.json({ 
        message: 'Product marked as discontinued due to existing orders' 
      });
    } else {
      // Safe to delete
      const { error: deleteError } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error('Error deleting product:', deleteError);
        return NextResponse.json(
          { error: 'Failed to delete product' },
          { status: 500 }
        );
      }

      return NextResponse.json({ message: 'Product deleted successfully' });
    }
  } catch (error) {
    console.error('Error in DELETE /api/products/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
