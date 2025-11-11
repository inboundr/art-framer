import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { authenticateRequest } from "@/lib/auth/jwtAuth";
import { z } from "zod";

const CreateProductSchema = z.object({
  imageId: z.string().uuid(),
  frameSize: z.enum(['small', 'medium', 'large', 'extra_large']),
  frameStyle: z.enum(['black', 'white', 'natural', 'gold', 'silver', 'brown', 'grey']),
  frameMaterial: z.enum(['wood', 'metal', 'plastic', 'bamboo', 'canvas', 'acrylic']).optional().default('wood'),
  price: z.number().positive(),
  cost: z.number().positive().optional(),
});

const GetProductsSchema = z.object({
  imageId: z.string().uuid().optional(),
  frameSize: z.enum(['small', 'medium', 'large', 'extra_large']).optional(),
  frameStyle: z.enum(['black', 'white', 'natural', 'gold', 'silver', 'brown', 'grey']).optional(),
  frameMaterial: z.enum(['wood', 'metal', 'plastic', 'bamboo', 'canvas', 'acrylic']).optional(),
  status: z.enum(['active', 'inactive', 'discontinued']).optional().default('active'),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

export async function GET(request: NextRequest) {
  try {
    // Allow unauthenticated GET requests for public product listing
    // Use service client to bypass RLS for public queries
    const serviceSupabase = createServiceClient();
    
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

    let query = serviceSupabase
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
    console.log('🔥 Products API: Request received');
    console.log('🔑 Products API: Starting authentication...');
    
    // JWT-only authentication
    const { user, error: authError } = await authenticateRequest(request);
    
    console.log('🔑 Products API: Authentication result', { 
      hasUser: !!user, 
      hasError: !!authError,
      userId: user?.id 
    });
    
    if (authError || !user) {
      console.error('❌ Products API: Authentication failed', { error: authError });
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.log('✅ Products API: User authenticated', { userId: user.id });

    console.log('📦 Products API: Parsing request body...');
    const body = await request.json();
    console.log('📦 Products API: Body parsed:', { 
      imageId: body.imageId,
      frameSize: body.frameSize,
      frameStyle: body.frameStyle,
      frameMaterial: body.frameMaterial,
      price: body.price
    });
    
    console.log('✅ Products API: Validating data...');
    const validatedData = CreateProductSchema.parse(body);
    console.log('✅ Products API: Data validated successfully');

    // Verify the image belongs to the user using service client to bypass RLS
    console.log('🔍 Products API: Verifying image ownership...', { imageId: validatedData.imageId, userId: user.id });
    const serviceSupabase = createServiceClient();
    const { data: image, error: imageError } = await serviceSupabase
      .from('images')
      .select('id, user_id, status')
      .eq('id', validatedData.imageId)
      .eq('user_id', user.id)
      .single();

    console.log('🔍 Products API: Image verification result:', { 
      hasImage: !!image, 
      hasError: !!imageError,
      imageStatus: (image as any)?.status 
    });

    if (imageError || !image) {
      console.error('❌ Products API: Image not found or access denied', { imageError });
      return NextResponse.json(
        { error: 'Image not found or access denied' },
        { status: 404 }
      );
    }

    if (image && (image as any).status !== 'completed') {
      console.error('❌ Products API: Image not completed', { status: (image as any).status });
      return NextResponse.json(
        { error: 'Image must be completed before creating products' },
        { status: 400 }
      );
    }
    
    console.log('✅ Products API: Image verified successfully');

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
      console.log('✅ Products API: Found existing product, returning it', { productId: (existingProduct as { id: string }).id });
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
      
      console.log('✅ Products API: Returning existing product');
      return NextResponse.json({ product }, { status: 200 });
    }

    console.log('🆕 Products API: No existing product found, creating new one...');

    // Calculate dimensions based on frame size
    const dimensions = getFrameDimensions(validatedData.frameSize);
    const cost = validatedData.cost || validatedData.price * 0.4; // Default 40% cost margin
    console.log('📐 Products API: Calculated dimensions and cost', { dimensions, cost });

    // Generate SKU using Prodigi client
    console.log('🔑 Products API: Generating SKU...');
    const { prodigiClient } = await import('@/lib/prodigi');
    const sku = await prodigiClient.generateFrameSku(
      validatedData.frameSize,
      validatedData.frameStyle,
      validatedData.frameMaterial,
      validatedData.imageId // Pass image ID to make SKU unique
    );
    console.log('✅ Products API: SKU generated', { sku });

    // Create product using service client to bypass RLS
    console.log('💾 Products API: Inserting product into database...');
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

    console.log('💾 Products API: Insert completed', { 
      hasProduct: !!product, 
      hasError: !!productError,
      productId: product?.id 
    });

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

    console.log('✅ Products API: Product created successfully, returning response', { productId: product.id });
    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    console.error('❌ Products API: Error in POST handler:', error);
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
