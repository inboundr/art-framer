'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { User, Session } from '@supabase/supabase-js';

interface AuthPersistenceState {
  isInitialized: boolean;
  isAuthenticated: boolean;
  user: User | null;
  session: Session | null;
  error: string | null;
}

export function useAuthPersistence() {
  const [state, setState] = useState<AuthPersistenceState>({
    isInitialized: false,
    isAuthenticated: false,
    user: null,
    session: null,
    error: null,
  });

  const restoreSession = useCallback(async () => {
    try {
      console.log('🔄 Attempting session restoration...');
      
      // Method 1: Try to get existing session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.log('🔄 Session error, attempting refresh...');
        
        // Method 2: Try to refresh session
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          console.log('🔄 Refresh failed, checking localStorage...');
          
          // Method 3: Check localStorage for stored session
          const storedSession = localStorage.getItem('supabase.auth.token');
          
          if (storedSession) {
            try {
              const parsedSession = JSON.parse(storedSession);
              
              if (parsedSession && parsedSession.access_token) {
                console.log('🔄 Found stored session, verifying...');
                
                // Method 4: Verify stored session
                const { data: { user }, error: userError } = await supabase.auth.getUser(parsedSession.access_token);
                
                if (!userError && user) {
                  console.log('✅ Session restored from localStorage');
                  
                  setState({
                    isInitialized: true,
                    isAuthenticated: true,
                    user,
                    session: parsedSession,
                    error: null,
                  });
                  return;
                }
              }
            } catch (parseError) {
              console.error('Error parsing stored session:', parseError);
            }
          }
          
          // If all methods fail, user is not authenticated
          setState({
            isInitialized: true,
            isAuthenticated: false,
            user: null,
            session: null,
            error: null,
          });
        } else if (refreshData.session) {
          console.log('✅ Session refreshed successfully');
          
          setState({
            isInitialized: true,
            isAuthenticated: true,
            user: refreshData.session.user,
            session: refreshData.session,
            error: null,
          });
        }
      } else if (session) {
        console.log('✅ Existing session found');
        
        setState({
          isInitialized: true,
          isAuthenticated: true,
          user: session.user,
          session,
          error: null,
        });
      } else {
        console.log('ℹ️ No session found');
        
        setState({
          isInitialized: true,
          isAuthenticated: false,
          user: null,
          session: null,
          error: null,
        });
      }
    } catch (error) {
      console.error('Error in session restoration:', error);
      
      setState({
        isInitialized: true,
        isAuthenticated: false,
        user: null,
        session: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, []);

  const forceRefresh = useCallback(async () => {
    console.log('🔄 Force refreshing authentication...');
    setState(prev => ({ ...prev, isInitialized: false }));
    await restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      if (!mounted) return;
      
      await restoreSession();
    };

    initializeAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
      if (!mounted) return;
      
      console.log('🔐 Auth state change:', event, session?.user?.email);
      
      switch (event) {
        case 'SIGNED_IN':
          setState({
            isInitialized: true,
            isAuthenticated: true,
            user: session?.user ?? null,
            session,
            error: null,
          });
          break;
          
        case 'SIGNED_OUT':
          setState({
            isInitialized: true,
            isAuthenticated: false,
            user: null,
            session: null,
            error: null,
          });
          break;
          
        case 'TOKEN_REFRESHED':
          setState(prev => ({
            ...prev,
            session,
            user: session?.user ?? null,
            error: null,
          }));
          break;
          
        case 'USER_UPDATED':
          setState(prev => ({
            ...prev,
            user: session?.user ?? null,
            session,
          }));
          break;
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [restoreSession]);

  return {
    ...state,
    restoreSession,
    forceRefresh,
  };
}
