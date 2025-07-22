-- Fix RLS Infinite Recursion for organization_members table

-- Step 1: Drop all existing policies on organization_members to start fresh
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
        RAISE NOTICE 'Dropped policy: %', pol.policyname;
    END LOOP;
END $$;

-- Step 2: Create simple, non-recursive policies
-- Users can see members of their organizations
CREATE POLICY "Users can view organization members" ON organization_members
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- Users can see their own membership
CREATE POLICY "Users can view own membership" ON organization_members
    FOR SELECT
    USING (user_id = auth.uid());

-- Admins can manage members
CREATE POLICY "Admins can insert members" ON organization_members
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 
            FROM organization_members existing
            WHERE existing.user_id = auth.uid()
            AND existing.organization_id = organization_members.organization_id
            AND existing.role = 'admin'
        )
    );

CREATE POLICY "Admins can update members" ON organization_members
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 
            FROM organization_members existing
            WHERE existing.user_id = auth.uid()
            AND existing.organization_id = organization_members.organization_id
            AND existing.role = 'admin'
        )
    );

CREATE POLICY "Admins can delete members" ON organization_members
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 
            FROM organization_members existing
            WHERE existing.user_id = auth.uid()
            AND existing.organization_id = organization_members.organization_id
            AND existing.role = 'admin'
        )
    );

-- Step 3: Clean up duplicate organizations
-- Keep the first one (mailvibes.io) and remove the one with www.
DELETE FROM organizations 
WHERE domain = 'www.mailvibes.io'
AND name = 'MailVibes';

-- Also clean up the third duplicate
DELETE FROM organizations
WHERE domain = 'www.MailVibes.io'
AND id = '000fb259-521d-4153-842e-8b64fa61fbb2';

-- Step 4: Verify the fix
SELECT 
    'RLS Policies After Fix' as info,
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'organization_members';

-- Step 5: Test the query that was failing
-- This should now work without recursion
SELECT organization_id 
FROM organization_members 
WHERE user_id = '645dac80-abfe-4228-802d-17c262ff07ff';

-- Step 6: Show final organization state
SELECT 
    'Final Organizations' as info,
    id,
    name,
    domain,
    created_at
FROM organizations
ORDER BY created_at;

-- Step 7: Show user's membership
SELECT 
    'User Membership' as info,
    u.email,
    o.name as organization,
    o.domain,
    om.role,
    om.created_at
FROM auth.users u
JOIN organization_members om ON u.id = om.user_id
JOIN organizations o ON om.organization_id = o.id
WHERE u.email = 'andres@mailvibes.io'; 