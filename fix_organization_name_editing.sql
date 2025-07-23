-- =============================================
-- FIX ORGANIZATION NAME EDITING ISSUE
-- =============================================

-- 1. Check current organizations table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'organizations'
ORDER BY ordinal_position;

-- 2. Check RLS policies on organizations table
SELECT pol.polname, pol.polcmd, pol.polpermissive, pol.polroles, pol.polqual, pol.polwithcheck
FROM pg_policy pol
JOIN pg_class cls ON pol.polrelid = cls.oid
WHERE cls.relname = 'organizations';

-- 3. Check if user has proper admin role
-- Test query to see what role current user has
CREATE OR REPLACE FUNCTION debug_user_org_role()
RETURNS TABLE(
    user_id UUID,
    user_email TEXT,
    organization_id UUID,
    organization_name TEXT,
    user_role TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        auth.uid() as user_id,
        (SELECT email FROM auth.users WHERE id = auth.uid()) as user_email,
        om.organization_id,
        o.name as organization_name,
        om.role as user_role
    FROM organization_members om
    JOIN organizations o ON om.organization_id = o.id
    WHERE om.user_id = auth.uid();
END;
$$;

-- 4. Create improved RLS policy for organization updates
DROP POLICY IF EXISTS "Users can update their own organization" ON organizations;

CREATE POLICY "Admins can update organization details"
ON organizations
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM organization_members 
        WHERE organization_id = organizations.id 
        AND user_id = auth.uid() 
        AND role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM organization_members 
        WHERE organization_id = organizations.id 
        AND user_id = auth.uid() 
        AND role = 'admin'
    )
);

-- 5. Create RPC function for updating organization name safely
DROP FUNCTION IF EXISTS update_organization_name(UUID, TEXT);

CREATE OR REPLACE FUNCTION update_organization_name(
    p_organization_id UUID,
    p_new_name TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_user_role TEXT;
    v_updated_count INTEGER;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Validate organization name
    IF p_new_name IS NULL OR TRIM(p_new_name) = '' THEN
        RAISE EXCEPTION 'Organization name cannot be empty';
    END IF;
    
    -- Check if user is admin of this organization
    SELECT role INTO v_user_role
    FROM organization_members
    WHERE user_id = v_user_id
    AND organization_id = p_organization_id;
    
    IF v_user_role IS NULL THEN
        RAISE EXCEPTION 'User is not a member of this organization';
    END IF;
    
    IF v_user_role != 'admin' THEN
        RAISE EXCEPTION 'Only administrators can update organization name';
    END IF;
    
    -- Update organization name
    UPDATE organizations
    SET name = TRIM(p_new_name),
        updated_at = NOW()
    WHERE id = p_organization_id;
    
    -- Check if update was successful
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    
    RETURN v_updated_count > 0;
END;
$$;

-- Grant permission
GRANT EXECUTE ON FUNCTION update_organization_name(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION debug_user_org_role() TO authenticated;

-- Test the function
SELECT 'Organization name editing functions created successfully!' as status; 