-- =============================================
-- FIX RESEND INVITATION FUNCTIONALITY
-- =============================================

-- Create RPC function to safely resend invitations
DROP FUNCTION IF EXISTS resend_organization_invitation(UUID);

CREATE OR REPLACE FUNCTION resend_organization_invitation(
    p_invitation_id UUID
)
RETURNS TABLE(
    success BOOLEAN,
    invitation_id UUID,
    new_expires_at TIMESTAMPTZ,
    message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_invitation RECORD;
    v_user_role TEXT;
    v_new_expires_at TIMESTAMPTZ;
    v_updated_count INTEGER;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Get invitation details
    SELECT * INTO v_invitation
    FROM organization_invitations
    WHERE id = p_invitation_id;
    
    IF v_invitation IS NULL THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TIMESTAMPTZ, 'Invitation not found'::TEXT;
        RETURN;
    END IF;
    
    -- Check if user is admin of the organization
    SELECT role INTO v_user_role
    FROM organization_members
    WHERE user_id = v_user_id
    AND organization_id = v_invitation.organization_id;
    
    IF v_user_role IS NULL THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TIMESTAMPTZ, 'User is not a member of this organization'::TEXT;
        RETURN;
    END IF;
    
    IF v_user_role != 'admin' THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TIMESTAMPTZ, 'Only administrators can resend invitations'::TEXT;
        RETURN;
    END IF;
    
    -- Set new expiry date (7 days from now)
    v_new_expires_at := NOW() + INTERVAL '7 days';
    
    -- Update the invitation
    UPDATE organization_invitations
    SET expires_at = v_new_expires_at,
        updated_at = NOW(),
        status = 'pending'  -- Reset status to pending in case it was expired
    WHERE id = p_invitation_id;
    
    -- Check if update was successful
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    
    IF v_updated_count > 0 THEN
        RETURN QUERY SELECT TRUE, p_invitation_id, v_new_expires_at, 'Invitation resent successfully'::TEXT;
    ELSE
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TIMESTAMPTZ, 'Failed to update invitation'::TEXT;
    END IF;
END;
$$;

-- Grant permission
GRANT EXECUTE ON FUNCTION resend_organization_invitation(UUID) TO authenticated;

-- Also fix cancel invitation function if needed
DROP FUNCTION IF EXISTS cancel_organization_invitation(UUID);

CREATE OR REPLACE FUNCTION cancel_organization_invitation(
    p_invitation_id UUID
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_invitation RECORD;
    v_user_role TEXT;
    v_deleted_count INTEGER;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Get invitation details
    SELECT * INTO v_invitation
    FROM organization_invitations
    WHERE id = p_invitation_id;
    
    IF v_invitation IS NULL THEN
        RETURN QUERY SELECT FALSE, 'Invitation not found'::TEXT;
        RETURN;
    END IF;
    
    -- Check if user is admin of the organization
    SELECT role INTO v_user_role
    FROM organization_members
    WHERE user_id = v_user_id
    AND organization_id = v_invitation.organization_id;
    
    IF v_user_role IS NULL THEN
        RETURN QUERY SELECT FALSE, 'User is not a member of this organization'::TEXT;
        RETURN;
    END IF;
    
    IF v_user_role != 'admin' THEN
        RETURN QUERY SELECT FALSE, 'Only administrators can cancel invitations'::TEXT;
        RETURN;
    END IF;
    
    -- Delete the invitation
    DELETE FROM organization_invitations
    WHERE id = p_invitation_id;
    
    -- Check if deletion was successful
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    IF v_deleted_count > 0 THEN
        RETURN QUERY SELECT TRUE, 'Invitation canceled successfully'::TEXT;
    ELSE
        RETURN QUERY SELECT FALSE, 'Failed to cancel invitation'::TEXT;
    END IF;
END;
$$;

-- Grant permission
GRANT EXECUTE ON FUNCTION cancel_organization_invitation(UUID) TO authenticated;

SELECT 'Resend and cancel invitation functions created successfully!' as status; 