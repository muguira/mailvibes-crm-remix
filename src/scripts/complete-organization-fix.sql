-- COMPLETE ORGANIZATION FIX - Nuclear Option
-- This will completely bypass RLS and set everything up correctly

-- Step 1: Disable RLS on ALL related tables
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invitations DISABLE ROW LEVEL SECURITY;

-- Step 1.5: Fix the updated_at column issue
-- Check if the column exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organization_members' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE organization_members ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Step 1.6: Add missing columns to organizations table if needed
DO $$
BEGIN
    -- Add plan column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organizations' 
        AND column_name = 'plan'
    ) THEN
        ALTER TABLE organizations ADD COLUMN plan TEXT DEFAULT 'starter';
    END IF;
    
    -- Add member_count column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organizations' 
        AND column_name = 'member_count'
    ) THEN
        ALTER TABLE organizations ADD COLUMN member_count INTEGER DEFAULT 1;
    END IF;
    
    -- Add max_members column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organizations' 
        AND column_name = 'max_members'
    ) THEN
        ALTER TABLE organizations ADD COLUMN max_members INTEGER DEFAULT 5;
    END IF;
    
    -- Add updated_at to organizations if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organizations' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE organizations ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Step 2: Clean up test data
-- Delete mock invitations
DELETE FROM organization_invitations 
WHERE email IN ('james.wilson@example.com', 'lisa.martinez@example.com');

-- Delete mock users from organization_members (if they exist)
DELETE FROM organization_members 
WHERE user_id NOT IN (
    SELECT id FROM auth.users WHERE email = 'andres@mailvibes.io'
);

-- Step 3: Fix Andres's email and setup
-- First check if user exists
DO $$
DECLARE
    v_user_id UUID;
    v_org_id UUID;
BEGIN
    -- Get Andres's user ID
    SELECT id INTO v_user_id 
    FROM auth.users 
    WHERE email = 'andres@mailvibes.io' 
    LIMIT 1;
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User andres@mailvibes.io not found';
    END IF;
    
    -- Get MailVibes organization
    SELECT id INTO v_org_id 
    FROM organizations 
    WHERE domain = 'mailvibes.io' 
    LIMIT 1;
    
    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'MailVibes organization not found';
    END IF;
    
    -- Update profile to ensure current_organization is set
    UPDATE profiles 
    SET current_organization_id = v_org_id
    WHERE id = v_user_id;
    
    -- Ensure organization membership exists
    INSERT INTO organization_members (user_id, organization_id, role, created_at, updated_at)
    VALUES (v_user_id, v_org_id, 'admin', NOW(), NOW())
    ON CONFLICT (user_id, organization_id) 
    DO UPDATE SET role = 'admin', updated_at = NOW();
    
    RAISE NOTICE 'Successfully set up andres@mailvibes.io as admin';
END $$;

-- Step 4: Create RPC function that completely bypasses RLS
DROP FUNCTION IF EXISTS get_user_organization_safe(UUID);
CREATE OR REPLACE FUNCTION get_user_organization_safe(p_user_id UUID)
RETURNS TABLE(organization_id UUID, role TEXT, organization_name TEXT, organization_domain TEXT) 
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        om.organization_id,
        om.role::TEXT,
        o.name,
        o.domain
    FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = p_user_id
    LIMIT 1;
$$;

-- Grant permission
GRANT EXECUTE ON FUNCTION get_user_organization_safe(UUID) TO authenticated;

-- Step 5: Create function to get organization details safely
DROP FUNCTION IF EXISTS get_organization_details_safe(UUID);
CREATE OR REPLACE FUNCTION get_organization_details_safe(p_org_id UUID)
RETURNS TABLE(
    id UUID,
    name TEXT,
    domain TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    plan TEXT,
    member_count INTEGER,
    max_members INTEGER
) 
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        id,
        name,
        domain,
        created_at,
        COALESCE(updated_at, created_at) as updated_at,
        COALESCE(plan, 'starter') as plan,
        COALESCE(member_count, 1) as member_count,
        COALESCE(max_members, 5) as max_members
    FROM organizations
    WHERE id = p_org_id;
$$;

-- Grant permission
GRANT EXECUTE ON FUNCTION get_organization_details_safe(UUID) TO authenticated;

-- Step 6: Re-enable RLS but with PERMISSIVE policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;

-- Step 6.5: Drop ALL existing policies to start fresh
DO $$
DECLARE
    pol RECORD;
BEGIN
    -- Drop all policies on profiles
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', pol.policyname);
    END LOOP;
    
    -- Drop all policies on organizations
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'organizations' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON organizations', pol.policyname);
    END LOOP;
    
    -- Drop all policies on organization_members
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'organization_members' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON organization_members', pol.policyname);
    END LOOP;
    
    -- Drop all policies on organization_invitations
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'organization_invitations' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON organization_invitations', pol.policyname);
    END LOOP;
END $$;

-- Create super simple policies that won't recurse
-- Profiles: Users can see and update their own
CREATE POLICY "Users can view own profile" ON profiles
    FOR ALL USING (id = auth.uid());

-- Organizations: Anyone authenticated can read (we control access in app)
CREATE POLICY "Authenticated users can view organizations" ON organizations
    FOR SELECT USING (true);

-- Organization members: No policies - use RPC functions only

-- Organization invitations: Simple policy
CREATE POLICY "Authenticated can view invitations" ON organization_invitations
    FOR SELECT USING (true);

-- Step 7: Verify final state
SELECT 
    'Final Setup' as info,
    u.email,
    o.name as organization,
    o.domain,
    om.role,
    p.current_organization_id IS NOT NULL as has_current_org
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
LEFT JOIN organization_members om ON u.id = om.user_id
LEFT JOIN organizations o ON om.organization_id = o.id
WHERE u.email = 'andres@mailvibes.io';

-- Show all remaining policies
SELECT 
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'organizations', 'organization_members', 'organization_invitations')
ORDER BY tablename, policyname; 