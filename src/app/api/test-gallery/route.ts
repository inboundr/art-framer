import { NextRequest, NextResponse } from "next/server";
import { supabaseImageAPI } from "@/lib/supabase/images";

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Test Gallery: Starting gallery test');
    
    // Test gallery loading with timeout
    const startTime = Date.now();
    const response = await supabaseImageAPI.getGallery(1, 5); // Small page size for testing
    const endTime = Date.now();
    
    console.log('✅ Test Gallery: Success', { 
      duration: endTime - startTime,
      imageCount: response.images.length,
      totalImages: response.pagination.total
    });

    return NextResponse.json({
      success: true,
      message: 'Gallery test successful',
      data: {
        duration: endTime - startTime,
        imageCount: response.images.length,
        totalImages: response.pagination.total,
        hasMore: response.pagination.has_more,
        sampleImages: response.images.slice(0, 2).map(img => ({
          id: img.id,
          title: img.title,
          image_url: img.image_url ? 'present' : 'missing'
        }))
      }
    });

  } catch (error) {
    console.error('❌ Test Gallery: Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Gallery test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
