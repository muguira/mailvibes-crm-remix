-- Clean and fix ALL RLS policies for emails table
-- This completely removes all existing policies and recreates them properly

-- First, completely disable RLS to clear everything
ALTER TABLE public.emails DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS  
ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on emails table (even if names might vary)
DO $$ 
DECLARE
    policy_record RECORD;
BEGIN
    -- Get all policies on the emails table
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'emails' 
        AND schemaname = 'public'
    LOOP
        -- Drop each policy
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.emails', policy_record.policyname);
        RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
    END LOOP;
END $$;

-- Create new comprehensive policy for emails that works with background sync
CREATE POLICY "emails_comprehensive_access" ON public.emails
  FOR ALL 
  TO authenticated
  USING (
    -- Allow access if user owns the email
    user_id::text = auth.uid()::text OR
    -- Allow service role for background operations 
    auth.role() = 'service_role'
  )
  WITH CHECK (
    -- For inserts/updates, ensure user_id is valid
    user_id IS NOT NULL AND (
      user_id::text = auth.uid()::text OR
      auth.role() = 'service_role'
    )
  );

-- Clean and recreate email_sync_log policies too
DO $$ 
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'email_sync_log' 
        AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.email_sync_log', policy_record.policyname);
        RAISE NOTICE 'Dropped email_sync_log policy: %', policy_record.policyname;
    END LOOP;
END $$;

CREATE POLICY "email_sync_log_comprehensive_access" ON public.email_sync_log
  FOR ALL
  TO authenticated  
  USING (
    -- Allow service role full access
    auth.role() = 'service_role' OR
    -- Allow users to access sync logs for their own email accounts
    EXISTS (
      SELECT 1 FROM public.email_accounts 
      WHERE email_accounts.id = email_sync_log.email_account_id 
      AND email_accounts.user_id::text = auth.uid()::text
    )
  )
  WITH CHECK (
    -- For inserts/updates
    auth.role() = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public.email_accounts 
      WHERE email_accounts.id = email_sync_log.email_account_id 
      AND email_accounts.user_id::text = auth.uid()::text
    )
  );

-- Add comment explaining this comprehensive fix
COMMENT ON POLICY "emails_comprehensive_access" ON public.emails IS 
'Comprehensive RLS policy for emails table that supports both user access and background sync operations';

COMMENT ON POLICY "email_sync_log_comprehensive_access" ON public.email_sync_log IS 
'Comprehensive RLS policy for email sync logs that supports background operations';

-- Ensure proper permissions are granted
GRANT ALL ON public.emails TO authenticated;
GRANT ALL ON public.email_sync_log TO authenticated;

-- Grant service role explicit permissions 
GRANT ALL ON public.emails TO service_role;
GRANT ALL ON public.email_sync_log TO service_role; 