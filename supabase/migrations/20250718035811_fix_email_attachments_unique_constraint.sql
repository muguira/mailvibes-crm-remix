-- Fix missing unique constraint on gmail_attachment_id in email_attachments table
-- This constraint is needed for UPSERT operations to work correctly

-- First, remove any duplicate gmail_attachment_ids that might exist
-- Keep only the most recent record for each gmail_attachment_id
DELETE FROM public.email_attachments 
WHERE id NOT IN (
  SELECT DISTINCT ON (gmail_attachment_id) id
  FROM public.email_attachments
  WHERE gmail_attachment_id IS NOT NULL
  ORDER BY gmail_attachment_id, created_at DESC
);

-- Add unique constraint on gmail_attachment_id for non-null values
-- Using a partial unique index to allow multiple NULL values
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_attachments_gmail_id_unique 
ON public.email_attachments(gmail_attachment_id) 
WHERE gmail_attachment_id IS NOT NULL;

-- Add a comment explaining the constraint
COMMENT ON INDEX idx_email_attachments_gmail_id_unique IS 'Ensures gmail_attachment_id is unique when not null, allowing UPSERT operations';

-- Also create a composite unique constraint for better data integrity
-- This ensures that the same Gmail attachment can't be duplicated for the same email
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_attachments_email_gmail_unique
ON public.email_attachments(email_id, gmail_attachment_id)
WHERE gmail_attachment_id IS NOT NULL;

COMMENT ON INDEX idx_email_attachments_email_gmail_unique IS 'Prevents duplicate Gmail attachments for the same email';
