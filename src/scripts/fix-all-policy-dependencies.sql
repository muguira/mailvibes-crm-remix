-- Comprehensive fix for all policy dependencies on organization tables
-- This script drops ALL policies that might depend on columns we need to change

-- 1. Drop ALL policies on organization tables to avoid dependency issues
DROP POLICY IF EXISTS "Anyone can view pending invitations" ON organization_invitations;
DROP POLICY IF EXISTS "Admins can create invitations" ON organization_invitations;
DROP POLICY IF EXISTS "Admins can update invitations" ON organization_invitations;
DROP POLICY IF EXISTS "Admins can delete invitations" ON organization_invitations;
DROP POLICY IF EXISTS "Users can accept their invitations" ON organization_invitations;
DROP POLICY IF EXISTS "Users can view their invitations" ON organization_invitations;
DROP POLICY IF EXISTS "Organization members can view invitations" ON organization_invitations;
DROP POLICY IF EXISTS "Members can view organization invitations" ON organization_invitations;

-- Drop organization_members policies
DROP POLICY IF EXISTS "Users can view their own membership" ON organization_members;
DROP POLICY IF EXISTS "Admins can view all members" ON organization_members;
DROP POLICY IF EXISTS "Admins can manage members" ON organization_members;
DROP POLICY IF EXISTS "Users can view organization members" ON organization_members;
DROP POLICY IF EXISTS "Members can view other members" ON organization_members;
DROP POLICY IF EXISTS "Organization members can view members" ON organization_members;

-- Drop organizations policies  
DROP POLICY IF EXISTS "Users can view their organization" ON organizations;
DROP POLICY IF EXISTS "Admins can update organization" ON organizations;
DROP POLICY IF EXISTS "Members can view organization" ON organizations;

-- 2. Now safely change all column types
DO $$
BEGIN
    -- Fix organization_invitations columns
    -- Role column
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'organization_invitations' 
        AND column_name = 'role' 
        AND data_type = 'character varying'
    ) THEN
        ALTER TABLE organization_invitations 
        ALTER COLUMN role TYPE TEXT USING role::TEXT;
        RAISE NOTICE 'Changed organization_invitations.role column to TEXT';
    END IF;

    -- Email column
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'organization_invitations' 
        AND column_name = 'email' 
        AND data_type = 'character varying'
    ) THEN
        ALTER TABLE organization_invitations 
        ALTER COLUMN email TYPE TEXT USING email::TEXT;
        RAISE NOTICE 'Changed organization_invitations.email column to TEXT';
    END IF;

    -- Status column
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'organization_invitations' 
        AND column_name = 'status' 
        AND data_type = 'character varying'
    ) THEN
        ALTER TABLE organization_invitations 
        ALTER COLUMN status TYPE TEXT USING status::TEXT;
        RAISE NOTICE 'Changed organization_invitations.status column to TEXT';
    END IF;

    -- Fix organization_members columns
    -- Role column
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'organization_members' 
        AND column_name = 'role' 
        AND data_type = 'character varying'
    ) THEN
        ALTER TABLE organization_members 
        ALTER COLUMN role TYPE TEXT USING role::TEXT;
        RAISE NOTICE 'Changed organization_members.role column to TEXT';
    END IF;

    -- Status column if it exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'organization_members' 
        AND column_name = 'status' 
        AND data_type = 'character varying'
    ) THEN
        ALTER TABLE organization_members 
        ALTER COLUMN status TYPE TEXT USING status::TEXT;
        RAISE NOTICE 'Changed organization_members.status column to TEXT';
    END IF;
END $$;

-- 3. Add missing columns
ALTER TABLE organization_members 
ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS joined_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE organization_invitations 
ADD COLUMN IF NOT EXISTS token TEXT DEFAULT gen_random_uuid()::TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 4. Recreate essential policies with proper column types

-- Organization Invitations Policies
CREATE POLICY "Anyone can view pending invitations" ON organization_invitations
    FOR SELECT
    USING (status = 'pending');

CREATE POLICY "Admins can manage invitations" ON organization_invitations
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM organization_members om
            WHERE om.user_id = auth.uid()
            AND om.organization_id = organization_invitations.organization_id
            AND om.role = 'admin'
        )
    );

