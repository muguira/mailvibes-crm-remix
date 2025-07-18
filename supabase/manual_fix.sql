
-- Manual migration to fix attachment field lengths
-- Run these commands to fix the schema

ALTER TABLE public.email_attachments 
ALTER COLUMN filename TYPE VARCHAR(1000);

ALTER TABLE public.email_attachments 
ALTER COLUMN content_id TYPE VARCHAR(500);

ALTER TABLE public.email_attachments 
ALTER COLUMN mime_type TYPE VARCHAR(500);

ALTER TABLE public.email_attachments 
ALTER COLUMN gmail_attachment_id TYPE VARCHAR(500);

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'email_attachments' 
    AND table_schema = 'public'
    AND column_name IN ('filename', 'content_id', 'mime_type', 'gmail_attachment_id')
ORDER BY column_name;

