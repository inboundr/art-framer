import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
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
    
    const supabase = await createClient();
    
    // Check authentication - try multiple methods
    let user = null;
    let authError = null;
    
    // Method 1: Try cookie-based auth
    const { data: cookieAuth, error: cookieError } = await supabase.auth.getUser();
    console.log('Cart API: Cookie auth check', { 
      hasUser: !!cookieAuth.user, 
      userId: cookieAuth.user?.id, 
      userEmail: cookieAuth.user?.email,
      cookieError: cookieError?.message 
    });
    
    // Debug: Check if we have session cookies
    const cookies = request.cookies.getAll();
    const authCookies = cookies.filter(cookie => 
      cookie.name.includes('sb-') || cookie.name.includes('supabase')
    );
    console.log('Cart API: Auth cookies found', {
      totalCookies: cookies.length,
      authCookies: authCookies.length,
      cookieNames: authCookies.map(c => c.name)
    });
    
    if (!cookieError && cookieAuth.user) {
      user = cookieAuth.user;
    } else {
      // Method 2: Try Authorization header
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const { data: headerAuth, error: headerError } = await supabase.auth.getUser(token);
        if (!headerError && headerAuth.user) {
          user = headerAuth.user;
        } else {
          authError = headerError;
        }
      } else {
        // Method 3: Try to get session from cookies directly
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (!sessionError && sessionData.session?.user) {
          console.log('Cart API: Authenticated via session');
          user = sessionData.session.user;
        } else {
          // Method 4: Try to refresh the session
          console.log('Cart API: Attempting session refresh');
          try {
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
            if (!refreshError && refreshData.session?.user) {
              console.log('Cart API: Session refreshed successfully');
              user = refreshData.session.user;
            } else {
              console.log('Cart API: Session refresh failed', refreshError?.message);
              authError = cookieError || sessionError || refreshError;
            }
          } catch (refreshError) {
            console.log('Cart API: Session refresh error', refreshError);
            authError = cookieError || sessionError || refreshError;
          }
        }
      }
    }
    
    if (authError || !user) {
      console.log('Cart API: Authentication failed', { 
        authError: authError instanceof Error ? authError.message : String(authError),
        hasUser: !!user 
      });
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

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
    const supabase = await createClient();
    
    // Check authentication - try both cookie and header methods
    let user = null;
    let authError = null;
    
    // Method 1: Try cookie-based auth
    const { data: cookieAuth, error: cookieError } = await supabase.auth.getUser();
    if (!cookieError && cookieAuth.user) {
      user = cookieAuth.user;
    } else {
      // Method 2: Try Authorization header
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const { data: headerAuth, error: headerError } = await supabase.auth.getUser(token);
        if (!headerError && headerAuth.user) {
          user = headerAuth.user;
        } else {
          authError = headerError;
        }
      } else {
        authError = cookieError;
      }
    }
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = AddToCartSchema.parse(body);

    // Use service client to bypass RLS for cart operations
    const serviceSupabase = createServiceClient();
    
    // Verify product exists and is active
    const { data: product, error: productError } = await serviceSupabase
      .from('products')
      .select('id, status, price')
      .eq('id', validatedData.productId)
      .eq('status', 'active')
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: 'Product not found or not available' },
        { status: 404 }
      );
    }

    // Check if item already exists in cart
    const { data: existingItem, error: existingError } = await serviceSupabase
      .from('cart_items')
      .select('id, quantity')
      .eq('user_id', user.id)
      .eq('product_id', validatedData.productId)
      .single();

    if (existingError && existingError.code !== 'PGRST116') {
      console.error('Error checking existing cart item:', existingError);
      return NextResponse.json(
        { error: 'Failed to check cart' },
        { status: 500 }
      );
    }

    if (existingItem) {
      // Update existing item quantity
      const newQuantity = (existingItem as any).quantity + validatedData.quantity;
      if (newQuantity > 10) {
        return NextResponse.json(
          { error: 'Maximum quantity per item is 10' },
          { status: 400 }
        );
      }

      const { data: updatedItem, error: updateError } = await (serviceSupabase as any)
        .from('cart_items')
        .update({ 
          quantity: newQuantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', (existingItem as any).id)
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

      return NextResponse.json({ 
        cartItem: updatedItem,
        message: 'Cart item updated successfully'
      });
    } else {
      // Create new cart item
      const { data: newItem, error: insertError } = await (serviceSupabase as any)
        .from('cart_items')
        .insert({
          user_id: user.id,
          product_id: validatedData.productId,
          quantity: validatedData.quantity
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

      if (insertError) {
        console.error('Error adding to cart:', insertError);
        return NextResponse.json(
          { error: 'Failed to add item to cart', details: insertError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ 
        cartItem: newItem,
        message: 'Item added to cart successfully'
      }, { status: 201 });
    }
  } catch (error) {
    console.error('Error in POST /api/cart:', error);
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
    const supabase = await createClient();
    
    // Check authentication - try both cookie and header methods
    let user = null;
    let authError = null;
    
    // Method 1: Try cookie-based auth
    const { data: cookieAuth, error: cookieError } = await supabase.auth.getUser();
    if (!cookieError && cookieAuth.user) {
      user = cookieAuth.user;
    } else {
      // Method 2: Try Authorization header
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const { data: headerAuth, error: headerError } = await supabase.auth.getUser(token);
        if (!headerError && headerAuth.user) {
          user = headerAuth.user;
        } else {
          authError = headerError;
        }
      } else {
        authError = cookieError;
      }
    }
    
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
    const supabase = await createClient();
    
    // Check authentication - try both cookie and header methods
    let user = null;
    let authError = null;
    
    // Method 1: Try cookie-based auth
    const { data: cookieAuth, error: cookieError } = await supabase.auth.getUser();
    if (!cookieError && cookieAuth.user) {
      user = cookieAuth.user;
    } else {
      // Method 2: Try Authorization header
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const { data: headerAuth, error: headerError } = await supabase.auth.getUser(token);
        if (!headerError && headerAuth.user) {
          user = headerAuth.user;
        } else {
          authError = headerError;
        }
      } else {
        authError = cookieError;
      }
    }
    
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
