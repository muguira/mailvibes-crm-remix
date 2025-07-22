-- Create RPC function to safely delete invitations
-- This bypasses RLS issues that prevent normal DELETE operations

DROP FUNCTION IF EXISTS cancel_organization_invitation(UUID);

CREATE OR REPLACE FUNCTION cancel_organization_invitation(
    p_invitation_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_org_id UUID;
    v_user_role TEXT;
    v_invitation_exists BOOLEAN;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Get the organization ID for this invitation
    SELECT organization_id INTO v_org_id
    FROM organization_invitations
    WHERE id = p_invitation_id;
    
    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Invitation not found';
    END IF;
    
    -- Check if user is admin of the organization
    SELECT role INTO v_user_role
    FROM organization_members
    WHERE user_id = v_user_id
    AND organization_id = v_org_id;
    
    IF v_user_role IS NULL THEN
        RAISE EXCEPTION 'User is not a member of this organization';
    END IF;
    
    IF v_user_role != 'admin' THEN
        RAISE EXCEPTION 'Only administrators can cancel invitations';
    END IF;
    
    -- Delete the invitation
    DELETE FROM organization_invitations
    WHERE id = p_invitation_id;
    
    -- Check if deletion was successful
    GET DIAGNOSTICS v_invitation_exists = ROW_COUNT;
    
    RETURN v_invitation_exists > 0;
END;
$$;

-- Grant permission
GRANT EXECUTE ON FUNCTION cancel_organization_invitation(UUID) TO authenticated;

-- Test function creation
SELECT 'Invitation deletion RPC function created successfully!' as status; 