import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin;
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  console.log('🔄 Auth callback route handler:', {
    hasCode: !!code,
    hasError: !!error,
    origin,
    url: request.url
  });

  // Handle OAuth errors
  if (error) {
    console.error('❌ OAuth error in callback:', error, errorDescription);
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(errorDescription || error)}`
    );
  }

  if (code) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            // Set cookies in the response
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value);
            });
          },
        },
      }
    );

    try {
      console.log('🔑 Exchanging code for session in route handler...');
      
      // Exchange the code for a session
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        console.error('❌ Code exchange error:', exchangeError);
        return NextResponse.redirect(
          `${origin}/login?error=${encodeURIComponent(exchangeError.message)}`
        );
      }

      if (data.session) {
        console.log('✅ Session established in route handler:', {
          userId: data.user?.id,
          email: data.user?.email
        });

        // Create response with proper cookie setting
        const response = NextResponse.redirect(`${origin}/`);
        
        // Set cookies from Supabase
        const cookiesToSet = await supabase.auth.getSession().then(() => {
          return request.cookies.getAll();
        });
        
        cookiesToSet.forEach(({ name, value }) => {
          response.cookies.set(name, value, {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 7, // 7 days
          });
        });

        console.log('🏠 Redirecting to home page with session cookies');
        return response;
      }
    } catch (err) {
      console.error('❌ Unexpected error in callback route:', err);
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent('Authentication failed')}`
      );
    }
  }

  // No code or error, redirect to login
  console.warn('⚠️ No code or error in callback, redirecting to login');
  return NextResponse.redirect(`${origin}/login`);
}

