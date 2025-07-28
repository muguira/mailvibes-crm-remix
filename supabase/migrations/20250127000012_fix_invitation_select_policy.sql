-- Fix invitation SELECT policy for organization admins
-- This ensures admins can see invitations for their organization

-- Drop the overly broad policy
DROP POLICY IF EXISTS "anyone_can_view_pending_invitations" ON organization_invitations;

-- Create more specific policies for different use cases

-- Policy 1: Organization admins can view all invitations for their organization
CREATE POLICY "admins_can_view_org_invitations" ON organization_invitations
    FOR SELECT
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

-- Policy 2: Users can view their own pending invitations (for accepting via email)
CREATE POLICY "users_can_view_own_pending_invitations" ON organization_invitations
    FOR SELECT
    USING (
        email = (SELECT email FROM auth.users WHERE id = auth.uid())
        AND status = 'pending'
    );

-- Policy 3: Public access for pending invitations via token (for email links)
CREATE POLICY "public_can_view_invitations_by_token" ON organization_invitations
    FOR SELECT
    USING (status = 'pending' AND token IS NOT NULL);

-- Test the fix
DO $$
BEGIN
    RAISE NOTICE 'Invitation SELECT policies updated successfully!';
    RAISE NOTICE 'Organization admins can now view their organization invitations.';
END $$; 