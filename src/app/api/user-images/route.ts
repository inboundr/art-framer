import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { Database } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  try {
    console.log('🔍 User images API called');

    // Create Supabase client using request cookies directly (like middleware does)
    // This ensures cookies are properly read from the incoming request
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            // Update request cookies
            cookiesToSet.forEach(({ name, value }) => {
              request.cookies.set(name, value);
            });
            // Create new response to update cookies
            response = NextResponse.next({
              request,
            });
            // Set cookies on response with proper options
            cookiesToSet.forEach(({ name, value, options }) => {
              const cookieOptions = {
                ...options,
                httpOnly: false,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax' as const,
                path: '/',
                maxAge: options?.maxAge || 60 * 60 * 24 * 7, // 7 days default
              };
              response.cookies.set(name, value, cookieOptions);
            });
          },
        },
      }
    );

    // Get authenticated user - use getUser() for security (validates token server-side)
    let { data: { user }, error: authError } = await supabase.auth.getUser();
    
    // If getUser fails, try to refresh the session (might be expired token)
    if (authError && authError.message?.includes('Auth session missing')) {
      console.log('🔄 User images API: Session missing, attempting refresh...');
      const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
      
      if (!refreshError && session) {
        console.log('✅ User images API: Session refreshed');
        // Try getUser again after refresh
        const retryResult = await supabase.auth.getUser();
        user = retryResult.data.user;
        authError = retryResult.error;
      }
    }
    
    if (authError || !user) {
      console.error('❌ User images API: Not authenticated', {
        error: authError?.message,
        errorCode: authError?.status,
        hasUser: !!user,
        cookies: request.cookies.getAll().map(c => c.name),
      });
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = user.id;
    console.log('✅ User images API: Authenticated user', { userId });

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

    // Create JSON response with data
    const jsonResponse = NextResponse.json({
      images: images || [],
      pagination: {
        page,
        total_pages,
        total,
        has_more,
      },
    });

    // Copy cookies from the response object (which may have been updated by Supabase)
    response.cookies.getAll().forEach(({ name, value }) => {
      jsonResponse.cookies.set(name, value, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });
    });

    return jsonResponse;

  } catch (error) {
    console.error('❌ User images API: Error', error);
    return NextResponse.json(
      { error: 'Failed to fetch user images', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

