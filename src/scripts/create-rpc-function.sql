-- Create RPC function to check user organization without RLS issues
CREATE OR REPLACE FUNCTION check_user_organization(p_user_id UUID)
RETURNS TABLE(has_organization BOOLEAN, organization_id UUID, current_organization UUID) 
LANGUAGE plpgsql
SECURITY DEFINER -- This bypasses RLS
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN om.organization_id IS NOT NULL OR p.current_organization IS NOT NULL THEN true
      ELSE false
    END as has_organization,
    om.organization_id,
    p.current_organization
  FROM auth.users u
  LEFT JOIN profiles p ON u.id = p.id
  LEFT JOIN organization_members om ON u.id = om.user_id
  WHERE u.id = p_user_id
  LIMIT 1;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_user_organization(UUID) TO authenticated; 