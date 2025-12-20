'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the code from the URL
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const searchParams = new URLSearchParams(window.location.search);
        
        const code = searchParams.get('code');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        if (error) {
          console.error('OAuth error:', error, errorDescription);
          router.push(`/login?error=${encodeURIComponent(errorDescription || error)}`);
          return;
        }

        if (code) {
          // Exchange the code for a session
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          
          if (exchangeError) {
            console.error('Error exchanging code for session:', exchangeError);
            router.push(`/login?error=${encodeURIComponent(exchangeError.message)}`);
            return;
          }

          console.log('✅ OAuth callback: Session established', { userId: data.user?.id });
          
          // Redirect to home or intended destination
          const redirectTo = sessionStorage.getItem('authRedirect') || '/';
          sessionStorage.removeItem('authRedirect');
          router.push(redirectTo);
        } else {
          // No code, redirect to login
          router.push('/login');
        }
      } catch (err) {
        console.error('Unexpected error in auth callback:', err);
        router.push('/login?error=Authentication failed');
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-pink-primary" />
        <p className="text-gray-600">Completing sign in...</p>
      </div>
    </div>
  );
}

