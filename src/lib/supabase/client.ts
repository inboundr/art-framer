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

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase environment variables not found, using mock client');
    return {} as any;
  }

  supabaseInstance = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // Enhanced session storage configuration with fallback
    storageKey: 'supabase.auth.token',
    storage: {
      getItem: (key: string) => {
        if (typeof window !== 'undefined') {
          try {
            const value = window.localStorage.getItem(key);
            console.log(`🔍 Storage getItem: ${key} = ${value ? 'exists' : 'null'}`);
            return value;
          } catch (error) {
            console.error('Error getting from localStorage:', error);
            return null;
          }
        }
        return null;
      },
      setItem: (key: string, value: string) => {
        if (typeof window !== 'undefined') {
          try {
            window.localStorage.setItem(key, value);
            console.log(`💾 Storage setItem: ${key} = stored`);
            
            // Also set a backup in sessionStorage
            window.sessionStorage.setItem(`backup_${key}`, value);
          } catch (error) {
            console.error('Error setting localStorage:', error);
            // Fallback to sessionStorage
            try {
              window.sessionStorage.setItem(key, value);
            } catch (sessionError) {
              console.error('Error setting sessionStorage:', sessionError);
            }
          }
        }
      },
      removeItem: (key: string) => {
        if (typeof window !== 'undefined') {
          try {
            window.localStorage.removeItem(key);
            window.sessionStorage.removeItem(`backup_${key}`);
            console.log(`🗑️ Storage removeItem: ${key}`);
          } catch (error) {
            console.error('Error removing from storage:', error);
          }
        }
      },
    },
    // Enhanced flow type for better compatibility
    flowType: 'pkce'
  },
  // Enhanced cookie configuration
  cookieOptions: {
    name: 'supabase-auth-token',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: false, // Allow client-side access
  },
  // Global configuration
  global: {
    headers: {
      'X-Client-Info': 'art-framer-web'
    }
  }
  });

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
          credits: number
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
          credits?: number
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
          credits?: number
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

