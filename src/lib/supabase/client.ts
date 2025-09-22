import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

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
          settings: any
          status: 'pending' | 'generating' | 'completed' | 'failed'
          result: any
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          prompt: string
          settings: any
          status?: 'pending' | 'generating' | 'completed' | 'failed'
          result?: any
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          prompt?: string
          settings?: any
          status?: 'pending' | 'generating' | 'completed' | 'failed'
          result?: any
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

