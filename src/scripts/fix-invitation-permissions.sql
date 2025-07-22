-- Fix invitation permissions

-- Check current policies on organization_invitations
SELECT 
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'organization_invitations';

-- Drop existing policies and create new ones
DO $$
BEGIN
    -- Drop all existing policies on organization_invitations
    DROP POLICY IF EXISTS "Authenticated can view invitations" ON organization_invitations;
    DROP POLICY IF EXISTS "Admins can create invitations" ON organization_invitations;
    DROP POLICY IF EXISTS "Admins can manage invitations" ON organization_invitations;
    DROP POLICY IF EXISTS "Users can view their invitations" ON organization_invitations;
    
    -- Create new policies for organization_invitations
    
    -- Allow authenticated users to view invitations
    CREATE POLICY "Anyone can view invitations" ON organization_invitations
        FOR SELECT
        USING (true);
    
    -- Allow organization admins to create invitations
    CREATE POLICY "Admins can create invitations" ON organization_invitations
        FOR INSERT
        WITH CHECK (
            EXISTS (
                SELECT 1 
                FROM organization_members 
                WHERE organization_members.organization_id = organization_invitations.organization_id
                AND organization_members.user_id = auth.uid()
                AND organization_members.role = 'admin'
            )
        );
    
    -- Allow organization admins to update invitations (resend, cancel)
    CREATE POLICY "Admins can update invitations" ON organization_invitations
        FOR UPDATE
        USING (
            EXISTS (
                SELECT 1 
                FROM organization_members 
                WHERE organization_members.organization_id = organization_invitations.organization_id
                AND organization_members.user_id = auth.uid()
                AND organization_members.role = 'admin'
            )
        );
    
    -- Allow organization admins to delete invitations
    CREATE POLICY "Admins can delete invitations" ON organization_invitations
        FOR DELETE
        USING (
            EXISTS (
                SELECT 1 
                FROM organization_members 
                WHERE organization_members.organization_id = organization_invitations.organization_id
                AND organization_members.user_id = auth.uid()
                AND organization_members.role = 'admin'
            )
        );
        
    RAISE NOTICE 'Successfully updated organization_invitations policies';
END $$;

-- Verify the new policies
SELECT 
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'organization_invitations'
ORDER BY policyname;

-- Double check that andres@mailvibes.io is an admin
SELECT 
    u.email,
    om.role,
    o.name as organization
FROM auth.users u
JOIN organization_members om ON u.id = om.user_id
JOIN organizations o ON om.organization_id = o.id
WHERE u.email = 'andres@mailvibes.io'; 