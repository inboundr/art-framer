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
      
      // Session errors are normal for unauthenticated users
      // Supabase handles session refresh automatically through the auth state change listener
      // No need to manually refresh here - it can cause race conditions
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
