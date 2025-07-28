-- Fix organization invitation creation using RPC function
-- This bypasses RLS issues for both SELECT and INSERT operations

-- Create comprehensive RPC function to create invitations
CREATE OR REPLACE FUNCTION create_organization_invitations(
    org_id UUID, 
    email_list TEXT[], 
    invitation_role TEXT,
    welcome_message TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    organization_id UUID,
    email TEXT,
    role TEXT,
    status TEXT,
    invited_by UUID,
    expires_at TIMESTAMP WITH TIME ZONE,
    token TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    is_existing BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_id UUID;
    email_item TEXT;
    existing_invitation_count INTEGER;
    new_invitation_id UUID;
BEGIN
    -- Get current user
    current_user_id := auth.uid();
    
    -- Check if user is admin of the organization
    IF NOT EXISTS (
        SELECT 1 
        FROM organization_members om 
        WHERE om.organization_id = org_id 
        AND om.user_id = current_user_id 
        AND om.role = 'admin'
        AND om.status = 'active'
    ) THEN
        RAISE EXCEPTION 'Access denied: User is not an admin of this organization';
    END IF;

    -- Process each email
    FOREACH email_item IN ARRAY email_list
    LOOP
        -- Check if invitation already exists
        SELECT COUNT(*) INTO existing_invitation_count
        FROM organization_invitations oi
        WHERE oi.organization_id = org_id 
        AND oi.email = email_item 
        AND oi.status = 'pending';

        IF existing_invitation_count > 0 THEN
            -- Return existing invitation
            RETURN QUERY
            SELECT 
                oi.id,
                oi.organization_id,
                oi.email,
                oi.role,
                oi.status,
                oi.invited_by,
                oi.expires_at,
                oi.token,
                oi.created_at,
                oi.updated_at,
                true as is_existing
            FROM organization_invitations oi
            WHERE oi.organization_id = org_id 
            AND oi.email = email_item 
            AND oi.status = 'pending'
            LIMIT 1;
        ELSE
            -- Create new invitation
            new_invitation_id := gen_random_uuid();
            
            INSERT INTO organization_invitations (
                id,
                organization_id,
                email,
                role,
                invited_by,
                token,
                expires_at,
                status,
                created_at,
                updated_at
            ) VALUES (
                new_invitation_id,
                org_id,
                email_item,
                invitation_role,
                current_user_id,
                gen_random_uuid()::TEXT,
                NOW() + INTERVAL '7 days',
                'pending',
                NOW(),
                NOW()
            );

            -- Return new invitation
            RETURN QUERY
            SELECT 
                oi.id,
                oi.organization_id,
                oi.email,
                oi.role,
                oi.status,
                oi.invited_by,
                oi.expires_at,
                oi.token,
                oi.created_at,
                oi.updated_at,
                false as is_existing
            FROM organization_invitations oi
            WHERE oi.id = new_invitation_id;
        END IF;
    END LOOP;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_organization_invitations(UUID, TEXT[], TEXT, TEXT) TO authenticated;

-- Test the fix
DO $$
BEGIN
    RAISE NOTICE 'Organization invitation creation RPC function created successfully!';
    RAISE NOTICE 'Use create_organization_invitations(org_id, emails, role) to create invitations safely.';
END $$; 