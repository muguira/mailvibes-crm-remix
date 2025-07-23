-- =============================================
-- CLEAN UP ORPHANED INVITATIONS
-- =============================================
-- This script removes orphaned invitations for users who were previously
-- deleted from organizations, preventing duplicate key errors.

-- 1. First, let's see what invitations are causing issues
SELECT 
    oi.id,
    oi.email,
    oi.organization_id,
    oi.status,
    oi.created_at,
    o.name as organization_name,
    CASE 
        WHEN om.user_id IS NOT NULL THEN 'Member exists'
        ELSE 'No membership found'
    END as membership_status
FROM organization_invitations oi
JOIN organizations o ON oi.organization_id = o.id
LEFT JOIN organization_members om ON (
    oi.organization_id = om.organization_id 
    AND oi.email = (SELECT email FROM auth.users WHERE id = om.user_id)
)
WHERE oi.status = 'pending'
ORDER BY oi.created_at DESC;

-- 2. Create function to clean up orphaned invitations
DROP FUNCTION IF EXISTS clean_orphaned_invitations(UUID);

CREATE OR REPLACE FUNCTION clean_orphaned_invitations(p_organization_id UUID)
RETURNS TABLE(
    cleaned_count INTEGER,
    emails_cleaned TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_user_role TEXT;
    v_cleaned_count INTEGER := 0;
    v_emails_cleaned TEXT[] := ARRAY[]::TEXT[];
    v_invitation RECORD;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Check if user is admin of the organization
    SELECT role INTO v_user_role
    FROM organization_members
    WHERE user_id = v_user_id
    AND organization_id = p_organization_id;
    
    IF v_user_role IS NULL THEN
        RAISE EXCEPTION 'User is not a member of this organization';
    END IF;
    
    IF v_user_role != 'admin' THEN
        RAISE EXCEPTION 'Only administrators can clean up invitations';
    END IF;
    
    -- Find and clean orphaned invitations
    FOR v_invitation IN
        SELECT oi.id, oi.email
        FROM organization_invitations oi
        WHERE oi.organization_id = p_organization_id
        AND oi.status = 'pending'
        AND NOT EXISTS (
            SELECT 1 FROM organization_members om
            JOIN auth.users u ON om.user_id = u.id
            WHERE om.organization_id = oi.organization_id
            AND u.email = oi.email
        )
    LOOP
        -- Delete the orphaned invitation
        DELETE FROM organization_invitations 
        WHERE id = v_invitation.id;
        
        v_cleaned_count := v_cleaned_count + 1;
        v_emails_cleaned := array_append(v_emails_cleaned, v_invitation.email);
    END LOOP;
    
    RETURN QUERY SELECT v_cleaned_count, v_emails_cleaned;
END;
$$;

-- Grant permission
GRANT EXECUTE ON FUNCTION clean_orphaned_invitations(UUID) TO authenticated;

-- 3. Create improved send_organization_invitations that handles duplicates better
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
        
        -- Check for existing invitation
        SELECT id INTO v_existing_invitation
        FROM organization_invitations
        WHERE organization_id = p_organization_id
        AND email = v_email
        AND status = 'pending';
        
        IF v_existing_invitation IS NOT NULL THEN
            -- Update existing invitation instead of creating duplicate
            UPDATE organization_invitations
            SET expires_at = v_expires_at,
                role = p_role,
                invited_by = v_user_id,
                token = v_token,
                updated_at = NOW()
            WHERE id = v_existing_invitation;
        ELSE
            -- Insert new invitation
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
        END IF;
    END LOOP;
    
    -- Return the created/updated invitations
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
        oi.token::CHARACTER VARYING
    FROM organization_invitations oi
    WHERE oi.organization_id = p_organization_id
    AND oi.invited_by = v_user_id
    AND oi.email = ANY(p_emails)
    ORDER BY oi.created_at DESC;
    
END;
$$;

-- Grant permission
GRANT EXECUTE ON FUNCTION send_organization_invitations(UUID, TEXT[], TEXT, TEXT) TO authenticated;

-- Show success message
SELECT 'Orphaned invitation cleanup functions created successfully!' as status; 