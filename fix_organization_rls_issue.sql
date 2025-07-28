-- URGENT FIX: Organization RLS policies to allow organization creation
-- Run this in Supabase SQL Editor to fix the issue where users cannot create organizations

-- Step 1: Drop existing restrictive policies on organizations
DO $$ 
DECLARE
    policy_record RECORD;
BEGIN
    -- Get all policies on the organizations table
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'organizations' 
        AND schemaname = 'public'
    LOOP
        -- Drop each policy
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.organizations', policy_record.policyname);
        RAISE NOTICE 'Dropped organization policy: %', policy_record.policyname;
    END LOOP;
END $$;

-- Step 2: Create comprehensive policies for organizations
-- Policy 1: All authenticated users can view organizations
CREATE POLICY "authenticated_users_can_view_organizations" ON public.organizations
    FOR SELECT 
    TO authenticated
    USING (true);

-- Policy 2: All authenticated users can create organizations
CREATE POLICY "authenticated_users_can_create_organizations" ON public.organizations
    FOR INSERT 
    TO authenticated
    WITH CHECK (true);

-- Policy 3: Users can update organizations they are admin of
CREATE POLICY "admins_can_update_organizations" ON public.organizations
    FOR UPDATE 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 
            FROM organization_members om 
            WHERE om.organization_id = organizations.id 
            AND om.user_id = auth.uid() 
            AND om.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 
            FROM organization_members om 
            WHERE om.organization_id = organizations.id 
            AND om.user_id = auth.uid() 
            AND om.role = 'admin'
        )
    );

-- Policy 4: Users can delete organizations they are admin of (for future use)
CREATE POLICY "admins_can_delete_organizations" ON public.organizations
    FOR DELETE 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 
            FROM organization_members om 
            WHERE om.organization_id = organizations.id 
            AND om.user_id = auth.uid() 
            AND om.role = 'admin'
        )
    );

-- Step 3: Ensure RLS is enabled on organizations table
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Step 4: Grant necessary permissions
GRANT ALL ON public.organizations TO authenticated;

-- Step 5: Verify the fix
SELECT 
    'Organization RLS Fix Applied' as status,
    COUNT(*) as total_policies
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'organizations';

-- Step 6: List all current policies
SELECT 
    tablename,
    policyname,
    cmd as operation,
    qual as using_expression
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'organizations'
ORDER BY cmd;

-- Log the fix
DO $$
BEGIN
    RAISE NOTICE '✅ Organization RLS policies updated successfully - users can now create organizations';
    RAISE NOTICE '🔧 This fixes the issue where users with cancelled invitations could not create organizations';
END $$; 