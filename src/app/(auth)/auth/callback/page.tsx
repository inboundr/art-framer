'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState('Completing sign in...');

  useEffect(() => {
    let redirected = false;

    // Listen for auth state change
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string, session: any) => {
      console.log('🎧 Callback page: Auth event:', event);
      
      if (event === 'SIGNED_IN' && session && !redirected) {
        console.log('✅ User signed in, redirecting...');
        redirected = true;
        setStatus('Success! Redirecting...');
        
        // Immediate redirect
        router.push('/');
      }
    });

    const handleCallback = async () => {
      try {
        console.log('🔄 OAuth callback page: Starting...');
        
        const searchParams = new URLSearchParams(window.location.search);
        const code = searchParams.get('code');
        const error = searchParams.get('error');

        if (error) {
          console.error('❌ OAuth error:', error);
          router.push(`/login?error=${encodeURIComponent(error)}`);
          return;
        }

        if (!code) {
          console.warn('⚠️ No code in URL');
          router.push('/login');
          return;
        }

        console.log('🔑 Found OAuth code, exchanging...');
        setStatus('Exchanging code for session...');
        
        // Exchange the code - this will trigger SIGNED_IN event
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          console.error('❌ Code exchange error:', exchangeError);
          router.push(`/login?error=${encodeURIComponent(exchangeError.message)}`);
          return;
        }

        console.log('✅ Code exchange initiated, waiting for auth event...');
        // The auth state listener will handle the redirect
        
      } catch (err) {
        console.error('❌ Callback error:', err);
        if (!redirected) {
          router.push('/login?error=Authentication failed');
        }
      }
    };

    handleCallback();

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-pink-primary" />
        <p className="text-gray-600">{status}</p>
      </div>
    </div>
  );
}

