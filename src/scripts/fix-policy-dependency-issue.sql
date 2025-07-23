-- Fix policy dependency issue for organization_invitations status column
-- We need to drop the policy first, change the column type, then recreate the policy

-- 1. Drop the policy that depends on the status column
DROP POLICY IF EXISTS "Anyone can view pending invitations" ON organization_invitations;

-- 2. Now we can safely change the column types
DO $$
BEGIN
    -- Check if role column is varchar(255) and needs to be TEXT
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'organization_invitations' 
        AND column_name = 'role' 
        AND data_type = 'character varying'
    ) THEN
        -- Change role column to TEXT
        ALTER TABLE organization_invitations 
        ALTER COLUMN role TYPE TEXT USING role::TEXT;
        RAISE NOTICE 'Changed role column to TEXT';
    END IF;

    -- Check if email column is varchar(255) and needs to be TEXT
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'organization_invitations' 
        AND column_name = 'email' 
        AND data_type = 'character varying'
    ) THEN
        -- Change email column to TEXT
        ALTER TABLE organization_invitations 
        ALTER COLUMN email TYPE TEXT USING email::TEXT;
        RAISE NOTICE 'Changed email column to TEXT';
    END IF;

    -- Check if status column is varchar(255) and needs to be TEXT
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'organization_invitations' 
        AND column_name = 'status' 
        AND data_type = 'character varying'
    ) THEN
        -- Change status column to TEXT
        ALTER TABLE organization_invitations 
        ALTER COLUMN status TYPE TEXT USING status::TEXT;
        RAISE NOTICE 'Changed status column to TEXT';
    END IF;
END $$;

-- 3. Recreate the policy with the correct column type
CREATE POLICY "Anyone can view pending invitations" ON organization_invitations
    FOR SELECT
    USING (status = 'pending');

-- 4. Also fix organization_members role type if needed
DO $$
BEGIN
    -- Check if role column needs to be TEXT
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'organization_members' 
        AND column_name = 'role' 
        AND data_type = 'character varying'
    ) THEN
        -- Change role column to TEXT
        ALTER TABLE organization_members 
        ALTER COLUMN role TYPE TEXT USING role::TEXT;
        RAISE NOTICE 'Changed organization_members.role column to TEXT';
    END IF;
END $$;

-- 5. Add missing invited_by column to organization_members if it doesn't exist
ALTER TABLE organization_members 
ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES auth.users(id);

-- 6. Make sure the current user is set as admin if they're the sole member
DO $$
DECLARE
    v_org_id UUID;
    v_current_user_id UUID;
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
            -- Check if they're the only member (founder scenario)
            IF (SELECT COUNT(*) FROM organization_members WHERE organization_id = v_org_id) = 1 THEN
                -- Make sure they're an admin since they're the only member
                UPDATE organization_members
                SET role = 'admin'
                WHERE user_id = v_current_user_id
                AND organization_id = v_org_id;
                
                RAISE NOTICE 'Updated sole organization member to admin role';
            END IF;
        END IF;
    END IF;
END $$;

-- 7. Recreate the RPC function with proper types
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

-- 8. Verify the changes
SELECT 
    'Organization Invitations Columns' as table_info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'organization_invitations'
ORDER BY ordinal_position;

SELECT 
    'Organization Members Columns' as table_info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'organization_members'
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

-- Done!
SELECT 'Policy dependency issue fixed!' as status; 