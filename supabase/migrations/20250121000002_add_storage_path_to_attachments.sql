-- Add storage_path column to email_attachments table if it doesn't exist
ALTER TABLE email_attachments 
ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- Add index for faster queries on storage_path
CREATE INDEX IF NOT EXISTS idx_email_attachments_storage_path 
ON email_attachments(storage_path) 
WHERE storage_path IS NOT NULL; 