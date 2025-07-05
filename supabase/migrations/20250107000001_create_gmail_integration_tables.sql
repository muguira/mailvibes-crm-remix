-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: email_accounts
-- Stores connected Gmail accounts for each user
CREATE TABLE IF NOT EXISTS public.email_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email VARCHAR(255) NOT NULL,
  provider VARCHAR(50) DEFAULT 'gmail' CHECK (provider IN ('gmail', 'outlook', 'other')),
  sync_enabled BOOLEAN DEFAULT true,
  sync_frequency_minutes INTEGER DEFAULT 5,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  last_sync_status VARCHAR(50) DEFAULT 'pending',
  last_sync_error TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, email)
);

-- Table: oauth_tokens
-- Stores OAuth tokens securely (encrypted at rest by Supabase)
CREATE TABLE IF NOT EXISTS public.oauth_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email_account_id UUID REFERENCES public.email_accounts(id) ON DELETE CASCADE NOT NULL,
  access_token TEXT NOT NULL, -- Will be encrypted by Supabase
  refresh_token TEXT, -- Will be encrypted by Supabase
  token_type VARCHAR(50) DEFAULT 'Bearer',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  scope TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(email_account_id)
);

-- Table: emails
-- Stores email metadata and content
CREATE TABLE IF NOT EXISTS public.emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email_account_id UUID REFERENCES public.email_accounts(id) ON DELETE CASCADE NOT NULL,
  -- Commented out until contacts table exists
  -- contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  contact_id UUID, -- Will add foreign key later when contacts table exists
  
  -- Gmail specific fields
  gmail_id VARCHAR(255) UNIQUE NOT NULL,
  gmail_thread_id VARCHAR(255),
  gmail_history_id BIGINT,
  
  -- Email metadata
  subject TEXT,
  snippet TEXT, -- First 100-200 chars of email
  body_text TEXT,
  body_html TEXT,
  
  -- Sender/Recipient info
  from_email VARCHAR(255) NOT NULL,
  from_name VARCHAR(255),
  to_emails JSONB DEFAULT '[]', -- Array of {email, name}
  cc_emails JSONB DEFAULT '[]',
  bcc_emails JSONB DEFAULT '[]',
  reply_to VARCHAR(255),
  
  -- Email properties
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  is_sent BOOLEAN DEFAULT false,
  is_draft BOOLEAN DEFAULT false,
  is_read BOOLEAN DEFAULT false,
  is_starred BOOLEAN DEFAULT false,
  is_important BOOLEAN DEFAULT false,
  is_spam BOOLEAN DEFAULT false,
  is_trash BOOLEAN DEFAULT false,
  
  -- Gmail labels and categories
  labels JSONB DEFAULT '[]',
  categories JSONB DEFAULT '[]',
  
  -- Performance and search
  has_attachments BOOLEAN DEFAULT false,
  attachment_count INTEGER DEFAULT 0,
  size_bytes BIGINT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_emails_user_id ON public.emails(user_id);
CREATE INDEX IF NOT EXISTS idx_emails_contact_id ON public.emails(contact_id);
CREATE INDEX IF NOT EXISTS idx_emails_email_account_id ON public.emails(email_account_id);
CREATE INDEX IF NOT EXISTS idx_emails_date ON public.emails(date DESC);
CREATE INDEX IF NOT EXISTS idx_emails_from_email ON public.emails(from_email);
CREATE INDEX IF NOT EXISTS idx_emails_gmail_thread_id ON public.emails(gmail_thread_id);

-- Table: email_attachments
-- Stores email attachment metadata
CREATE TABLE IF NOT EXISTS public.email_attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email_id UUID REFERENCES public.emails(id) ON DELETE CASCADE NOT NULL,
  gmail_attachment_id VARCHAR(255),
  filename VARCHAR(500) NOT NULL,
  mime_type VARCHAR(255),
  size_bytes BIGINT,
  inline BOOLEAN DEFAULT false,
  content_id VARCHAR(255), -- For inline images
  storage_path TEXT, -- Path in Supabase Storage if downloaded
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for email_attachments
CREATE INDEX IF NOT EXISTS idx_attachments_email_id ON public.email_attachments(email_id);

-- Table: email_sync_log
-- Tracks sync operations for debugging and monitoring
CREATE TABLE IF NOT EXISTS public.email_sync_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email_account_id UUID REFERENCES public.email_accounts(id) ON DELETE CASCADE NOT NULL,
  sync_type VARCHAR(50) NOT NULL, -- 'full', 'incremental', 'webhook'
  status VARCHAR(50) NOT NULL, -- 'started', 'completed', 'failed'
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  emails_synced INTEGER DEFAULT 0,
  emails_created INTEGER DEFAULT 0,
  emails_updated INTEGER DEFAULT 0,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_email_accounts_updated_at BEFORE UPDATE ON public.email_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_oauth_tokens_updated_at BEFORE UPDATE ON public.oauth_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_emails_updated_at BEFORE UPDATE ON public.emails
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 