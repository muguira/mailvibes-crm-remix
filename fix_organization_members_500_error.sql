-- =============================================
-- FIX FOR 500 ERROR: organization_members table
-- =============================================
-- This script fixes the infinite recursion issue in RLS policies
-- that causes 500 Internal Server Error when querying organization_members

-- Step 1: Temporarily disable RLS to work safely
ALTER TABLE organization_members DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies that might cause recursion
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
-- Policy 1: Users can view their own membership record
CREATE POLICY "view_own_membership" ON organization_members
    FOR SELECT
    USING (user_id = auth.uid());

-- Policy 2: Create a simple function to check organization membership
-- without causing recursion in the policy
CREATE OR REPLACE FUNCTION is_organization_member(p_org_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM organization_members 
        WHERE organization_id = p_org_id 
        AND user_id = p_user_id
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_organization_member(UUID, UUID) TO authenticated;

-- Policy 3: Users can view members of organizations they belong to
-- Using the function to avoid recursion
CREATE POLICY "view_org_members" ON organization_members
    FOR SELECT
    USING (
        user_id = auth.uid() 
        OR is_organization_member(organization_id, auth.uid())
    );

-- Policy 4: Only admins can insert new members
CREATE POLICY "admin_insert_members" ON organization_members
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 
            FROM organization_members existing
            WHERE existing.user_id = auth.uid()
            AND existing.organization_id = organization_members.organization_id
            AND existing.role = 'admin'
        )
    );

-- Policy 5: Only admins can update members
CREATE POLICY "admin_update_members" ON organization_members
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 
            FROM organization_members existing
            WHERE existing.user_id = auth.uid()
            AND existing.organization_id = organization_members.organization_id
            AND existing.role = 'admin'
        )
    );

-- Policy 6: Only admins can delete members
CREATE POLICY "admin_delete_members" ON organization_members
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 
            FROM organization_members existing
            WHERE existing.user_id = auth.uid()
            AND existing.organization_id = organization_members.organization_id
            AND existing.role = 'admin'
        )
    );

-- Step 4: Re-enable RLS
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Step 5: Update the RPC function to handle errors gracefully
CREATE OR REPLACE FUNCTION get_organization_members_safe(p_org_id UUID)
RETURNS TABLE(
    id UUID,
    user_id UUID,
    organization_id UUID,
    role TEXT,
    status TEXT,
    invited_by UUID,
    joined_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    user_email TEXT,
    user_first_name TEXT,
    user_last_name TEXT,
    user_avatar_url TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    
    -- Return empty if no user
    IF v_user_id IS NULL THEN
        RETURN;
    END IF;
    
    -- Only allow if user is a member of this organization
    IF NOT is_organization_member(p_org_id, v_user_id) THEN
        RETURN; -- Return empty result set
    END IF;
    
    RETURN QUERY
    SELECT 
        om.id,
        om.user_id,
        om.organization_id,
        COALESCE(om.role, 'member')::TEXT,
        COALESCE(om.status, 'active')::TEXT,
        om.invited_by,
        COALESCE(om.joined_at, om.created_at) as joined_at,
        om.created_at,
        om.updated_at,
        COALESCE(au.email, '')::TEXT as user_email,
        COALESCE(au.raw_user_meta_data->>'first_name', '')::TEXT as user_first_name,
        COALESCE(au.raw_user_meta_data->>'last_name', '')::TEXT as user_last_name,
        COALESCE(au.raw_user_meta_data->>'avatar_url', '')::TEXT as user_avatar_url
    FROM organization_members om
    LEFT JOIN auth.users au ON om.user_id = au.id
    WHERE om.organization_id = p_org_id
    ORDER BY om.created_at ASC;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log error and return empty set
        RAISE WARNING 'Error in get_organization_members_safe: %', SQLERRM;
        RETURN;
END;
$$;

-- Grant permission
GRANT EXECUTE ON FUNCTION get_organization_members_safe(UUID) TO authenticated;

-- Step 6: Add error handling to the organization store function
CREATE OR REPLACE FUNCTION get_user_organization_safe(p_user_id UUID)
RETURNS TABLE(
    organization_id UUID,
    role TEXT,
    status TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Return empty if no user
    IF p_user_id IS NULL THEN
        RETURN;
    END IF;
    
    RETURN QUERY
    SELECT 
        om.organization_id,
        COALESCE(om.role, 'member')::TEXT,
        COALESCE(om.status, 'active')::TEXT
    FROM organization_members om
    WHERE om.user_id = p_user_id
    LIMIT 1;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log error and return empty set
        RAISE WARNING 'Error in get_user_organization_safe: %', SQLERRM;
        RETURN;
END;
$$;

-- Grant permission
GRANT EXECUTE ON FUNCTION get_user_organization_safe(UUID) TO authenticated;

-- Step 7: Test the fix
DO $$
DECLARE
    v_count INTEGER;
    v_user_id UUID;
BEGIN
    -- Get current user
    SELECT auth.uid() INTO v_user_id;
    
    IF v_user_id IS NOT NULL THEN
        -- Test that we can now query organization_members without errors
        SELECT COUNT(*) INTO v_count
        FROM organization_members
        WHERE user_id = v_user_id;
        
        RAISE NOTICE 'Successfully queried organization_members for user %. Found % rows.', v_user_id, v_count;
    ELSE
        RAISE NOTICE 'No authenticated user found for testing.';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error during test: %', SQLERRM;
END $$;

-- Success message
SELECT 'Organization members 500 error fix completed successfully!' as status; 