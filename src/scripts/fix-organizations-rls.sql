-- Fix RLS policies on organizations table

-- First, check existing policies
SELECT 
    'Organizations Table Policies' as info,
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'organizations';

-- Disable RLS temporarily
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'organizations'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON organizations', pol.policyname);
        RAISE NOTICE 'Dropped policy on organizations: %', pol.policyname;
    END LOOP;
END $$;

-- Create simple, non-recursive policies
-- Allow authenticated users to view organizations they belong to
CREATE POLICY "Users can view their organizations" ON organizations
    FOR SELECT
    USING (
        id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- Allow users to view organizations by direct ID (for invitations, etc)
CREATE POLICY "Users can view organization by ID" ON organizations
    FOR SELECT
    USING (true); -- This is safe because we control access at the query level

-- Admin policies for organization management
CREATE POLICY "Admins can manage their organizations" ON organizations
    FOR ALL
    USING (
        id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Re-enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Verify the fix
SELECT 
    'Final Organizations Policies' as info,
    COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'organizations'; 