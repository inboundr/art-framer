import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { authenticateRequest } from "@/lib/auth/jwtAuth";
import { z } from "zod";
import type { PricingItem } from "@/lib/pricing";

const AddToCartSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).max(10).default(1),
});

const UpdateCartItemSchema = z.object({
  cartItemId: z.string().uuid(),
  quantity: z.number().int().min(1).max(10),
});

export async function GET(request: NextRequest) {
  try {
    console.log('Cart API: Starting request');
    
    // JWT-only authentication
    const { user, error: authError } = await authenticateRequest(request);
    
    if (authError || !user) {
      console.log('Cart API: Authentication failed', { error: authError });
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.log('Cart API: User authenticated', { userId: user.id });

    // Use service client to bypass RLS for cart operations
    const serviceSupabase = createServiceClient();
    const { data: cartItems, error } = await serviceSupabase
      .from('cart_items')
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
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching cart items:', error);
      return NextResponse.json(
        { error: 'Failed to fetch cart items' },
        { status: 500 }
      );
    }

    // Calculate totals using robust pricing calculator
    const { defaultPricingCalculator } = await import('@/lib/pricing');
    
    const pricingItems: PricingItem[] = cartItems.map((item: {
      id: string;
      quantity: number;
      products: {
        sku: string;
        price: number;
        name?: string;
        frame_size: string;
        frame_style: string;
      };
    }) => ({
      id: item.id,
      sku: item.products.sku,
      price: item.products.price,
      quantity: item.quantity,
      name: item.products.name || `${item.products.frame_size} ${item.products.frame_style} Frame`,
    }));

    const pricingResult = defaultPricingCalculator.calculateTotal(pricingItems);
    
    const { subtotal, taxAmount, total } = pricingResult;
    const shippingAmount = 0; // Will be calculated when address is provided

    return NextResponse.json({
      cartItems,
      totals: {
        subtotal,
        taxAmount,
        shippingAmount,
        total,
        itemCount: cartItems.reduce((sum: number, item: { quantity: number }) => sum + item.quantity, 0)
      }
    });
  } catch (error) {
    console.error('Error in GET /api/cart:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('Cart API POST: Starting request');
    
    // JWT-only authentication
    const { user, error: authError } = await authenticateRequest(request);
    
    if (authError || !user) {
      console.log('Cart API POST: Authentication failed', { error: authError });
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.log('Cart API POST: User authenticated', { userId: user.id });

    console.log('Cart API POST: About to parse request body');
    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      console.error('Cart API POST: JSON parsing error:', jsonError);
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }
    console.log('Cart API POST: Request body parsed:', body);
    console.log('Cart API POST: About to validate request data');
    const validatedData = AddToCartSchema.parse(body);
    console.log('Cart API POST: Request data validated:', validatedData);

    // Use service client to bypass RLS for cart operations
    const serviceSupabase = createServiceClient();
    console.log('Cart API: Service client created:', typeof serviceSupabase);
    
    // Verify product exists and is active
    console.log('Cart API: About to query products table');
    const { data: product, error: productError } = await serviceSupabase
      .from('products')
      .select('id, status, price')
      .eq('id', validatedData.productId)
      .eq('status', 'active')
      .single();
    console.log('Cart API: Product query result:', { product, productError });

    if (productError || !product) {
      return NextResponse.json(
        { error: 'Product not found or not available' },
        { status: 404 }
      );
    }

    // First, try to get existing item to check current quantity
    const { data: existingItem } = await serviceSupabase
      .from('cart_items')
      .select('id, quantity')
      .eq('user_id', user.id)
      .eq('product_id', validatedData.productId)
      .single();

    let finalQuantity = validatedData.quantity;
    let isNewItem = false;

    if (existingItem) {
      // Item exists, add to existing quantity
      finalQuantity = (existingItem as any).quantity + validatedData.quantity;
      isNewItem = false;
    } else {
      // New item
      finalQuantity = validatedData.quantity;
      isNewItem = true;
    }

    // Check if final quantity exceeds maximum
    if (finalQuantity > 10) {
      return NextResponse.json(
        { error: 'Maximum quantity per item is 10' },
        { status: 400 }
      );
    }

    // Use upsert to handle race conditions atomically
    const { data: cartItem, error: upsertError } = await (serviceSupabase as any)
      .from('cart_items')
      .upsert({
        user_id: user.id,
        product_id: validatedData.productId,
        quantity: finalQuantity,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,product_id',
        ignoreDuplicates: false
      })
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

    if (upsertError) {
      console.error('Error upserting cart item:', upsertError);
      return NextResponse.json(
        { error: 'Failed to add/update cart item', details: upsertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      cartItem,
      message: isNewItem ? 'Item added to cart successfully' : 'Cart item updated successfully'
    }, { status: isNewItem ? 201 : 200 });
  } catch (error) {
    console.error('Error in POST /api/cart:', error);
    console.error('Error type:', typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
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

export async function PATCH(request: NextRequest) {
  try {
    // JWT-only authentication
    const { user, error: authError } = await authenticateRequest(request);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = UpdateCartItemSchema.parse(body);

    // Use service client to bypass RLS for cart operations
    const serviceSupabase = createServiceClient();

    // Update cart item quantity
    const { data: updatedItem, error: updateError } = await (serviceSupabase as any)
      .from('cart_items')
      .update({ 
        quantity: validatedData.quantity,
        updated_at: new Date().toISOString()
      })
      .eq('id', validatedData.cartItemId)
      .eq('user_id', user.id)
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
        { error: 'Failed to update cart item', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      cartItem: updatedItem,
      message: 'Cart item updated successfully'
    });
  } catch (error) {
    console.error('Error in PATCH /api/cart:', error);
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

export async function DELETE(request: NextRequest) {
  try {
    // JWT-only authentication
    const { user, error: authError } = await authenticateRequest(request);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    // Use service client to bypass RLS for cart operations
    const serviceSupabase = createServiceClient();

    const { error: deleteError } = await serviceSupabase
      .from('cart_items')
      .delete()
      .eq('user_id', user.id)
      .eq('product_id', productId);

    if (deleteError) {
      console.error('Error removing from cart:', deleteError);
      return NextResponse.json(
        { error: 'Failed to remove item from cart', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      message: 'Item removed from cart successfully' 
    });
  } catch (error) {
    console.error('Error in DELETE /api/cart:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
