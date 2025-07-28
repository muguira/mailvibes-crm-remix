-- Fix RLS policies for organization creation
-- This resolves the chicken-and-egg problem where organization creators can't add themselves as admin

-- Drop the restrictive admin_insert_members policy
DROP POLICY IF EXISTS "admin_insert_members" ON organization_members;

-- Create a new policy that allows organization creators to add themselves as admin
-- and existing admins to add new members
CREATE POLICY "allow_organization_creation_and_admin_insert" ON organization_members
    FOR INSERT
    WITH CHECK (
        -- Allow if user is inserting themselves as admin for a newly created organization
        -- (organization with no existing members)
        (
            user_id = auth.uid() 
            AND role = 'admin'
            AND NOT EXISTS (
                SELECT 1 
                FROM organization_members existing_members
                WHERE existing_members.organization_id = organization_members.organization_id
            )
        )
        OR
        -- Allow if user is an existing admin of the organization
        EXISTS (
            SELECT 1 
            FROM organization_members admin_check
            WHERE admin_check.user_id = auth.uid()
            AND admin_check.organization_id = organization_members.organization_id
            AND admin_check.role = 'admin'
        )
    );

-- Also ensure organization_members table has proper indexes for performance
CREATE INDEX IF NOT EXISTS idx_organization_members_user_org 
    ON organization_members(user_id, organization_id);

CREATE INDEX IF NOT EXISTS idx_organization_members_org_role 
    ON organization_members(organization_id, role);

-- Create a secure RPC function for organization creation that bypasses RLS
CREATE OR REPLACE FUNCTION create_organization_with_admin(
    p_org_name TEXT,
    p_org_domain TEXT,
    p_user_id UUID DEFAULT auth.uid()
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_org_id UUID;
    v_result JSON;
BEGIN
    -- Validate inputs
    IF p_org_name IS NULL OR trim(p_org_name) = '' THEN
        RAISE EXCEPTION 'Organization name is required';
    END IF;
    
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID is required';
    END IF;

    -- Create organization
    INSERT INTO organizations (name, domain, plan, member_count, max_members)
    VALUES (
        trim(p_org_name),
        COALESCE(trim(p_org_domain), lower(regexp_replace(trim(p_org_name), '[^a-zA-Z0-9]', '', 'g')) || '-' || extract(epoch from now())::bigint || '.workspace'),
        'free',
        1,
        25
    )
    RETURNING id INTO v_org_id;

    -- Add user as admin (this bypasses RLS since function is SECURITY DEFINER)
    INSERT INTO organization_members (user_id, organization_id, role, status, joined_at)
    VALUES (p_user_id, v_org_id, 'admin', 'active', now());

    -- Update user's current organization in profiles
    UPDATE profiles 
    SET current_organization = v_org_id 
    WHERE id = p_user_id;

    -- Return success result
    SELECT json_build_object(
        'success', true,
        'organization_id', v_org_id,
        'message', 'Organization created successfully'
    ) INTO v_result;

    RETURN v_result;

EXCEPTION WHEN OTHERS THEN
    -- Return error result
    SELECT json_build_object(
        'success', false,
        'error', SQLERRM,
        'code', SQLSTATE
    ) INTO v_result;
    
    RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_organization_with_admin(TEXT, TEXT, UUID) TO authenticated;

-- Test the fix
DO $$
BEGIN
    RAISE NOTICE 'Organization creation RLS fix completed successfully!';
    RAISE NOTICE 'Users can now create organizations and be added as admin members.';
END $$; 