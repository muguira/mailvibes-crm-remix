
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
      leads_rows: {
        Row: {
          id: string
          user_id: string | null
          row_id: number
          data: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          row_id: number
          data: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          row_id?: number
          data?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_rows_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      user_lists: {
        Row: {
          id: string
          user_id: string
          name: string
          type: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          type: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          type?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_lists_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      grid_data: {
        Row: {
          id: string
          user_id: string
          list_id: string
          row_id: string
          data: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          list_id: string
          row_id: string
          data: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          list_id?: string
          row_id?: string
          data?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grid_data_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      tasks: {
        Row: {
          id: string
          user_id: string
          title: string
          deadline?: string
          contact?: string
          description?: string
          display_status: "upcoming" | "overdue" | "completed"
          status: "on-track" | "at-risk" | "off-track"
          type: "follow-up" | "respond" | "task" | "cross-functional"
          tag?: string
          created_at: string
          updated_at: string
          priority?: "low" | "medium" | "high"
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          deadline?: string
          contact?: string
          description?: string
          display_status?: "upcoming" | "overdue" | "completed"
          status?: "on-track" | "at-risk" | "off-track"
          type?: "follow-up" | "respond" | "task" | "cross-functional"
          tag?: string
          created_at?: string
          updated_at?: string
          priority?: "low" | "medium" | "high"
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          deadline?: string
          contact?: string
          description?: string
          display_status?: "upcoming" | "overdue" | "completed"
          status?: "on-track" | "at-risk" | "off-track"
          type?: "follow-up" | "respond" | "task" | "cross-functional"
          tag?: string
          created_at?: string
          updated_at?: string
          priority?: "low" | "medium" | "high"
        }
      }
      // Add minimal definitions for these tables to satisfy references in code
      contacts: {
        Row: {
          id: string
          user_id: string
          name: string
          email?: string
          phone?: string
          company?: string
          status?: string
          last_activity?: string
          created_at: string
          updated_at: string
          data?: Record<string, any>
        }
      }
      activities: {
        Row: {
          id: string
          user_id: string
          contact_id?: string
          type: string
          content?: string
          created_at: string
          updated_at: string
        }
      }
      grid_change_history: {
        Row: {
          id: string
          user_id: string
          grid_id: string
          field: string
          old_value?: string
          new_value?: string
          created_at: string
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
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Insertable<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type Updateable<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
