'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('🔄 OAuth callback: Starting...');
        
        // Check for errors in URL
        const searchParams = new URLSearchParams(window.location.search);
        const errorParam = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        if (errorParam) {
          console.error('❌ OAuth error:', errorParam, errorDescription);
          setError(errorDescription || errorParam);
          setTimeout(() => {
            router.push(`/login?error=${encodeURIComponent(errorDescription || errorParam)}`);
          }, 2000);
          return;
        }

        // Supabase PKCE flow automatically handles the code exchange
        // We just need to wait for the session to be established
        console.log('⏳ Waiting for session...');
        
        // Check if session exists
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('❌ Session error:', sessionError);
          setError('Failed to establish session');
          setTimeout(() => {
            router.push('/login?error=Session failed');
          }, 2000);
          return;
        }

        if (session) {
          console.log('✅ OAuth callback: Session established', { userId: session.user?.id });
          
          // Small delay to ensure auth state is fully propagated
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Redirect to home or intended destination
          const redirectTo = sessionStorage.getItem('authRedirect') || '/';
          sessionStorage.removeItem('authRedirect');
          
          console.log('🏠 Redirecting to:', redirectTo);
          router.push(redirectTo);
        } else {
          // No session yet, wait a bit and try again
          console.log('⏳ No session yet, retrying...');
          setTimeout(() => {
            handleCallback();
          }, 1000);
        }
      } catch (err) {
        console.error('❌ Unexpected error in auth callback:', err);
        setError('Authentication failed');
        setTimeout(() => {
          router.push('/login?error=Authentication failed');
        }, 2000);
      }
    };

    // Small initial delay to let Supabase process the callback
    const timer = setTimeout(() => {
      handleCallback();
    }, 100);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-pink-primary" />
        {error ? (
          <div>
            <p className="text-red-600 font-medium mb-2">Authentication Error</p>
            <p className="text-gray-600 text-sm">{error}</p>
            <p className="text-gray-500 text-xs mt-2">Redirecting to login...</p>
          </div>
        ) : (
          <div>
            <p className="text-gray-600">Completing sign in...</p>
            <p className="text-gray-500 text-sm mt-2">Please wait a moment</p>
          </div>
        )}
      </div>
    </div>
  );
}

