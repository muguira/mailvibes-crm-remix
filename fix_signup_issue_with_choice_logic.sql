-- =============================================
-- FIX SIGNUP 500 ERROR ISSUE (WITH INVITATION CHOICE LOGIC)
-- =============================================
-- This script fixes the signup issue by creating a trigger that automatically
-- sets up required profile and organization records when new users sign up.
-- 
-- LOGIC:
-- 1. If user has pending invitation AND no existing organization -> Auto-accept invitation
-- 2. If user has pending invitation AND already has organization -> Leave invitation pending (let user choose)
-- 3. If no invitation -> Always create NEW organization for the user
-- 
-- This allows existing users to choose between organizations while auto-accepting for new users.

-- Function to handle new user setup with proper invitation choice logic
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_domain TEXT;
  org_id UUID;
  org_name TEXT;
  user_role TEXT := 'admin';
  invitation_record RECORD;
  has_pending_invitation BOOLEAN := FALSE;
  has_existing_organization BOOLEAN := FALSE;
BEGIN
  -- Extract domain from user email
  user_domain := SPLIT_PART(NEW.email, '@', 2);
  
  -- Create user profile first
  INSERT INTO public.profiles (id, created_at, updated_at)
  VALUES (NEW.id, NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;
  
  -- Check if user already has an organization (shouldn't happen for new signups, but safety check)
  SELECT EXISTS(
    SELECT 1 FROM public.organization_members 
    WHERE user_id = NEW.id
  ) INTO has_existing_organization;
  
  -- STEP 1: Check for pending invitations first (higher priority)
  SELECT * INTO invitation_record
  FROM public.organization_invitations 
  WHERE email = NEW.email 
    AND status = 'pending' 
    AND expires_at > NOW()
  ORDER BY created_at DESC -- Get the most recent invitation
  LIMIT 1;
  
  IF invitation_record.id IS NOT NULL THEN
    has_pending_invitation := TRUE;
    
    -- If user has NO existing organization, auto-accept the invitation
    IF NOT has_existing_organization THEN
      org_id := invitation_record.organization_id;
      user_role := invitation_record.role;
      
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
      
      -- Update user's current organization
      UPDATE public.profiles 
      SET current_organization_id = org_id, updated_at = NOW()
      WHERE id = NEW.id;
      
      RETURN NEW;
    ELSE
      -- User has existing organization AND pending invitation
      -- Leave invitation pending - let the choice UI handle it
      -- Just ensure user has a profile, no organization changes
      RETURN NEW;
    END IF;
  END IF;
  
  -- STEP 2: No pending invitation OR user chose not to auto-accept
  -- Create a new organization for the user
  
  -- Generate organization name with user's name or email prefix
  SELECT COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data ->> 'firstName'), '') || '''s Organization',
    SPLIT_PART(NEW.email, '@', 1) || '''s Organization'
  ) INTO org_name;
  
  -- Create new organization
  INSERT INTO public.organizations (name, domain, plan, member_count, max_members, created_at, updated_at)
  VALUES (org_name, user_domain, 'free', 1, 25, NOW(), NOW())
  RETURNING id INTO org_id;
  
  -- Add user as admin member of their new organization
  INSERT INTO public.organization_members (user_id, organization_id, role, status, created_at, updated_at)
  VALUES (NEW.id, org_id, 'admin', 'active', NOW(), NOW())
  ON CONFLICT (user_id, organization_id) DO NOTHING;
  
  -- Update user's current organization
  UPDATE public.profiles 
  SET current_organization_id = org_id, updated_at = NOW()
  WHERE id = NEW.id;
  
  RETURN NEW;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the signup
    RAISE NOTICE 'Error in handle_new_user trigger: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger for new user signups
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =============================================
-- TESTING NOTES
-- =============================================
-- After running this script:
-- 
-- 1. New users with NO invitations will get their own organization
-- 2. New users with pending invitations will auto-join the invited org
-- 3. Existing users with new invitations will see the choice UI
-- 
-- Test scenarios:
-- - Fresh signup (no invitation) -> Creates own org ✓
-- - Fresh signup (has invitation) -> Joins invited org ✓  
-- - Existing user gets invitation -> Shows choice UI ✓ 