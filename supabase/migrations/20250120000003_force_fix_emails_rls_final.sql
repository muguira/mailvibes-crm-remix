-- FINAL AGGRESSIVE FIX: Force complete RLS policy reset for emails table
-- This migration will forcefully remove ALL conflicting policies and recreate clean ones

-- Step 1: Temporarily disable RLS to clear all policies
ALTER TABLE public.emails DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies forcefully (ignore errors if they don't exist)
DROP POLICY IF EXISTS "emails_comprehensive_access" ON public.emails;
DROP POLICY IF EXISTS "Allow email sync upsert operations" ON public.emails;
DROP POLICY IF EXISTS "Email sync service operations" ON public.emails;
DROP POLICY IF EXISTS "Users can view own emails" ON public.emails;
DROP POLICY IF EXISTS "Users can insert own emails" ON public.emails;
DROP POLICY IF EXISTS "Users can update own emails" ON public.emails;
DROP POLICY IF EXISTS "Users can delete own emails" ON public.emails;

-- Step 3: Drop any other potential policy names that might exist
DO $$ 
DECLARE
    policy_record RECORD;
BEGIN
    -- Get ALL policies on emails table and drop them
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'emails' 
        AND schemaname = 'public'
    LOOP
        BEGIN
            EXECUTE format('DROP POLICY %I ON public.emails', policy_record.policyname);
            RAISE NOTICE 'Force dropped policy: %', policy_record.policyname;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Could not drop policy %: %', policy_record.policyname, SQLERRM;
        END;
    END LOOP;
END $$;

-- Step 4: Re-enable RLS
ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;

-- Step 5: Create ONE SINGLE comprehensive policy that works for everything
CREATE POLICY "emails_final_access_policy" ON public.emails
  FOR ALL
  TO authenticated, anon, service_role
  USING (
    -- Always allow service_role (for background operations)
    auth.role() = 'service_role' OR
    -- Allow authenticated users to access their own emails
    (auth.role() = 'authenticated' AND user_id = auth.uid()) OR
    -- Allow if user_id matches auth.uid() as text (type safety)
    (user_id::text = auth.uid()::text)
  )
  WITH CHECK (
    -- For writes, allow service_role or matching user_id
    auth.role() = 'service_role' OR
    (user_id IS NOT NULL AND user_id::text = auth.uid()::text)
  );

-- Step 6: Grant explicit permissions to bypass any permission issues
GRANT ALL PRIVILEGES ON public.emails TO authenticated;
GRANT ALL PRIVILEGES ON public.emails TO service_role;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;

-- Step 7: Also fix email_sync_log table with same approach
ALTER TABLE public.email_sync_log DISABLE ROW LEVEL SECURITY;

-- Drop all email_sync_log policies
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
        BEGIN
            EXECUTE format('DROP POLICY %I ON public.email_sync_log', policy_record.policyname);
            RAISE NOTICE 'Force dropped email_sync_log policy: %', policy_record.policyname;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Could not drop email_sync_log policy %: %', policy_record.policyname, SQLERRM;
        END;
    END LOOP;
END $$;

ALTER TABLE public.email_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "email_sync_log_final_access_policy" ON public.email_sync_log
  FOR ALL
  TO authenticated, anon, service_role
  USING (
    auth.role() = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public.email_accounts 
      WHERE email_accounts.id = email_sync_log.email_account_id 
      AND (
        email_accounts.user_id = auth.uid() OR
        email_accounts.user_id::text = auth.uid()::text
      )
    )
  )
  WITH CHECK (
    auth.role() = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public.email_accounts 
      WHERE email_accounts.id = email_sync_log.email_account_id 
      AND (
        email_accounts.user_id = auth.uid() OR
        email_accounts.user_id::text = auth.uid()::text
      )
    )
  );

GRANT ALL PRIVILEGES ON public.email_sync_log TO authenticated;
GRANT ALL PRIVILEGES ON public.email_sync_log TO service_role;

-- Step 8: Add helpful comments
COMMENT ON POLICY "emails_final_access_policy" ON public.emails IS 
'Final comprehensive RLS policy for emails - supports all operations including background sync';

COMMENT ON POLICY "email_sync_log_final_access_policy" ON public.email_sync_log IS 
'Final comprehensive RLS policy for email sync logs - supports background operations';

-- Verification query to check policies
DO $$
BEGIN
    RAISE NOTICE 'RLS POLICIES VERIFICATION:';
    RAISE NOTICE 'Active policies on emails table:';
    PERFORM pg_sleep(0.1);
END $$;

SELECT 'EMAILS POLICIES:' as table_name, policyname, cmd, roles
FROM pg_policies 
WHERE tablename = 'emails' AND schemaname = 'public'

UNION ALL

SELECT 'EMAIL_SYNC_LOG POLICIES:' as table_name, policyname, cmd, roles
FROM pg_policies 
WHERE tablename = 'email_sync_log' AND schemaname = 'public'; 