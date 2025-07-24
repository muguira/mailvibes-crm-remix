export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      comments: {
        Row: {
          content: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          company: string | null
          created_at: string
          data: Json | null
          email: string | null
          id: string
          last_activity: string | null
          list_id: string | null
          name: string
          phone: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          data?: Json | null
          email?: string | null
          id?: string
          last_activity?: string | null
          list_id?: string | null
          name: string
          phone?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company?: string | null
          created_at?: string
          data?: Json | null
          email?: string | null
          id?: string
          last_activity?: string | null
          list_id?: string | null
          name?: string
          phone?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      opportunities: {
        Row: {
          close_date: string | null
          company_linkedin: string | null
          company_name: string | null
          created_at: string
          data: Json | null
          employees: number | null
          id: string
          last_contacted: string | null
          lead_source: string | null
          next_meeting: string | null
          opportunity: string
          original_contact_id: string | null
          owner: string | null
          priority: string | null
          revenue: number | null
          revenue_display: string | null
          status: string
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          close_date?: string | null
          company_linkedin?: string | null
          company_name?: string | null
          created_at?: string
          data?: Json | null
          employees?: number | null
          id?: string
          last_contacted?: string | null
          lead_source?: string | null
          next_meeting?: string | null
          opportunity: string
          original_contact_id?: string | null
          owner?: string | null
          priority?: string | null
          revenue?: number | null
          revenue_display?: string | null
          status?: string
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          close_date?: string | null
          company_linkedin?: string | null
          company_name?: string | null
          created_at?: string
          data?: Json | null
          employees?: number | null
          id?: string
          last_contacted?: string | null
          lead_source?: string | null
          next_meeting?: string | null
          opportunity?: string
          original_contact_id?: string | null
          owner?: string | null
          priority?: string | null
          revenue?: number | null
          revenue_display?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_original_contact_id_fkey"
            columns: ["original_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      deleted_contacts: {
        Row: {
          company: string | null
          created_at: string
          data: Json | null
          deleted_at: string
          email: string | null
          expiry_date: string
          id: string
          last_activity: string | null
          list_id: string | null
          name: string
          phone: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company?: string | null
          created_at: string
          data?: Json | null
          deleted_at?: string
          email?: string | null
          expiry_date: string
          id: string
          last_activity?: string | null
          list_id?: string | null
          name: string
          phone?: string | null
          status?: string | null
          updated_at: string
          user_id: string
        }
        Update: {
          company?: string | null
          created_at?: string
          data?: Json | null
          deleted_at?: string
          email?: string | null
          expiry_date?: string
          id?: string
          last_activity?: string | null
          list_id?: string | null
          name?: string
          phone?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      email_accounts: {
        Row: {
          created_at: string | null
          email: string
          id: string
          last_sync_at: string | null
          last_sync_error: string | null
          last_sync_status: string | null
          provider: string | null
          settings: Json | null
          sync_enabled: boolean | null
          sync_frequency_minutes: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          last_sync_at?: string | null
          last_sync_error?: string | null
          last_sync_status?: string | null
          provider?: string | null
          settings?: Json | null
          sync_enabled?: boolean | null
          sync_frequency_minutes?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          last_sync_at?: string | null
          last_sync_error?: string | null
          last_sync_status?: string | null
          provider?: string | null
          settings?: Json | null
          sync_enabled?: boolean | null
          sync_frequency_minutes?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      email_attachments: {
        Row: {
          content_id: string | null
          created_at: string | null
          email_id: string
          filename: string
          gmail_attachment_id: string | null
          id: string
          inline: boolean | null
          mime_type: string | null
          size_bytes: number | null
          storage_path: string | null
        }
        Insert: {
          content_id?: string | null
          created_at?: string | null
          email_id: string
          filename: string
          gmail_attachment_id?: string | null
          id?: string
          inline?: boolean | null
          mime_type?: string | null
          size_bytes?: number | null
          storage_path?: string | null
        }
        Update: {
          content_id?: string | null
          created_at?: string | null
          email_id?: string
          filename?: string
          gmail_attachment_id?: string | null
          id?: string
          inline?: boolean | null
          mime_type?: string | null
          size_bytes?: number | null
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_attachments_email_id_fkey"
            columns: ["email_id"]
            isOneToOne: false
            referencedRelation: "emails"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sync_log: {
        Row: {
          completed_at: string | null
          created_at: string | null
          email_account_id: string
          emails_created: number | null
          emails_synced: number | null
          emails_updated: number | null
          error_message: string | null
          id: string
          metadata: Json | null
          started_at: string | null
          status: string
          sync_type: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          email_account_id: string
          emails_created?: number | null
          emails_synced?: number | null
          emails_updated?: number | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          started_at?: string | null
          status: string
          sync_type: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          email_account_id?: string
          emails_created?: number | null
          emails_synced?: number | null
          emails_updated?: number | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          started_at?: string | null
          status?: string
          sync_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_sync_log_email_account_id_fkey"
            columns: ["email_account_id"]
            isOneToOne: false
            referencedRelation: "email_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      emails: {
        Row: {
          attachment_count: number | null
          bcc_emails: Json | null
          body_html: string | null
          body_text: string | null
          categories: Json | null
          cc_emails: Json | null
          contact_id: string | null
          created_at: string | null
          date: string
          email_account_id: string
          from_email: string
          from_name: string | null
          gmail_history_id: number | null
          gmail_id: string
          gmail_thread_id: string | null
          has_attachments: boolean | null
          id: string
          is_draft: boolean | null
          is_important: boolean | null
          is_read: boolean | null
          is_sent: boolean | null
          is_spam: boolean | null
          is_starred: boolean | null
          is_trash: boolean | null
          labels: Json | null
          message_id: string | null
          reply_to: string | null
          size_bytes: number | null
          snippet: string | null
          subject: string | null
          to_emails: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          attachment_count?: number | null
          bcc_emails?: Json | null
          body_html?: string | null
          body_text?: string | null
          categories?: Json | null
          cc_emails?: Json | null
          contact_id?: string | null
          created_at?: string | null
          date: string
          email_account_id: string
          from_email: string
          from_name?: string | null
          gmail_history_id?: number | null
          gmail_id: string
          gmail_thread_id?: string | null
          has_attachments?: boolean | null
          id?: string
          is_draft?: boolean | null
          is_important?: boolean | null
          is_read?: boolean | null
          is_sent?: boolean | null
          is_spam?: boolean | null
          is_starred?: boolean | null
          is_trash?: boolean | null
          labels?: Json | null
          message_id?: string | null
          reply_to?: string | null
          size_bytes?: number | null
          snippet?: string | null
          subject?: string | null
          to_emails?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          attachment_count?: number | null
          bcc_emails?: Json | null
          body_html?: string | null
          body_text?: string | null
          categories?: Json | null
          cc_emails?: Json | null
          contact_id?: string | null
          created_at?: string | null
          date?: string
          email_account_id?: string
          from_email?: string
          from_name?: string | null
          gmail_history_id?: number | null
          gmail_id?: string
          gmail_thread_id?: string | null
          has_attachments?: boolean | null
          id?: string
          is_draft?: boolean | null
          is_important?: boolean | null
          is_read?: boolean | null
          is_sent?: boolean | null
          is_spam?: boolean | null
          is_starred?: boolean | null
          is_trash?: boolean | null
          labels?: Json | null
          message_id?: string | null
          reply_to?: string | null
          size_bytes?: number | null
          snippet?: string | null
          subject?: string | null
          to_emails?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "emails_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emails_email_account_id_fkey"
            columns: ["email_account_id"]
            isOneToOne: false
            referencedRelation: "email_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      leads_rows: {
        Row: {
          created_at: string
          data: Json
          id: string
          row_id: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          data: Json
          id?: string
          row_id: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          row_id?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      oauth_tokens: {
        Row: {
          access_token: string
          created_at: string | null
          email_account_id: string
          expires_at: string
          id: string
          last_refresh_attempt: string | null
          refresh_attempts: number | null
          refresh_token: string | null
          scope: string | null
          token_type: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string | null
          email_account_id: string
          expires_at: string
          id?: string
          last_refresh_attempt?: string | null
          refresh_attempts?: number | null
          refresh_token?: string | null
          scope?: string | null
          token_type?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string | null
          email_account_id?: string
          expires_at?: string
          id?: string
          last_refresh_attempt?: string | null
          refresh_attempts?: number | null
          refresh_token?: string | null
          scope?: string | null
          token_type?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "oauth_tokens_email_account_id_fkey"
            columns: ["email_account_id"]
            isOneToOne: true
            referencedRelation: "email_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          email: string
          expires_at: string
          id: string
          invited_by: string
          organization_id: string
          role: string
          status: string | null
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          invited_by: string
          organization_id: string
          role?: string
          status?: string | null
          token: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          organization_id?: string
          role?: string
          status?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string | null
          id: string
          organization_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          organization_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          organization_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          domain: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          domain?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          domain?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      pinned_emails: {
        Row: {
          contact_email: string
          created_at: string
          email_id: string
          id: string
          is_pinned: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          contact_email: string
          created_at?: string
          email_id: string
          id?: string
          is_pinned?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          contact_email?: string
          created_at?: string
          email_id?: string
          id?: string
          is_pinned?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          current_organization: string | null
          current_organization_id: string | null
          email: string | null
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          current_organization?: string | null
          current_organization_id?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          current_organization?: string | null
          current_organization_id?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_current_organization_fkey"
            columns: ["current_organization"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_current_organization_id_fkey"
            columns: ["current_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          contact: string | null
          created_at: string
          deadline: string | null
          description: string | null
          display_status: string
          id: string
          priority: string | null
          status: string
          tag: string | null
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          contact?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          display_status?: string
          id?: string
          priority?: string | null
          status?: string
          tag?: string | null
          title: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          contact?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          display_status?: string
          id?: string
          priority?: string | null
          status?: string
          tag?: string | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_activities: {
        Row: {
          activity_type: string
          created_at: string | null
          details: Json | null
          entity_id: string | null
          entity_name: string | null
          entity_type: string | null
          field_name: string | null
          id: string
          is_pinned: boolean | null
          new_value: Json | null
          old_value: Json | null
          timestamp: string | null
          user_email: string | null
          user_id: string
          user_name: string
        }
        Insert: {
          activity_type: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string | null
          field_name?: string | null
          id?: string
          is_pinned?: boolean | null
          new_value?: Json | null
          old_value?: Json | null
          timestamp?: string | null
          user_email?: string | null
          user_id: string
          user_name: string
        }
        Update: {
          activity_type?: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string | null
          field_name?: string | null
          id?: string
          is_pinned?: boolean | null
          new_value?: Json | null
          old_value?: Json | null
          timestamp?: string | null
          user_email?: string | null
          user_id?: string
          user_name?: string
        }
        Relationships: []
      }
      user_activity_comments: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          user_activity_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          user_activity_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          user_activity_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_activity_comments_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_activity_comments_user_activity_id_fkey"
            columns: ["user_activity_id"]
            isOneToOne: false
            referencedRelation: "user_activities"
            referencedColumns: ["id"]
          },
        ]
      }
      user_api_keys: {
        Row: {
          api_key: string
          created_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          last_used_at: string | null
          name: string
          user_id: string
        }
        Insert: {
          api_key: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          name: string
          user_id: string
        }
        Update: {
          api_key?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      zapier_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          last_used_at: string
          session_token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          last_used_at?: string
          session_token: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          last_used_at?: string
          session_token?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_expired_deleted_contacts: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_expired_zapier_sessions: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      count_unique_jsonb_field_values: {
        Args: { p_user_id: string; p_field_name: string }
        Returns: number
      }
      create_user_api_key: {
        Args: { p_user_id: string; p_api_key: string; p_name: string }
        Returns: string
      }
      get_unique_jsonb_field_values: {
        Args: { p_user_id: string; p_field_name: string; p_limit?: number }
        Returns: {
          value: string
          count: number
        }[]
      }
      restore_deleted_contact: {
        Args: { contact_id_param: string; user_id_param: string }
        Returns: {
          restored: boolean
        }[]
      }
      soft_delete_contacts: {
        Args: { contact_ids: string[]; user_id_param: string }
        Returns: {
          moved_count: number
        }[]
      }
      update_api_key_usage: {
        Args: { p_api_key: string }
        Returns: undefined
      }
      validate_api_key: {
        Args: { p_api_key: string }
        Returns: {
          user_id: string
          name: string
          is_active: boolean
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
