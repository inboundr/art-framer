import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 User images API called');

    // JWT-only authentication - require Authorization header
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ User images API: Missing or invalid Authorization header');
      return NextResponse.json(
        { error: 'Unauthorized - Authorization header required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    console.log('🔍 User images API: Authenticating with JWT token');

    // Create Supabase client and verify JWT token
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('❌ User images API: JWT authentication failed', {
        error: authError instanceof Error ? authError.message : (authError as any)?.message || String(authError),
        hasUser: !!user,
      });
      return NextResponse.json(
        { error: 'Unauthorized - Invalid or expired token' },
        { status: 401 }
      );
    }

    const userId = user.id;
    console.log('✅ User images API: Authenticated user', { userId, email: user.email });

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');
    const page = pageParam ? (isNaN(parseInt(pageParam)) ? 1 : parseInt(pageParam)) : 1;
    const limit = limitParam ? (isNaN(parseInt(limitParam)) ? 20 : parseInt(limitParam)) : 20;

    const offset = (page - 1) * limit;
    const from = offset;
    const to = offset + limit - 1;

    console.log('🔍 User images API: Fetching images', { 
      userId,
      page, 
      limit,
      from,
      to
    });

    // Fetch images with count
    const { data: images, error, count } = await supabase
      .from('images')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('❌ User images API: Query error', error);
      return NextResponse.json(
        { error: 'Failed to fetch images', details: error.message },
        { status: 500 }
      );
    }

    const total = count || 0;
    const total_pages = Math.ceil(total / limit);
    const has_more = page < total_pages;

    console.log('✅ User images API: Success', { 
      imageCount: images?.length || 0,
      total,
      page,
      total_pages 
    });

    return NextResponse.json({
      images: images || [],
      pagination: {
        page,
        total_pages,
        total,
        has_more,
      },
    });

  } catch (error) {
    console.error('❌ User images API: Error', error);
    return NextResponse.json(
      { error: 'Failed to fetch user images', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

