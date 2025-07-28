-- Create RPC function to get user information including email
-- This helps get complete user data for organization members

CREATE OR REPLACE FUNCTION get_user_info(user_ids UUID[])
RETURNS TABLE (
    id UUID,
    email TEXT,
    first_name TEXT,
    last_name TEXT,
    avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        au.id,
        au.email,
        COALESCE(p.first_name, split_part(split_part(au.email, '@', 1), '.', 1)) as first_name,
        COALESCE(p.last_name, split_part(split_part(au.email, '@', 1), '.', 2)) as last_name,
        p.avatar_url
    FROM auth.users au
    LEFT JOIN profiles p ON au.id = p.id
    WHERE au.id = ANY(user_ids);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_info(UUID[]) TO authenticated;

-- Create a simpler function for single user
CREATE OR REPLACE FUNCTION get_single_user_info(user_id UUID)
RETURNS TABLE (
    id UUID,
    email TEXT,
    first_name TEXT,
    last_name TEXT,
    avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM get_user_info(ARRAY[user_id]);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_single_user_info(UUID) TO authenticated;

-- Test the functions
DO $$
BEGIN
    RAISE NOTICE 'User info RPC functions created successfully!';
    RAISE NOTICE 'You can now get complete user data including emails from auth.users.';
END $$; 