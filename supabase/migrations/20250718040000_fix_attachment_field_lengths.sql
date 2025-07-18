-- Fix varchar length limits for email attachments
-- Some Gmail attachments have very long filenames and content_ids

-- Increase filename limit from 255 to 1000 characters
ALTER TABLE public.email_attachments 
ALTER COLUMN filename TYPE VARCHAR(1000);

-- Increase content_id limit from 255 to 500 characters  
ALTER TABLE public.email_attachments 
ALTER COLUMN content_id TYPE VARCHAR(500);

-- Increase mime_type limit from 255 to 500 characters (some MIME types can be long)
ALTER TABLE public.email_attachments 
ALTER COLUMN mime_type TYPE VARCHAR(500);

-- Also fix gmail_attachment_id which might have long IDs
ALTER TABLE public.email_attachments 
ALTER COLUMN gmail_attachment_id TYPE VARCHAR(500);

-- Add comment
COMMENT ON TABLE public.email_attachments IS 'Email attachments with increased field lengths to handle Gmail edge cases'; 