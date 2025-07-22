-- Setup test organization members safely
-- This script should be run with service role privileges to bypass RLS

-- First, ensure we have the users in auth.users
-- These would normally be created through the auth flow, but for testing we'll assume they exist

-- Get the MailVibes organization ID
DO $$
DECLARE
    v_org_id UUID;
    v_andres_id UUID;
BEGIN
    -- Get organization
    SELECT id INTO v_org_id 
    FROM organizations 
    WHERE domain = 'mailvibes.io' 
    LIMIT 1;
    
    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'MailVibes organization not found';
    END IF;
    
    -- Get Andres's user ID
    SELECT id INTO v_andres_id 
    FROM auth.users 
    WHERE email = 'andres@mailvibes.io' 
    LIMIT 1;
    
    -- Clear existing test members (except Andres)
    DELETE FROM organization_members 
    WHERE organization_id = v_org_id 
    AND user_id != v_andres_id;
    
    -- Note: In a real application, these users would need to:
    -- 1. Be created in auth.users first
    -- 2. Have profiles created
    -- 3. Then be added to organization_members
    
    -- For now, we'll just ensure Andres is properly set up
    -- Other users should be invited through the invitation flow
    
    RAISE NOTICE 'Organization members cleaned up. Use the invitation system to add new members.';
END $$;

-- Show current state
SELECT 
    'Current Members' as info,
    u.email,
    om.role,
    p.current_organization_id = om.organization_id as org_matches
FROM organization_members om
JOIN auth.users u ON om.user_id = u.id
LEFT JOIN profiles p ON u.id = p.id
WHERE om.organization_id = (
    SELECT id FROM organizations WHERE domain = 'mailvibes.io' LIMIT 1
); 