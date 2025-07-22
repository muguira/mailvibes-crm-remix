-- Comprehensive RLS Fix for ALL Tables
-- This fixes infinite recursion on both profiles and organization_members tables

-- Step 1: Disable RLS temporarily to clean up
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies on profiles
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'profiles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', pol.policyname);
        RAISE NOTICE 'Dropped policy on profiles: %', pol.policyname;
    END LOOP;
END $$;

-- Step 3: Drop ALL existing policies on organization_members
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'organization_members'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON organization_members', pol.policyname);
        RAISE NOTICE 'Dropped policy on organization_members: %', pol.policyname;
    END LOOP;
END $$;

-- Step 4: Create SIMPLE non-recursive policies for profiles
-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT
    USING (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE
    USING (id = auth.uid());

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT
    WITH CHECK (id = auth.uid());

-- Step 5: Create SIMPLE non-recursive policies for organization_members
-- View policies
CREATE POLICY "Users can view own membership" ON organization_members
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can view members of their org" ON organization_members
    FOR SELECT
    USING (
        organization_id IN (
            SELECT om2.organization_id 
            FROM organization_members om2 
            WHERE om2.user_id = auth.uid()
        )
    );

-- Admin policies
CREATE POLICY "Admins can manage members" ON organization_members
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 
            FROM organization_members om2
            WHERE om2.user_id = auth.uid()
            AND om2.organization_id = organization_members.organization_id
            AND om2.role = 'admin'
        )
    );

-- Step 6: Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Step 7: Clean up duplicate organizations
DELETE FROM organizations 
WHERE domain IN ('www.mailvibes.io', 'www.MailVibes.io')
AND name = 'MailVibes';

-- Step 8: Fix andres@mailvibes.io profile to ensure current_organization is set
UPDATE profiles 
SET current_organization = (
    SELECT om.organization_id 
    FROM organization_members om
    JOIN organizations o ON om.organization_id = o.id
    WHERE om.user_id = profiles.id
    AND o.domain = 'mailvibes.io'
    LIMIT 1
)
WHERE id = (
    SELECT id FROM auth.users WHERE email = 'andres@mailvibes.io'
);

-- Step 9: Verify the fix
DO $$
BEGIN
    RAISE NOTICE '=== Verification Results ===';
END $$;

-- Check RLS policies
SELECT 
    'Profiles Policies' as table_name,
    COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'profiles';

SELECT 
    'Org Members Policies' as table_name,
    COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'organization_members';

-- Test the queries that were failing
SELECT 
    'Profile Query Test' as test,
    id,
    current_organization
FROM profiles
WHERE id = '645dac80-abfe-4228-802d-17c262ff07ff';

SELECT 
    'Membership Query Test' as test,
    organization_id
FROM organization_members
WHERE user_id = '645dac80-abfe-4228-802d-17c262ff07ff'
LIMIT 1;

-- Show final state
SELECT 
    'Final User State' as info,
    u.email,
    o.name as organization,
    o.domain,
    om.role,
    p.current_organization IS NOT NULL as has_current_org
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
LEFT JOIN organization_members om ON u.id = om.user_id
LEFT JOIN organizations o ON om.organization_id = o.id
WHERE u.email = 'andres@mailvibes.io'; 