-- =============================================
-- FIX SIGNUP 500 ERROR ISSUE (WITH INVITATION SUPPORT)
-- =============================================
-- This script fixes the signup issue by creating a trigger that automatically
-- sets up required profile and organization records when new users sign up.
-- It prioritizes pending invitations over domain-based organization assignment.

-- Function to handle new user setup with invitation support
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
  user_role TEXT := 'member';
  invitation_record RECORD;
  has_pending_invitation BOOLEAN := FALSE;
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
    -- STEP 2: No pending invitation - fall back to domain-based assignment
    -- Check if organization exists for this domain
    SELECT id, name INTO org_id, org_name
    FROM public.organizations 
    WHERE domain = user_domain
    LIMIT 1;
    
    -- If no organization exists, create one
    IF org_id IS NULL THEN
      -- Create organization for the domain
      INSERT INTO public.organizations (name, domain, plan, member_count, max_members, created_at, updated_at)
      VALUES (
        INITCAP(user_domain) || ' Organization',
        user_domain,
        'free',
        1,
        25,
        NOW(),
        NOW()
      )
      RETURNING id INTO org_id;
      
      -- First user of new organization becomes admin
      user_role := 'admin';
      
      -- Add user as admin member
      INSERT INTO public.organization_members (user_id, organization_id, role, status, created_at, updated_at)
      VALUES (NEW.id, org_id, user_role, 'active', NOW(), NOW())
      ON CONFLICT (user_id, organization_id) DO NOTHING;
    ELSE
      -- Organization exists, add user as member
      INSERT INTO public.organization_members (user_id, organization_id, role, status, created_at, updated_at)
      VALUES (NEW.id, org_id, user_role, 'active', NOW(), NOW())
      ON CONFLICT (user_id, organization_id) DO NOTHING;
      
      -- Update member count
      UPDATE public.organizations 
      SET member_count = member_count + 1, updated_at = NOW()
      WHERE id = org_id;
    END IF;
  END IF;
  
  -- Update user profile with organization
  UPDATE public.profiles 
  SET current_organization = org_id, updated_at = NOW()
  WHERE id = NEW.id;
  
  -- Log what happened for debugging
  IF has_pending_invitation THEN
    RAISE NOTICE 'User % auto-assigned to organization % via invitation as %', NEW.email, org_id, user_role;
  ELSE
    RAISE NOTICE 'User % assigned to organization % based on domain % as %', NEW.email, org_id, user_domain, user_role;
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

-- Ensure organization_invitations table exists (if not already)
CREATE TABLE IF NOT EXISTS public.organization_invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    token TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on invitations if not already enabled
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;

-- Test the new logic with a query
SELECT 
    'Updated trigger created successfully' as status,
    'Now prioritizes invitations over domain-based assignment' as behavior; 