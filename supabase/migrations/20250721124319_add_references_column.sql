-- Add references column to emails table for RFC 2822 References header
-- This stores the complete chain of Message-IDs for proper email threading

ALTER TABLE emails 
ADD COLUMN IF NOT EXISTS references TEXT;

-- Create index for references to enable fast lookups for threading
CREATE INDEX IF NOT EXISTS idx_emails_references ON emails(references);

-- Add comment for documentation
COMMENT ON COLUMN emails.references IS 'RFC 2822 References header value - complete chain of Message-IDs for threading';
