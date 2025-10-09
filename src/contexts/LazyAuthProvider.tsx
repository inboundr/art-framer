'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/client';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface LazyAuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  isInitialized: boolean;
  signUp: (email: string, password: string, metadata?: any) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: Error | null }>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: any }>;
  refreshProfile: () => Promise<void>;
}

export const LazyAuthContext = createContext<LazyAuthContextType | undefined>(undefined);

export function LazyAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false); // Start with false - no blocking
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize auth in background without blocking
  useEffect(() => {
    let mounted = true;
    let retryCount = 0;
    const maxRetries = 3;
    let timeoutId: NodeJS.Timeout | null = null;

    const initializeAuth = async () => {
      try {
        console.log('🔐 Lazy auth initialization started...');
        
        // Set a maximum timeout to prevent infinite loading
        timeoutId = setTimeout(() => {
          if (mounted) {
            console.log('⚠️ Lazy auth initialization timeout, setting loading to false');
            setLoading(false);
            setIsInitialized(true);
          }
        }, 3000); // 3 second timeout for lazy auth
        
        setLoading(true);
        
        // Get initial session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          throw error;
        }
        
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user) {
            await fetchProfile(session.user.id);
          }
          
          setLoading(false);
          setIsInitialized(true);
          console.log('✅ Lazy auth initialization completed');
        }
      } catch (error) {
        console.error('Lazy auth initialization error:', error);
        
        if (retryCount < maxRetries) {
          retryCount++;
          console.log(`🔄 Retrying lazy auth initialization (${retryCount}/${maxRetries})...`);
          setTimeout(() => {
            if (mounted) {
              initializeAuth();
            }
          }, 1000 * retryCount);
        } else {
          console.log('⚠️ All lazy auth initialization retries failed, continuing without auth');
          if (mounted) {
            setLoading(false);
            setIsInitialized(true);
          }
        }
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }
    };

    // Start auth initialization in background after a small delay
    const timer = setTimeout(() => {
      if (mounted) {
        initializeAuth();
      }
    }, 100); // Small delay to ensure component renders first

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session?.user?.email);
      
      if (!mounted) return;

      try {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
        
        // Handle specific auth events
        if (event === 'SIGNED_OUT') {
          setProfile(null);
          setSession(null);
          setUser(null);
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('Token refreshed successfully');
          // Force a session refresh to ensure cookies are updated
          try {
            const { data: { session: refreshedSession } } = await supabase.auth.getSession();
            if (refreshedSession) {
              setSession(refreshedSession);
              console.log('Session updated after token refresh');
            }
          } catch (error) {
            console.error('Error updating session after token refresh:', error);
          }
        } else if (event === 'SIGNED_IN') {
          console.log('User signed in:', session?.user?.email);
        }
        
        setLoading(false);
        setIsInitialized(true);
      } catch (error) {
        console.error('Error handling auth state change:', error);
        setLoading(false);
        setIsInitialized(true);
      }
    });

    // Set up periodic session refresh to prevent expiration
    const refreshInterval = setInterval(async () => {
      if (mounted && user) {
        try {
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          if (currentSession && currentSession.expires_at) {
            const expiresAt = new Date(currentSession.expires_at * 1000);
            const now = new Date();
            const timeUntilExpiry = expiresAt.getTime() - now.getTime();
            
            // If session expires in less than 5 minutes, refresh it
            if (timeUntilExpiry < 5 * 60 * 1000) {
              console.log('Session expiring soon, refreshing...');
              const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
              if (!refreshError && refreshData.session) {
                setSession(refreshData.session);
                console.log('Session refreshed proactively');
              }
            }
          }
        } catch (error) {
          console.error('Error during periodic session check:', error);
        }
      }
    }, 60000); // Check every minute

    return () => {
      mounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      clearTimeout(timer);
      clearInterval(refreshInterval);
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const signUp = async (email: string, password: string, metadata?: any) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) {
      return { error: new Error('No user logged in') };
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) {
        return { error };
      }

      // Refresh profile data
      await fetchProfile(user.id);
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  return (
    <LazyAuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        isInitialized,
        signUp,
        signIn,
        signOut,
        updateProfile,
        refreshProfile,
      }}
    >
      {children}
    </LazyAuthContext.Provider>
  );
}

export function useLazyAuth() {
  const context = useContext(LazyAuthContext);
  if (context === undefined) {
    throw new Error('useLazyAuth must be used within a LazyAuthProvider');
  }
  return context;
}
