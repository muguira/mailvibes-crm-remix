-- Fix the token column type mismatch in send_organization_invitations function

-- First, check the current column type
SELECT 
    column_name,
    data_type,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'organization_invitations'
AND column_name = 'token';

-- Drop the existing function
DROP FUNCTION IF EXISTS send_organization_invitations(UUID, TEXT[], TEXT, TEXT);

-- Recreate with the correct return type for token
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
    token CHARACTER VARYING  -- Changed from TEXT to CHARACTER VARYING
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
    
    -- Return the created invitations with explicit casting
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
        oi.token::CHARACTER VARYING  -- Explicitly cast to match expected type
    FROM organization_invitations oi
    WHERE oi.organization_id = p_organization_id
    AND oi.invited_by = v_user_id
    AND oi.email = ANY(p_emails)
    ORDER BY oi.created_at DESC;
    
END;
$$;

-- Grant permission
GRANT EXECUTE ON FUNCTION send_organization_invitations(UUID, TEXT[], TEXT, TEXT) TO authenticated;

-- Verify the fix
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'send_organization_invitations') THEN
        RAISE NOTICE '✓ send_organization_invitations function updated successfully';
    ELSE
        RAISE NOTICE '✗ send_organization_invitations function not found';
    END IF;
END $$;

-- Test the token column type
SELECT 
    'Token column type' as info,
    column_name,
    data_type,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'organization_invitations'
AND column_name = 'token'; 