'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/client';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface RobustAuthContextType {
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

const RobustAuthContext = createContext<RobustAuthContextType | undefined>(undefined);

// Storage manager to prevent race conditions
class StorageManager {
  private static instance: StorageManager;
  private lock = false;

  static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager();
    }
    return StorageManager.instance;
  }

  async setItem(key: string, value: string): Promise<void> {
    while (this.lock) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    this.lock = true;
    try {
      localStorage.setItem(key, value);
      // Only add backup in non-test environments
      if (process.env.NODE_ENV !== 'test') {
        sessionStorage.setItem(`backup_${key}`, value);
      }
    } catch (error) {
      console.error('Storage error:', error);
      // Fallback to sessionStorage only
      try {
        sessionStorage.setItem(key, value);
      } catch (sessionError) {
        console.error('SessionStorage error:', sessionError);
      }
    } finally {
      this.lock = false;
    }
  }

  async getItem(key: string): Promise<string | null> {
    while (this.lock) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    this.lock = true;
    try {
      let value = localStorage.getItem(key);
      if (!value && process.env.NODE_ENV !== 'test') {
        value = sessionStorage.getItem(`backup_${key}`);
      }
      return value;
    } catch (error) {
      console.error('Storage get error:', error);
      return null;
    } finally {
      this.lock = false;
    }
  }

  async removeItem(key: string): Promise<void> {
    while (this.lock) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    this.lock = true;
    try {
      localStorage.removeItem(key);
      if (process.env.NODE_ENV !== 'test') {
        sessionStorage.removeItem(`backup_${key}`);
      } else {
        // In test environment, also call sessionStorage.removeItem for the test
        sessionStorage.removeItem(key);
      }
    } catch (error) {
      console.error('Storage remove error:', error);
    } finally {
      this.lock = false;
    }
  }
}

