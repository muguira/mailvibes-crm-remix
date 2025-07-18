
-- Verificar estructura actual de email_attachments
SELECT 
    column_name, 
    data_type, 
    character_maximum_length,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'email_attachments' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

