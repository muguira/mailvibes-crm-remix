-- Fix auto-acceptance duplicate key error
-- This script fixes the remaining issues with invitation flow

-- 1. Update auto_accept_invitation to handle existing memberships properly
DROP FUNCTION IF EXISTS auto_accept_invitation(UUID, UUID);
CREATE OR REPLACE FUNCTION auto_accept_invitation(p_invitation_id UUID, p_user_id UUID)
RETURNS TABLE(
    success BOOLEAN,
    organization_id UUID,
    message TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_invitation RECORD;
    v_org_id UUID;
    v_existing_member UUID;
    v_user_email TEXT;
BEGIN
    -- Debug logging
    RAISE NOTICE 'auto_accept_invitation called with invitation_id: %, user_id: %', p_invitation_id, p_user_id;
    
    -- Get user email
    SELECT email INTO v_user_email FROM auth.users WHERE id = p_user_id;
    
    -- Get invitation details
    SELECT 
        oi.id,
        oi.email,
        oi.role,
        oi.status,
        oi.organization_id,
        oi.expires_at
    INTO v_invitation
    FROM organization_invitations oi
    WHERE oi.id = p_invitation_id
    AND COALESCE(oi.status, 'pending') = 'pending'
    AND oi.expires_at > NOW();

    IF v_invitation IS NULL THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, 'Invitation not found, expired, or already processed'::TEXT;
        RETURN;
    END IF;

    -- Verify email matches
    IF LOWER(TRIM(v_user_email)) != LOWER(TRIM(v_invitation.email)) THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, 
            format('Email mismatch: invitation for %s but user is %s', v_invitation.email, COALESCE(v_user_email, 'unknown'))::TEXT;
        RETURN;
    END IF;

    v_org_id := v_invitation.organization_id;

    -- Check if user is already a member of this organization
    SELECT om.user_id INTO v_existing_member
    FROM organization_members om
    WHERE om.user_id = p_user_id
    AND om.organization_id = v_org_id;

    IF v_existing_member IS NOT NULL THEN
        -- User is already a member, just mark invitation as accepted
        UPDATE organization_invitations
        SET status = 'accepted',
            accepted_at = NOW(),
            updated_at = NOW()
        WHERE id = p_invitation_id;

        RETURN QUERY SELECT TRUE, v_org_id, 'Already a member - invitation marked as accepted'::TEXT;
        RETURN;
    END IF;

    -- Create organization member (user is not already a member)
    INSERT INTO organization_members (
        user_id,
        organization_id,
        role,
        status,
        joined_at,
        created_at,
        updated_at
    ) VALUES (
        p_user_id,
        v_org_id,
        v_invitation.role::TEXT,
        'active',
        NOW(),
        NOW(),
        NOW()
    );

    -- Update user's profile to set current organization
    INSERT INTO profiles (id, current_organization_id)
    VALUES (p_user_id, v_org_id)
    ON CONFLICT (id) DO UPDATE SET
        current_organization_id = v_org_id,
        updated_at = NOW();

    -- Mark invitation as accepted
    UPDATE organization_invitations
    SET status = 'accepted',
        accepted_at = NOW(),
        updated_at = NOW()
    WHERE id = p_invitation_id;

    -- Update organization member count
    UPDATE organizations
    SET member_count = (
        SELECT COUNT(*)
        FROM organization_members om
        WHERE om.organization_id = v_org_id
        AND om.status = 'active'
    ),
    updated_at = NOW()
    WHERE id = v_org_id;

    RETURN QUERY SELECT TRUE, v_org_id, 'Successfully joined organization'::TEXT;
    
EXCEPTION
    WHEN unique_violation THEN
        -- Handle the case where membership was created between our check and insert
        UPDATE organization_invitations
        SET status = 'accepted',
            accepted_at = NOW(),
            updated_at = NOW()
        WHERE id = p_invitation_id;
        
        RETURN QUERY SELECT TRUE, v_org_id, 'Membership already exists - invitation accepted'::TEXT;
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in auto_accept_invitation: %', SQLERRM;
        RETURN QUERY SELECT FALSE, NULL::UUID, ('Error: ' || SQLERRM)::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION auto_accept_invitation(UUID, UUID) TO authenticated;

-- Done!
SELECT 'Auto-acceptance duplicate key issue fixed!' as status;
