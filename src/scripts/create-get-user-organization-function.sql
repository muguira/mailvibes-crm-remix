-- Create RPC function to safely get user organization data without RLS issues
CREATE OR REPLACE FUNCTION get_user_organization(p_user_id UUID)
RETURNS TABLE(organization_id UUID, role TEXT) 
LANGUAGE plpgsql
SECURITY DEFINER -- This bypasses RLS
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    om.organization_id,
    om.role::TEXT
  FROM organization_members om
  WHERE om.user_id = p_user_id
  LIMIT 1;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_organization(UUID) TO authenticated;

-- Also create a simpler version that just checks if user has an organization
CREATE OR REPLACE FUNCTION has_organization(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_has_org BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 
    FROM organization_members 
    WHERE user_id = p_user_id
  ) INTO v_has_org;
  
  RETURN v_has_org;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION has_organization(UUID) TO authenticated; 