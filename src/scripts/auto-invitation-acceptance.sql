-- Auto-invitation acceptance system
-- This script creates the necessary functions for automatically accepting invitations during auth

-- 1. Create RPC function to get pending invitations for an email
DROP FUNCTION IF EXISTS get_pending_invitations_for_email(TEXT);
CREATE OR REPLACE FUNCTION get_pending_invitations_for_email(p_email TEXT)
RETURNS TABLE(
    id UUID,
    organization_id UUID,
    role TEXT,
    invited_by UUID,
    expires_at TIMESTAMPTZ,
    organization_name TEXT,
    organization_domain TEXT
) 
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        oi.id,
        oi.organization_id,
        oi.role,
        oi.invited_by,
        oi.expires_at,
        o.name as organization_name,
        o.domain as organization_domain
    FROM organization_invitations oi
    JOIN organizations o ON o.id = oi.organization_id
    WHERE oi.email = LOWER(TRIM(p_email))
    AND oi.status = 'pending'
    AND oi.expires_at > NOW()
    ORDER BY oi.created_at DESC;
$$;

-- Grant permission to authenticated users
GRANT EXECUTE ON FUNCTION get_pending_invitations_for_email(TEXT) TO authenticated;

-- 2. Create RPC function to auto-accept invitation
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
BEGIN
    -- Get invitation details
    SELECT * INTO v_invitation
    FROM organization_invitations
    WHERE id = p_invitation_id
    AND status = 'pending'
    AND expires_at > NOW();

    IF v_invitation IS NULL THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, 'Invitation not found or expired'::TEXT;
        RETURN;
    END IF;

    v_org_id := v_invitation.organization_id;

    -- Check if user is already a member of this organization
    SELECT id INTO v_existing_member
    FROM organization_members
    WHERE user_id = p_user_id
    AND organization_id = v_org_id;

    IF v_existing_member IS NOT NULL THEN
        -- User is already a member, just update their current organization and mark invitation as accepted
        UPDATE profiles
        SET current_organization = v_org_id
        WHERE id = p_user_id;

        UPDATE organization_invitations
        SET status = 'accepted',
            accepted_at = NOW()
        WHERE id = p_invitation_id;

        RETURN QUERY SELECT TRUE, v_org_id, 'Already a member - switched to organization'::TEXT;
        RETURN;
    END IF;

    -- Create organization member
    INSERT INTO organization_members (
        user_id,
        organization_id,
        role
    ) VALUES (
        p_user_id,
        v_org_id,
        v_invitation.role
    );

    -- Update user's profile to set current organization
    INSERT INTO profiles (id, current_organization)
    VALUES (p_user_id, v_org_id)
    ON CONFLICT (id) DO UPDATE SET
        current_organization = v_org_id;

    -- Mark invitation as accepted
    UPDATE organization_invitations
    SET status = 'accepted',
        accepted_at = NOW()
    WHERE id = p_invitation_id;

    -- Update organization member count
    UPDATE organizations
    SET member_count = (
        SELECT COUNT(*)
        FROM organization_members
        WHERE organization_id = v_org_id
    )
    WHERE id = v_org_id;

    RETURN QUERY SELECT TRUE, v_org_id, 'Successfully joined organization'::TEXT;
END;
$$;

-- Grant permission to authenticated users
GRANT EXECUTE ON FUNCTION auto_accept_invitation(UUID, UUID) TO authenticated;

-- 3. Create function to check if user needs organization (considering pending invitations)
DROP FUNCTION IF EXISTS user_needs_organization(UUID);
CREATE OR REPLACE FUNCTION user_needs_organization(p_user_id UUID)
RETURNS TABLE(
    needs_org BOOLEAN,
    has_pending_invitation BOOLEAN,
    user_email TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_email TEXT;
    v_has_org BOOLEAN := FALSE;
    v_has_pending BOOLEAN := FALSE;
BEGIN
    -- Get user email
    SELECT email INTO v_user_email
    FROM auth.users
    WHERE id = p_user_id;

    IF v_user_email IS NULL THEN
        RETURN QUERY SELECT TRUE, FALSE, NULL::TEXT;
        RETURN;
    END IF;

    -- Check if user has an organization
    SELECT EXISTS(
        SELECT 1
        FROM organization_members
        WHERE user_id = p_user_id
    ) INTO v_has_org;

    -- Check if user has pending invitations
    SELECT EXISTS(
        SELECT 1
        FROM organization_invitations
        WHERE email = v_user_email
        AND status = 'pending'
        AND expires_at > NOW()
    ) INTO v_has_pending;

    -- User needs organization if they don't have one AND don't have pending invitations
    RETURN QUERY SELECT (NOT v_has_org AND NOT v_has_pending), v_has_pending, v_user_email;
END;
$$;

-- Grant permission to authenticated users
GRANT EXECUTE ON FUNCTION user_needs_organization(UUID) TO authenticated;

-- Verify functions were created
SELECT 'Functions created successfully' as status; 