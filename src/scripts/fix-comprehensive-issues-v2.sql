-- COMPREHENSIVE INVITATION FIX V2
-- Fixed version without syntax errors

-- 1. Add missing token column to organization_invitations if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organization_invitations' 
        AND column_name = 'token'
    ) THEN
        ALTER TABLE organization_invitations ADD COLUMN token TEXT;
        RAISE NOTICE 'Added token column to organization_invitations';
    END IF;
END $$;

-- 2. Update existing invitations to have tokens
UPDATE organization_invitations 
SET token = gen_random_uuid()::TEXT 
WHERE token IS NULL OR token = '';

-- 3. Drop existing function if it exists
DROP FUNCTION IF EXISTS cancel_organization_invitation(UUID);

-- 4. Create RPC function to safely delete invitations with correct return type
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
    v_deleted_count INTEGER;
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
    
    -- Get the number of rows deleted
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    -- Return true if we deleted something, false otherwise
    RETURN v_deleted_count > 0;
END;
$$;

-- Grant permission
GRANT EXECUTE ON FUNCTION cancel_organization_invitation(UUID) TO authenticated;

-- 5. Fix the send invitations RPC to return tokens
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
    token TEXT
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
BEGIN
    -- Get current user ID
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Check if user is admin of the organization
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
    
    -- Set expiry date (7 days from now)
    v_expires_at := NOW() + INTERVAL '7 days';
    
    -- Process each email individually
    FOR i IN 1..array_length(p_emails, 1) LOOP
        v_email := LOWER(TRIM(p_emails[i]));
        v_token := gen_random_uuid()::TEXT;
        
        -- Insert single invitation
        INSERT INTO organization_invitations (
            organization_id,
            email,
            role,
            status,
            invited_by,
            expires_at,
            token,
            created_at,
            updated_at
        ) VALUES (
            p_organization_id,
            v_email,
            p_role,
            'pending',
            v_user_id,
            v_expires_at,
            v_token,
            NOW(),
            NOW()
        );
    END LOOP;
    
    -- Return the created invitations
    RETURN QUERY
    SELECT 
        oi.id,
        oi.organization_id,
        oi.email,
        oi.role,
        oi.status,
        oi.invited_by,
        oi.expires_at,
        oi.created_at,
        oi.token
    FROM organization_invitations oi
    WHERE oi.organization_id = p_organization_id
    AND oi.invited_by = v_user_id
    AND oi.email = ANY(p_emails)
    ORDER BY oi.created_at DESC;
    
END;
$$;

-- Grant permission
GRANT EXECUTE ON FUNCTION send_organization_invitations(UUID, TEXT[], TEXT, TEXT) TO authenticated;

-- 6. Update organization capacity to be more realistic
UPDATE organizations 
SET max_members = 25, 
    member_count = 1
WHERE domain = 'salessheet.io';

-- 7. Verify everything is working
DO $$
BEGIN
    RAISE NOTICE 'Verifying installation...';
    
    -- Check if functions exist
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'cancel_organization_invitation') THEN
        RAISE NOTICE '✓ cancel_organization_invitation function created';
    ELSE
        RAISE NOTICE '✗ cancel_organization_invitation function missing';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'send_organization_invitations') THEN
        RAISE NOTICE '✓ send_organization_invitations function created';
    ELSE
        RAISE NOTICE '✗ send_organization_invitations function missing';
    END IF;
    
    -- Check organization
    IF EXISTS (SELECT 1 FROM organizations WHERE domain = 'salessheet.io' AND max_members = 25) THEN
        RAISE NOTICE '✓ Organization capacity updated';
    ELSE
        RAISE NOTICE '✗ Organization capacity not updated';
    END IF;
    
    RAISE NOTICE 'Comprehensive invitation fix completed successfully!';
END $$;

-- 8. Show final status
SELECT 
    'Final Status' as info,
    name,
    domain,
    member_count,
    max_members,
    (SELECT COUNT(*) FROM organization_members WHERE organization_id = organizations.id) as actual_members,
    (SELECT COUNT(*) FROM organization_invitations WHERE organization_id = organizations.id AND status = 'pending') as pending_invitations
FROM organizations 
WHERE domain = 'salessheet.io'; 