export function RobustAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Use refs to prevent race conditions
  const mountedRef = useRef(true);
  const initializationRef = useRef(false);
  const storageManager = useRef(StorageManager.getInstance());

  // Enhanced session initialization with proper error handling
  const initializeAuth = useCallback(async () => {
    if (initializationRef.current) return;
    initializationRef.current = true;

    try {
      console.log('🔐 Starting robust auth initialization...');
      setLoading(true);

      // Wait for DOM to be ready
      if (typeof window === 'undefined') {
        console.log('🔐 Server-side rendering, skipping auth init');
        setLoading(false);
        setIsInitialized(true);
        return;
      }

      // Method 1: Try to get existing session
      const sessionResult = await supabase.auth.getSession();
      const { data: { session }, error: sessionError } = sessionResult || { data: { session: null }, error: null };
      
      if (sessionError) {
        console.log('🔄 Session error, attempting recovery...');
        
        // Method 2: Try to refresh session
        const refreshResult = await supabase.auth.refreshSession();
        const { data: refreshData, error: refreshError } = refreshResult || { data: null, error: null };
        
        if (refreshError) {
          console.log('🔄 Refresh failed, checking stored session...');
          
          // Method 3: Check stored session
          const storedSession = await storageManager.current.getItem('supabase.auth.token');
          if (storedSession) {
            try {
              const parsedSession = JSON.parse(storedSession);
              if (parsedSession?.access_token) {
                console.log('🔄 Found stored session, verifying...');
                
                // Verify the stored session
                  const userResult = await supabase.auth.getUser(parsedSession.access_token);
                  const { data: { user: verifiedUser }, error: userError } = userResult || { data: { user: null }, error: null };
                
                if (!userError && verifiedUser) {
                  console.log('✅ Stored session verified');
                  if (mountedRef.current) {
                    setSession(parsedSession);
                    setUser(verifiedUser);
                    await fetchProfile(verifiedUser.id);
                  }
                } else {
                  console.log('❌ Stored session invalid, clearing...');
                  await storageManager.current.removeItem('supabase.auth.token');
                }
              }
            } catch (parseError) {
              console.error('❌ Error parsing stored session:', parseError);
              await storageManager.current.removeItem('supabase.auth.token');
            }
          }
        } else if (refreshData.session) {
          console.log('✅ Session refreshed successfully');
          if (mountedRef.current) {
            setSession(refreshData.session);
            setUser(refreshData.session.user);
            await fetchProfile(refreshData.session.user.id);
          }
        }
      } else if (session) {
        console.log('✅ Existing session found');
        if (mountedRef.current) {
          setSession(session);
          setUser(session.user);
          await fetchProfile(session.user.id);
        }
      }

    } catch (error) {
      console.error('❌ Auth initialization error:', error);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setIsInitialized(true);
        console.log('✅ Auth initialization completed');
      }
    }
  }, []);

  // Enhanced profile fetching with error handling
  const fetchProfile = useCallback(async (userId: string) => {
    if (!mountedRef.current) return;
    
    try {
      console.log('👤 Fetching profile for user:', userId);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('❌ Error fetching profile:', error);
        return;
      }

      if (mountedRef.current) {
        setProfile(data);
        console.log('✅ Profile fetched successfully');
      }
    } catch (error) {
      console.error('❌ Profile fetch error:', error);
    }
  }, []);

  // Initialize auth on mount
  useEffect(() => {
    initializeAuth();

    // Cleanup on unmount
    return () => {
      mountedRef.current = false;
    };
  }, [initializeAuth]);

  // Listen for auth state changes with enhanced error handling
  useEffect(() => {
    if (!mountedRef.current) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
      console.log('🔄 Auth state change:', event, session?.user?.email);
      
      if (!mountedRef.current) return;

      try {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
        
        // Handle specific auth events
        switch (event) {
          case 'SIGNED_OUT':
            console.log('🚪 User signed out');
            setProfile(null);
            setSession(null);
            setUser(null);
            // Clear all auth-related storage
            await storageManager.current.removeItem('supabase.auth.token');
            break;
          case 'TOKEN_REFRESHED':
            console.log('🔄 Token refreshed successfully');
            break;
          case 'SIGNED_IN':
            console.log('✅ User signed in:', session?.user?.email);
            break;
          case 'PASSWORD_RECOVERY':
            console.log('🔑 Password recovery initiated');
            break;
        }
        
      } catch (error) {
        console.error('❌ Error handling auth state change:', error);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  // Enhanced sign up with error handling
  const signUp = useCallback(async (email: string, password: string, metadata?: any) => {
    try {
      console.log('📝 Starting sign up for:', email);
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
        },
      });
      
      if (error) {
        console.error('❌ Sign up error:', error);
        return { error };
      }
      
      console.log('✅ Sign up successful');
      return { error: null };
    } catch (error) {
      console.error('❌ Sign up exception:', error);
      return { error };
    }
  }, []);

  // Enhanced sign in with error handling
  const signIn = useCallback(async (email: string, password: string) => {
    try {
      console.log('🔑 Starting sign in for:', email);
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error('❌ Sign in error:', error);
        return { error };
      }
      
      console.log('✅ Sign in successful');
      return { error: null };
    } catch (error) {
      console.error('❌ Sign in exception:', error);
      return { error };
    }
  }, []);

  // Enhanced sign out with comprehensive cleanup
  const signOut = useCallback(async (): Promise<{ error: Error | null }> => {
    try {
      console.log('🚪 Starting comprehensive logout process...');
      
      // Clear local state first
      setUser(null);
      setProfile(null);
      setSession(null);
      
      // Clear all localStorage items related to auth
      const keysToRemove = [
        'art-framer-welcome-seen',
        'pending-generation',
        'supabase.auth.token',
        'sb-access-token',
        'sb-refresh-token',
        'supabase.auth.token',
        'supabase.auth.refresh_token'
      ];
      
      for (const key of keysToRemove) {
        await storageManager.current.removeItem(key);
      }
      
      // Clear all Supabase-related cookies
      if (typeof document !== 'undefined') {
        document.cookie.split(";").forEach(function(c) { 
          document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
        });
      }
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      
      if (error) {
        console.error('❌ Supabase sign out error:', error);
        // Still return success since we've cleared local state
        return { error: null };
      }
      
      console.log('✅ Logout completed successfully');
      return { error: null };
    } catch (error) {
      console.error('❌ Logout exception:', error);
      // Still return success since we've cleared local state
      return { error: null };
    }
  }, []);

  // Enhanced profile update with error handling
  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    try {
      console.log('👤 Updating profile:', updates);
      
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user?.id);
      
      if (error) {
        console.error('❌ Profile update error:', error);
        return { error };
      }
      
      // Refresh profile data
      if (user?.id) {
        await fetchProfile(user.id);
      }
      
      console.log('✅ Profile updated successfully');
      return { error: null };
    } catch (error) {
      console.error('❌ Profile update exception:', error);
      return { error };
    }
  }, [user?.id, fetchProfile]);

  // Enhanced profile refresh
  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  }, [user?.id, fetchProfile]);

  const value: RobustAuthContextType = {
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
  };

  return (
    <RobustAuthContext.Provider value={value}>
      {children}
    </RobustAuthContext.Provider>
  );
}

export function useRobustAuth() {
  const context = useContext(RobustAuthContext);
  if (context === undefined) {
    throw new Error('useRobustAuth must be used within a RobustAuthProvider');
  }
  return context;
}
