-- Add message_id column to emails table for RFC 2822 Message-ID tracking
-- This is crucial for proper email threading according to Gmail API requirements

ALTER TABLE emails 
ADD COLUMN IF NOT EXISTS message_id TEXT;

-- Create index for message_id to enable fast lookups for threading
CREATE INDEX IF NOT EXISTS idx_emails_message_id ON emails(message_id);

-- Add comment for documentation
COMMENT ON COLUMN emails.message_id IS 'RFC 2822 Message-ID header value for proper email threading';
