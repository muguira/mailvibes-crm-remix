-- Working setup for SalesSheet.ai organization and andres@salessheet.io
-- This version only uses columns that actually exist in the database

-- Step 1: Create the SalesSheet.ai organization
INSERT INTO organizations (name, domain)
VALUES ('SalesSheet.ai', 'salessheet.io')
ON CONFLICT (domain) DO UPDATE SET
  name = EXCLUDED.name,
  updated_at = NOW();

-- Step 2: Add andres@salessheet.io as admin member
DO $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
BEGIN
  -- Get the user ID for andres@salessheet.io
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'andres@salessheet.io' LIMIT 1;
  
  -- Get the organization ID for SalesSheet.ai
  SELECT id INTO v_org_id FROM organizations WHERE domain = 'salessheet.io' LIMIT 1;
  
  IF v_user_id IS NOT NULL AND v_org_id IS NOT NULL THEN
    -- Add as organization member (only use columns that exist)
    INSERT INTO organization_members (
      user_id,
      organization_id,
      role
    )
    VALUES (
      v_user_id,
      v_org_id,
      'admin'
    ) ON CONFLICT (user_id, organization_id) DO UPDATE SET
      role = EXCLUDED.role;

    -- Update user's profile to set current organization
    INSERT INTO profiles (id, current_organization)
    VALUES (v_user_id, v_org_id)
    ON CONFLICT (id) DO UPDATE SET
      current_organization = EXCLUDED.current_organization;
    
    RAISE NOTICE 'Successfully set up SalesSheet.ai organization for andres@salessheet.io';
    RAISE NOTICE 'User ID: %', v_user_id;
    RAISE NOTICE 'Organization ID: %', v_org_id;
  ELSE
    IF v_user_id IS NULL THEN
      RAISE NOTICE 'ERROR: User andres@salessheet.io not found. Please make sure you have signed up with this email.';
    END IF;
    IF v_org_id IS NULL THEN
      RAISE NOTICE 'ERROR: Failed to create SalesSheet.ai organization';
    END IF;
  END IF;
END $$;

-- Step 3: Verify the setup
SELECT 
  'Setup Status' as info,
  u.email,
  o.name as organization,
  o.domain,
  om.role,
  CASE 
    WHEN p.current_organization IS NOT NULL THEN 'Profile Updated'
    ELSE 'Profile Not Updated'
  END as profile_status
FROM auth.users u
LEFT JOIN organization_members om ON u.id = om.user_id
LEFT JOIN organizations o ON om.organization_id = o.id
LEFT JOIN profiles p ON u.id = p.id
WHERE u.email = 'andres@salessheet.io';

-- Step 4: List all columns in organization_members table (for debugging)
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'organization_members'
ORDER BY ordinal_position; 