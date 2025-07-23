-- Migration: Add Gmail History ID tracking for incremental synchronization
-- Date: 2025-01-27
-- Purpose: Enable incremental email sync using Gmail History API

-- Add gmail_history_id column to email_sync_log table
-- This will track the historyId returned by Gmail API for each sync operation
ALTER TABLE public.email_sync_log 
ADD COLUMN IF NOT EXISTS gmail_history_id TEXT;

-- Add last_history_id column to email_accounts table  
-- This will store the latest historyId for each connected email account
ALTER TABLE public.email_accounts 
ADD COLUMN IF NOT EXISTS last_history_id TEXT;

-- Create optimized indexes for performance
-- Index for email_sync_log.gmail_history_id for quick lookups
CREATE INDEX IF NOT EXISTS idx_email_sync_log_history_id 
ON public.email_sync_log(gmail_history_id);

-- Index for email_accounts.last_history_id for account-level tracking
CREATE INDEX IF NOT EXISTS idx_email_accounts_history_id 
ON public.email_accounts(last_history_id);

-- Composite index for email_sync_log to efficiently find latest sync by contact
-- This enables fast queries for specific contact sync history
CREATE INDEX IF NOT EXISTS idx_email_sync_log_contact_completed 
ON public.email_sync_log(((metadata->>'contact_email')), completed_at DESC)
WHERE status = 'completed';

-- Add comments for documentation
COMMENT ON COLUMN public.email_sync_log.gmail_history_id IS 
'Gmail History ID returned by Gmail API after sync operation. Used for incremental sync.';

COMMENT ON COLUMN public.email_accounts.last_history_id IS 
'Latest Gmail History ID for this account. Used to determine starting point for incremental sync.';

-- Update the updated_at trigger to include new columns
-- This ensures proper timestamp tracking when history IDs are updated
-- (The existing trigger function should already handle any new columns) 