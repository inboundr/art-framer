export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      stripe_session_addresses: {
        Row: {
          id: string
          stripe_session_id: string
          user_id: string
          shipping_address: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          stripe_session_id: string
          user_id: string
          shipping_address: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          stripe_session_id?: string
          user_id?: string
          shipping_address?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stripe_session_addresses_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
