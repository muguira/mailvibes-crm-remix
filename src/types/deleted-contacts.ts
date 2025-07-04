import { Json } from "@/integrations/supabase/types";

export interface DeletedContact {
  id: string;
  user_id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  status?: string | null;
  last_activity?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string;
  expiry_date: string;
  data?: Json | null;
  list_id?: string | null;
}

export interface DeletedContactInsert {
  id: string;
  user_id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  status?: string | null;
  last_activity?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  expiry_date: string;
  data?: Json | null;
  list_id?: string | null;
}

export interface DeletedContactUpdate {
  id?: string;
  user_id?: string;
  name?: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  status?: string | null;
  last_activity?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
  expiry_date?: string;
  data?: Json | null;
  list_id?: string | null;
}
