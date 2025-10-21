import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
          })
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => {
            // Enhanced cookie options for better persistence
            const cookieOptions = {
              ...options,
              httpOnly: false, // Allow client-side access for session management
              secure: process.env.NODE_ENV === 'production', // HTTPS in production
              sameSite: 'lax' as const, // Better compatibility
              path: '/', // Ensure cookie is available site-wide
              maxAge: options?.maxAge || 60 * 60 * 24 * 7, // 7 days default
            }
            supabaseResponse.cookies.set(name, value, cookieOptions)
          })
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  try {
    const {
      data: { user },
      error
    } = await supabase.auth.getUser()

    if (error) {
      // Only log errors in development or for critical issues
      if (process.env.NODE_ENV === 'development' || error.message?.includes('Auth session missing')) {
        console.error('Middleware auth error:', error)
      }
      
      // Only try to refresh session if it's not a logout-related error
      // Check if this is a deliberate logout (no refresh token) vs session expiry
      const refreshToken = request.cookies.get('sb-refresh-token')?.value
      
      if (refreshToken && !error.message?.includes('Auth session missing')) {
        if (process.env.NODE_ENV === 'development') {
          console.log('🔄 Attempting session refresh in middleware')
        }
        try {
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
          if (!refreshError && refreshData.session) {
            if (process.env.NODE_ENV === 'development') {
              console.log('🔄 Session refreshed in middleware')
            }
            // Update cookies with refreshed session
            supabaseResponse.cookies.set('sb-access-token', refreshData.session.access_token, {
              maxAge: 60 * 60 * 24 * 7, // 7 days
              path: '/',
              sameSite: 'lax',
              secure: process.env.NODE_ENV === 'production',
              httpOnly: false
            })
            supabaseResponse.cookies.set('sb-refresh-token', refreshData.session.refresh_token, {
              maxAge: 60 * 60 * 24 * 7, // 7 days
              path: '/',
              sameSite: 'lax',
              secure: process.env.NODE_ENV === 'production',
              httpOnly: false
            })
          }
        } catch (refreshError) {
          console.error('Failed to refresh session in middleware:', refreshError)
        }
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log('🚪 No refresh token or logout detected, not attempting refresh')
        }
      }
    }

    // Add user info to response headers for debugging (optional)
    if (user) {
      supabaseResponse.headers.set('x-user-id', user.id)
      supabaseResponse.headers.set('x-auth-status', 'authenticated')
    } else {
      supabaseResponse.headers.set('x-auth-status', 'unauthenticated')
    }

    // Add simple cache busting headers
    supabaseResponse.headers.set('x-build-time', Date.now().toString());
    supabaseResponse.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    supabaseResponse.headers.set('Pragma', 'no-cache');
    supabaseResponse.headers.set('Expires', '0');
  } catch (error) {
    console.error('Middleware error:', error)
    supabaseResponse.headers.set('x-auth-status', 'error')
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object instead of the supabaseResponse object

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
