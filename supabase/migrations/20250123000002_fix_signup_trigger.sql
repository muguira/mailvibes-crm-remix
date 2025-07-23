-- Fix signup issue by adding automatic user setup trigger
-- This trigger will create required profile and organization records when users sign up

-- Function to handle new user setup
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
BEGIN
  -- Extract domain from user email
  user_domain := SPLIT_PART(NEW.email, '@', 2);
  
  -- Create user profile first
  INSERT INTO public.profiles (id, created_at, updated_at)
  VALUES (NEW.id, NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;
  
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
    
    -- Add user as admin member
    INSERT INTO public.organization_members (user_id, organization_id, role, status, created_at, updated_at)
    VALUES (NEW.id, org_id, 'admin', 'active', NOW(), NOW())
    ON CONFLICT (user_id, organization_id) DO NOTHING;
  ELSE
    -- Organization exists, add user as member
    INSERT INTO public.organization_members (user_id, organization_id, role, status, created_at, updated_at)
    VALUES (NEW.id, org_id, 'member', 'active', NOW(), NOW())
    ON CONFLICT (user_id, organization_id) DO NOTHING;
    
    -- Update member count
    UPDATE public.organizations 
    SET member_count = member_count + 1, updated_at = NOW()
    WHERE id = org_id;
  END IF;
  
  -- Update user profile with organization
  UPDATE public.profiles 
  SET current_organization = org_id, updated_at = NOW()
  WHERE id = NEW.id;
  
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

-- Ensure required tables exist with proper structure
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    current_organization UUID REFERENCES public.organizations(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on profiles if not already enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'profiles' 
        AND policyname = 'Users can view own profile'
    ) THEN
        CREATE POLICY "Users can view own profile" ON public.profiles
            FOR SELECT USING (auth.uid() = id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'profiles' 
        AND policyname = 'Users can update own profile'
    ) THEN
        CREATE POLICY "Users can update own profile" ON public.profiles
            FOR ALL USING (auth.uid() = id);
    END IF;
END $$;

-- Ensure organizations table exists
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    domain TEXT UNIQUE NOT NULL,
    plan TEXT DEFAULT 'free',
    member_count INTEGER DEFAULT 1,
    max_members INTEGER DEFAULT 25,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure organization_members table exists
CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, organization_id)
);

-- Enable RLS on these tables if not already enabled
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Add comment explaining the fix
COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates profile and organization records when new users sign up to prevent 500 errors during signup'; 