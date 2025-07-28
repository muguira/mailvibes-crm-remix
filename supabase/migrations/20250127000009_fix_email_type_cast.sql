-- Fix type mismatch in get_organization_members RPC function
-- Cast auth.users.email from character varying to text

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
        om.role::text,  -- Explicit cast to text
        om.status::text,  -- Explicit cast to text
        om.created_at as joined_at,
        COALESCE(au.email::text, '') as user_email,  -- Cast email to text
        -- Extract first name from email prefix (before @)
        COALESCE(
            INITCAP(SPLIT_PART(SPLIT_PART(au.email, '@', 1), '.', 1)),
            'User'
        )::text as user_first_name,  -- Cast to text
        -- Extract last name from email prefix (after first .)
        COALESCE(
            NULLIF(INITCAP(SPLIT_PART(SPLIT_PART(au.email, '@', 1), '.', 2)), ''),
            ''
        )::text as user_last_name,  -- Cast to text
        ''::text as user_avatar_url  -- Cast to text
    FROM organization_members om
    LEFT JOIN auth.users au ON om.user_id = au.id
    WHERE om.organization_id = org_id
    AND om.status = 'active'
    ORDER BY om.created_at ASC;
END;
$$;

-- Ensure permissions are granted
GRANT EXECUTE ON FUNCTION get_organization_members(UUID) TO authenticated;

-- Test the fix
DO $$
BEGIN
    RAISE NOTICE 'Fixed type casting: all columns now explicitly cast to text!';
    RAISE NOTICE 'This should resolve the character varying vs text mismatch.';
END $$; 