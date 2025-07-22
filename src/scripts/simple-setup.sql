-- Simple setup for MailVibes organization and andres@mailvibes.io
-- This version works with the existing table structure

-- Create the MailVibes organization (using only existing columns)
INSERT INTO organizations (id, name, domain, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'MailVibes',
  'mailvibes.io',
  NOW(),
  NOW()
) ON CONFLICT (domain) DO UPDATE SET
  name = EXCLUDED.name,
  updated_at = NOW();

-- Add andres@mailvibes.io as admin member
DO $$
DECLARE
  user_uuid UUID;
  org_uuid UUID;
BEGIN
  -- Get the user ID for andres@mailvibes.io
  SELECT id INTO user_uuid FROM auth.users WHERE email = 'andres@mailvibes.io' LIMIT 1;
  
  -- Get the organization ID for MailVibes
  SELECT id INTO org_uuid FROM organizations WHERE domain = 'mailvibes.io' LIMIT 1;
  
  IF user_uuid IS NOT NULL AND org_uuid IS NOT NULL THEN
    -- Add as organization member
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

    -- Update user's profile
    INSERT INTO profiles (id, current_organization, created_at, updated_at)
    VALUES (user_uuid, org_uuid, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET
      current_organization = EXCLUDED.current_organization,
      updated_at = NOW();
    
    RAISE NOTICE 'Successfully set up MailVibes organization for andres@mailvibes.io';
  ELSE
    IF user_uuid IS NULL THEN
      RAISE NOTICE 'User andres@mailvibes.io not found. Make sure you have signed up with this email.';
    END IF;
    IF org_uuid IS NULL THEN
      RAISE NOTICE 'Failed to create MailVibes organization';
    END IF;
  END IF;
END $$;

-- Verify the setup
SELECT 
  u.email,
  o.name as organization_name,
  o.domain,
  om.role,
  'SUCCESS' as status
FROM auth.users u
JOIN organization_members om ON u.id = om.user_id
JOIN organizations o ON om.organization_id = o.id
WHERE u.email = 'andres@mailvibes.io'; 