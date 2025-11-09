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

      console.log('✅ CentralizedAuth: Profile fetched successfully');
      setProfile(data);
    } catch (error) {
      console.error('❌ CentralizedAuth: Profile fetch exception:', error);
    }
  }, []);

  const initializeAuth = useCallback(async () => {
    try {
      console.log('🔐 CentralizedAuth: Initializing authentication (listener-only mode)...');
      setLoading(true);

      // Ensure Supabase is ready
      const isReady = await ensureSupabaseReady();
      if (!isReady) {
        console.warn('❌ CentralizedAuth: Supabase not ready');
        setLoading(false);
        setIsInitialized(true);
        return;
      }

      // DON'T call getSession() - it hangs!
      // The onAuthStateChange listener will fire INITIAL_SESSION event automatically
      // if a session exists in localStorage. This is the Supabase-recommended approach.
      console.log('✅ CentralizedAuth: Initialization complete - relying on listener for session');
      console.log('📡 CentralizedAuth: onAuthStateChange will fire INITIAL_SESSION if session exists');
      
      // Set a timeout to stop loading state if listener doesn't fire
      setTimeout(() => {
        if (loading) {
          console.log('⏰ CentralizedAuth: Listener timeout - setting initialized without session');
          setIsInitialized(true);
          setLoading(false);
        }
      }, 2000);
        
    } catch (error) {
      console.error('❌ CentralizedAuth: Initialization error:', error);
      setIsInitialized(true);
      setLoading(false);
    }
  }, [loading]);

  // Initialize auth on mount
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Listen for auth state changes
  useEffect(() => {
    console.log('👂 CentralizedAuth: Setting up auth state listener...');
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: any, session: Session | null) => {
        console.log('🔔 CentralizedAuth: Auth state changed', { 
          event, 
          hasSession: !!session,
          userId: session?.user?.id 
        });

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
          console.log(`✅ CentralizedAuth: ${event}`, { userId: session?.user?.id });
          
          if (session?.user) {
            setSession(session);
            setUser(session.user);
            await fetchProfile(session.user.id);
          } else {
            console.warn(`⚠️ CentralizedAuth: ${event} fired but no session/user`);
            setSession(null);
            setUser(null);
            setProfile(null);
          }
          
          // Stop loading and mark as initialized when listener fires
          setLoading(false);
          setIsInitialized(true);
        } else if (event === 'SIGNED_OUT') {
          console.log('🚪 CentralizedAuth: User signed out');
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
          setIsInitialized(true);
        }
      }
    );

    return () => {
      console.log('🔌 CentralizedAuth: Cleaning up auth listener');
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔐 CentralizedAuth: Signing in user...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error('❌ CentralizedAuth: Sign in error:', error);
        return { error };
      }
      
      console.log('✅ CentralizedAuth: Sign in successful', { userId: data.user?.id });
      // State will be updated by onAuthStateChange listener
      return { error: null };
    } catch (error) {
      console.error('❌ CentralizedAuth: Sign in exception:', error);
      return { error: error as Error };
    }
  };

  const signUp = async (email: string, password: string, metadata?: any) => {
    try {
      console.log('📝 CentralizedAuth: Signing up user...');
      const { data, error } = await supabase.auth.signUp({
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
      
      console.log('✅ CentralizedAuth: Sign up successful', { userId: data.user?.id });
      // State will be updated by onAuthStateChange listener
      return { error: null };
    } catch (error) {
      console.error('❌ CentralizedAuth: Sign up exception:', error);
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    try {
      console.log('🚪 CentralizedAuth: Signing out user...');
      console.log('🔍 CentralizedAuth: Current state before signout', {
        hasUser: !!user,
        hasSession: !!session,
        userId: user?.id
      });
      
      // Add a timeout to prevent hanging
      const signOutPromise = supabase.auth.signOut();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Sign out timeout')), 5000)
      );
      
      const { error } = await Promise.race([signOutPromise, timeoutPromise]) as any;

      if (error) {
        console.error('❌ CentralizedAuth: Sign out error:', error);
        // Still clear state locally even if API call fails
        console.log('⚠️ CentralizedAuth: Clearing state locally despite error');
        setSession(null);
        setUser(null);
        setProfile(null);
        return; // Don't throw, just clear state
      }

      console.log('✅ CentralizedAuth: Sign out successful');
      
      // Manually clear state immediately (don't wait for listener)
      console.log('🧹 CentralizedAuth: Manually clearing state');
      setSession(null);
      setUser(null);
      setProfile(null);
      
      // State will also be updated by onAuthStateChange listener (belt and suspenders)
    } catch (error) {
      console.error('❌ CentralizedAuth: Sign out exception:', error);
      // Clear state locally even if sign out fails
      console.log('⚠️ CentralizedAuth: Clearing state locally after exception');
      setSession(null);
      setUser(null);
      setProfile(null);
      // Don't throw, we've cleared the state
    }
  };

  const refreshSession = async () => {
    try {
      console.log('🔄 CentralizedAuth: Refreshing session...');
      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        console.error('❌ CentralizedAuth: Session refresh error:', error);
        return;
      }

      console.log('✅ CentralizedAuth: Session refreshed', { userId: data.session?.user?.id });
      // State will be updated by onAuthStateChange listener
    } catch (error) {
      console.error('❌ CentralizedAuth: Session refresh exception:', error);
    }
  };

  const updateProfile = async (updates: any) => {
    try {
      if (!user) {
        return { error: new Error('No user logged in') };
      }

      console.log('💾 CentralizedAuth: Updating profile...');
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) {
        console.error('❌ CentralizedAuth: Profile update error:', error);
        return { error };
      }

      console.log('✅ CentralizedAuth: Profile updated successfully');
      await fetchProfile(user.id);
      return { error: null };
    } catch (error) {
      console.error('❌ CentralizedAuth: Profile update exception:', error);
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

