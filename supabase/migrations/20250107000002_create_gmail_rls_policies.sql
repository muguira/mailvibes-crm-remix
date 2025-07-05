-- Enable RLS on all tables
ALTER TABLE public.email_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oauth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_sync_log ENABLE ROW LEVEL SECURITY;

-- Policies for email_accounts
CREATE POLICY "Users can view own email accounts" ON public.email_accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own email accounts" ON public.email_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own email accounts" ON public.email_accounts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own email accounts" ON public.email_accounts
  FOR DELETE USING (auth.uid() = user_id);

-- Policies for oauth_tokens (más restrictivas)
CREATE POLICY "Users can view own tokens" ON public.oauth_tokens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tokens" ON public.oauth_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tokens" ON public.oauth_tokens
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tokens" ON public.oauth_tokens
  FOR DELETE USING (auth.uid() = user_id);

-- Policies for emails
CREATE POLICY "Users can view own emails" ON public.emails
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own emails" ON public.emails
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own emails" ON public.emails
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own emails" ON public.emails
  FOR DELETE USING (auth.uid() = user_id);

-- Policies for email_attachments
CREATE POLICY "Users can view attachments of own emails" ON public.email_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.emails 
      WHERE emails.id = email_attachments.email_id 
      AND emails.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert attachments for own emails" ON public.email_attachments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.emails 
      WHERE emails.id = email_attachments.email_id 
      AND emails.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update attachments of own emails" ON public.email_attachments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.emails 
      WHERE emails.id = email_attachments.email_id 
      AND emails.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete attachments of own emails" ON public.email_attachments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.emails 
      WHERE emails.id = email_attachments.email_id 
      AND emails.user_id = auth.uid()
    )
  );

-- Policies for email_sync_log
CREATE POLICY "Users can view own sync logs" ON public.email_sync_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.email_accounts 
      WHERE email_accounts.id = email_sync_log.email_account_id 
      AND email_accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert sync logs for own accounts" ON public.email_sync_log
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.email_accounts 
      WHERE email_accounts.id = email_sync_log.email_account_id 
      AND email_accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update sync logs for own accounts" ON public.email_sync_log
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.email_accounts 
      WHERE email_accounts.id = email_sync_log.email_account_id 
      AND email_accounts.user_id = auth.uid()
    )
  ); 