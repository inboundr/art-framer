import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';

const CreateCuratedProductSchema = z.object({
  curatedImageId: z.string().uuid(),
  frameSize: z.enum(['small', 'medium', 'large', 'extra_large']),
  frameStyle: z.enum(['black', 'white', 'natural', 'gold', 'silver']),
  frameMaterial: z.enum(['wood', 'metal', 'plastic', 'bamboo']),
  price: z.number().positive(),
});

// Frame dimensions mapping
const getFrameDimensions = (size: string) => {
  const dimensions = {
    small: { width: 200, height: 200, depth: 20 },
    medium: { width: 300, height: 300, depth: 25 },
    large: { width: 400, height: 400, depth: 30 },
    extra_large: { width: 500, height: 500, depth: 35 },
  };
  return dimensions[size as keyof typeof dimensions] || dimensions.medium;
};

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
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
    const validatedData = CreateCuratedProductSchema.parse(body);

    // Verify the curated image exists and is active
    const { data: curatedImage, error: curatedImageError } = await supabase
      .from('curated_images')
      .select('id, title, image_url, width, height')
      .eq('id', validatedData.curatedImageId)
      .eq('is_active', true)
      .single();

    if (curatedImageError || !curatedImage) {
      return NextResponse.json(
        { error: 'Curated image not found or not available' },
        { status: 404 }
      );
    }

    // Type assertion to ensure we have the expected fields
    const curatedImageData = curatedImage as {
      id: string;
      title: string;
      image_url: string;
      width: number;
      height: number;
    };

    // Calculate aspect ratio from dimensions
    const calculateAspectRatio = (width: number, height: number): 'square' | 'tall' | 'wide' => {
      if (width === height) return 'square';
      if (width > height) return 'wide';
      return 'tall';
    };

    // Create a temporary image record for the curated image
    const serviceSupabase = createServiceClient();
    const { data: tempImage, error: tempImageError } = await (serviceSupabase as any)
      .from('images')
      .insert({
        user_id: user.id,
        prompt: curatedImageData.title,
        image_url: curatedImageData.image_url,
        width: curatedImageData.width,
        height: curatedImageData.height,
        aspect_ratio: calculateAspectRatio(curatedImageData.width, curatedImageData.height),
        model: '3.0-latest', // Default model for curated images
        status: 'completed',
        is_public: true,
      })
      .select('id')
      .single();

    if (tempImageError || !tempImage) {
      console.error('Error creating temp image:', tempImageError);
      return NextResponse.json(
        { error: 'Failed to create temporary image record' },
        { status: 500 }
      );
    }

    // Check if product already exists for this curated image and frame combination
    const { data: existingProducts, error: existingProductError } = await (serviceSupabase as any)
      .from('products')
      .select('id')
      .eq('image_id', tempImage.id)
      .eq('frame_size', validatedData.frameSize)
      .eq('frame_style', validatedData.frameStyle)
      .eq('frame_material', validatedData.frameMaterial);

    if (existingProductError) {
      console.error('Error checking for existing product:', existingProductError);
    }

    if (existingProducts && existingProducts.length > 0) {
      return NextResponse.json({
        product: existingProducts[0],
        message: 'Product already exists'
      });
    }

    // Calculate dimensions based on frame size
    const dimensions = getFrameDimensions(validatedData.frameSize);
    const cost = validatedData.price * 0.4; // Default 40% cost margin

    // Generate SKU using Prodigi client
    const { prodigiClient } = await import('@/lib/prodigi');
    const sku = await prodigiClient.generateFrameSku(
      validatedData.frameSize,
      validatedData.frameStyle,
      validatedData.frameMaterial,
      tempImage.id // Pass the image ID to make SKU unique
    );

    // Create product using service client to bypass RLS
    const { data: product, error: productError } = await (serviceSupabase as any)
      .from('products')
      .insert({
        image_id: tempImage.id,
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
        id,
        image_id,
        frame_size,
        frame_style,
        frame_material,
        price,
        cost,
        dimensions_cm,
        sku,
        status,
        created_at
      `)
      .single();

    if (productError) {
      console.error('Error creating product:', productError);
      
      // Handle specific database constraint violations
      if (productError.code === '23505') {
        // Duplicate key violation - product already exists
        console.log('🔄 Product already exists, finding existing product...');
        
        // Try to find the existing product
        const { data: existingProducts, error: findError } = await (serviceSupabase as any)
          .from('products')
          .select(`
            id,
            image_id,
            frame_size,
            frame_style,
            frame_material,
            price,
            cost,
            dimensions_cm,
            sku,
            status,
            created_at
          `)
          .eq('image_id', tempImage.id)
          .eq('frame_size', validatedData.frameSize)
          .eq('frame_style', validatedData.frameStyle)
          .eq('frame_material', validatedData.frameMaterial);
          
        if (existingProducts && existingProducts.length > 0) {
          console.log('✅ Found existing product, returning it for quantity increment');
          return NextResponse.json({
            product: existingProducts[0],
            message: 'Product already exists - use for quantity increment'
          });
        }
        
        if (findError) {
          console.error('Error finding existing product:', findError);
        }
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to create product',
          details: productError.message,
          code: productError.code
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      product,
      message: 'Product created successfully'
    });

  } catch (error) {
    console.error('Error in POST /api/curated-products:', error);
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
