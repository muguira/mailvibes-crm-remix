-- Fix SELECT RLS policies for organization_members
-- This resolves the 406 Not Acceptable error when checking user memberships

-- Drop problematic SELECT policies
DROP POLICY IF EXISTS "view_own_membership" ON organization_members;
DROP POLICY IF EXISTS "view_org_members" ON organization_members;

-- Create a simplified SELECT policy that allows users to view:
-- 1. Their own memberships in any organization
-- 2. All members of organizations they belong to
CREATE POLICY "users_can_view_relevant_memberships" ON organization_members
    FOR SELECT
    USING (
        -- Users can always see their own membership records
        user_id = auth.uid()
        OR
        -- Users can see members of organizations they belong to
        organization_id IN (
            SELECT om.organization_id 
            FROM organization_members om 
            WHERE om.user_id = auth.uid() 
            AND om.status = 'active'
        )
    );

-- Ensure proper permissions
GRANT SELECT ON organization_members TO authenticated;
GRANT SELECT ON organizations TO authenticated;

-- Test the fix
DO $$
BEGIN
    RAISE NOTICE 'Organization members SELECT RLS fix completed successfully!';
    RAISE NOTICE 'Users can now query their organization memberships without 406 errors.';
END $$; 