import { createBrowserClient } from '@supabase/ssr'

// Lazy initialization to prevent build-time errors
let supabaseInstance: ReturnType<typeof createBrowserClient> | null = null;

export const supabase = (() => {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  // Check if we're in a build environment
  if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
    // During build, return a mock client
    return {} as any;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Only log in development
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 Supabase client initialization:', {
      supabaseUrl: supabaseUrl ? 'exists' : 'missing',
      supabaseAnonKey: supabaseAnonKey ? 'exists' : 'missing',
      nodeEnv: process.env.NODE_ENV,
      windowDefined: typeof window !== 'undefined'
    });
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('❌ Supabase environment variables not found, using mock client');
    return {} as any;
  }

  supabaseInstance = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true, // Auto-detect OAuth session in URL
      flowType: 'pkce', // Use PKCE flow for OAuth
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      storageKey: 'supabase.auth.token',
    },
    global: {
      headers: {
        'X-Client-Info': 'art-framer-web'
      }
      // Note: Don't override fetch - Supabase SSR automatically handles cookies
      // via the cookie configuration in middleware and server-side client
      // The browser client reads from localStorage which is synced from cookies
    }
  });

  // Add a ready check method
  (supabaseInstance as any).isReady = () => {
    return !!(supabaseInstance && supabaseInstance.from);
  };

  return supabaseInstance;
})();

// Database types
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          username: string | null
          full_name: string | null
          avatar_url: string | null
          // Removed plan_type - no plans needed
          is_premium: boolean
          login_count: number
          last_login_at: string | null
          has_seen_styles_onboarding: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          // Removed plan_type - no plans needed
          is_premium?: boolean
          login_count?: number
          last_login_at?: string | null
          has_seen_styles_onboarding?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          // Removed plan_type - no plans needed
          is_premium?: boolean
          login_count?: number
          last_login_at?: string | null
          has_seen_styles_onboarding?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      images: {
        Row: {
          id: string
          user_id: string
          prompt: string
          negative_prompt: string | null
          aspect_ratio: 'square' | 'tall' | 'wide'
          width: number
          height: number
          model: '3.0-latest' | '3.0' | '2.1' | '1.5'
          status: 'pending' | 'generating' | 'completed' | 'failed'
          image_url: string | null
          thumbnail_url: string | null
          metadata: any
          likes: number
          is_public: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          prompt: string
          negative_prompt?: string | null
          aspect_ratio: 'square' | 'tall' | 'wide'
          width: number
          height: number
          model: '3.0-latest' | '3.0' | '2.1' | '1.5'
          status?: 'pending' | 'generating' | 'completed' | 'failed'
          image_url?: string | null
          thumbnail_url?: string | null
          metadata?: any
          likes?: number
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          prompt?: string
          negative_prompt?: string | null
          aspect_ratio?: 'square' | 'tall' | 'wide'
          width?: number
          height?: number
          model?: '3.0-latest' | '3.0' | '2.1' | '1.5'
          status?: 'pending' | 'generating' | 'completed' | 'failed'
          image_url?: string | null
          thumbnail_url?: string | null
          metadata?: any
          likes?: number
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      image_likes: {
        Row: {
          id: string
          user_id: string
          image_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          image_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          image_id?: string
          created_at?: string
        }
      }
      user_generations: {
        Row: {
          id: string
          user_id: string
          prompt: string
          settings: Record<string, unknown>
          status: 'pending' | 'generating' | 'completed' | 'failed'
          result: Record<string, unknown>
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          prompt: string
          settings: Record<string, unknown>
          status?: 'pending' | 'generating' | 'completed' | 'failed'
          result?: Record<string, unknown>
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          prompt?: string
          settings?: Record<string, unknown>
          status?: 'pending' | 'generating' | 'completed' | 'failed'
          result?: Record<string, unknown>
          created_at?: string
          updated_at?: string
        }
      }
      stripe_session_addresses: {
        Row: {
          id: string
          stripe_session_id: string
          user_id: string
          shipping_address: Record<string, unknown>
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          stripe_session_id: string
          user_id: string
          shipping_address: Record<string, unknown>
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          stripe_session_id?: string
          user_id?: string
          shipping_address?: Record<string, unknown>
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      image_status: 'pending' | 'generating' | 'completed' | 'failed'
      image_aspect_ratio: 'square' | 'tall' | 'wide'
      generation_model: '3.0-latest' | '3.0' | '2.1' | '1.5'
    }
  }
}

