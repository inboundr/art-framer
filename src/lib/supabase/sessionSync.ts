/**
 * Explicit cookie-to-localStorage sync utility
 * 
 * Supabase SSR stores sessions in cookies (server-side) but the browser client
 * needs to sync these cookies to localStorage for client-side access.
 * 
 * This function explicitly triggers that sync by making an auth request that
 * includes cookies, forcing Supabase to sync cookies to localStorage.
 */

import { supabase } from './client';

/**
 * Forces cookie-to-localStorage sync by making an auth request
 * @param maxAttempts Maximum number of sync attempts
 * @param delayMs Delay between attempts
 * @returns Promise that resolves when sync is complete (or fails)
 */
export async function forceCookieSync(
  maxAttempts: number = 5,
  delayMs: number = 200
): Promise<{ success: boolean; session: any | null; user: any | null }> {
  console.log('🔄 Starting explicit cookie-to-localStorage sync...');
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`🔄 Sync attempt ${attempt}/${maxAttempts}...`);
      
      // Method 1: Call getUser() which makes HTTP request with cookies
      // This triggers Supabase to sync cookies to localStorage
      const getUserPromise = supabase.auth.getUser();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('getUser timeout')), 5000)
      );
      
      const getUserResult = await Promise.race([getUserPromise, timeoutPromise]) as any;
      
      if (getUserResult?.data?.user) {
        // User found - cookies are valid
        console.log('✅ Sync: User found via getUser()');
        
        // Wait a moment for localStorage sync to complete
        await new Promise(resolve => setTimeout(resolve, delayMs));
        
        // Now check localStorage via getSession()
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (session) {
          console.log('✅ Sync: Session synced to localStorage successfully', {
            userId: session.user.id,
            attempt
          });
          return { success: true, session, user: getUserResult.data.user };
        } else if (sessionError) {
          console.warn('⚠️ Sync: getUser succeeded but getSession failed', sessionError);
        }
      } else if (getUserResult?.error) {
        // If getUser fails, user is not authenticated
        const errorMessage = getUserResult.error.message || '';
        
        // Don't retry on authentication errors
        if (errorMessage.includes('JWT') || errorMessage.includes('session') || getUserResult.error.status === 401) {
          console.log('🚪 Sync: User not authenticated (cookies invalid or expired)');
          return { success: false, session: null, user: null };
        }
      }
      
      // If we get here, sync didn't complete - wait and retry
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
      }
    } catch (error) {
      console.warn(`⚠️ Sync attempt ${attempt} failed:`, error);
      
      // If it's a timeout, try alternative method
      if (error instanceof Error && error.message.includes('timeout')) {
        // Try alternative: Make API call to trigger cookie sync
        try {
          const apiResponse = await fetch('/api/user-images?page=1&limit=1', {
            credentials: 'include',
            method: 'GET',
            cache: 'no-store'
          });
          
          if (apiResponse.ok) {
            console.log('✅ Sync: API call succeeded, waiting for localStorage sync...');
            await new Promise(resolve => setTimeout(resolve, delayMs * 2));
            
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
              console.log('✅ Sync: Session synced via API fallback');
              return { success: true, session, user: session.user };
            }
          }
        } catch (apiError) {
          console.warn('⚠️ Sync: API fallback also failed', apiError);
        }
      }
      
      // Continue to next attempt if not last
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
      }
    }
  }
  
  // All attempts failed - check one final time
  console.warn('⚠️ Sync: All attempts failed, checking localStorage one final time...');
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session) {
    console.log('✅ Sync: Session found on final check');
    return { success: true, session, user: session.user };
  }
  
  console.error('❌ Sync: Cookie-to-localStorage sync failed after all attempts');
  return { success: false, session: null, user: null };
}

/**
 * Detects if we're returning from an external site (like Stripe)
 * by checking URL parameters or referrer
 */
export function isReturningFromExternalSite(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check for common redirect parameters
  const urlParams = new URLSearchParams(window.location.search);
  const hasRedirectParams = 
    urlParams.has('session_id') || // Stripe checkout
    urlParams.has('code') || // OAuth
    urlParams.has('state'); // OAuth
  
  // Check referrer
  const referrer = document.referrer;
  const isExternalReferrer = referrer && (
    referrer.includes('stripe.com') ||
    referrer.includes('checkout.stripe.com') ||
    !referrer.includes(window.location.origin)
  );
  
  return hasRedirectParams || !!isExternalReferrer;
}

