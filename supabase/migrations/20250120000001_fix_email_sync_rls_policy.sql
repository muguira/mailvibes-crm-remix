-- Fix RLS policies for email synchronization
-- This addresses the "row violates row-level security policy" error when syncing emails

-- Add a more permissive policy for email sync operations
-- This allows upsert operations when user_id matches the authenticated user
CREATE POLICY "Allow email sync upsert operations" ON public.emails
  FOR ALL 
  TO authenticated
  USING (
    -- Allow if user_id matches auth.uid() (normal case)
    auth.uid() = user_id OR
    -- Allow if this is a service operation (for background sync)
    auth.role() = 'service_role'
  )
  WITH CHECK (
    -- For INSERT/UPDATE, ensure user_id is provided and valid
    user_id IS NOT NULL AND (
      auth.uid() = user_id OR
      auth.role() = 'service_role'
    )
  );

-- Drop the old restrictive policy (if it exists)
DROP POLICY IF EXISTS "Users can insert own emails" ON public.emails;
DROP POLICY IF EXISTS "Users can update own emails" ON public.emails;

-- Add specific policy for sync operations to bypass RLS when needed
CREATE POLICY "Email sync service operations" ON public.emails
  FOR ALL
  TO authenticated
  USING (
    -- Allow full access to service role
    auth.role() = 'service_role' OR
    -- Allow users to access their own emails
    auth.uid()::text = user_id::text
  )
  WITH CHECK (
    -- For writes, ensure user_id is set correctly
    user_id IS NOT NULL AND (
      auth.role() = 'service_role' OR
      auth.uid()::text = user_id::text
    )
  );

-- Ensure the email_sync_log table also has proper policies for background operations
DROP POLICY IF EXISTS "Users can insert sync logs for own accounts" ON public.email_sync_log;

CREATE POLICY "Allow sync log operations" ON public.email_sync_log
  FOR ALL
  TO authenticated
  USING (
    auth.role() = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public.email_accounts 
      WHERE email_accounts.id = email_sync_log.email_account_id 
      AND email_accounts.user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.role() = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public.email_accounts 
      WHERE email_accounts.id = email_sync_log.email_account_id 
      AND email_accounts.user_id = auth.uid()
    )
  );

-- Add comment explaining this fix
COMMENT ON POLICY "Email sync service operations" ON public.emails IS 
'Allows email synchronization operations to work in background contexts where auth.uid() may not be available';

-- Grant necessary permissions to authenticated users for email operations
GRANT SELECT, INSERT, UPDATE ON public.emails TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.email_sync_log TO authenticated; 