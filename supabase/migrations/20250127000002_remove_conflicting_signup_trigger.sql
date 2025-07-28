-- Remove conflicting signup trigger that auto-creates organizations
-- This allows frontend-controlled organization creation workflow

-- Drop the trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop the function
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Add comment explaining why we removed it
COMMENT ON SCHEMA public IS 'Removed auto-organization creation trigger to allow frontend-controlled workflow';

-- Ensure profiles table still gets created for new users (keep this simple)
CREATE OR REPLACE FUNCTION public.handle_new_user_profile_only()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create user profile, no organization logic
  INSERT INTO public.profiles (id, created_at, updated_at)
  VALUES (NEW.id, NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail user creation
  RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- Create simple profile-only trigger
CREATE TRIGGER on_auth_user_created_profile_only
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile_only();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user_profile_only() TO service_role;

-- Log the change
DO $$
BEGIN
    RAISE NOTICE 'Removed auto-organization trigger - frontend now controls organization creation';
END $$; 