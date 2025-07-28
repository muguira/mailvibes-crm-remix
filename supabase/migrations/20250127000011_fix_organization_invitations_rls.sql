-- Fix RLS policies for organization_invitations table
-- This allows organization admins to create and manage invitations

-- Drop all existing policies on organization_invitations
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'organization_invitations'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON organization_invitations', pol.policyname);
        RAISE NOTICE 'Dropped invitation policy: %', pol.policyname;
    END LOOP;
END $$;

-- Policy 1: Anyone can view pending invitations (for public invitation acceptance)
CREATE POLICY "anyone_can_view_pending_invitations" ON organization_invitations
    FOR SELECT
    USING (status = 'pending');

-- Policy 2: Organization admins can create invitations
CREATE POLICY "admins_can_create_invitations" ON organization_invitations
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 
            FROM organization_members om 
            WHERE om.organization_id = organization_invitations.organization_id 
            AND om.user_id = auth.uid() 
            AND om.role = 'admin'
            AND om.status = 'active'
        )
    );

-- Policy 3: Organization admins can update invitations (for resending, etc.)
CREATE POLICY "admins_can_update_invitations" ON organization_invitations
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 
            FROM organization_members om 
            WHERE om.organization_id = organization_invitations.organization_id 
            AND om.user_id = auth.uid() 
            AND om.role = 'admin'
            AND om.status = 'active'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 
            FROM organization_members om 
            WHERE om.organization_id = organization_invitations.organization_id 
            AND om.user_id = auth.uid() 
            AND om.role = 'admin'
            AND om.status = 'active'
        )
    );

-- Policy 4: Users can accept their own invitations
CREATE POLICY "users_can_accept_own_invitations" ON organization_invitations
    FOR UPDATE
    USING (
        email = (SELECT email FROM auth.users WHERE id = auth.uid())
        AND status = 'pending'
    )
    WITH CHECK (
        email = (SELECT email FROM auth.users WHERE id = auth.uid())
        AND status IN ('accepted', 'declined')
    );

-- Policy 5: Organization admins can delete invitations
CREATE POLICY "admins_can_delete_invitations" ON organization_invitations
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 
            FROM organization_members om 
            WHERE om.organization_id = organization_invitations.organization_id 
            AND om.user_id = auth.uid() 
            AND om.role = 'admin'
            AND om.status = 'active'
        )
    );

-- Ensure RLS is enabled
ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON organization_invitations TO authenticated;

-- Test the fix
DO $$
BEGIN
    RAISE NOTICE 'Organization invitations RLS policies fixed successfully!';
    RAISE NOTICE 'Admins can now create, update, and delete invitations.';
END $$; 