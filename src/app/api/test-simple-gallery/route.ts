import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Test Simple Gallery: Starting simple gallery test');
    
    // Test 1: Simple count query
    console.log('🔍 Test 1: Simple count query');
    const { count, error: countError } = await supabase
      .from('images')
      .select('*', { count: 'exact', head: true })
      .eq('is_public', true);

    if (countError) {
      console.error('❌ Count query error:', countError);
      return NextResponse.json({
        success: false,
        error: 'Count query failed',
        details: countError.message
      });
    }

    console.log('✅ Count query success:', { count });

    // Test 2: Simple data query (no joins)
    console.log('🔍 Test 2: Simple data query');
    const { data: images, error: dataError } = await supabase
      .from('images')
      .select('id, prompt, image_url, created_at')
      .eq('is_public', true)
      .limit(5);

    if (dataError) {
      console.error('❌ Data query error:', dataError);
      return NextResponse.json({
        success: false,
        error: 'Data query failed',
        details: dataError.message
      });
    }

    console.log('✅ Data query success:', { imageCount: images?.length || 0 });

    return NextResponse.json({
      success: true,
      message: 'Simple gallery test successful',
      data: {
        totalImages: count,
        sampleImages: images?.slice(0, 2) || [],
        imageCount: images?.length || 0
      }
    });

  } catch (error) {
    console.error('❌ Test Simple Gallery: Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Simple gallery test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
