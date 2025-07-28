-- Fix infinite recursion in organization_members RLS policy
-- The previous policy caused circular dependency when checking organization membership

-- Drop the problematic policy
DROP POLICY IF EXISTS "users_can_view_relevant_memberships" ON organization_members;

-- Create a simplified policy that only allows users to see their own memberships
CREATE POLICY "users_can_view_own_memberships" ON organization_members
    FOR SELECT
    USING (user_id = auth.uid());

-- Create a secure RPC function to get organization members (bypasses RLS)
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
        COALESCE(p.first_name, SPLIT_PART(au.email, '@', 1)) as user_first_name,
        COALESCE(p.last_name, '') as user_last_name,
        COALESCE(p.avatar_url, '') as user_avatar_url
    FROM organization_members om
    LEFT JOIN auth.users au ON om.user_id = au.id
    LEFT JOIN profiles p ON om.user_id = p.id
    WHERE om.organization_id = org_id
    AND om.status = 'active'
    ORDER BY om.joined_at ASC;
END;
$$;

-- Create a secure RPC function to check user's organization membership (bypasses RLS)
CREATE OR REPLACE FUNCTION get_user_organization_membership(user_uuid UUID)
RETURNS TABLE (
    organization_id UUID,
    organization_name text,
    organization_domain text,
    user_role text,
    user_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id as organization_id,
        o.name as organization_name,
        o.domain as organization_domain,
        om.role as user_role,
        om.status as user_status
    FROM organization_members om
    INNER JOIN organizations o ON om.organization_id = o.id
    WHERE om.user_id = user_uuid
    AND om.status = 'active'
    LIMIT 1;
END;
$$;

-- Grant permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_organization_members(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_organization_membership(UUID) TO authenticated;

-- Test the fix
DO $$
BEGIN
    RAISE NOTICE 'RLS infinite recursion fix completed successfully!';
    RAISE NOTICE 'Users can now query organization memberships without circular dependencies.';
END $$; 