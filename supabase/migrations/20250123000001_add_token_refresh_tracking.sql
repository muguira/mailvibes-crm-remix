-- Add fields to track token refresh attempts and errors
ALTER TABLE public.oauth_tokens
ADD COLUMN IF NOT EXISTS last_refresh_attempt TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS refresh_attempts INTEGER DEFAULT 0;

-- Add index for better performance when looking up tokens by email
CREATE INDEX IF NOT EXISTS idx_email_accounts_user_email 
ON public.email_accounts(user_id, email);

-- Add index for token lookups
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_email_account 
ON public.oauth_tokens(email_account_id);

-- Update RLS policies to allow Edge Functions to update tokens
CREATE POLICY "Service role can manage all tokens" ON public.oauth_tokens
  FOR ALL USING (auth.role() = 'service_role');

-- Ensure refresh_token column exists and has proper constraints
ALTER TABLE public.oauth_tokens
ALTER COLUMN refresh_token TYPE TEXT;

-- Add comment to document the purpose
COMMENT ON COLUMN public.oauth_tokens.refresh_token IS 'Google OAuth refresh token for obtaining new access tokens';
COMMENT ON COLUMN public.oauth_tokens.last_refresh_attempt IS 'Timestamp of the last token refresh attempt';
COMMENT ON COLUMN public.oauth_tokens.refresh_attempts IS 'Number of refresh attempts since last successful refresh'; 