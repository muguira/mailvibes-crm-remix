-- Fix RLS policies for invitation acceptance and organization access
-- This script creates safe RPC functions and fixes policies

-- 1. Create RPC function to get invitation details safely (for unauthenticated users)
DROP FUNCTION IF EXISTS get_invitation_details_public(TEXT);
CREATE OR REPLACE FUNCTION get_invitation_details_public(
    p_token_or_id TEXT
)
RETURNS TABLE(
    id UUID,
    email TEXT,
    role TEXT,
    status TEXT,
    expires_at TIMESTAMPTZ,
    organization_id UUID,
    organization_name TEXT,
    invited_by UUID,
    inviter_email TEXT,
    inviter_name TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- This function can be called by anyone (no auth required)
    -- to get basic invitation details for the acceptance flow
    
    RETURN QUERY
    SELECT 
        oi.id,
        oi.email,
        oi.role::TEXT,
        COALESCE(oi.status, 'pending')::TEXT,
        oi.expires_at,
        oi.organization_id,
        o.name as organization_name,
        oi.invited_by,
        COALESCE(au.email, 'team@company.com') as inviter_email,
        COALESCE(
            TRIM(CONCAT(
                COALESCE(au.raw_user_meta_data->>'first_name', ''),
                ' ',
                COALESCE(au.raw_user_meta_data->>'last_name', '')
            )),
            au.email,
            'Team Member'
        ) as inviter_name
    FROM organization_invitations oi
    JOIN organizations o ON oi.organization_id = o.id
    LEFT JOIN auth.users au ON oi.invited_by = au.id
    WHERE (
        (oi.id::TEXT = p_token_or_id) OR 
        (oi.token = p_token_or_id)
    )
    AND oi.status = 'pending'
    LIMIT 1;
END;
$$;

-- Grant access to everyone (including unauthenticated users)
GRANT EXECUTE ON FUNCTION get_invitation_details_public(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_invitation_details_public(TEXT) TO authenticated;

-- 2. Create RPC function to get organization members safely
DROP FUNCTION IF EXISTS get_organization_members_safe(UUID);
CREATE OR REPLACE FUNCTION get_organization_members_safe(
    p_org_id UUID
)
RETURNS TABLE(
    id UUID,
    user_id UUID,
    organization_id UUID,
    role TEXT,
    status TEXT,
    invited_by UUID,
    joined_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    user_email TEXT,
    user_first_name TEXT,
    user_last_name TEXT,
    user_avatar_url TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    
    -- Only allow if user is a member of this organization
    IF NOT EXISTS (
        SELECT 1 
        FROM organization_members om
        WHERE om.user_id = v_user_id 
        AND om.organization_id = p_org_id
    ) THEN
        RETURN; -- Return empty result set
    END IF;
    
    RETURN QUERY
    SELECT 
        om.id,
        om.user_id,
        om.organization_id,
        om.role::TEXT,
        COALESCE(om.status, 'active')::TEXT,
        om.invited_by,
        om.joined_at,
        om.created_at,
        om.updated_at,
        au.email as user_email,
        COALESCE(au.raw_user_meta_data->>'first_name', '') as user_first_name,
        COALESCE(au.raw_user_meta_data->>'last_name', '') as user_last_name,
        COALESCE(au.raw_user_meta_data->>'avatar_url', '') as user_avatar_url
    FROM organization_members om
    JOIN auth.users au ON om.user_id = au.id
    WHERE om.organization_id = p_org_id
    ORDER BY om.created_at ASC;
END;
$$;

-- Grant permission to authenticated users
GRANT EXECUTE ON FUNCTION get_organization_members_safe(UUID) TO authenticated;

-- 3. Create RPC function to get organization invitations safely
DROP FUNCTION IF EXISTS get_organization_invitations_safe(UUID);
CREATE OR REPLACE FUNCTION get_organization_invitations_safe(
    p_org_id UUID
)
RETURNS TABLE(
    id UUID,
    organization_id UUID,
    email TEXT,
    role TEXT,
    status TEXT,
    invited_by UUID,
    expires_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    token TEXT,
    inviter_email TEXT,
    inviter_name TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_user_role TEXT;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    
    -- Check if user is admin of this organization
    SELECT om.role INTO v_user_role
    FROM organization_members om
    WHERE om.user_id = v_user_id 
    AND om.organization_id = p_org_id;
    
    -- Only admins can view invitations
    IF v_user_role != 'admin' THEN
        RETURN; -- Return empty result set
    END IF;
    
    RETURN QUERY
    SELECT 
        oi.id,
        oi.organization_id,
        oi.email,
        oi.role::TEXT,
        COALESCE(oi.status, 'pending')::TEXT,
        oi.invited_by,
        oi.expires_at,
        oi.accepted_at,
        oi.created_at,
        oi.updated_at,
        oi.token,
        COALESCE(au.email, 'team@company.com') as inviter_email,
        COALESCE(
            TRIM(CONCAT(
                COALESCE(au.raw_user_meta_data->>'first_name', ''),
                ' ',
                COALESCE(au.raw_user_meta_data->>'last_name', '')
            )),
            au.email,
            'Team Member'
        ) as inviter_name
    FROM organization_invitations oi
    LEFT JOIN auth.users au ON oi.invited_by = au.id
    WHERE oi.organization_id = p_org_id
    AND oi.status = 'pending'
    ORDER BY oi.created_at DESC;
END;
$$;

-- Grant permission to authenticated users
GRANT EXECUTE ON FUNCTION get_organization_invitations_safe(UUID) TO authenticated;

-- 4. Update RLS policies to be more permissive for invitation acceptance
-- Allow anyone to read organization_invitations for invitation acceptance
DROP POLICY IF EXISTS "Anyone can view pending invitations" ON organization_invitations;
CREATE POLICY "Anyone can view pending invitations" ON organization_invitations
    FOR SELECT
    USING (status = 'pending');

-- 5. Verify the functions were created
DO $$
BEGIN
    RAISE NOTICE '✓ Created get_invitation_details_public function';
    RAISE NOTICE '✓ Created get_organization_members_safe function';
    RAISE NOTICE '✓ Created get_organization_invitations_safe function';
    RAISE NOTICE '✓ Updated RLS policies for invitation acceptance';
END $$; 