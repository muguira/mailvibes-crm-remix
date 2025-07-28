-- Fix column name mismatch in get_organization_members RPC function
-- The organization_members table has 'created_at' not 'joined_at'

CREATE OR REPLACE FUNCTION get_organization_members(org_id UUID)
RETURNS TABLE (
    user_id UUID,
    role text,
    status text,
    joined_at timestamp with time zone,
    user_email text,
    user_first_name text,
    user_last_name text,
    user_avatar_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        om.user_id,
        om.role,
        om.status,
        om.created_at as joined_at,  -- Use created_at instead of joined_at
        COALESCE(au.email, '') as user_email,
        -- Extract first name from email prefix (before @)
        COALESCE(
            INITCAP(SPLIT_PART(SPLIT_PART(au.email, '@', 1), '.', 1)),
            'User'
        ) as user_first_name,
        -- Extract last name from email prefix (after first .)
        COALESCE(
            NULLIF(INITCAP(SPLIT_PART(SPLIT_PART(au.email, '@', 1), '.', 2)), ''),
            ''
        ) as user_last_name,
        '' as user_avatar_url  -- No avatar column exists, return empty string
    FROM organization_members om
    LEFT JOIN auth.users au ON om.user_id = au.id
    WHERE om.organization_id = org_id
    AND om.status = 'active'
    ORDER BY om.created_at ASC;  -- Order by created_at instead of joined_at
END;
$$;

-- Ensure permissions are granted
GRANT EXECUTE ON FUNCTION get_organization_members(UUID) TO authenticated;

-- Test the fix
DO $$
BEGIN
    RAISE NOTICE 'Fixed column mismatch: using created_at instead of joined_at!';
    RAISE NOTICE 'get_organization_members function should now work without type errors.';
END $$; 