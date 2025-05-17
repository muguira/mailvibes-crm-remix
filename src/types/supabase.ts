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
      contacts: {
        Row: {
          id: string
          user_id: string
          name: string
          email?: string | null
          phone?: string | null
          company?: string | null
          status?: string | null
          last_activity?: string | null
          created_at: string
          updated_at: string
          data?: Json | null
          list_id?: string | null
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          email?: string | null
          phone?: string | null
          company?: string | null
          status?: string | null
          last_activity?: string | null
          created_at?: string
          updated_at?: string
          data?: Json | null
          list_id?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          email?: string | null
          phone?: string | null
          company?: string | null
          status?: string | null
          last_activity?: string | null
          created_at?: string
          updated_at?: string
          data?: Json | null
          list_id?: string | null
        }
      }
      activities: {
        Row: {
          id: string
          user_id: string
          contact_id?: string | null
          type: string
          content?: string | null
          timestamp: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          contact_id?: string | null
          type: string
          content?: string | null
          timestamp?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          contact_id?: string | null
          type?: string
          content?: string | null
          timestamp?: string
          created_at?: string
          updated_at?: string
        }
      }
      user_activities: {
        Row: {
          id: string
          user_id: string
          user_name: string
          user_email?: string | null
          timestamp: string
          activity_type: string
          entity_id?: string | null
          entity_type?: string | null
          entity_name?: string | null
          field_name?: string | null
          old_value?: Json | null
          new_value?: Json | null
          details?: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          user_name: string
          user_email?: string | null
          timestamp?: string
          activity_type: string
          entity_id?: string | null
          entity_type?: string | null
          entity_name?: string | null
          field_name?: string | null
          old_value?: Json | null
          new_value?: Json | null
          details?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          user_name?: string
          user_email?: string | null
          timestamp?: string
          activity_type?: string
          entity_id?: string | null
          entity_type?: string | null
          entity_name?: string | null
          field_name?: string | null
          old_value?: Json | null
          new_value?: Json | null
          details?: Json | null
          created_at?: string
        }
      }
      grid_change_history: {
        Row: {
          id: string
          user_id: string
          grid_id: string
          field: string
          old_value?: string | null
          new_value?: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          grid_id: string
          field: string
          old_value?: string | null
          new_value?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          grid_id?: string
          field?: string
          old_value?: string | null
          new_value?: string | null
          created_at?: string
        }
      }
      comments: {
        Row: {
          id: string
          user_id: string
          content: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          content: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          content?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      user_activity_comments: {
        Row: {
          id: string
          comment_id: string
          user_activity_id: string
          created_at: string
        }
        Insert: {
          id?: string
          comment_id: string
          user_activity_id: string
          created_at?: string
        }
        Update: {
          id?: string
          comment_id?: string
          user_activity_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_activity_comments_comment_id_fkey"
            columns: ["comment_id"]
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_activity_comments_user_activity_id_fkey"
            columns: ["user_activity_id"]
            referencedRelation: "user_activities"
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

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Insertable<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type Updateable<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
