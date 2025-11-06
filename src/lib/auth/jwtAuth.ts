/**
 * JWT-Only Authentication Helper
 * 
 * Provides standardized JWT authentication for API routes.
 * Requires Authorization header with Bearer token.
 * No cookie fallbacks, no session refresh, no complex logic.
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { User } from '@supabase/supabase-js';

export interface AuthResult {
  user: User | null;
  error: string | null;
}

/**
 * Authenticates a request using JWT from Authorization header
 * 
 * @param request - Next.js request object
 * @returns Object with user (if authenticated) or error message
 * 
 * @example
 * ```typescript
 * const { user, error } = await authenticateRequest(request);
 * if (error || !user) {
 *   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 * }
 * // Use user.id for queries
 * ```
 */
export async function authenticateRequest(request: NextRequest): Promise<AuthResult> {
  // Extract Authorization header
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader) {
    console.warn('JWT Auth: No Authorization header provided');
    return {
      user: null,
      error: 'Authorization header required'
    };
  }

  if (!authHeader.startsWith('Bearer ')) {
    console.warn('JWT Auth: Invalid Authorization header format');
    return {
      user: null,
      error: 'Invalid Authorization header format. Expected: Bearer <token>'
    };
  }

  // Extract token
  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  if (!token || token.length < 10) {
    console.warn('JWT Auth: Token is empty or too short');
    return {
      user: null,
      error: 'Invalid token'
    };
  }

  // Validate token with Supabase
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError) {
      console.warn('JWT Auth: Token validation failed', {
        error: authError.message,
        status: (authError as any)?.status
      });
      return {
        user: null,
        error: authError.message || 'Invalid or expired token'
      };
    }

    if (!user) {
      console.warn('JWT Auth: No user found for valid token');
      return {
        user: null,
        error: 'User not found'
      };
    }

    // Success
    console.log('JWT Auth: User authenticated', {
      userId: user.id,
      email: user.email
    });

    return {
      user,
      error: null
    };
  } catch (error) {
    console.error('JWT Auth: Unexpected error during authentication', error);
    return {
      user: null,
      error: error instanceof Error ? error.message : 'Authentication failed'
    };
  }
}

/**
 * Quick authentication check - returns true if request has valid JWT
 * Useful for conditional logic without needing the full user object
 */
export async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const { user } = await authenticateRequest(request);
  return !!user;
}

/**
 * Extracts user ID from JWT token without full validation
 * Warning: This does not verify the token! Only use for logging/debugging
 * For actual authentication, always use authenticateRequest()
 */
export function extractUserIdFromToken(token: string): string | null {
  try {
    // JWT format: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    // Decode payload (base64url)
    const payload = JSON.parse(
      Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()
    );
    
    return payload.sub || null;
  } catch {
    return null;
  }
}

