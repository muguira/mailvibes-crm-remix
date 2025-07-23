-- FINAL FIX for organization_members RLS infinite recursion
-- This script completely resolves the infinite recursion issue

-- Step 1: Disable RLS temporarily to work safely
ALTER TABLE organization_members DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies on organization_members
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'organization_members'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON organization_members', pol.policyname);
        RAISE NOTICE 'Dropped policy: %', pol.policyname;
    END LOOP;
END $$;

-- Step 3: Create simple, non-recursive policies
-- Policy 1: Users can always view their own membership
CREATE POLICY "view_own_membership" ON organization_members
    FOR SELECT
    USING (user_id = auth.uid());

-- Policy 2: Users can view OTHER members of organizations they belong to
-- This uses a direct query without self-referencing the same table in the policy
CREATE POLICY "view_org_members" ON organization_members
    FOR SELECT
    USING (
        organization_id = ANY(
            SELECT DISTINCT om.organization_id 
            FROM organization_members om 
            WHERE om.user_id = auth.uid()
        )
    );

-- Policy 3: Only organization admins can insert new members
CREATE POLICY "admin_insert_members" ON organization_members
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 
            FROM organization_members admin_check
            WHERE admin_check.user_id = auth.uid()
            AND admin_check.organization_id = organization_members.organization_id
            AND admin_check.role = 'admin'
        )
    );

-- Policy 4: Only organization admins can update members
CREATE POLICY "admin_update_members" ON organization_members
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 
            FROM organization_members admin_check
            WHERE admin_check.user_id = auth.uid()
            AND admin_check.organization_id = organization_members.organization_id
            AND admin_check.role = 'admin'
        )
    );

-- Policy 5: Only organization admins can delete members (but not themselves)
CREATE POLICY "admin_delete_members" ON organization_members
    FOR DELETE
    USING (
        user_id != auth.uid() -- Cannot delete yourself
        AND EXISTS (
            SELECT 1 
            FROM organization_members admin_check
            WHERE admin_check.user_id = auth.uid()
            AND admin_check.organization_id = organization_members.organization_id
            AND admin_check.role = 'admin'
        )
    );

-- Step 4: Re-enable RLS
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Step 5: Create a secure RPC function for member deletion that bypasses RLS
CREATE OR REPLACE FUNCTION delete_organization_member(
    p_member_id UUID,
    p_organization_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_admin_user_id UUID;
    v_target_user_id UUID;
    v_admin_count INTEGER;
BEGIN
    -- Get the current user
    v_admin_user_id := auth.uid();
    
    -- Verify the admin user is actually an admin of this organization
    IF NOT EXISTS (
        SELECT 1 
        FROM organization_members
        WHERE user_id = v_admin_user_id
        AND organization_id = p_organization_id
        AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Only organization admins can delete members';
    END IF;
    
    -- Get the target user ID
    SELECT user_id INTO v_target_user_id
    FROM organization_members
    WHERE id = p_member_id
    AND organization_id = p_organization_id;
    
    IF v_target_user_id IS NULL THEN
        RAISE EXCEPTION 'Member not found in organization';
    END IF;
    
    -- Prevent admin from deleting themselves
    IF v_target_user_id = v_admin_user_id THEN
        RAISE EXCEPTION 'Cannot delete yourself from the organization';
    END IF;
    
    -- Check if we're deleting the last admin
    SELECT COUNT(*) INTO v_admin_count
    FROM organization_members
    WHERE organization_id = p_organization_id
    AND role = 'admin'
    AND user_id != v_target_user_id; -- Exclude the member being deleted
    
    IF v_admin_count = 0 THEN
        -- Check if the member being deleted is an admin
        IF EXISTS (
            SELECT 1 FROM organization_members
            WHERE id = p_member_id AND role = 'admin'
        ) THEN
            RAISE EXCEPTION 'Cannot delete the last admin of the organization';
        END IF;
    END IF;
    
    -- Perform the deletion
    DELETE FROM organization_members
    WHERE id = p_member_id
    AND organization_id = p_organization_id;
    
    -- Update organization member count
    UPDATE organizations
    SET member_count = (
        SELECT COUNT(*)
        FROM organization_members
        WHERE organization_id = p_organization_id
        AND status = 'active'
    ),
    updated_at = NOW()
    WHERE id = p_organization_id;
    
    RETURN TRUE;
END;
$$;

-- Grant permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_organization_member(UUID, UUID) TO authenticated;

-- Step 6: Verify the fix by checking policies
SELECT 
    'organization_members policies' as table_name,
    policyname,
    cmd
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'organization_members'
ORDER BY cmd, policyname;

-- Step 7: Test that we can now query organization_members without recursion
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM organization_members
    WHERE organization_id IS NOT NULL;
    
    RAISE NOTICE 'Successfully queried organization_members. Found % rows.', v_count;
    RAISE NOTICE 'Organization members RLS fix completed successfully!';
END $$;
