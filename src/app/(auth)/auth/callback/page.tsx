'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState('Completing sign in...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('🔄 OAuth callback page: Starting...');
        
        // Get the code from URL
        const searchParams = new URLSearchParams(window.location.search);
        const code = searchParams.get('code');
        const error = searchParams.get('error');

        if (error) {
          console.error('❌ OAuth error:', error);
          router.push(`/login?error=${encodeURIComponent(error)}`);
          return;
        }

        if (code) {
          console.log('🔑 Found OAuth code, exchanging...');
          setStatus('Exchanging code for session...');
          
          // Exchange the code for a session (client-side)
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

          console.log('🔍 Exchange result:', { 
            hasData: !!data, 
            hasSession: !!data?.session,
            hasUser: !!data?.user,
            hasError: !!exchangeError,
            errorMessage: exchangeError?.message 
          });

          if (exchangeError) {
            console.error('❌ Code exchange error:', exchangeError);
            router.push(`/login?error=${encodeURIComponent(exchangeError.message)}`);
            return;
          }

          if (data?.session) {
            console.log('✅ Session established:', { userId: data.user?.id });
            setStatus('Success! Redirecting...');
            
            // Small delay to ensure session is fully established
            await new Promise(resolve => setTimeout(resolve, 500));
            
            console.log('🏠 Navigating to home page...');
            router.push('/');
            return;
          } else {
            console.warn('⚠️ Code exchange succeeded but no session in data');
            // Wait for the onAuthStateChange event to fire and establish session
            console.log('⏳ Waiting for auth state change...');
            setStatus('Finalizing authentication...');
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Check if session is now available
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            if (currentSession) {
              console.log('✅ Session now available, redirecting...');
              router.push('/');
            } else {
              console.error('❌ Still no session after waiting');
              router.push('/login?error=Session not established');
            }
          }
        }

        // No code found
        console.warn('⚠️ No code in URL');
        router.push('/login');
      } catch (err) {
        console.error('❌ Callback error:', err);
        router.push('/login?error=Authentication failed');
      }
    };

    handleCallback();
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

