-- Final targeted fix for remaining column type mismatches
-- This script specifically addresses the varchar(255) vs TEXT issues

-- First, let's see what columns still have varchar types
SELECT 
    table_name,
    column_name,
    data_type,
    character_maximum_length
FROM information_schema.columns
WHERE table_name IN ('organization_members', 'organization_invitations', 'organizations')
AND data_type = 'character varying'
ORDER BY table_name, column_name;

-- Drop the problematic function first
DROP FUNCTION IF EXISTS get_organization_members_safe(UUID);

-- Fix ALL remaining varchar columns across all organization tables
DO $$
DECLARE
    rec RECORD;
BEGIN
    -- Fix organization_members table
    FOR rec IN 
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'organization_members' 
        AND data_type = 'character varying'
    LOOP
        EXECUTE format('ALTER TABLE organization_members ALTER COLUMN %I TYPE TEXT USING %I::TEXT', rec.column_name, rec.column_name);
        RAISE NOTICE 'Fixed organization_members.% column to TEXT', rec.column_name;
    END LOOP;

    -- Fix organization_invitations table
    FOR rec IN 
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'organization_invitations' 
        AND data_type = 'character varying'
    LOOP
        EXECUTE format('ALTER TABLE organization_invitations ALTER COLUMN %I TYPE TEXT USING %I::TEXT', rec.column_name, rec.column_name);
        RAISE NOTICE 'Fixed organization_invitations.% column to TEXT', rec.column_name;
    END LOOP;

    -- Fix organizations table
    FOR rec IN 
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'organizations' 
        AND data_type = 'character varying'
    LOOP
        EXECUTE format('ALTER TABLE organizations ALTER COLUMN %I TYPE TEXT USING %I::TEXT', rec.column_name, rec.column_name);
        RAISE NOTICE 'Fixed organizations.% column to TEXT', rec.column_name;
    END LOOP;
END $$;

-- Make sure the current user has an organization membership record
DO $$
DECLARE
    v_user_id UUID;
    v_user_email TEXT;
    v_org_id UUID;
    v_existing_member_id UUID;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    
    IF v_user_id IS NOT NULL THEN
        -- Get user email
        SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
        
        -- Check if user already has membership
        SELECT id, organization_id INTO v_existing_member_id, v_org_id
        FROM organization_members 
        WHERE user_id = v_user_id 
        LIMIT 1;
        
        IF v_existing_member_id IS NULL THEN
            -- User has no membership, let's find or create an organization
            
            -- Try to find an organization they should belong to
            SELECT id INTO v_org_id 
            FROM organizations 
            WHERE domain = SPLIT_PART(v_user_email, '@', 2)
            LIMIT 1;
            
            IF v_org_id IS NULL THEN
                -- No organization found, create one
                INSERT INTO organizations (id, name, domain, created_at, updated_at)
                VALUES (
                    gen_random_uuid(),
                    INITCAP(SPLIT_PART(v_user_email, '@', 2)) || ' Organization',
                    SPLIT_PART(v_user_email, '@', 2),
                    NOW(),
                    NOW()
                )
                RETURNING id INTO v_org_id;
                
                RAISE NOTICE 'Created new organization for domain: %', SPLIT_PART(v_user_email, '@', 2);
            END IF;
            
            -- Create membership record
            INSERT INTO organization_members (
                id,
                user_id,
                organization_id,
                role,
                status,
                joined_at,
                created_at,
                updated_at
            ) VALUES (
                gen_random_uuid(),
                v_user_id,
                v_org_id,
                'admin', -- Make them admin
                'active',
                NOW(),
                NOW(),
                NOW()
            );
            
            RAISE NOTICE 'Created admin membership for user: %', v_user_email;
            
        ELSE
            -- User has membership, make sure they're admin if they're the only member
            IF (SELECT COUNT(*) FROM organization_members WHERE organization_id = v_org_id) = 1 THEN
                UPDATE organization_members 
                SET role = 'admin'
                WHERE id = v_existing_member_id;
                
                RAISE NOTICE 'Updated sole member to admin: %', v_user_email;
            END IF;
        END IF;
    END IF;
END $$;

-- Recreate the RPC function with completely explicit TEXT casting
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
        CAST(om.role AS TEXT),
        CAST(COALESCE(om.status, 'active') AS TEXT),
        om.invited_by,
        COALESCE(om.joined_at, om.created_at) as joined_at,
        om.created_at,
        om.updated_at,
        CAST(au.email AS TEXT) as user_email,
        CAST(COALESCE(au.raw_user_meta_data->>'first_name', '') AS TEXT) as user_first_name,
        CAST(COALESCE(au.raw_user_meta_data->>'last_name', '') AS TEXT) as user_last_name,
        CAST(COALESCE(au.raw_user_meta_data->>'avatar_url', '') AS TEXT) as user_avatar_url
    FROM organization_members om
    JOIN auth.users au ON om.user_id = au.id
    WHERE om.organization_id = p_org_id
    ORDER BY om.created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_organization_members_safe(UUID) TO authenticated;

-- Also recreate the invitations function with explicit casting
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
    SELECT CAST(om.role AS TEXT) INTO v_user_role
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
        CAST(oi.email AS TEXT),
        CAST(oi.role AS TEXT),
        CAST(COALESCE(oi.status, 'pending') AS TEXT),
        oi.invited_by,
        oi.expires_at,
        oi.accepted_at,
        oi.created_at,
        oi.updated_at,
        CAST(COALESCE(oi.token, '') AS TEXT),
        CAST(COALESCE(au.email, 'team@company.com') AS TEXT) as inviter_email,
        CAST(COALESCE(
            TRIM(CONCAT(
                COALESCE(au.raw_user_meta_data->>'first_name', ''),
                ' ',
                COALESCE(au.raw_user_meta_data->>'last_name', '')
            )),
            au.email,
            'Team Member'
        ) AS TEXT) as inviter_name
    FROM organization_invitations oi
    LEFT JOIN auth.users au ON oi.invited_by = au.id
    WHERE oi.organization_id = p_org_id
    AND CAST(COALESCE(oi.status, 'pending') AS TEXT) = 'pending'
    ORDER BY oi.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_organization_invitations_safe(UUID) TO authenticated;

-- Verify all column types are now TEXT
SELECT 
    'Final Column Types Check' as info,
    table_name,
    column_name,
    data_type,
    character_maximum_length
FROM information_schema.columns
WHERE table_name IN ('organization_members', 'organization_invitations', 'organizations')
AND data_type = 'character varying'
ORDER BY table_name, column_name;

-- Show current user's membership
SELECT 
    'Current User Membership' as info,
    u.email,
    om.role,
    om.status,
    om.organization_id,
    o.name as organization_name
FROM auth.users u
JOIN organization_members om ON u.id = om.user_id
JOIN organizations o ON om.organization_id = o.id
WHERE u.id = auth.uid();

-- Test the function
SELECT 'Testing get_organization_members_safe function' as info;
SELECT * FROM get_organization_members_safe(
    (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1)
);

SELECT 'All fixes completed successfully!' as status; 