CREATE POLICY "Users can accept their invitations" ON organization_invitations
    FOR UPDATE
    USING (
        email = (SELECT email FROM auth.users WHERE id = auth.uid())
        AND status = 'pending'
    );

-- Organization Members Policies
CREATE POLICY "Members can view organization members" ON organization_members
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM organization_members om
            WHERE om.user_id = auth.uid()
            AND om.organization_id = organization_members.organization_id
        )
    );

CREATE POLICY "Admins can manage members" ON organization_members
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM organization_members om
            WHERE om.user_id = auth.uid()
            AND om.organization_id = organization_members.organization_id
            AND om.role = 'admin'
        )
    );

-- Organizations Policies
CREATE POLICY "Members can view their organization" ON organizations
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM organization_members om
            WHERE om.user_id = auth.uid()
            AND om.organization_id = organizations.id
        )
    );

CREATE POLICY "Admins can update organization" ON organizations
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM organization_members om
            WHERE om.user_id = auth.uid()
            AND om.organization_id = organizations.id
            AND om.role = 'admin'
        )
    );

-- 5. Make sure the current user is set as admin if they're the sole member
DO $$
DECLARE
    v_org_id UUID;
    v_current_user_id UUID;
    v_member_count INTEGER;
BEGIN
    -- Get the current authenticated user's ID
    v_current_user_id := auth.uid();
    
    IF v_current_user_id IS NOT NULL THEN
        -- Get their organization
        SELECT organization_id INTO v_org_id
        FROM organization_members
        WHERE user_id = v_current_user_id
        LIMIT 1;
        
        IF v_org_id IS NOT NULL THEN
            -- Check member count
            SELECT COUNT(*) INTO v_member_count
            FROM organization_members 
            WHERE organization_id = v_org_id;
            
            -- If they're the only member or if there are no admins, make them admin
            IF v_member_count = 1 OR NOT EXISTS (
                SELECT 1 FROM organization_members 
                WHERE organization_id = v_org_id 
                AND role = 'admin'
            ) THEN
                UPDATE organization_members
                SET role = 'admin'
                WHERE user_id = v_current_user_id
                AND organization_id = v_org_id;
                
                RAISE NOTICE 'Updated user to admin role (member count: %)', v_member_count;
            END IF;
        END IF;
    END IF;
END $$;

-- 6. Recreate all RPC functions with proper types
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
        COALESCE(om.joined_at, om.created_at) as joined_at,
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
    SELECT om.role::TEXT INTO v_user_role
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
        oi.email::TEXT,
        oi.role::TEXT,
        COALESCE(oi.status, 'pending')::TEXT,
        oi.invited_by,
        oi.expires_at,
        oi.accepted_at,
        oi.created_at,
        oi.updated_at,
        oi.token::TEXT,
        COALESCE(au.email, 'team@company.com')::TEXT as inviter_email,
        COALESCE(
            TRIM(CONCAT(
                COALESCE(au.raw_user_meta_data->>'first_name', ''),
                ' ',
                COALESCE(au.raw_user_meta_data->>'last_name', '')
            )),
            au.email,
            'Team Member'
        )::TEXT as inviter_name
    FROM organization_invitations oi
    LEFT JOIN auth.users au ON oi.invited_by = au.id
    WHERE oi.organization_id = p_org_id
    AND COALESCE(oi.status, 'pending') = 'pending'
    ORDER BY oi.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_organization_invitations_safe(UUID) TO authenticated;

-- 7. Verify the changes
SELECT 
    'Organization Members Columns' as table_info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'organization_members'
ORDER BY ordinal_position;

SELECT 
    'Organization Invitations Columns' as table_info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'organization_invitations'
ORDER BY ordinal_position;

-- Show current user's organization membership
SELECT 
    u.email,
    om.role,
    om.organization_id,
    o.name as organization_name
FROM auth.users u
JOIN organization_members om ON u.id = om.user_id
JOIN organizations o ON om.organization_id = o.id
WHERE u.id = auth.uid();

-- List all policies to verify they were recreated
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('organization_members', 'organization_invitations', 'organizations')
ORDER BY tablename, policyname;

-- Done!
SELECT 'All policy dependencies fixed and tables updated!' as status; 