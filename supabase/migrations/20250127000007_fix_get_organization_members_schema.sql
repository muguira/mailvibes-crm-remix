-- Fix get_organization_members RPC function to work with actual profiles table schema
-- The profiles table only has: id, current_organization, created_at, updated_at
-- No first_name, last_name, or avatar_url columns exist

-- Drop and recreate the function with correct column references
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
        om.joined_at,
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
    ORDER BY om.joined_at ASC;
END;
$$;

-- Ensure permissions are granted
GRANT EXECUTE ON FUNCTION get_organization_members(UUID) TO authenticated;

-- Also fix get_user_info function to work with actual profiles schema
CREATE OR REPLACE FUNCTION get_user_info(user_ids UUID[])
RETURNS TABLE (
    id UUID,
    email TEXT,
    first_name TEXT,
    last_name TEXT,
    avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        au.id,
        au.email,
        -- Extract first name from email prefix (before @)
        COALESCE(
            INITCAP(SPLIT_PART(SPLIT_PART(au.email, '@', 1), '.', 1)),
            'User'
        ) as first_name,
        -- Extract last name from email prefix (after first .)
        COALESCE(
            NULLIF(INITCAP(SPLIT_PART(SPLIT_PART(au.email, '@', 1), '.', 2)), ''),
            ''
        ) as last_name,
        '' as avatar_url  -- No avatar column exists, return empty string
    FROM auth.users au
    WHERE au.id = ANY(user_ids);
END;
$$;

-- Ensure permissions are granted
GRANT EXECUTE ON FUNCTION get_user_info(UUID[]) TO authenticated;

-- Test the fix
DO $$
BEGIN
    RAISE NOTICE 'Fixed both get_organization_members and get_user_info functions!';
    RAISE NOTICE 'Names will be derived from email addresses since profiles table has no name columns.';
END $$; 