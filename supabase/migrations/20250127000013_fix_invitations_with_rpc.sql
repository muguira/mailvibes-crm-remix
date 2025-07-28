-- Fix organization invitations access using RPC function
-- This bypasses RLS issues by using SECURITY DEFINER functions

-- Create RPC function to get organization invitations for admins
CREATE OR REPLACE FUNCTION get_organization_invitations(org_id UUID)
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
    updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if user is admin of the organization
    IF NOT EXISTS (
        SELECT 1 
        FROM organization_members om 
        WHERE om.organization_id = org_id 
        AND om.user_id = auth.uid() 
        AND om.role = 'admin'
        AND om.status = 'active'
    ) THEN
        RAISE EXCEPTION 'Access denied: User is not an admin of this organization';
    END IF;

    -- Return invitations for this organization
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
        oi.updated_at
    FROM organization_invitations oi
    WHERE oi.organization_id = org_id
    AND oi.status = 'pending'
    ORDER BY oi.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_organization_invitations(UUID) TO authenticated;

-- Also create a function to get specific invitations (for email sending)
CREATE OR REPLACE FUNCTION get_invitations_by_emails(org_id UUID, email_list TEXT[])
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
    updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if user is admin of the organization
    IF NOT EXISTS (
        SELECT 1 
        FROM organization_members om 
        WHERE om.organization_id = org_id 
        AND om.user_id = auth.uid() 
        AND om.role = 'admin'
        AND om.status = 'active'
    ) THEN
        RAISE EXCEPTION 'Access denied: User is not an admin of this organization';
    END IF;

    -- Return specific invitations
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
        oi.updated_at
    FROM organization_invitations oi
    WHERE oi.organization_id = org_id
    AND oi.email = ANY(email_list)
    AND oi.status = 'pending'
    ORDER BY oi.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_invitations_by_emails(UUID, TEXT[]) TO authenticated;

-- Test the fix
DO $$
BEGIN
    RAISE NOTICE 'Organization invitations RPC functions created successfully!';
    RAISE NOTICE 'Use get_organization_invitations(org_id) to read invitations safely.';
END $$; 