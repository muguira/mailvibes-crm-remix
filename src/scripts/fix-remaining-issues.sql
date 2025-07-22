-- Fix remaining issues after RLS fix

-- 1. Fix the joined date for andres@salessheet.io
DO $$
DECLARE
    v_user_id UUID;
    v_org_id UUID;
    v_created_at TIMESTAMPTZ;
BEGIN
    -- Get user ID
    SELECT id, created_at INTO v_user_id, v_created_at
    FROM auth.users 
    WHERE email = 'andres@salessheet.io';
    
    -- Get organization ID
    SELECT id INTO v_org_id
    FROM organizations 
    WHERE domain = 'salessheet.io';
    
    -- Update organization_members with proper created_at
    UPDATE organization_members 
    SET created_at = COALESCE(created_at, v_created_at, '2024-05-02'::TIMESTAMPTZ),
        updated_at = NOW()
    WHERE user_id = v_user_id 
    AND organization_id = v_org_id;
    
    RAISE NOTICE 'Fixed joined date for andres@salessheet.io';
END $$;

-- 2. Add invited_by column to organization_invitations if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organization_invitations' 
        AND column_name = 'invited_by'
    ) THEN
        ALTER TABLE organization_invitations ADD COLUMN invited_by UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- 3. Add status column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organization_invitations' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE organization_invitations ADD COLUMN status TEXT DEFAULT 'pending';
    END IF;
END $$;

-- 4. Add updated_at column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organization_invitations' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE organization_invitations ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- 5. Create a safe RPC function to get invitations without foreign key issues
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
    inviter_email TEXT,
    inviter_name TEXT
) 
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        oi.id,
        oi.organization_id,
        oi.email,
        oi.role::TEXT,
        COALESCE(oi.status, 'pending') as status,
        oi.invited_by,
        oi.expires_at,
        oi.accepted_at,
        oi.created_at,
        COALESCE(oi.updated_at, oi.created_at) as updated_at,
        p.email as inviter_email,
        p.full_name as inviter_name
    FROM organization_invitations oi
    LEFT JOIN profiles p ON oi.invited_by = p.id
    WHERE oi.organization_id = p_org_id
    AND oi.accepted_at IS NULL;
$$;

-- Grant permission
GRANT EXECUTE ON FUNCTION get_organization_invitations_safe(UUID) TO authenticated;

-- 6. Verify the fix
SELECT 
    'Member Info' as info,
    u.email,
    om.created_at as joined_date,
    om.role
FROM organization_members om
JOIN auth.users u ON om.user_id = u.id
WHERE u.email = 'andres@salessheet.io';

-- Show organization_invitations structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'organization_invitations'
ORDER BY ordinal_position; 