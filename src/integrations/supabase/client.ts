import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/integrations/supabase/types'

const SUPABASE_URL = 'https://nihnthenxxbkvoisatop.supabase.co'
const SUPABASE_PUBLISHABLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5paG50aGVueHhia3ZvaXNhdG9wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxNjY2MDQsImV4cCI6MjA2MTc0MjYwNH0.wjkBOFFcmPbwdTDJVbZzcOWhFYwfuFjRBhg00sWoYxk'

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
})