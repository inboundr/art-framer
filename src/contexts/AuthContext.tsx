'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/client';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, metadata?: any) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: Error | null }>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: any }>;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let retryCount = 0;
    const maxRetries = 3;
    let timeoutId: NodeJS.Timeout | null = null;

    // Enhanced session initialization with multiple retry attempts
    const initializeAuth = async () => {
      try {
        console.log('🔐 Initializing authentication...');
        
        // Set a maximum timeout to prevent infinite loading
        timeoutId = setTimeout(() => {
          if (mounted) {
            console.log('⚠️ Auth initialization timeout, setting loading to false');
            setLoading(false);
          }
        }, 5000); // 5 second timeout
        
        // Wait a bit for localStorage to be available
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // First attempt: get existing session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting initial session:', error);
          
          // Enhanced recovery: try multiple approaches
          console.log('🔄 Attempting session recovery...');
          
          // Method 1: Refresh session
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          
          if (refreshError) {
            console.log('🔄 Refresh failed, trying localStorage recovery...');
            
            // Method 2: Check localStorage directly
            const storedSession = localStorage.getItem('supabase.auth.token');
            if (storedSession) {
              try {
                const parsedSession = JSON.parse(storedSession);
                if (parsedSession && parsedSession.access_token) {
                  console.log('🔄 Found stored session, attempting restoration...');
                  
                  // Method 3: Set session manually and verify
                  const { data: { user: restoredUser }, error: userError } = await supabase.auth.getUser(parsedSession.access_token);
                  
                  if (!userError && restoredUser) {
                    console.log('✅ Session restored from localStorage');
                    if (mounted) {
                      setSession(parsedSession);
                      setUser(restoredUser);
                      await fetchProfile(restoredUser.id);
                    }
                  } else {
                    // If user verification fails, try to refresh the token
                    console.log('🔄 User verification failed, trying token refresh...');
                    const { data: refreshResult, error: refreshError2 } = await supabase.auth.refreshSession();
                    if (!refreshError2 && refreshResult.session) {
                      console.log('✅ Session refreshed after user verification failed');
                      if (mounted) {
                        setSession(refreshResult.session);
                        setUser(refreshResult.session.user);
                        if (refreshResult.session.user) {
                          await fetchProfile(refreshResult.session.user.id);
                        }
                      }
                    }
                  }
                }
              } catch (parseError) {
                console.error('Error parsing stored session:', parseError);
                // Clear invalid session
                localStorage.removeItem('supabase.auth.token');
              }
            } else {
              console.log('🔄 No stored session found, checking cookies...');
              
              // Method 4: Check if we have cookies but no localStorage
              const cookies = document.cookie.split(';').reduce((acc, cookie) => {
                const [key, value] = cookie.trim().split('=');
                acc[key] = value;
                return acc;
              }, {} as Record<string, string>);
              
              if (cookies['sb-access-token'] || cookies['sb-refresh-token']) {
                console.log('🔄 Found cookies, attempting session recovery...');
                // Force a session refresh
                const { data: forceRefresh, error: forceRefreshError } = await supabase.auth.refreshSession();
                if (!forceRefreshError && forceRefresh.session) {
                  console.log('✅ Session recovered from cookies');
                  if (mounted) {
                    setSession(forceRefresh.session);
                    setUser(forceRefresh.session.user);
                    if (forceRefresh.session.user) {
                      await fetchProfile(forceRefresh.session.user.id);
                    }
                  }
                }
              }
            }
          } else if (refreshData.session) {
            console.log('✅ Session refreshed successfully');
            if (mounted) {
              setSession(refreshData.session);
              setUser(refreshData.session?.user ?? null);
              if (refreshData.session?.user) {
                await fetchProfile(refreshData.session.user.id);
              }
            }
          }
        } else if (session) {
          console.log('✅ Existing session found');
          if (mounted) {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
              await fetchProfile(session.user.id);
            }
          }
        } else {
          console.log('ℹ️ No existing session found');
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        
        // Retry logic for critical errors
        if (retryCount < maxRetries) {
          retryCount++;
          console.log(`🔄 Retrying authentication initialization (${retryCount}/${maxRetries})...`);
          setTimeout(() => {
            if (mounted) {
              initializeAuth();
            }
          }, 1000 * retryCount);
          return;
        } else {
          // If all retries failed, just set loading to false and continue
          console.log('⚠️ All auth initialization retries failed, continuing without auth');
          if (mounted) {
            setLoading(false);
          }
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes with enhanced error handling
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
          // Clear all local state
          setProfile(null);
          setSession(null);
          setUser(null);
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('Token refreshed successfully');
        } else if (event === 'SIGNED_IN') {
          console.log('User signed in:', session?.user?.email);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error handling auth state change:', error);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
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

  const signOut = async (): Promise<{ error: Error | null }> => {
    try {
      console.log('🚪 Starting logout process...');
      console.log('🚪 Supabase client:', supabase);
      console.log('🚪 Current user before logout:', user);
      
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
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
      
      // Clear all Supabase-related cookies by setting them to expire
      document.cookie.split(";").forEach(function(c) { 
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
      });
      
      // Sign out from Supabase with scope: 'local' to clear local session only
      console.log('🚪 Calling supabase.auth.signOut()...');
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      console.log('🚪 Supabase signOut result:', { error });
      
      if (error) {
        console.error('Supabase sign out error:', error);
        // Even if Supabase signOut fails, we've cleared local state
        return { error: null };
      } else {
        console.log('✅ Successfully signed out from Supabase');
        return { error: null };
      }
    } catch (error) {
      console.error('Sign out error:', error);
      // Even if there's an error, we've cleared local state
      return { error: null };
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error('No user logged in') };

    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) {
        // Handle unique constraint violations
        if (error.code === '23505') {
          if (error.message.includes('username')) {
            return { error: new Error('Username already taken. Please choose a different username.') };
          } else if (error.message.includes('email')) {
            return { error: new Error('Email already in use. Please use a different email.') };
          }
        }
        return { error };
      }

      if (!error) {
        setProfile(prev => prev ? { ...prev, ...updates } : null);
      }

      return { error: null };
    } catch (error) {
      console.error('Error updating profile:', error);
      return { error: error instanceof Error ? error : new Error('Failed to update profile') };
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const value = {
    user,
    profile,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
