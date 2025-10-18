import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";

const CreateProductSchema = z.object({
  imageId: z.string().uuid(),
  frameSize: z.enum(['small', 'medium', 'large', 'extra_large']),
  frameStyle: z.enum(['black', 'white', 'natural', 'gold', 'silver']),
  frameMaterial: z.enum(['wood', 'metal', 'plastic', 'bamboo']).optional().default('wood'),
  price: z.number().positive(),
  cost: z.number().positive().optional(),
});

const GetProductsSchema = z.object({
  imageId: z.string().uuid().optional(),
  frameSize: z.enum(['small', 'medium', 'large', 'extra_large']).optional(),
  frameStyle: z.enum(['black', 'white', 'natural', 'gold', 'silver']).optional(),
  frameMaterial: z.enum(['wood', 'metal', 'plastic', 'bamboo']).optional(),
  status: z.enum(['active', 'inactive', 'discontinued']).optional().default('active'),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

export async function GET(request: NextRequest) {
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
    
    // Allow unauthenticated GET requests for public product listing
    // Authentication is only required for POST requests (creating products)
    
    const { searchParams } = new URL(request.url);
    
    const params = GetProductsSchema.parse({
      imageId: searchParams.get('imageId') || undefined,
      frameSize: searchParams.get('frameSize') || undefined,
      frameStyle: searchParams.get('frameStyle') || undefined,
      frameMaterial: searchParams.get('frameMaterial') || undefined,
      status: searchParams.get('status') || undefined,
      limit: searchParams.get('limit') || undefined,
      offset: searchParams.get('offset') || undefined,
    });

    let query = supabase
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
      .eq('status', params.status)
      .order('created_at', { ascending: false })
      .range(params.offset, params.offset + params.limit - 1);

    // Apply filters
    if (params.imageId) {
      query = query.eq('image_id', params.imageId);
    }
    if (params.frameSize) {
      query = query.eq('frame_size', params.frameSize);
    }
    if (params.frameStyle) {
      query = query.eq('frame_style', params.frameStyle);
    }
    if (params.frameMaterial) {
      query = query.eq('frame_material', params.frameMaterial);
    }

    const { data: products, error } = await query;

    if (error) {
      console.error('Error fetching products:', error);
      return NextResponse.json(
        { error: 'Failed to fetch products' },
        { status: 500 }
      );
    }

    return NextResponse.json({ products });
  } catch (error) {
    console.error('Error in GET /api/products:', error);
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
      console.log('Auth failed:', { authError: authError?.message, user: !!user });
      console.log('Auth header present:', !!request.headers.get('authorization'));
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = CreateProductSchema.parse(body);

    // Verify the image belongs to the user using service client to bypass RLS
    const serviceSupabase = createServiceClient();
    const { data: image, error: imageError } = await serviceSupabase
      .from('images')
      .select('id, user_id, status')
      .eq('id', validatedData.imageId)
      .eq('user_id', user.id)
      .single();

    if (imageError || !image) {
      return NextResponse.json(
        { error: 'Image not found or access denied' },
        { status: 404 }
      );
    }

    if (image && (image as any).status !== 'completed') {
      return NextResponse.json(
        { error: 'Image must be completed before creating products' },
        { status: 400 }
      );
    }

    // Check if product already exists using service client to bypass RLS
    console.log('🔍 Checking for existing product with specs:', {
      imageId: validatedData.imageId,
      frameSize: validatedData.frameSize,
      frameStyle: validatedData.frameStyle,
      frameMaterial: validatedData.frameMaterial
    });
    
    const { data: existingProduct, error: existingError } = await serviceSupabase
      .from('products')
      .select('id')
      .eq('image_id', validatedData.imageId)
      .eq('frame_size', validatedData.frameSize)
      .eq('frame_style', validatedData.frameStyle)
      .eq('frame_material', validatedData.frameMaterial)
      .maybeSingle(); // Use maybeSingle() instead of single() to avoid error when no product exists

    console.log('🔍 Existing product check result:', { existingProduct, existingError });

    if (existingProduct && !existingError) {
      // Return the existing product instead of error
      const productId = (existingProduct as { id: string }).id;
      const { data: product } = await serviceSupabase
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
        .eq('id', productId)
        .single();
      
      return NextResponse.json({ product }, { status: 200 });
    }

    // Calculate dimensions based on frame size
    const dimensions = getFrameDimensions(validatedData.frameSize);
    const cost = validatedData.cost || validatedData.price * 0.4; // Default 40% cost margin

    // Generate SKU using Prodigi client
    const { prodigiClient } = await import('@/lib/prodigi');
    const sku = await prodigiClient.generateFrameSku(
      validatedData.frameSize,
      validatedData.frameStyle,
      validatedData.frameMaterial,
      validatedData.imageId // Pass image ID to make SKU unique
    );

    // Create product using service client to bypass RLS
    const { data: product, error: productError } = await (serviceSupabase as any)
      .from('products')
      .insert({
        image_id: validatedData.imageId,
        frame_size: validatedData.frameSize,
        frame_style: validatedData.frameStyle,
        frame_material: validatedData.frameMaterial,
        price: validatedData.price,
        cost: cost,
        dimensions_cm: dimensions,
        sku: sku,
        status: 'active'
      })
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

    if (productError) {
      console.error('Error creating product:', productError);
      
      // Handle duplicate SKU constraint specifically
      if (productError.code === '23505' && productError.message.includes('products_sku_key')) {
        console.log('🔄 Duplicate SKU detected, finding existing product with SKU:', sku);
        
        // Find and return the existing product with this SKU
        const { data: existingProductBySku } = await serviceSupabase
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
          .eq('sku', sku)
          .single();
        
        console.log('🔍 Found existing product by SKU:', existingProductBySku ? 'Yes' : 'No');
        
        if (existingProductBySku) {
          console.log('✅ Returning existing product for quantity increment');
          return NextResponse.json({ product: existingProductBySku }, { status: 200 });
        }
        
        return NextResponse.json(
          { error: 'Product with this SKU already exists', details: 'A product with the same frame specifications already exists' },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to create product', details: productError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/products:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function getFrameDimensions(frameSize: string) {
  const dimensions = {
    small: { width: 20, height: 25, depth: 2 },
    medium: { width: 30, height: 40, depth: 2 },
    large: { width: 40, height: 50, depth: 3 },
    extra_large: { width: 50, height: 70, depth: 3 }
  };
  
  return dimensions[frameSize as keyof typeof dimensions] || dimensions.medium;
}
