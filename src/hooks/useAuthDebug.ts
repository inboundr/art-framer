'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

interface AuthDebugInfo {
  localStorage: {
    hasToken: boolean;
    tokenValue: string | null;
    tokenValid: boolean;
  };
  session: {
    exists: boolean;
    valid: boolean;
    expiresAt: string | null;
    user: Record<string, unknown> | null;
  };
  cookies: {
    hasAccessToken: boolean;
    hasRefreshToken: boolean;
    accessTokenValue: string | null;
    refreshTokenValue: string | null;
  };
  errors: string[];
}

export function useAuthDebug() {
  const [debugInfo, setDebugInfo] = useState<AuthDebugInfo | null>(null);
  const [isDebugging, setIsDebugging] = useState(false);

  const runDebugCheck = async () => {
    setIsDebugging(true);
    const errors: string[] = [];
    const info: AuthDebugInfo = {
      localStorage: {
        hasToken: false,
        tokenValue: null,
        tokenValid: false,
      },
      session: {
        exists: false,
        valid: false,
        expiresAt: null,
        user: null,
      },
      cookies: {
        hasAccessToken: false,
        hasRefreshToken: false,
        accessTokenValue: null,
        refreshTokenValue: null,
      },
      errors: [],
    };

    try {
      // Check localStorage
      const storedToken = localStorage.getItem('supabase.auth.token');
      info.localStorage.hasToken = !!storedToken;
      info.localStorage.tokenValue = storedToken;
      
      if (storedToken) {
        try {
          const parsedToken = JSON.parse(storedToken);
          info.localStorage.tokenValid = !!(parsedToken?.access_token && parsedToken?.expires_at);
          
          if (parsedToken?.expires_at) {
            const expiresAt = new Date(parsedToken.expires_at * 1000);
            const now = new Date();
            if (expiresAt < now) {
              errors.push('Stored token has expired');
            }
          }
        } catch (e) {
          errors.push('Invalid token format in localStorage');
        }
      } else {
        errors.push('No token found in localStorage');
      }

      // Check cookies
      const cookies = document.cookie.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=');
        acc[key] = value;
        return acc;
      }, {} as Record<string, string>);

      info.cookies.hasAccessToken = !!cookies['sb-access-token'];
      info.cookies.hasRefreshToken = !!cookies['sb-refresh-token'];
      info.cookies.accessTokenValue = cookies['sb-access-token'] || null;
      info.cookies.refreshTokenValue = cookies['sb-refresh-token'] || null;

      if (!info.cookies.hasAccessToken) {
        errors.push('No access token cookie found');
      }
      if (!info.cookies.hasRefreshToken) {
        errors.push('No refresh token cookie found');
      }

      // Check current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        errors.push(`Session error: ${sessionError.message}`);
      } else if (session) {
        info.session.exists = true;
        info.session.user = session.user ? (session.user as unknown as Record<string, unknown>) : null;
        info.session.expiresAt = session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null;
        
        if (session.expires_at) {
          const expiresAt = new Date(session.expires_at * 1000); // Convert from Unix timestamp
          const now = new Date();
          info.session.valid = expiresAt > now;
          
          if (!info.session.valid) {
            errors.push('Current session has expired');
          }
        } else {
          errors.push('Session has no expiration date');
        }
      } else {
        errors.push('No active session found');
      }

      info.errors = errors;
      setDebugInfo(info);
    } catch (error) {
      console.error('Debug check failed:', error);
      setDebugInfo({
        ...info,
        errors: [...errors, `Debug check failed: ${error}`],
      });
    } finally {
      setIsDebugging(false);
    }
  };

  useEffect(() => {
    runDebugCheck();
  }, []);

  return {
    debugInfo,
    isDebugging,
    runDebugCheck,
  };
}
