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

      // Wait a bit for Supabase to restore session from storage/cookies
      // This is important because Supabase SSR needs time to restore cookies and sync to localStorage
      await new Promise(resolve => setTimeout(resolve, 200));

      // Try to trigger cookie sync by making a request to Supabase auth endpoint
      // This ensures cookies are read and synced to localStorage
      try {
        console.log('🔍 CentralizedAuth: Calling getUser() to trigger cookie sync...');
        // The getSession call should trigger cookie reading, but we can also try getUser
        // which makes a request to Supabase that will include cookies
        // Add timeout to prevent hanging
        const getUserPromise = supabase.auth.getUser();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('getUser timeout')), 3000)
        );
        
        console.log('⏳ CentralizedAuth: Waiting for getUser() response (max 3s)...');
        
        let checkUser, checkError;
        try {
          const result = await Promise.race([getUserPromise, timeoutPromise]) as any;
          checkUser = result?.data?.user;
          checkError = result?.error;
        } catch (timeoutError) {
          console.warn('⚠️ CentralizedAuth: getUser() timed out, continuing with getSession()...', timeoutError);
          checkUser = null;
          checkError = null;
        }
        
        console.log('📥 CentralizedAuth: getUser() response received', {
          hasUser: !!checkUser,
          hasError: !!checkError,
          errorMessage: checkError?.message,
          userId: checkUser?.id
        });
        
        if (checkUser && !checkError) {
          console.log('✅ CentralizedAuth: User found via getUser() during init', { userId: checkUser.id });
          // If getUser works, getSession should also work - use this session directly
          console.log('🔍 CentralizedAuth: Getting session after successful getUser()...');
          const { data: { session: userSession }, error: sessionError } = await supabase.auth.getSession();
          console.log('📥 CentralizedAuth: getSession() after getUser()', {
            hasSession: !!userSession,
            hasError: !!sessionError,
            errorMessage: sessionError?.message
          });
          
          if (userSession) {
            console.log('✅ CentralizedAuth: Session found via getUser() path', { userId: userSession.user.id });
            setSession(userSession);
            setUser(userSession.user);
            await fetchProfile(userSession.user.id);
            setIsInitialized(true);
            setLoading(false);
            return;
          } else {
            console.warn('⚠️ CentralizedAuth: getUser() succeeded but getSession() returned no session');
          }
        } else if (checkError) {
          console.log('⚠️ CentralizedAuth: getUser() error (will try getSession)', { 
            error: checkError.message,
            status: checkError.status 
          });
        } else {
          console.log('⚠️ CentralizedAuth: getUser() returned no user and no error (will try getSession)');
        }
      } catch (e) {
        console.error('❌ CentralizedAuth: getUser() exception (will try getSession)', e);
        // Continue to getSession
      }

      // Get current session - try multiple times if needed
      let session = null;
      let error = null;
      
      // First attempt
      console.log('🔍 CentralizedAuth: Calling getSession() for first attempt...');
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        session = sessionData.session;
        error = sessionError;
        
        console.log('🔍 CentralizedAuth: First getSession() attempt completed', {
          hasSession: !!session,
          hasError: !!error,
          errorMessage: error?.message,
          sessionUserId: session?.user?.id
        });
      } catch (e) {
        console.error('❌ CentralizedAuth: getSession() threw exception', e);
        error = e as Error;
      }
      
      // If no session, try API endpoint to trigger cookie sync
      if (!session && !error) {
        console.log('⏳ CentralizedAuth: No session found, trying API endpoint to trigger cookie sync...');
        try {
          // Call our API endpoint which reads cookies server-side
          // This will trigger Supabase to sync cookies to localStorage
          const apiResponse = await fetch('/api/user-images?page=1&limit=1', {
            credentials: 'include',
            method: 'GET'
          });
          
          console.log('📡 CentralizedAuth: API endpoint response', {
            status: apiResponse.status,
            ok: apiResponse.ok
          });
          
          if (apiResponse.ok) {
            // API succeeded - cookies are valid, wait for Supabase to sync
            console.log('✅ CentralizedAuth: API call succeeded - cookies are valid, waiting for sync...');
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Try getSession again - should work now
            const { data: retryData, error: retryError } = await supabase.auth.getSession();
            if (retryData.session) {
              session = retryData.session;
              console.log('✅ CentralizedAuth: Session restored after API call', { userId: session.user.id });
            } else if (retryError) {
              console.warn('⚠️ CentralizedAuth: getSession() still failed after API call', retryError);
              error = retryError;
            }
          } else if (apiResponse.status === 401) {
            console.log('⚠️ CentralizedAuth: API returned 401 - user is not authenticated');
            // User is logged out - clear state
            setUser(null);
            setSession(null);
            setProfile(null);
            setIsInitialized(true);
            setLoading(false);
            return;
          }
        } catch (apiError) {
          console.warn('⚠️ CentralizedAuth: API fallback failed', apiError);
        }
      }
      
      // If still no session, wait a bit more and try one more time
      if (!session && !error) {
        console.log('⏳ CentralizedAuth: Still no session, final retry...');
        await new Promise(resolve => setTimeout(resolve, 300));
        const { data: finalRetryData, error: finalRetryError } = await supabase.auth.getSession();
        if (finalRetryData.session) {
          session = finalRetryData.session;
          console.log('✅ CentralizedAuth: Session restored on final retry');
        } else if (finalRetryError) {
          error = finalRetryError;
        }
      }
      
      if (error) {
        console.error('❌ CentralizedAuth: Session error:', error);
        // Try to refresh session
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        if (!refreshError && refreshData.session) {
          console.log('✅ CentralizedAuth: Session refreshed after error');
          setSession(refreshData.session);
          setUser(refreshData.session.user);
          await fetchProfile(refreshData.session.user.id);
          setIsInitialized(true);
          setLoading(false);
          return;
        } else {
          // No valid session - but wait for INITIAL_SESSION event before clearing
          console.log('⚠️ CentralizedAuth: No valid session found, waiting for INITIAL_SESSION event...');
          setIsInitialized(true);
          setLoading(false);
          // Don't clear user yet - let onAuthStateChange handle it
          return;
        }
      } 
      
      if (session) {
        console.log('✅ CentralizedAuth: Session found', { userId: session.user.id, expiresAt: session.expires_at });
        // Check if session is expired or about to expire (within 5 minutes)
        const expiresAt = session.expires_at ? session.expires_at * 1000 : null;
        const now = Date.now();
        const fiveMinutes = 5 * 60 * 1000;
        
        if (expiresAt && expiresAt < (now + fiveMinutes)) {
          console.log('🔄 CentralizedAuth: Session expiring soon, refreshing...');
          // Refresh session proactively
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          if (!refreshError && refreshData.session) {
            console.log('✅ CentralizedAuth: Session refreshed proactively');
            setSession(refreshData.session);
            setUser(refreshData.session.user);
            await fetchProfile(refreshData.session.user.id);
            setIsInitialized(true);
            setLoading(false);
            return;
          } else {
            // Refresh failed, use existing session
            console.log('⚠️ CentralizedAuth: Refresh failed, using existing session');
            setSession(session);
            setUser(session.user);
            await fetchProfile(session.user.id);
            setIsInitialized(true);
            setLoading(false);
            return;
          }
        } else {
          // Session is valid
          setSession(session);
          setUser(session.user);
          await fetchProfile(session.user.id);
          setIsInitialized(true);
          setLoading(false);
          return;
        }
      } else {
        // No session found - wait for INITIAL_SESSION event from onAuthStateChange
        // Supabase might still be restoring session from cookies/storage
        console.log('⚠️ CentralizedAuth: No session found immediately, waiting for INITIAL_SESSION event...');
        
        // Check localStorage directly as a fallback - Supabase SSR stores session there
        try {
          // Find all localStorage keys that might contain session data
          const allKeys = typeof window !== 'undefined' ? Object.keys(localStorage) : [];
          const supabaseKeys = allKeys.filter(k => 
            k.includes('supabase') || 
            k.includes('sb-') || 
            k.includes('auth-token') ||
            k.includes('auth.token')
          );
          
          console.log('🔍 CentralizedAuth: Checking localStorage for session', { 
            supabaseKeysCount: supabaseKeys.length,
            supabaseKeys: supabaseKeys.slice(0, 5) // First 5 keys
          });
          
          if (supabaseKeys.length > 0) {
            // Found Supabase keys - session should exist, wait longer for restoration
            console.log('⏳ CentralizedAuth: Found Supabase keys in localStorage, waiting longer for session restoration...');
            
            // Wait longer and try multiple times
            for (let attempt = 0; attempt < 3; attempt++) {
              await new Promise(resolve => setTimeout(resolve, 300));
              const { data: retrySessionData, error: retryError } = await supabase.auth.getSession();
              if (retrySessionData.session) {
                console.log(`✅ CentralizedAuth: Session found after localStorage check (attempt ${attempt + 1})`, { 
                  userId: retrySessionData.session.user.id 
                });
                setSession(retrySessionData.session);
                setUser(retrySessionData.session.user);
                await fetchProfile(retrySessionData.session.user.id);
                setIsInitialized(true);
                setLoading(false);
                return;
              }
            }
            
            console.warn('⚠️ CentralizedAuth: Found localStorage keys but session not restored after retries');
          }
        } catch (e) {
          console.warn('⚠️ CentralizedAuth: Error checking localStorage', e);
        }
        
        setIsInitialized(true);
        setLoading(false);
        // Don't clear user/session yet - let onAuthStateChange handle INITIAL_SESSION
        return;
      }
    } catch (error) {
      console.error('❌ CentralizedAuth: Initialization error:', error);
      // Even on error, mark as initialized so app can continue
      setIsInitialized(true);
      setLoading(false);
    }
  }, [fetchProfile]);

  useEffect(() => {
    console.log('🚀 CentralizedAuth: Setting up auth - calling initializeAuth()...');
    initializeAuth().catch((error) => {
      console.error('❌ CentralizedAuth: initializeAuth() failed:', error);
    });

    // Listen for auth state changes - this MUST be set up immediately
    // CRITICAL: This listener MUST be set up before initializeAuth() completes
    // because INITIAL_SESSION event can fire synchronously
    console.log('🔄 CentralizedAuth: Setting up onAuthStateChange listener...');
    
    // Set up listener FIRST, then call initializeAuth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
      console.log('🔄 CentralizedAuth: Auth state change:', event, session?.user?.email, {
        hasSession: !!session,
        hasUser: !!session?.user,
        sessionExpiresAt: session?.expires_at
      });
      
      setSession(session);
      
      // Handle INITIAL_SESSION FIRST - it's the most important for session restoration
      if (event === 'INITIAL_SESSION') {
        // Handle INITIAL_SESSION immediately
        console.log('🔄 CentralizedAuth: INITIAL_SESSION event received (priority handler)', { 
          hasSession: !!session, 
          hasUser: !!session?.user,
          sessionExpiresAt: session?.expires_at
        });
        
        setIsInitialized(true);
        setLoading(false);
        
        // For INITIAL_SESSION, cookies exist but might not be in localStorage yet
        // The browser client needs to make a request that includes cookies to sync them
        // Try multiple approaches to restore session from cookies
        
        console.log('🔍 CentralizedAuth: INITIAL_SESSION - Attempting to restore session from cookies...');
        
        // Approach 1: Call getUser() which validates token server-side (uses cookies)
        let restoredUser = null;
        let restoredSession = null;
        
        try {
          console.log('🔍 CentralizedAuth: INITIAL_SESSION - Step 1: Calling getUser() to validate cookies...');
          
          // Add timeout to prevent hanging
          const getUserPromise = supabase.auth.getUser();
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('getUser timeout after 3 seconds')), 3000)
          );
          
          let getUserResult;
          try {
            getUserResult = await Promise.race([getUserPromise, timeoutPromise]) as any;
          } catch (raceError) {
            console.warn('⚠️ CentralizedAuth: getUser() timed out or failed, trying alternative method...', raceError);
            // Try alternative: Call our API endpoint which can read cookies server-side
            try {
              const apiResponse = await fetch('/api/user-images?page=1&limit=1', {
                credentials: 'include',
                method: 'GET'
              });
              
              if (apiResponse.ok || apiResponse.status === 200) {
                // API succeeded - user is authenticated, now try to get session from Supabase
                console.log('✅ CentralizedAuth: API call succeeded, user is authenticated via cookies');
                // Wait a moment for Supabase to sync
                await new Promise(resolve => setTimeout(resolve, 200));
                const { data: { session: syncedSession } } = await supabase.auth.getSession();
                if (syncedSession) {
                  console.log('✅ CentralizedAuth: Session synced after API call', { userId: syncedSession.user.id });
                  setUser(syncedSession.user);
                  setSession(syncedSession);
                  await fetchProfile(syncedSession.user.id);
                  return;
                }
              } else if (apiResponse.status === 401) {
                console.log('⚠️ CentralizedAuth: API returned 401 - user not authenticated');
                setUser(null);
                setSession(null);
                setProfile(null);
                return;
              }
            } catch (apiError) {
              console.warn('⚠️ CentralizedAuth: API fallback also failed', apiError);
            }
            
            // If all else fails, user is logged out
            setUser(null);
            setSession(null);
            setProfile(null);
            return;
          }
          
          const { data: { user: cookieUser }, error: cookieError } = getUserResult || { data: { user: null }, error: null };
          
          console.log('📥 CentralizedAuth: INITIAL_SESSION - getUser() result', {
            hasUser: !!cookieUser,
            hasError: !!cookieError,
            errorMessage: cookieError?.message,
            userId: cookieUser?.id
          });
          
          if (cookieUser && !cookieError) {
            restoredUser = cookieUser;
            console.log('✅ CentralizedAuth: User found via getUser() during INITIAL_SESSION', { userId: cookieUser.id });
            
            // Now get the session - it should be synced now
            console.log('🔍 CentralizedAuth: INITIAL_SESSION - Step 2: Getting session after successful getUser()...');
            const { data: { session: userSession }, error: sessionError } = await supabase.auth.getSession();
            
            console.log('📥 CentralizedAuth: INITIAL_SESSION - getSession() after getUser()', {
              hasSession: !!userSession,
              hasError: !!sessionError,
              errorMessage: sessionError?.message
            });
            
            if (userSession) {
              restoredSession = userSession;
              console.log('✅ CentralizedAuth: Session found via getUser() during INITIAL_SESSION', { 
                userId: userSession.user.id,
                email: userSession.user.email 
              });
            } else {
              console.warn('⚠️ CentralizedAuth: getUser() succeeded but getSession() returned no session');
              // Try refreshing the session
              console.log('🔄 CentralizedAuth: INITIAL_SESSION - Attempting to refresh session...');
              const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
              if (refreshData.session) {
                restoredSession = refreshData.session;
                console.log('✅ CentralizedAuth: Session refreshed during INITIAL_SESSION', { userId: refreshData.session.user.id });
              } else {
                console.warn('⚠️ CentralizedAuth: Session refresh failed', { error: refreshError?.message });
              }
            }
          } else {
            console.log('⚠️ CentralizedAuth: getUser() failed during INITIAL_SESSION', { 
              error: cookieError?.message,
              status: cookieError?.status 
            });
          }
        } catch (e) {
          console.error('❌ CentralizedAuth: getUser() exception during INITIAL_SESSION', e);
        }
        
        // If we restored session via getUser(), use it
        if (restoredSession && restoredUser) {
          setUser(restoredUser);
          setSession(restoredSession);
          await fetchProfile(restoredUser.id);
          return;
        }
        
        // Fallback: Try getSession() directly
        const { data: { session: currentSession }, error: currentError } = await supabase.auth.getSession();
        console.log('🔍 CentralizedAuth: getSession() check during INITIAL_SESSION', {
          hasCurrentSession: !!currentSession,
          hasPassedSession: !!session,
          currentError: currentError?.message
        });
        
        // Use the session from getSession() if available, otherwise use the passed session
        const sessionToUse = currentSession || session;
        
        if (sessionToUse?.user) {
          // If session was restored, set user
          console.log('✅ CentralizedAuth: Session restored from INITIAL_SESSION', { 
            userId: sessionToUse.user.id,
            email: sessionToUse.user.email 
          });
          setUser(sessionToUse.user);
          setSession(sessionToUse);
          await fetchProfile(sessionToUse.user.id);
        } else {
          // No session - user is logged out (but only clear if we're sure)
          console.log('🚪 CentralizedAuth: No session in INITIAL_SESSION - user is logged out');
          // Don't wait - if INITIAL_SESSION fired with no session, user is definitely logged out
          setUser(null);
          setSession(null);
          setProfile(null);
        }
        
        return; // Exit early, don't process through switch statement
      }
      
      // Handle specific events
      switch (event) {
        case 'SIGNED_OUT':
          console.log('🚪 CentralizedAuth: User signed out');
          setUser(null);
          setSession(null);
          setProfile(null);
          setIsInitialized(true);
          setLoading(false);
          break;
        case 'TOKEN_REFRESHED':
          console.log('🔄 CentralizedAuth: Token refreshed');
          setUser(session?.user ?? null);
          setIsInitialized(true);
          setLoading(false);
          if (session?.user) {
            await fetchProfile(session.user.id);
          }
          break;
        case 'SIGNED_IN':
          console.log('✅ CentralizedAuth: User signed in');
          setUser(session?.user ?? null);
          setIsInitialized(true);
          setLoading(false);
          if (session?.user) {
            await fetchProfile(session.user.id);
          }
          break;
        default:
          // Handle INITIAL_SESSION first (before other default cases)
          if (event === 'INITIAL_SESSION') {
            // Initial session event - Supabase restored session from storage
            console.log('🔄 CentralizedAuth: INITIAL_SESSION event received', { 
              hasSession: !!session, 
              hasUser: !!session?.user,
              sessionExpiresAt: session?.expires_at
            });
            
            setIsInitialized(true);
            setLoading(false);
            
            // For INITIAL_SESSION, cookies exist but might not be in localStorage yet
            // The browser client needs to make a request that includes cookies to sync them
            // Try multiple approaches to restore session from cookies
            
            console.log('🔍 CentralizedAuth: INITIAL_SESSION - Attempting to restore session from cookies...');
            
            // Approach 1: Call getUser() which validates token server-side (uses cookies)
            let restoredUser = null;
            let restoredSession = null;
            
            try {
              console.log('🔍 CentralizedAuth: INITIAL_SESSION - Step 1: Calling getUser() to validate cookies...');
              const getUserResult = await Promise.race([
                supabase.auth.getUser(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('getUser timeout')), 5000))
              ]) as any;
              
              const { data: { user: cookieUser }, error: cookieError } = getUserResult || { data: { user: null }, error: null };
              
              console.log('📥 CentralizedAuth: INITIAL_SESSION - getUser() result', {
                hasUser: !!cookieUser,
                hasError: !!cookieError,
                errorMessage: cookieError?.message,
                userId: cookieUser?.id
              });
              
              if (cookieUser && !cookieError) {
                restoredUser = cookieUser;
                console.log('✅ CentralizedAuth: User found via getUser() during INITIAL_SESSION', { userId: cookieUser.id });
                
                // Now get the session - it should be synced now
                console.log('🔍 CentralizedAuth: INITIAL_SESSION - Step 2: Getting session after successful getUser()...');
                const { data: { session: userSession }, error: sessionError } = await supabase.auth.getSession();
                
                console.log('📥 CentralizedAuth: INITIAL_SESSION - getSession() after getUser()', {
                  hasSession: !!userSession,
                  hasError: !!sessionError,
                  errorMessage: sessionError?.message
                });
                
                if (userSession) {
                  restoredSession = userSession;
                  console.log('✅ CentralizedAuth: Session found via getUser() during INITIAL_SESSION', { 
                    userId: userSession.user.id,
                    email: userSession.user.email 
                  });
                } else {
                  console.warn('⚠️ CentralizedAuth: getUser() succeeded but getSession() returned no session');
                  // Try refreshing the session
                  console.log('🔄 CentralizedAuth: INITIAL_SESSION - Attempting to refresh session...');
                  const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
                  if (refreshData.session) {
                    restoredSession = refreshData.session;
                    console.log('✅ CentralizedAuth: Session refreshed during INITIAL_SESSION', { userId: refreshData.session.user.id });
                  } else {
                    console.warn('⚠️ CentralizedAuth: Session refresh failed', { error: refreshError?.message });
                  }
                }
              } else {
                console.log('⚠️ CentralizedAuth: getUser() failed during INITIAL_SESSION', { 
                  error: cookieError?.message,
                  status: cookieError?.status 
                });
              }
            } catch (e) {
              console.error('❌ CentralizedAuth: getUser() exception during INITIAL_SESSION', e);
            }
            
            // If we restored session via getUser(), use it
            if (restoredSession && restoredUser) {
              setUser(restoredUser);
              setSession(restoredSession);
              await fetchProfile(restoredUser.id);
              return;
            }
            
            // Fallback: Try getSession() directly
            const { data: { session: currentSession }, error: currentError } = await supabase.auth.getSession();
            console.log('🔍 CentralizedAuth: getSession() check during INITIAL_SESSION', {
              hasCurrentSession: !!currentSession,
              hasPassedSession: !!session,
              currentError: currentError?.message
            });
            
            // Use the session from getSession() if available, otherwise use the passed session
            const sessionToUse = currentSession || session;
            
            if (sessionToUse?.user) {
              // If session was restored, set user
              console.log('✅ CentralizedAuth: Session restored from INITIAL_SESSION', { 
                userId: sessionToUse.user.id,
                email: sessionToUse.user.email 
              });
              setUser(sessionToUse.user);
              setSession(sessionToUse);
              await fetchProfile(sessionToUse.user.id);
            } else {
              // No session - user is logged out (but only clear if we're sure)
              console.log('🚪 CentralizedAuth: No session in INITIAL_SESSION - user is logged out');
              // Don't wait - if INITIAL_SESSION fired with no session, user is definitely logged out
              setUser(null);
              setSession(null);
              setProfile(null);
            }
          }
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
      
      // Validate inputs
      if (!email || !email.trim()) {
        const error = { message: 'Email is required' } as Error;
        console.error('❌ CentralizedAuth: Empty email');
        return { error };
      }
      
      if (!password || !password.trim()) {
        const error = { message: 'Password is required' } as Error;
        console.error('❌ CentralizedAuth: Empty password');
        return { error };
      }
      
      // Normalize email (lowercase, trim)
      const normalizedEmail = email.trim().toLowerCase();
      console.log('🔑 CentralizedAuth: Attempting sign in with normalized email:', normalizedEmail);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: password, // Don't trim password - might have intentional spaces
      });
      
      if (error) {
        console.error('❌ CentralizedAuth: Sign in error:', {
          message: error.message,
          status: error.status,
          name: error.name
        });
        
        // Provide more helpful error messages
        let userFriendlyMessage = error.message;
        
        if (error.message.includes('Invalid login credentials') || error.status === 400) {
          userFriendlyMessage = 'Invalid email or password. Please check your credentials and try again.';
        } else if (error.message.includes('Email not confirmed')) {
          userFriendlyMessage = 'Please check your email and confirm your account before signing in.';
        } else if (error.message.includes('User not found')) {
          userFriendlyMessage = 'No account found with this email. Please sign up first.';
        }
        
        return { 
          error: {
            ...error,
            message: userFriendlyMessage
          }
        };
      }
      
      console.log('✅ CentralizedAuth: Sign in successful', {
        userId: data.user?.id,
        email: data.user?.email
      });
      return { error: null };
    } catch (error) {
      console.error('❌ CentralizedAuth: Sign in exception:', error);
      return { 
        error: error instanceof Error ? error : new Error('An unexpected error occurred during sign in')
      };
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
