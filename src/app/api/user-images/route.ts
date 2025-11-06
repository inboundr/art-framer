import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 User images API called');

    // Debug: Log all cookies
    const allCookies = request.cookies.getAll();
    const authCookies = allCookies.filter(c => 
      c.name.includes('sb-') || c.name.includes('auth') || c.name.includes('supabase')
    );
    console.log('🔍 User images API: Cookies found', {
      totalCookies: allCookies.length,
      authCookies: authCookies.map(c => ({ name: c.name, hasValue: !!c.value, valueLength: c.value?.length })),
    });

    // Create Supabase client for server-side
    const supabase = await createClient();

    // Check authentication - try multiple methods (same pattern as cart API)
    let user = null;
    let authError = null;
    
    // Method 0: Try to parse sb-auth-token cookie manually (if Supabase SSR doesn't recognize it)
    const sbAuthTokenCookie = request.cookies.get('sb-auth-token');
    if (sbAuthTokenCookie?.value) {
      try {
        // Decode base64 and parse JSON
        const decoded = Buffer.from(sbAuthTokenCookie.value, 'base64').toString('utf-8');
        const sessionData = JSON.parse(decoded);
        if (sessionData?.access_token) {
          console.log('🔍 User images API: Found access_token in sb-auth-token cookie');
          const { data: tokenAuth, error: tokenError } = await supabase.auth.getUser(sessionData.access_token);
          if (!tokenError && tokenAuth.user) {
            console.log('✅ User images API: Authenticated via sb-auth-token cookie');
            user = tokenAuth.user;
          }
        }
      } catch (parseError) {
        console.warn('⚠️ User images API: Failed to parse sb-auth-token cookie', parseError);
      }
    }
    
    // Method 1: Try cookie-based auth (Supabase SSR standard cookies)
    if (!user) {
      const { data: cookieAuth, error: cookieError } = await supabase.auth.getUser();
      
      if (!cookieError && cookieAuth.user) {
        console.log('✅ User images API: Authenticated via Supabase SSR cookies');
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
          console.log('✅ User images API: Authenticated via session');
          user = sessionData.session.user;
        } else {
          // Method 4: Try to refresh the session
          console.log('🔄 User images API: Attempting session refresh');
          try {
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
            if (!refreshError && refreshData.session?.user) {
              console.log('✅ User images API: Session refreshed successfully');
              user = refreshData.session.user;
            } else {
              console.log('❌ User images API: Session refresh failed', refreshError?.message);
              authError = cookieError || sessionError || refreshError;
            }
          } catch (refreshError) {
            console.log('❌ User images API: Session refresh error', refreshError);
            authError = cookieError || sessionError || refreshError;
          }
        }
      }
    }
    
    if (authError || !user) {
      console.error('❌ User images API: Not authenticated', {
        error: authError instanceof Error ? authError.message : (authError as any)?.message || String(authError),
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

