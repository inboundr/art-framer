'use client';

import { useState, useEffect, useContext } from 'react';
import { User } from '@supabase/supabase-js';
import { LazyAuthContext } from '@/contexts/LazyAuthProvider';

interface LazyAuthState {
  user: User | null;
  profile: any;
  loading: boolean;
  isAuthenticated: boolean;
}

/**
 * Lazy authentication hook that doesn't block rendering
 * - Returns immediately with loading: false
 * - Authentication happens in background
 * - Perfect for public pages that don't need auth
 */
export function useLazyAuth(): LazyAuthState {
  const authContext = useContext(LazyAuthContext);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize auth in background without blocking
  useEffect(() => {
    let mounted = true;
    
    // Small delay to ensure component renders first
    const timer = setTimeout(() => {
      if (mounted) {
        setIsInitialized(true);
      }
    }, 100);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, []);

  // Return auth state without blocking
  return {
    user: authContext?.user || null,
    profile: authContext?.profile || null,
    loading: !isInitialized, // Only show loading during initial render
    isAuthenticated: !!authContext?.user,
  };
}

/**
 * Hook for components that need authentication but can wait
 * - Shows loading state while auth initializes
 * - Perfect for protected pages
 */
export function useAuthWhenReady(): LazyAuthState {
  const authContext = useContext(LazyAuthContext);
  
  return {
    user: authContext?.user || null,
    profile: authContext?.profile || null,
    loading: authContext?.loading || false,
    isAuthenticated: !!authContext?.user,
  };
}
