-- Setup test data for SalesSheet.ai organization and andres@salessheet.io
-- Run this in your Supabase SQL editor

-- First, add missing columns to organizations table if they don't exist
DO $$ 
BEGIN
  -- Add plan column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organizations' AND column_name = 'plan'
  ) THEN
    ALTER TABLE organizations ADD COLUMN plan VARCHAR(20) DEFAULT 'free';
  END IF;
  
  -- Add member_count column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organizations' AND column_name = 'member_count'
  ) THEN
    ALTER TABLE organizations ADD COLUMN member_count INTEGER DEFAULT 0;
  END IF;
  
  -- Add max_members column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organizations' AND column_name = 'max_members'
  ) THEN
    ALTER TABLE organizations ADD COLUMN max_members INTEGER DEFAULT 25;
  END IF;
END $$;

-- Create or update the SalesSheet.ai organization using gen_random_uuid()
DO $$
DECLARE
  org_id UUID;
BEGIN
  -- Generate a random UUID for the organization
  org_id := gen_random_uuid();
  
  -- Insert the organization
  INSERT INTO organizations (id, name, domain, plan, member_count, max_members, created_at, updated_at)
  VALUES (
    org_id,
    'SalesSheet.ai',
    'salessheet.io',
    'pro',
    1,
    100,
    NOW(),
    NOW()
  ) ON CONFLICT (domain) DO UPDATE SET
    name = EXCLUDED.name,
    plan = EXCLUDED.plan,
    max_members = EXCLUDED.max_members,
    updated_at = NOW()
  RETURNING id INTO org_id;
  
  -- If there was a conflict, get the existing organization ID
  IF org_id IS NULL THEN
    SELECT id INTO org_id FROM organizations WHERE domain = 'salessheet.io';
  END IF;
  
  RAISE NOTICE 'Organization ID: %', org_id;
END $$;

-- Add andres@salessheet.io as admin member if not already exists
DO $$
DECLARE
  user_uuid UUID;
  org_uuid UUID;
BEGIN
  -- Get the user ID for andres@salessheet.io
  SELECT id INTO user_uuid FROM auth.users WHERE email = 'andres@salessheet.io' LIMIT 1;
  
  -- Get the organization ID for SalesSheet.ai
  SELECT id INTO org_uuid FROM organizations WHERE domain = 'salessheet.io' LIMIT 1;
  
  IF user_uuid IS NOT NULL AND org_uuid IS NOT NULL THEN
    -- Add as organization member if not already exists
    INSERT INTO organization_members (
      id,
      user_id,
      organization_id,
      role,
      joined_at,
      created_at,
      updated_at
    )
    VALUES (
      gen_random_uuid(),
      user_uuid,
      org_uuid,
      'admin',
      NOW(),
      NOW(),
      NOW()
    ) ON CONFLICT (user_id, organization_id) DO UPDATE SET
      role = EXCLUDED.role,
      updated_at = NOW();

    -- Update the user's profile to set current organization
    UPDATE profiles 
    SET current_organization = org_uuid
    WHERE id = user_uuid;
    
    RAISE NOTICE 'Successfully set up SalesSheet.ai organization for andres@salessheet.io';
  ELSE
    IF user_uuid IS NULL THEN
      RAISE NOTICE 'User andres@salessheet.io not found in auth.users table';
    END IF;
    IF org_uuid IS NULL THEN
      RAISE NOTICE 'SalesSheet.ai organization not found';
    END IF;
  END IF;
END $$;

-- Update organization member count
UPDATE organizations 
SET member_count = (
  SELECT COUNT(*) 
  FROM organization_members 
  WHERE organization_id = organizations.id
)
WHERE domain = 'salessheet.io';

-- Verify the setup
SELECT 
  'Setup Verification' as status,
  u.email,
  o.name as organization_name,
  o.domain,
  o.plan,
  o.member_count,
  o.max_members,
  om.role,
  p.current_organization IS NOT NULL as has_current_org
FROM auth.users u
JOIN organization_members om ON u.id = om.user_id
JOIN organizations o ON om.organization_id = o.id
LEFT JOIN profiles p ON u.id = p.id
WHERE u.email = 'andres@salessheet.io'

UNION ALL

SELECT 
  'Available Organizations' as status,
  '' as email,
  name as organization_name,
  domain,
  plan,
  member_count,
  max_members,
  '' as role,
  false as has_current_org
FROM organizations; 