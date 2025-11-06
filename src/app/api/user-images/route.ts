import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 User images API called');

    // Debug: Log all cookies and headers
    const allCookies = request.cookies.getAll();
    const authCookies = allCookies.filter(c => 
      c.name.includes('sb-') || c.name.includes('auth') || c.name.includes('supabase')
    );
    const authHeader = request.headers.get('authorization');
    console.log('🔍 User images API: Request details', {
      totalCookies: allCookies.length,
      authCookies: authCookies.map(c => ({ name: c.name, hasValue: !!c.value, valueLength: c.value?.length, valuePreview: c.value?.substring(0, 50) })),
      hasAuthorizationHeader: !!authHeader,
      authorizationHeaderPreview: authHeader ? authHeader.substring(0, 50) + '...' : null,
    });

    // Create Supabase client for server-side
    const supabase = await createClient();

    // Check authentication - try multiple methods (same pattern as cart API)
    let user = null;
    let authError = null;
    
    // Method 0: Try to parse sb-auth-token cookie manually (if Supabase SSR doesn't recognize it)
    const sbAuthTokenCookie = request.cookies.get('sb-auth-token');
    console.log('🔍 User images API: Checking sb-auth-token cookie', {
      cookieExists: !!sbAuthTokenCookie,
      hasValue: !!sbAuthTokenCookie?.value,
      valueStartsWith: sbAuthTokenCookie?.value?.substring(0, 20),
    });
    
    if (sbAuthTokenCookie?.value) {
      try {
        // Cookie value may have 'base64-' prefix, strip it if present
        let cookieValue = sbAuthTokenCookie.value;
        console.log('🔍 User images API: Processing cookie value', {
          originalLength: cookieValue.length,
          startsWithBase64: cookieValue.startsWith('base64-'),
        });
        
        if (cookieValue.startsWith('base64-')) {
          cookieValue = cookieValue.substring(7); // Remove 'base64-' prefix
          console.log('🔍 User images API: Stripped base64- prefix', {
            newLength: cookieValue.length,
          });
        }
        
        // Decode base64 and parse JSON
        const decoded = Buffer.from(cookieValue, 'base64').toString('utf-8');
        console.log('🔍 User images API: Decoded cookie', {
          decodedLength: decoded.length,
          decodedPreview: decoded.substring(0, 100),
        });
        
        const sessionData = JSON.parse(decoded);
        console.log('🔍 User images API: Parsed session data', {
          hasAccessToken: !!sessionData?.access_token,
          hasRefreshToken: !!sessionData?.refresh_token,
          hasUser: !!sessionData?.user,
          accessTokenPreview: sessionData?.access_token?.substring(0, 50),
        });
        
        if (sessionData?.access_token) {
          console.log('🔍 User images API: Found access_token in sb-auth-token cookie, validating...');
          const { data: tokenAuth, error: tokenError } = await supabase.auth.getUser(sessionData.access_token);
          if (!tokenError && tokenAuth.user) {
            console.log('✅ User images API: Authenticated via sb-auth-token cookie', {
              userId: tokenAuth.user.id,
              email: tokenAuth.user.email,
            });
            user = tokenAuth.user;
          } else {
            console.warn('⚠️ User images API: Failed to authenticate with token from cookie', {
              error: tokenError?.message,
              errorStatus: (tokenError as any)?.status,
            });
          }
        } else {
          console.warn('⚠️ User images API: No access_token found in sb-auth-token cookie', {
            sessionDataKeys: Object.keys(sessionData || {}),
          });
        }
      } catch (parseError) {
        console.error('❌ User images API: Failed to parse sb-auth-token cookie', {
          error: parseError instanceof Error ? parseError.message : String(parseError),
          stack: parseError instanceof Error ? parseError.stack : undefined,
        });
      }
    } else {
      console.log('⚠️ User images API: sb-auth-token cookie not found or empty');
    }
    
    // Method 1: Try cookie-based auth (Supabase SSR standard cookies)
    // Only try this if we haven't authenticated yet AND we have Supabase SSR cookies
    if (!user) {
      // Check if we have any Supabase SSR standard cookies before trying getUser()
      const hasSupabaseCookies = allCookies.some(c => 
        c.name.startsWith('sb-') && 
        (c.name.includes('auth-token') || c.name.includes('access-token') || c.name.includes('refresh-token'))
      );
      
      if (hasSupabaseCookies) {
        console.log('🔍 User images API: Trying Supabase SSR standard cookie auth');
        try {
          const { data: cookieAuth, error: cookieError } = await supabase.auth.getUser();
          
          if (!cookieError && cookieAuth.user) {
            console.log('✅ User images API: Authenticated via Supabase SSR cookies');
            user = cookieAuth.user;
          } else {
            console.warn('⚠️ User images API: Supabase SSR cookie auth failed', {
              error: cookieError?.message,
              errorStatus: (cookieError as any)?.status,
            });
            authError = cookieError;
          }
        } catch (getUserError) {
          console.error('❌ User images API: Error calling getUser()', {
            error: getUserError instanceof Error ? getUserError.message : String(getUserError),
          });
          authError = getUserError;
        }
      } else {
        console.log('⚠️ User images API: No Supabase SSR standard cookies found, skipping getUser()');
      }
      
      // Method 2: Try Authorization header
      if (!user) {
        const authHeader = request.headers.get('authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.substring(7);
          console.log('🔍 User images API: Trying Authorization header auth');
          const { data: headerAuth, error: headerError } = await supabase.auth.getUser(token);
          if (!headerError && headerAuth.user) {
            console.log('✅ User images API: Authenticated via Authorization header');
            user = headerAuth.user;
          } else {
            console.warn('⚠️ User images API: Authorization header auth failed', {
              error: headerError?.message,
            });
            authError = headerError;
          }
        } else {
          // Method 3: Try to get session from cookies directly
          console.log('🔍 User images API: Trying getSession()');
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

