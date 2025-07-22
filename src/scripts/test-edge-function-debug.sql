-- Check if RESEND_API_KEY is set in the Edge Function environment
-- Run this to see the Edge Function logs and debug the 400 error

-- First, check if the function exists and can be called
SELECT 'Testing Edge Function availability' as info;

-- Check organization_invitations table has token column
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'organization_invitations'
AND column_name = 'token';

-- Check recent invitations have tokens
SELECT 
    id,
    email,
    token IS NOT NULL as has_token,
    token,
    created_at
FROM organization_invitations 
ORDER BY created_at DESC 
LIMIT 5;

-- If there are invitations without tokens, update them
UPDATE organization_invitations 
SET token = gen_random_uuid()::TEXT 
WHERE token IS NULL OR token = '';

SELECT 'Edge Function debug check completed' as status; 