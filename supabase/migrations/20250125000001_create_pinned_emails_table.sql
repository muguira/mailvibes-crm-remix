-- Create table for storing pinned Gmail emails
CREATE TABLE IF NOT EXISTS pinned_emails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_id TEXT NOT NULL, -- Gmail email ID
  contact_email TEXT NOT NULL, -- Contact's email address
  is_pinned BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE pinned_emails ENABLE ROW LEVEL SECURITY;

-- Users can only view their own pinned emails
CREATE POLICY "Users can view their own pinned emails"
  ON pinned_emails FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own pinned emails
CREATE POLICY "Users can insert their own pinned emails"
  ON pinned_emails FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own pinned emails
CREATE POLICY "Users can update their own pinned emails"
  ON pinned_emails FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own pinned emails
CREATE POLICY "Users can delete their own pinned emails"
  ON pinned_emails FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pinned_emails_user_id ON pinned_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_pinned_emails_email_id ON pinned_emails(email_id);
CREATE INDEX IF NOT EXISTS idx_pinned_emails_contact_email ON pinned_emails(contact_email);

-- Create unique constraint to prevent duplicate pins
CREATE UNIQUE INDEX IF NOT EXISTS idx_pinned_emails_unique 
  ON pinned_emails(user_id, email_id, contact_email); 