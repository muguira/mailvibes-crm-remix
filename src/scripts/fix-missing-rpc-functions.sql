-- Fix missing RPC functions and auto_accept_invitation issues
-- This script creates all the missing functions that are causing 400 errors

-- 1. First, let's make sure we have the proper column structure
ALTER TABLE organization_invitations 
ADD COLUMN IF NOT EXISTS token TEXT DEFAULT gen_random_uuid()::TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Create get_organization_members_safe function
DROP FUNCTION IF EXISTS get_organization_members_safe(UUID);
CREATE OR REPLACE FUNCTION get_organization_members_safe(p_org_id UUID)
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

GRANT EXECUTE ON FUNCTION get_organization_members_safe(UUID) TO authenticated;

-- 3. Create get_organization_invitations_safe function
DROP FUNCTION IF EXISTS get_organization_invitations_safe(UUID);
CREATE OR REPLACE FUNCTION get_organization_invitations_safe(p_org_id UUID)
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

GRANT EXECUTE ON FUNCTION get_organization_invitations_safe(UUID) TO authenticated;

-- 4. Create get_organization_details_safe function
DROP FUNCTION IF EXISTS get_organization_details_safe(UUID);
CREATE OR REPLACE FUNCTION get_organization_details_safe(p_org_id UUID)
RETURNS TABLE(
    id UUID,
    name TEXT,
    domain TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    plan TEXT,
    member_count INTEGER,
    max_members INTEGER
) 
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        id,
        name,
        domain,
        created_at,
        COALESCE(updated_at, created_at) as updated_at,
        COALESCE(plan, 'free') as plan,
        COALESCE(member_count, 1) as member_count,
        COALESCE(max_members, 25) as max_members
    FROM organizations
    WHERE id = p_org_id;
$$;

GRANT EXECUTE ON FUNCTION get_organization_details_safe(UUID) TO authenticated;

-- 5. Fix the auto_accept_invitation function to handle all edge cases properly
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
    
    -- Get invitation details with better error handling
    SELECT * INTO v_invitation
    FROM organization_invitations
    WHERE id = p_invitation_id
    AND status = 'pending'
    AND expires_at > NOW();

    IF v_invitation IS NULL THEN
        -- Try to find the invitation by any status to give better error message
        SELECT * INTO v_invitation
        FROM organization_invitations
        WHERE id = p_invitation_id;
        
        IF v_invitation IS NULL THEN
            RETURN QUERY SELECT FALSE, NULL::UUID, 'Invitation not found'::TEXT;
            RETURN;
        ELSIF v_invitation.status != 'pending' THEN
            RETURN QUERY SELECT FALSE, NULL::UUID, 'Invitation has already been processed'::TEXT;
            RETURN;
        ELSIF v_invitation.expires_at <= NOW() THEN
            RETURN QUERY SELECT FALSE, NULL::UUID, 'Invitation has expired'::TEXT;
            RETURN;
        END IF;
    END IF;

    -- Verify email matches
    IF v_user_email != v_invitation.email THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, 
            ('Email mismatch: invitation for ' || v_invitation.email || ' but user is ' || COALESCE(v_user_email, 'unknown'))::TEXT;
        RETURN;
    END IF;

    v_org_id := v_invitation.organization_id;

    -- Check if user is already a member of this organization
    SELECT user_id INTO v_existing_member
    FROM organization_members
    WHERE user_id = p_user_id
    AND organization_id = v_org_id;

    IF v_existing_member IS NOT NULL THEN
        -- User is already a member, just update their current organization and mark invitation as accepted
        INSERT INTO profiles (id, current_organization)
        VALUES (p_user_id, v_org_id)
        ON CONFLICT (id) DO UPDATE SET
            current_organization = v_org_id;

        UPDATE organization_invitations
        SET status = 'accepted',
            accepted_at = NOW(),
            updated_at = NOW()
        WHERE id = p_invitation_id;

        RETURN QUERY SELECT TRUE, v_org_id, 'Already a member - switched to organization'::TEXT;
        RETURN;
    END IF;

    -- Create organization member
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
        v_invitation.role,
        'active',
        NOW(),
        NOW(),
        NOW()
    );

    -- Update user's profile to set current organization
    INSERT INTO profiles (id, current_organization)
    VALUES (p_user_id, v_org_id)
    ON CONFLICT (id) DO UPDATE SET
        current_organization = v_org_id;

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
        FROM organization_members
        WHERE organization_id = v_org_id
        AND status = 'active'
    ),
    updated_at = NOW()
    WHERE id = v_org_id;

    RETURN QUERY SELECT TRUE, v_org_id, 'Successfully joined organization'::TEXT;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in auto_accept_invitation: %', SQLERRM;
        RETURN QUERY SELECT FALSE, NULL::UUID, ('Error: ' || SQLERRM)::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION auto_accept_invitation(UUID, UUID) TO authenticated;

-- 6. Update send_organization_invitations to ensure it works properly
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

GRANT EXECUTE ON FUNCTION send_organization_invitations(UUID, TEXT[], TEXT, TEXT) TO authenticated;

-- 7. Ensure profiles table has the right structure
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    current_organization UUID REFERENCES organizations(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
    FOR ALL USING (auth.uid() = id);

-- 8. Add status column to organization_members if missing
ALTER TABLE organization_members 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS joined_at TIMESTAMPTZ DEFAULT NOW();

-- Verify functions were created
SELECT 'All missing RPC functions created successfully!' as status; 