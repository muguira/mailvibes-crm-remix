-- Quick check for user role
SELECT 
    u.email,
    om.role,
    om.created_at,
    o.name as organization
FROM auth.users u
JOIN organization_members om ON u.id = om.user_id
JOIN organizations o ON om.organization_id = o.id
WHERE u.email = 'andres@mailvibes.io'; 