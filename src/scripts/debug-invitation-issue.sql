-- Debug invitation issue

-- 1. Check your user ID and organization
SELECT 
    'Current User Info' as info,
    u.id as user_id,
    u.email,
    om.role,
    om.organization_id
FROM auth.users u
JOIN organization_members om ON u.id = om.user_id
WHERE u.email = 'andres@salessheet.io';

-- 2. Test the RPC function manually (this should work if you're authenticated in the app)
-- Note: This will only work when called from the app, not from SQL editor

-- 3. Check if there are any other RLS policies blocking
SELECT 
    tablename,
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'organization_invitations'
ORDER BY policyname;

-- 4. Show organization_invitations table structure
\d organization_invitations; 