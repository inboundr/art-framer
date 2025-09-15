import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client with service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Use service role key for server operations
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

interface SaveImageRequest {
  imageUrl: string;
  prompt: string;
  aspectRatio: string;
  model: string;
  style?: string;
  color?: string;
  userId: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: SaveImageRequest = await request.json();
    const { imageUrl, prompt, aspectRatio, model, style, color, userId } = body;

    // Validate required fields
    if (!imageUrl || !prompt || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: imageUrl, prompt, userId' },
        { status: 400 }
      );
    }

    console.log('🔄 Saving image to Supabase:', { imageUrl, prompt, userId });

    // Fetch the image from the original URL (server-side, no CORS issues)
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const imageBlob = new Blob([imageBuffer], { 
      type: imageResponse.headers.get('content-type') || 'image/jpeg' 
    });

    // Generate unique filename for storage
    const fileExtension = 'jpg'; // Ideogram typically returns JPGs
    const storageFileName = `generated-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExtension}`;
    
    console.log('📤 Uploading to Supabase Storage:', storageFileName);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('images')
      .upload(storageFileName, imageBlob, {
        cacheControl: '3600',
        upsert: false,
        contentType: imageBlob.type,
      });

    if (uploadError) {
      console.error('❌ Upload error:', uploadError);
      throw new Error(`Failed to upload image: ${uploadError.message}`);
    }

    console.log('✅ Upload successful:', uploadData);

    // Get public URL from Supabase Storage
    const { data: { publicUrl } } = supabase.storage
      .from('images')
      .getPublicUrl(storageFileName);

    console.log('🔗 Public URL generated:', publicUrl);

    // Map aspect ratio to database enum
    const mapAspectRatio = (ratio: string) => {
      if (ratio.includes('1x1') || ratio.includes('1:1')) return 'square';
      if (ratio.includes('3x4') || ratio.includes('2x3') || ratio.includes('3:4') || ratio.includes('2:3')) return 'tall';
      if (ratio.includes('4x3') || ratio.includes('3x2') || ratio.includes('4:3') || ratio.includes('3:2')) return 'wide';
      return 'square'; // default
    };

    // Map model to database enum
    const mapModel = (model: string) => {
      if (model === 'V_3') return '3.0-latest';
      if (model === 'V_2_1') return '2.1';
      if (model === 'V_1_5') return '1.5';
      return '3.0-latest'; // default
    };

    // Get image dimensions (default for now, could be extracted from actual image)
    const dimensions = aspectRatio.includes('1x1') || aspectRatio.includes('1:1') 
      ? { width: 1024, height: 1024 }
      : aspectRatio.includes('3x4') || aspectRatio.includes('2x3')
      ? { width: 768, height: 1024 }
      : aspectRatio.includes('4x3') || aspectRatio.includes('3x2')
      ? { width: 1024, height: 768 }
      : { width: 1024, height: 1024 };

    console.log('💾 Saving metadata to database...');

    // Save metadata to database
    const { data: image, error: dbError } = await supabase
      .from('images')
      .insert({
        user_id: userId,
        prompt: prompt,
        aspect_ratio: mapAspectRatio(aspectRatio),
        width: dimensions.width,
        height: dimensions.height,
        model: mapModel(model),
        image_url: publicUrl,
        status: 'completed',
        is_public: true,
        metadata: {
          style: style,
          color: color,
          original_ideogram_url: imageUrl,
          generation_timestamp: new Date().toISOString(),
        }
      })
      .select()
      .single();

    if (dbError) {
      console.error('❌ Database error:', dbError);
      // Clean up uploaded file if database insert fails
      await supabase.storage.from('images').remove([storageFileName]);
      throw new Error(`Failed to save image metadata: ${dbError.message}`);
    }

    console.log('✅ Image saved successfully:', image);

    return NextResponse.json({ 
      success: true, 
      image,
      message: 'Image saved to Supabase successfully'
    });

  } catch (error) {
    console.error('❌ Error saving image:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to save image',
        details: error
      },
      { status: 500 }
    );
  }
}

