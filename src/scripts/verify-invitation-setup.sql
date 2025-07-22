-- Verify invitation setup

-- 1. Check if the RPC function exists
SELECT 
    proname as function_name,
    proargnames as argument_names
FROM pg_proc 
WHERE proname = 'send_organization_invitations';

-- 2. Check organization_invitations table structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'organization_invitations'
ORDER BY ordinal_position;

-- 3. Check if token column exists (required by the function)
SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'organization_invitations' 
    AND column_name = 'token'
) as token_column_exists;

-- 4. Add token column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organization_invitations' 
        AND column_name = 'token'
    ) THEN
        ALTER TABLE organization_invitations ADD COLUMN token TEXT DEFAULT gen_random_uuid()::TEXT;
    END IF;
END $$;

-- 5. Verify andres@salessheet.io membership and organization
SELECT 
    u.id as user_id,
    u.email,
    om.role,
    om.organization_id,
    o.name as organization_name,
    o.id as org_id
FROM auth.users u
JOIN organization_members om ON u.id = om.user_id
JOIN organizations o ON om.organization_id = o.id
WHERE u.email = 'andres@salessheet.io'; 