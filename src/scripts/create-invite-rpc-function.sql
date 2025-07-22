-- Create RPC function to send invitations safely
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
    email TEXT,
    role TEXT,
    status TEXT,
    invited_by UUID,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ
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
BEGIN
    -- Get current user
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
    
    -- Insert invitations and return them
    RETURN QUERY
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
    )
    SELECT 
        p_organization_id,
        LOWER(TRIM(unnest(p_emails))),
        p_role,
        'pending',
        v_user_id,
        v_expires_at,
        gen_random_uuid()::TEXT,
        NOW(),
        NOW()
    RETURNING 
        organization_invitations.id,
        organization_invitations.organization_id,
        organization_invitations.email,
        organization_invitations.role,
        organization_invitations.status,
        organization_invitations.invited_by,
        organization_invitations.expires_at,
        organization_invitations.created_at;
END;
$$;

-- Grant permission
GRANT EXECUTE ON FUNCTION send_organization_invitations(UUID, TEXT[], TEXT, TEXT) TO authenticated;

-- Function created successfully! 