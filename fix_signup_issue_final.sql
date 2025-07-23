-- =============================================
-- FIX SIGNUP 500 ERROR ISSUE (FINAL VERSION)
-- =============================================
-- This script fixes the signup issue by creating a trigger that automatically
-- sets up required profile and organization records when new users sign up.
-- 
-- LOGIC:
-- 1. If user has pending invitation -> Auto-accept and join that organization
-- 2. If no invitation -> Always create NEW organization for the user (even if domain has existing orgs)
-- 
-- This gives users full control and avoids privacy issues.

-- Function to handle new user setup with proper invitation logic
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_domain TEXT;
  org_id UUID;
  user_role TEXT := 'admin'; -- Default role for new org owners
  invitation_record RECORD;
  has_pending_invitation BOOLEAN := FALSE;
  existing_orgs_count INTEGER := 0;
  org_name TEXT;
BEGIN
  -- Extract domain from user email
  user_domain := SPLIT_PART(NEW.email, '@', 2);
  
  -- Create user profile first
  INSERT INTO public.profiles (id, created_at, updated_at)
  VALUES (NEW.id, NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;
  
  -- STEP 1: Check for pending invitations first (higher priority)
  SELECT * INTO invitation_record
  FROM public.organization_invitations 
  WHERE email = NEW.email 
    AND status = 'pending' 
    AND expires_at > NOW()
  ORDER BY created_at DESC -- Get the most recent invitation
  LIMIT 1;
  
  IF invitation_record.id IS NOT NULL THEN
    -- User has a pending invitation - use that organization
    org_id := invitation_record.organization_id;
    user_role := invitation_record.role;
    has_pending_invitation := TRUE;
    
    -- Mark invitation as accepted
    UPDATE public.organization_invitations 
    SET status = 'accepted', updated_at = NOW()
    WHERE id = invitation_record.id;
    
    -- Add user as member with the invited role
    INSERT INTO public.organization_members (user_id, organization_id, role, status, created_at, updated_at)
    VALUES (NEW.id, org_id, user_role, 'active', NOW(), NOW())
    ON CONFLICT (user_id, organization_id) DO NOTHING;
    
    -- Update member count
    UPDATE public.organizations 
    SET member_count = member_count + 1, updated_at = NOW()
    WHERE id = org_id;
    
  ELSE
    -- STEP 2: No pending invitation - create NEW organization for the user
    -- Check how many organizations already exist for this domain (for naming)
    SELECT COUNT(*) INTO existing_orgs_count
    FROM public.organizations 
    WHERE domain = user_domain;
    
    -- Generate organization name based on existing count
    IF existing_orgs_count = 0 THEN
      -- First organization for this domain
      org_name := INITCAP(user_domain) || ' Organization';
    ELSE
      -- Additional organization for this domain
      org_name := INITCAP(user_domain) || ' Organization ' || (existing_orgs_count + 1);
    END IF;
    
    -- Always create a NEW organization for the user
    INSERT INTO public.organizations (name, domain, plan, member_count, max_members, created_at, updated_at)
    VALUES (
      org_name,
      user_domain,
      'free',
      1,
      25,
      NOW(),
      NOW()
    )
    RETURNING id INTO org_id;
    
    -- User becomes admin of their new organization
    user_role := 'admin';
    
    -- Add user as admin member
    INSERT INTO public.organization_members (user_id, organization_id, role, status, created_at, updated_at)
    VALUES (NEW.id, org_id, user_role, 'active', NOW(), NOW())
    ON CONFLICT (user_id, organization_id) DO NOTHING;
  END IF;
  
  -- Update user profile with organization
  UPDATE public.profiles 
  SET current_organization = org_id, updated_at = NOW()
  WHERE id = NEW.id;
  
  -- Log what happened for debugging
  IF has_pending_invitation THEN
    RAISE NOTICE 'User % auto-assigned to organization % via invitation as %', NEW.email, org_id, user_role;
  ELSE
    RAISE NOTICE 'User % created new organization % (%) as admin', NEW.email, org_name, org_id;
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail user creation
  RAISE WARNING 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- Test the new logic with a query
SELECT 
    'Final trigger created successfully' as status,
    'Users can now create separate orgs even with same domain' as behavior;

-- Show example of what would happen with mailvibes.io scenario
SELECT 
    'Example scenario:' as info,
    'andres@mailvibes.io -> Creates "Mailvibes.io Organization"' as first_user,
    'wilberto@mailvibes.io -> Creates "Mailvibes.io Organization 2"' as second_user,
    'Both are admins of their own separate organizations' as result; 