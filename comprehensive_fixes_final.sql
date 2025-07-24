-- =============================================
-- COMPREHENSIVE FIXES FINAL VERSION
-- =============================================

-- 1. Fix organization_members RLS policy (to fix 500 error)
DROP POLICY IF EXISTS "Users can view their organization members" ON organization_members;

CREATE POLICY "Users can view their organization members"
ON organization_members
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.organization_id = organization_members.organization_id
        AND om.user_id = auth.uid()
    )
);

-- 2. Fix organization name editing
DROP POLICY IF EXISTS "Users can update their own organization" ON organizations;
DROP POLICY IF EXISTS "Admins can update organization details" ON organizations;

CREATE POLICY "Admins can update organization details"
ON organizations
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM organization_members 
        WHERE organization_id = organizations.id 
        AND user_id = auth.uid() 
        AND role = 'admin'
    )
);

-- Create RPC function for updating organization name safely
DROP FUNCTION IF EXISTS update_organization_name(UUID, TEXT);

CREATE OR REPLACE FUNCTION update_organization_name(
    p_organization_id UUID,
    p_new_name TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_user_role TEXT;
    v_updated_count INTEGER;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    IF p_new_name IS NULL OR TRIM(p_new_name) = '' THEN
        RAISE EXCEPTION 'Organization name cannot be empty';
    END IF;
    
    SELECT om.role INTO v_user_role
    FROM organization_members om
    WHERE om.user_id = v_user_id
    AND om.organization_id = p_organization_id;
    
    IF v_user_role IS NULL THEN
        RAISE EXCEPTION 'User is not a member of this organization';
    END IF;
    
    IF v_user_role != 'admin' THEN
        RAISE EXCEPTION 'Only administrators can update organization name';
    END IF;
    
    UPDATE organizations
    SET name = TRIM(p_new_name), updated_at = NOW()
    WHERE id = p_organization_id;
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    RETURN v_updated_count > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION update_organization_name(UUID, TEXT) TO authenticated;

-- 3. Fix invitation sending with proper duplicate handling
DROP FUNCTION IF EXISTS send_organization_invitations(UUID, TEXT[], TEXT, TEXT);

CREATE OR REPLACE FUNCTION send_organization_invitations(
    p_organization_id UUID,
    p_emails TEXT[],
    p_role TEXT,
    p_message TEXT DEFAULT NULL
)
RETURNS TABLE(
    id UUID,
    organization_id UUID,
    email CHARACTER VARYING,
    role CHARACTER VARYING,
    status CHARACTER VARYING,
    invited_by UUID,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    token CHARACTER VARYING
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_user_role TEXT;
    v_expires_at TIMESTAMPTZ;
    v_email TEXT;
    v_token TEXT;
    v_existing_invitation UUID;
    v_invitation_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    SELECT om.role INTO v_user_role
    FROM organization_members om
    WHERE om.organization_id = p_organization_id
    AND om.user_id = v_user_id;
    
    IF v_user_role IS NULL THEN
        RAISE EXCEPTION 'User is not a member of this organization';
    END IF;
    
    IF v_user_role != 'admin' THEN
        RAISE EXCEPTION 'Only administrators can invite users';
    END IF;
    
    v_expires_at := NOW() + INTERVAL '7 days';
    
    -- Create temp table to collect results
    CREATE TEMP TABLE temp_invitations (
        id UUID,
        organization_id UUID,
        email VARCHAR,
        role VARCHAR,
        status VARCHAR,
        invited_by UUID,
        expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ,
        token VARCHAR
    ) ON COMMIT DROP;
    
    FOR i IN 1..array_length(p_emails, 1) LOOP
        v_email := LOWER(TRIM(p_emails[i]));
        v_token := gen_random_uuid()::TEXT;
        
        -- Check for existing pending invitation
        SELECT oi.id INTO v_existing_invitation
        FROM organization_invitations oi
        WHERE oi.organization_id = p_organization_id
        AND oi.email = v_email
        AND oi.status = 'pending';
        
        IF v_existing_invitation IS NOT NULL THEN
            -- Update existing invitation
            UPDATE organization_invitations
            SET expires_at = v_expires_at,
                role = p_role,
                invited_by = v_user_id,
                token = v_token,
                updated_at = NOW()
            WHERE id = v_existing_invitation
            RETURNING id INTO v_invitation_id;
        ELSE
            -- Check for any existing invitation (even non-pending)
            SELECT oi.id INTO v_existing_invitation
            FROM organization_invitations oi
            WHERE oi.organization_id = p_organization_id
            AND oi.email = v_email;
            
            IF v_existing_invitation IS NOT NULL THEN
                -- Update the existing invitation to pending
                UPDATE organization_invitations
                SET status = 'pending',
                    expires_at = v_expires_at,
                    role = p_role,
                    invited_by = v_user_id,
                    token = v_token,
                    updated_at = NOW()
                WHERE id = v_existing_invitation
                RETURNING id INTO v_invitation_id;
            ELSE
                -- Create new invitation
                INSERT INTO organization_invitations (
                    organization_id, email, role, status, invited_by,
                    expires_at, token, created_at, updated_at
                ) VALUES (
                    p_organization_id, v_email, p_role, 'pending', v_user_id,
                    v_expires_at, v_token, NOW(), NOW()
                )
                RETURNING id INTO v_invitation_id;
            END IF;
        END IF;
        
        -- Add to temp table
        INSERT INTO temp_invitations
        SELECT 
            oi.id, oi.organization_id, oi.email, oi.role, oi.status,
            oi.invited_by, oi.expires_at, oi.created_at, oi.token
        FROM organization_invitations oi
        WHERE oi.id = v_invitation_id;
    END LOOP;
    
    -- Return all processed invitations
    RETURN QUERY SELECT * FROM temp_invitations;
END;
$$;

GRANT EXECUTE ON FUNCTION send_organization_invitations(UUID, TEXT[], TEXT, TEXT) TO authenticated;

-- 4. Fix resend invitation
DROP FUNCTION IF EXISTS resend_organization_invitation(UUID);

CREATE OR REPLACE FUNCTION resend_organization_invitation(p_invitation_id UUID)
RETURNS TABLE(success BOOLEAN, invitation_id UUID, new_expires_at TIMESTAMPTZ, message TEXT)
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
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    SELECT * INTO v_invitation FROM organization_invitations WHERE id = p_invitation_id;
    
    IF v_invitation IS NULL THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TIMESTAMPTZ, 'Invitation not found'::TEXT;
        RETURN;
    END IF;
    
    SELECT om.role INTO v_user_role
    FROM organization_members om
    WHERE om.user_id = v_user_id AND om.organization_id = v_invitation.organization_id;
    
    IF v_user_role != 'admin' THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TIMESTAMPTZ, 'Only administrators can resend invitations'::TEXT;
        RETURN;
    END IF;
    
    v_new_expires_at := NOW() + INTERVAL '7 days';
    
    UPDATE organization_invitations
    SET expires_at = v_new_expires_at, updated_at = NOW(), status = 'pending'
    WHERE id = p_invitation_id;
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    
    IF v_updated_count > 0 THEN
        RETURN QUERY SELECT TRUE, p_invitation_id, v_new_expires_at, 'Invitation resent successfully'::TEXT;
    ELSE
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TIMESTAMPTZ, 'Failed to update invitation'::TEXT;
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION resend_organization_invitation(UUID) TO authenticated;

-- 5. Fix cancel invitation
DROP FUNCTION IF EXISTS cancel_organization_invitation(UUID);

CREATE OR REPLACE FUNCTION cancel_organization_invitation(p_invitation_id UUID)
RETURNS TABLE(success BOOLEAN, message TEXT)
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
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    SELECT * INTO v_invitation FROM organization_invitations WHERE id = p_invitation_id;
    
    IF v_invitation IS NULL THEN
        RETURN QUERY SELECT FALSE, 'Invitation not found'::TEXT;
        RETURN;
    END IF;
    
    SELECT om.role INTO v_user_role
    FROM organization_members om
    WHERE om.user_id = v_user_id AND om.organization_id = v_invitation.organization_id;
    
    IF v_user_role != 'admin' THEN
        RETURN QUERY SELECT FALSE, 'Only administrators can cancel invitations'::TEXT;
        RETURN;
    END IF;
    
    DELETE FROM organization_invitations WHERE id = p_invitation_id;
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    IF v_deleted_count > 0 THEN
        RETURN QUERY SELECT TRUE, 'Invitation canceled successfully'::TEXT;
    ELSE
        RETURN QUERY SELECT FALSE, 'Failed to cancel invitation'::TEXT;
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION cancel_organization_invitation(UUID) TO authenticated;

-- 6. Add debug function to check user role
DROP FUNCTION IF EXISTS debug_user_org_role(UUID, UUID);

CREATE OR REPLACE FUNCTION debug_user_org_role(
    p_user_id UUID,
    p_org_id UUID
)
RETURNS TABLE(
    user_id UUID,
    org_id UUID,
    role TEXT,
    status TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        om.user_id,
        om.organization_id,
        om.role,
        om.status,
        om.created_at
    FROM organization_members om
    WHERE om.user_id = p_user_id
    AND om.organization_id = p_org_id;
END;
$$;

GRANT EXECUTE ON FUNCTION debug_user_org_role(UUID, UUID) TO authenticated;

SELECT 'All fixes applied successfully!' as status;
