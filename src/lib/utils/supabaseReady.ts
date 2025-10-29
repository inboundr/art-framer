import { supabase } from '@/lib/supabase/client';

/**
 * Utility function to ensure Supabase client is ready before making calls
 * This prevents race conditions that cause image loading issues
 */
export async function ensureSupabaseReady(maxRetries: number = 5): Promise<boolean> {
  let retries = 0;
  
  while (retries < maxRetries) {
    // Check if supabase client is ready
    if (supabase && supabase.from && (supabase as any).isReady?.()) {
      return true;
    }
    
    console.log(`🔄 Waiting for Supabase client (attempt ${retries + 1}/${maxRetries})`);
    await new Promise(resolve => setTimeout(resolve, 100 * (retries + 1)));
    retries++;
  }
  
  console.warn('❌ Supabase client not ready after retries');
  return false;
}

/**
 * Wrapper for Supabase operations that ensures client is ready
 */
export async function withSupabaseReady<T>(
  operation: () => Promise<T>,
  fallback?: T,
  maxRetries: number = 5
): Promise<T | undefined> {
  const isReady = await ensureSupabaseReady(maxRetries);
  
  if (!isReady) {
    console.warn('❌ Supabase not ready, returning fallback');
    return fallback;
  }
  
  try {
    return await operation();
  } catch (error) {
    console.error('❌ Supabase operation failed:', error);
    return fallback;
  }
}
