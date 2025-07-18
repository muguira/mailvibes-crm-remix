-- Fix attachment field lengths manually
-- Force update varchar limits that weren't applied correctly before

-- Increase filename limit from 255 to 1000 characters
ALTER TABLE public.email_attachments 
ALTER COLUMN filename TYPE VARCHAR(1000);

-- Increase content_id limit from 255 to 500 characters  
ALTER TABLE public.email_attachments 
ALTER COLUMN content_id TYPE VARCHAR(500);

-- Increase mime_type limit from 255 to 500 characters
ALTER TABLE public.email_attachments 
ALTER COLUMN mime_type TYPE VARCHAR(500);

-- Increase gmail_attachment_id limit from 255 to 500 characters
ALTER TABLE public.email_attachments 
ALTER COLUMN gmail_attachment_id TYPE VARCHAR(500);

-- Add comment to track this fix
COMMENT ON TABLE public.email_attachments IS 'Email attachments table with increased varchar limits (manual fix applied 2025-07-18)';
