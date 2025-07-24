-- =============================================
-- COMPREHENSIVE FIXES FOR ALL ISSUES
-- =============================================
-- This script fixes all identified issues:
-- 1. Organization name editing
-- 2. Orphaned invitations cleanup
-- 3. Resend invitation functionality
-- 4. Cancel invitation improvements
-- 5. Improved invitation sending with duplicate handling

-- =============================================
-- 1. FIX ORGANIZATION NAME EDITING
-- =============================================

-- Create improved RLS policy for organization updates
DROP POLICY IF EXISTS "Users can update their own organization" ON organizations;
DROP POLICY IF EXISTS "Admins can update organization details" ON organizations;

CREATE POLICY "Admins can update organization details"
ON organizations
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM organization_members 
        WHERE organization_id = organizations.id 
        AND user_id = auth.uid() 
        AND role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM organization_members 
        WHERE organization_id = organizations.id 
        AND user_id = auth.uid() 
        AND role = 'admin'
    )
);

-- Create RPC function for updating organization name safely
DROP FUNCTION IF EXISTS update_organization_name(UUID, TEXT);

CREATE OR REPLACE FUNCTION update_organization_name(
    p_organization_id UUID,
    p_new_name TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_user_role TEXT;
    v_updated_count INTEGER;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Validate organization name
    IF p_new_name IS NULL OR TRIM(p_new_name) = '' THEN
        RAISE EXCEPTION 'Organization name cannot be empty';
    END IF;
    
    -- Check if user is admin of this organization
    SELECT role INTO v_user_role
    FROM organization_members
    WHERE user_id = v_user_id
    AND organization_id = p_organization_id;
    
    IF v_user_role IS NULL THEN
        RAISE EXCEPTION 'User is not a member of this organization';
    END IF;
    
    IF v_user_role != 'admin' THEN
        RAISE EXCEPTION 'Only administrators can update organization name';
    END IF;
    
    -- Update organization name
    UPDATE organizations
    SET name = TRIM(p_new_name),
        updated_at = NOW()
    WHERE id = p_organization_id;
    
    -- Check if update was successful
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    
    RETURN v_updated_count > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION update_organization_name(UUID, TEXT) TO authenticated;

-- =============================================
-- 2. ORPHANED INVITATIONS CLEANUP
-- =============================================

-- Create function to clean up orphaned invitations
DROP FUNCTION IF EXISTS clean_orphaned_invitations(UUID);

CREATE OR REPLACE FUNCTION clean_orphaned_invitations(p_organization_id UUID)
RETURNS TABLE(
    cleaned_count INTEGER,
    emails_cleaned TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_user_role TEXT;
    v_cleaned_count INTEGER := 0;
    v_emails_cleaned TEXT[] := ARRAY[]::TEXT[];
    v_invitation RECORD;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Check if user is admin of the organization
    SELECT role INTO v_user_role
    FROM organization_members
    WHERE user_id = v_user_id
    AND organization_id = p_organization_id;
    
    IF v_user_role IS NULL THEN
        RAISE EXCEPTION 'User is not a member of this organization';
    END IF;
    
    IF v_user_role != 'admin' THEN
        RAISE EXCEPTION 'Only administrators can clean up invitations';
    END IF;
    
    -- Find and clean orphaned invitations
    FOR v_invitation IN
        SELECT oi.id, oi.email
        FROM organization_invitations oi
        WHERE oi.organization_id = p_organization_id
        AND oi.status = 'pending'
        AND NOT EXISTS (
            SELECT 1 FROM organization_members om
            JOIN auth.users u ON om.user_id = u.id
            WHERE om.organization_id = oi.organization_id
            AND u.email = oi.email
        )
    LOOP
        -- Delete the orphaned invitation
        DELETE FROM organization_invitations 
        WHERE id = v_invitation.id;
        
        v_cleaned_count := v_cleaned_count + 1;
        v_emails_cleaned := array_append(v_emails_cleaned, v_invitation.email);
    END LOOP;
    
    RETURN QUERY SELECT v_cleaned_count, v_emails_cleaned;
END;
$$;

GRANT EXECUTE ON FUNCTION clean_orphaned_invitations(UUID) TO authenticated;

-- =============================================
-- 3. IMPROVED INVITATION SENDING
-- =============================================

-- Create improved send_organization_invitations that handles duplicates
DROP FUNCTION IF EXISTS send_organization_invitations(UUID, TEXT[], TEXT, TEXT);

CREATE OR REPLACE FUNCTION send_organization_invitations(
    p_organization_id UUID,
    p_emails TEXT[],
    p_role TEXT,
    p_message TEXT DEFAULT NULL
)
RETURNS TABLE(
    id UUID,
    organization_id UUID,
    email CHARACTER VARYING,
    role CHARACTER VARYING,
    status CHARACTER VARYING,
    invited_by UUID,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    token CHARACTER VARYING
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_user_role TEXT;
    v_expires_at TIMESTAMPTZ;
    v_email TEXT;
    v_token TEXT;
    v_existing_invitation UUID;
BEGIN
    -- Get current user ID
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Check if user is admin of the organization
    SELECT om.role INTO v_user_role
    FROM organization_members om
    WHERE om.organization_id = p_organization_id
    AND om.user_id = v_user_id;
    
    IF v_user_role IS NULL THEN
        RAISE EXCEPTION 'User is not a member of this organization';
    END IF;
    
    IF v_user_role != 'admin' THEN
        RAISE EXCEPTION 'Only administrators can invite users';
    END IF;
    
    -- Set expiry date (7 days from now)
    v_expires_at := NOW() + INTERVAL '7 days';
    
    -- Process each email individually
    FOR i IN 1..array_length(p_emails, 1) LOOP
        v_email := LOWER(TRIM(p_emails[i]));
        v_token := gen_random_uuid()::TEXT;
        
        -- Check for existing invitation
        SELECT id INTO v_existing_invitation
        FROM organization_invitations
        WHERE organization_id = p_organization_id
        AND email = v_email
        AND status = 'pending';
        
        IF v_existing_invitation IS NOT NULL THEN
            -- Update existing invitation instead of creating duplicate
            UPDATE organization_invitations
            SET expires_at = v_expires_at,
                role = p_role,
                invited_by = v_user_id,
                token = v_token,
                updated_at = NOW()
            WHERE id = v_existing_invitation;
        ELSE
            -- Insert new invitation
            INSERT INTO organization_invitations (
                organization_id,
                email,
                role,
                status,
                invited_by,
                expires_at,
                token,
                created_at,
                updated_at
            ) VALUES (
                p_organization_id,
                v_email,
                p_role,
                'pending',
                v_user_id,
                v_expires_at,
                v_token,
                NOW(),
                NOW()
            );
        END IF;
    END LOOP;
    
    -- Return the created/updated invitations
    RETURN QUERY
    SELECT 
        oi.id,
        oi.organization_id,
        oi.email,
        oi.role,
        oi.status,
        oi.invited_by,
        oi.expires_at,
        oi.created_at,
        oi.token::CHARACTER VARYING
    FROM organization_invitations oi
    WHERE oi.organization_id = p_organization_id
    AND oi.invited_by = v_user_id
    AND oi.email = ANY(p_emails)
    ORDER BY oi.created_at DESC;
    
END;
$$;

GRANT EXECUTE ON FUNCTION send_organization_invitations(UUID, TEXT[], TEXT, TEXT) TO authenticated;

-- =============================================
-- 4. RESEND INVITATION FUNCTION
-- =============================================

-- Create RPC function to safely resend invitations
DROP FUNCTION IF EXISTS resend_organization_invitation(UUID);

CREATE OR REPLACE FUNCTION resend_organization_invitation(
    p_invitation_id UUID
)
RETURNS TABLE(
    success BOOLEAN,
    invitation_id UUID,
    new_expires_at TIMESTAMPTZ,
    message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_invitation RECORD;
    v_user_role TEXT;
    v_new_expires_at TIMESTAMPTZ;
    v_updated_count INTEGER;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Get invitation details
    SELECT * INTO v_invitation
    FROM organization_invitations
    WHERE id = p_invitation_id;
    
    IF v_invitation IS NULL THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TIMESTAMPTZ, 'Invitation not found'::TEXT;
        RETURN;
    END IF;
    
    -- Check if user is admin of the organization
    SELECT role INTO v_user_role
    FROM organization_members
    WHERE user_id = v_user_id
    AND organization_id = v_invitation.organization_id;
    
    IF v_user_role IS NULL THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TIMESTAMPTZ, 'User is not a member of this organization'::TEXT;
        RETURN;
    END IF;
    
    IF v_user_role != 'admin' THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TIMESTAMPTZ, 'Only administrators can resend invitations'::TEXT;
        RETURN;
    END IF;
    
    -- Set new expiry date (7 days from now)
    v_new_expires_at := NOW() + INTERVAL '7 days';
    
    -- Update the invitation
    UPDATE organization_invitations
    SET expires_at = v_new_expires_at,
        updated_at = NOW(),
        status = 'pending'  -- Reset status to pending in case it was expired
    WHERE id = p_invitation_id;
    
    -- Check if update was successful
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    
    IF v_updated_count > 0 THEN
        RETURN QUERY SELECT TRUE, p_invitation_id, v_new_expires_at, 'Invitation resent successfully'::TEXT;
    ELSE
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TIMESTAMPTZ, 'Failed to update invitation'::TEXT;
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION resend_organization_invitation(UUID) TO authenticated;

-- =============================================
-- 5. CANCEL INVITATION FUNCTION
-- =============================================

-- Improved cancel invitation function
DROP FUNCTION IF EXISTS cancel_organization_invitation(UUID);

CREATE OR REPLACE FUNCTION cancel_organization_invitation(
    p_invitation_id UUID
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_invitation RECORD;
    v_user_role TEXT;
    v_deleted_count INTEGER;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Get invitation details
    SELECT * INTO v_invitation
    FROM organization_invitations
    WHERE id = p_invitation_id;
    
    IF v_invitation IS NULL THEN
        RETURN QUERY SELECT FALSE, 'Invitation not found'::TEXT;
        RETURN;
    END IF;
    
    -- Check if user is admin of the organization
    SELECT role INTO v_user_role
    FROM organization_members
    WHERE user_id = v_user_id
    AND organization_id = v_invitation.organization_id;
    
    IF v_user_role IS NULL THEN
        RETURN QUERY SELECT FALSE, 'User is not a member of this organization'::TEXT;
        RETURN;
    END IF;
    
    IF v_user_role != 'admin' THEN
        RETURN QUERY SELECT FALSE, 'Only administrators can cancel invitations'::TEXT;
        RETURN;
    END IF;
    
    -- Delete the invitation
    DELETE FROM organization_invitations
    WHERE id = p_invitation_id;
    
    -- Check if deletion was successful
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    IF v_deleted_count > 0 THEN
        RETURN QUERY SELECT TRUE, 'Invitation canceled successfully'::TEXT;
    ELSE
        RETURN QUERY SELECT FALSE, 'Failed to cancel invitation'::TEXT;
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION cancel_organization_invitation(UUID) TO authenticated;

-- =============================================
-- 6. ADD CHOICE LOGIC TO SIGNUP TRIGGER
-- =============================================

-- Update the signup trigger to support invitation choices
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

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

-- =============================================
-- SUCCESS MESSAGE
-- =============================================
SELECT 'All comprehensive fixes have been applied successfully!' as status; 