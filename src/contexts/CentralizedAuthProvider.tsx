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
      console.log('👤 CentralizedAuth: Fetching profile for user:', userId);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('❌ CentralizedAuth: Error fetching profile:', error);
        return;
      }

      console.log('✅ CentralizedAuth: Profile fetched successfully:', data);
      setProfile(data);
    } catch (error) {
      console.error('❌ CentralizedAuth: Profile fetch exception:', error);
    }
  }, []);

  const initializeAuth = useCallback(async () => {
    try {
      console.log('🔐 CentralizedAuth: Initializing authentication...');
      setLoading(true);

      // Ensure Supabase is ready
      const isReady = await ensureSupabaseReady();
      if (!isReady) {
        console.warn('❌ CentralizedAuth: Supabase not ready');
        setLoading(false);
        setIsInitialized(true);
        return;
      }

      // Get current session
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('❌ CentralizedAuth: Session error:', error);
        // Try to refresh session
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        if (!refreshError && refreshData.session) {
          setSession(refreshData.session);
          setUser(refreshData.session.user);
          // Fetch profile for refreshed session
          await fetchProfile(refreshData.session.user.id);
        }
      } else if (session) {
        // Check if session is expired or about to expire (within 5 minutes)
        const expiresAt = session.expires_at ? session.expires_at * 1000 : null;
        const now = Date.now();
        const fiveMinutes = 5 * 60 * 1000;
        
        if (expiresAt && expiresAt < (now + fiveMinutes)) {
          console.log('🔄 CentralizedAuth: Session expiring soon, refreshing...');
          // Refresh session proactively
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          if (!refreshError && refreshData.session) {
            setSession(refreshData.session);
            setUser(refreshData.session.user);
            await fetchProfile(refreshData.session.user.id);
          } else {
            // Refresh failed, use existing session
            setSession(session);
            setUser(session.user);
            await fetchProfile(session.user.id);
          }
        } else {
          setSession(session);
          setUser(session.user);
          // Fetch profile for current session
          await fetchProfile(session.user.id);
        }
      }

      setIsInitialized(true);
    } catch (error) {
      console.error('❌ CentralizedAuth: Initialization error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initializeAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
      console.log('🔄 CentralizedAuth: Auth state change:', event, session?.user?.email);
      
      setSession(session);
      // CRITICAL FIX: Only set user to null on explicit SIGNED_OUT event
      if (event === 'SIGNED_OUT') {
        setUser(null);
      } else {
        setUser(session?.user ?? null);
      }

      // Fetch profile when user signs in
      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }

      // Handle specific events
      switch (event) {
        case 'SIGNED_OUT':
          console.log('🚪 CentralizedAuth: User signed out');
          setUser(null);
          setSession(null);
          setProfile(null);
          break;
        case 'TOKEN_REFRESHED':
          console.log('🔄 CentralizedAuth: Token refreshed');
          break;
        case 'SIGNED_IN':
          console.log('✅ CentralizedAuth: User signed in');
          break;
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [initializeAuth]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      console.log('🔑 CentralizedAuth: Starting sign in for:', email);
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error('❌ CentralizedAuth: Sign in error:', error);
        return { error };
      }
      
      console.log('✅ CentralizedAuth: Sign in successful');
      return { error: null };
    } catch (error) {
      console.error('❌ CentralizedAuth: Sign in exception:', error);
      return { error: error as Error };
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, metadata?: any) => {
    try {
      console.log('📝 CentralizedAuth: Starting sign up for:', email);
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
        },
      });
      
      if (error) {
        console.error('❌ CentralizedAuth: Sign up error:', error);
        return { error };
      }
      
      console.log('✅ CentralizedAuth: Sign up successful');
      return { error: null };
    } catch (error) {
      console.error('❌ CentralizedAuth: Sign up exception:', error);
      return { error: error as Error };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('❌ CentralizedAuth: Sign out error:', error);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

  const updateProfile = useCallback(async (updates: any) => {
    if (!user) return { error: new Error('No user logged in') };

    try {
      console.log('👤 CentralizedAuth: Updating profile:', updates);
      
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) {
        console.error('❌ CentralizedAuth: Profile update error:', error);
        return { error };
      }

      // Update local profile state
      setProfile((prev: any) => prev ? { ...prev, ...updates } : null);
      console.log('✅ CentralizedAuth: Profile updated successfully');
      return { error: null };
    } catch (error) {
      console.error('❌ CentralizedAuth: Profile update exception:', error);
      return { error: error as Error };
    }
  }, [user]);

  const refreshSession = useCallback(async () => {
    try {
      console.log('🔄 CentralizedAuth: Refreshing session...');
      const { data, error } = await supabase.auth.refreshSession();
      if (!error && data.session) {
        console.log('✅ CentralizedAuth: Session refreshed successfully');
        setSession(data.session);
        setUser(data.session.user);
        // Fetch profile after session refresh
        if (data.session.user) {
          await fetchProfile(data.session.user.id);
        }
      } else if (error) {
        console.error('❌ CentralizedAuth: Session refresh error:', error);
        // If refresh fails, user might need to log in again
        setUser(null);
        setSession(null);
        setProfile(null);
      }
    } catch (error) {
      console.error('❌ CentralizedAuth: Refresh error:', error);
      setUser(null);
      setSession(null);
      setProfile(null);
    }
  }, [fetchProfile]);

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

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useCentralizedAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useCentralizedAuth must be used within a CentralizedAuthProvider');
  }
  return context;
}
