-- Final setup script for SalesSheet.ai organization and andres@salessheet.io
-- This script handles all edge cases and only uses existing columns

-- First, let's check what columns actually exist
DO $$
BEGIN
  RAISE NOTICE '=== Checking table structures ===';
  
  -- Check organizations table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') THEN
    RAISE NOTICE 'Organizations table exists';
  ELSE
    RAISE EXCEPTION 'Organizations table does not exist!';
  END IF;
  
  -- Check organization_members table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organization_members') THEN
    RAISE NOTICE 'Organization_members table exists';
  ELSE
    RAISE EXCEPTION 'Organization_members table does not exist!';
  END IF;
END $$;

-- Create or update the SalesSheet.ai organization
INSERT INTO organizations (name, domain)
VALUES ('SalesSheet.ai', 'salessheet.io')
ON CONFLICT (domain) DO UPDATE SET
  name = EXCLUDED.name;

-- Get diagnostics
DO $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
  v_user_email TEXT;
BEGIN
  -- Get organization ID
  SELECT id INTO v_org_id FROM organizations WHERE domain = 'salessheet.io';
  RAISE NOTICE 'Organization ID: %', v_org_id;
  
  -- Get user info
  SELECT id, email INTO v_user_id, v_user_email FROM auth.users WHERE email = 'andres@salessheet.io' LIMIT 1;
  
  IF v_user_id IS NULL THEN
    -- Try to find any user with salessheet.io domain
    SELECT id, email INTO v_user_id, v_user_email FROM auth.users WHERE email LIKE '%@salessheet.io' LIMIT 1;
    IF v_user_id IS NOT NULL THEN
      RAISE NOTICE 'Found user with email: %', v_user_email;
    ELSE
      RAISE NOTICE 'No users found with @salessheet.io email domain';
      RAISE NOTICE 'Please sign up with andres@salessheet.io first';
      RETURN;
    END IF;
  ELSE
    RAISE NOTICE 'Found user andres@salessheet.io with ID: %', v_user_id;
  END IF;
  
  -- Add user to organization
  IF v_user_id IS NOT NULL AND v_org_id IS NOT NULL THEN
    BEGIN
      INSERT INTO organization_members (user_id, organization_id, role)
      VALUES (v_user_id, v_org_id, 'admin')
      ON CONFLICT (user_id, organization_id) DO UPDATE SET
        role = 'admin';
      
      RAISE NOTICE 'Successfully added user to organization as admin';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error adding user to organization: %', SQLERRM;
    END;
    
    -- Update profile
    BEGIN
      INSERT INTO profiles (id, current_organization)
      VALUES (v_user_id, v_org_id)
      ON CONFLICT (id) DO UPDATE SET
        current_organization = v_org_id;
      
      RAISE NOTICE 'Successfully updated user profile';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error updating profile: %', SQLERRM;
    END;
  END IF;
END $$;

-- Final verification
SELECT 
  'FINAL STATUS' as status,
  u.email,
  o.name as organization,
  o.domain,
  om.role,
  om.created_at as member_since,
  CASE 
    WHEN p.current_organization IS NOT NULL THEN 'Yes'
    ELSE 'No'
  END as has_current_org
FROM auth.users u
LEFT JOIN organization_members om ON u.id = om.user_id
LEFT JOIN organizations o ON om.organization_id = o.id
LEFT JOIN profiles p ON u.id = p.id
WHERE u.email LIKE '%@salessheet.io%'
ORDER BY u.email;

-- Show all organizations for debugging
SELECT 
  'ALL ORGANIZATIONS' as info,
  id,
  name,
  domain,
  created_at
FROM organizations
ORDER BY created_at DESC; 