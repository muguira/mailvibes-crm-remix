-- Fix role update infinite recursion by creating RPC function
-- This complements the member deletion fix

-- Create a secure RPC function for role updates that bypasses RLS
CREATE OR REPLACE FUNCTION update_organization_member_role(
    p_member_id UUID,
    p_organization_id UUID,
    p_new_role TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_admin_user_id UUID;
    v_target_user_id UUID;
    v_current_role TEXT;
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
        RAISE EXCEPTION 'Only organization admins can update member roles';
    END IF;
    
    -- Validate the new role
    IF p_new_role NOT IN ('admin', 'user') THEN
        RAISE EXCEPTION 'Invalid role. Must be either admin or user';
    END IF;
    
    -- Get the target member info
    SELECT user_id, role INTO v_target_user_id, v_current_role
    FROM organization_members
    WHERE id = p_member_id
    AND organization_id = p_organization_id;
    
    IF v_target_user_id IS NULL THEN
        RAISE EXCEPTION 'Member not found in organization';
    END IF;
    
    -- Don't allow changing your own role from admin to user if you're the last admin
    IF v_target_user_id = v_admin_user_id 
       AND v_current_role = 'admin' 
       AND p_new_role = 'user' THEN
        
        -- Check if this user is the last admin
        IF (SELECT COUNT(*) FROM organization_members 
            WHERE organization_id = p_organization_id 
            AND role = 'admin' 
            AND user_id != v_target_user_id) = 0 THEN
            RAISE EXCEPTION 'Cannot demote yourself from admin - you are the last admin';
        END IF;
    END IF;
    
    -- Perform the role update
    UPDATE organization_members
    SET role = p_new_role,
        updated_at = NOW()
    WHERE id = p_member_id
    AND organization_id = p_organization_id;
    
    -- Update organization's updated_at timestamp
    UPDATE organizations
    SET updated_at = NOW()
    WHERE id = p_organization_id;
    
    RETURN TRUE;
END;
$$;

-- Grant permission to authenticated users
GRANT EXECUTE ON FUNCTION update_organization_member_role(UUID, UUID, TEXT) TO authenticated;

-- Test the function creation
DO $$
BEGIN
    RAISE NOTICE 'Successfully created update_organization_member_role RPC function!';
END $$;
