'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { ensureSupabaseReady } from '@/lib/utils/supabaseReady';

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: any | null;
  loading: boolean;
  isInitialized: boolean;
}

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, metadata?: any) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  updateProfile: (updates: any) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function CentralizedAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('CentralizedAuth: Error fetching profile:', error);
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error('CentralizedAuth: Profile fetch exception:', error);
    }
  }, []);

  // Initialize auth on mount - ONCE ONLY
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setLoading(true);

        // Ensure Supabase is ready
        const isReady = await ensureSupabaseReady();
        if (!isReady) {
          console.warn('CentralizedAuth: Supabase not ready');
          setLoading(false);
          setIsInitialized(true);
          return;
        }

        // Get the session from localStorage immediately
        // This is crucial for session persistence on page refresh
        console.log('🔍 CentralizedAuth: Checking for existing session...');
        
        try {
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('❌ CentralizedAuth: Error getting session:', error);
          } else if (session) {
            console.log('✅ CentralizedAuth: Found existing session', { userId: session.user.id });
            setSession(session);
            setUser(session.user);
            // Fetch profile in background
            fetchProfile(session.user.id);
          } else {
            console.log('ℹ️ CentralizedAuth: No existing session found');
          }
        } catch (error) {
          console.error('❌ CentralizedAuth: Exception getting session:', error);
        }
        
        // Mark as initialized after checking session
          setIsInitialized(true);
          setLoading(false);
          
      } catch (error) {
        console.error('CentralizedAuth: Initialization error:', error);
        setIsInitialized(true);
        setLoading(false);
      }
    };
    
    initializeAuth();
  }, []); // ← Empty deps = run ONCE on mount only!

  // Listen for auth state changes
  useEffect(() => {
    console.log('🎧 CentralizedAuth: Setting up onAuthStateChange listener');
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: any, session: Session | null) => {
        console.log(`🎧 CentralizedAuth: Auth event received: ${event}`, { 
          hasSession: !!session, 
          userId: session?.user?.id 
        });

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
          if (session?.user) {
            console.log(`✅ CentralizedAuth: ${event} - updating session`, { userId: session.user.id });
            setSession(session);
            setUser(session.user);
            await fetchProfile(session.user.id);
          } else {
            // DON'T clear session if we don't get one from the event
            // The getSession() call in initialization should have already set it
            console.warn(`⚠️ CentralizedAuth: ${event} fired but no session - keeping existing state`);
            // Don't clear session/user/profile here!
          }
          
          // Stop loading and mark as initialized when listener fires
          setLoading(false);
          setIsInitialized(true);
        } else if (event === 'SIGNED_OUT') {
          console.log('🚪 CentralizedAuth: SIGNED_OUT - clearing session');
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
          setIsInitialized(true);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error('CentralizedAuth: Sign in error:', error);
        return { error };
      }
      
      // State will be updated by onAuthStateChange listener
      return { error: null };
    } catch (error) {
      console.error('CentralizedAuth: Sign in exception:', error);
      return { error: error as Error };
    }
  };

  const signUp = async (email: string, password: string, metadata?: any) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
        },
      });
      
      if (error) {
        console.error('CentralizedAuth: Sign up error:', error);
        return { error };
      }
      
      // State will be updated by onAuthStateChange listener
      return { error: null };
    } catch (error) {
      console.error('CentralizedAuth: Sign up exception:', error);
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    // IMMEDIATE logout: Clear state first, then tell Supabase (don't wait)
    // This prevents hanging just like we fixed with getSession()
    console.log('CentralizedAuth: Signing out...');
    
    // Clear state immediately for instant UI response
    setSession(null);
    setUser(null);
    setProfile(null);
    
    // Try to sign out from Supabase in the background (fire and forget)
    // Don't await - if it hangs, we've already logged out locally
    supabase.auth.signOut().catch((error: any) => {
      // Silently handle errors - we've already cleared state
      console.error('CentralizedAuth: Background signOut failed:', error);
    });
    
    // The onAuthStateChange listener will fire SIGNED_OUT event if Supabase succeeds
  };

  const refreshSession = async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        console.error('CentralizedAuth: Session refresh error:', error);
        return;
      }

      // State will be updated by onAuthStateChange listener
    } catch (error) {
      console.error('CentralizedAuth: Session refresh exception:', error);
    }
  };

  const updateProfile = async (updates: any) => {
    try {
      if (!user) {
        return { error: new Error('No user logged in') };
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) {
        console.error('CentralizedAuth: Profile update error:', error);
        return { error };
      }

      await fetchProfile(user.id);
      return { error: null };
    } catch (error) {
      console.error('CentralizedAuth: Profile update exception:', error);
      return { error: error as Error };
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
        }
  };

  const value: AuthContextType = {
    user,
    session,
    profile,
    loading,
    isInitialized,
    signIn,
    signUp,
    signOut,
    refreshSession,
    updateProfile,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within a CentralizedAuthProvider');
  }
  return context;
}

