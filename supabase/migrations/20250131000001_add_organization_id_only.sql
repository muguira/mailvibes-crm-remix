-- Migration: Add organization_id to opportunities table (MINIMAL CHANGE ONLY)
-- This migration ONLY adds the organization_id column and updates RLS policies
-- It does NOT create, drop, or modify any other tables
-- Date: 2025-01-31

-- Step 1: Add organization_id column to existing opportunities table
-- This is safe because it uses IF NOT EXISTS
ALTER TABLE public.opportunities
ADD COLUMN IF NOT EXISTS organization_id UUID;

-- Step 2: Add foreign key constraint to organizations table
-- This is safe because it only adds a constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'opportunities_organization_id_fkey'
        AND table_name = 'opportunities'
    ) THEN
        ALTER TABLE public.opportunities
        ADD CONSTRAINT opportunities_organization_id_fkey
        FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Step 3: Create index for performance (safe operation)
CREATE INDEX IF NOT EXISTS idx_opportunities_organization_id 
ON public.opportunities(organization_id);

-- Step 4: Update existing opportunities to set organization_id
-- This migrates existing data safely
UPDATE public.opportunities
SET organization_id = (
    SELECT COALESCE(
        p.current_organization_id,
        (SELECT id FROM public.organizations ORDER BY created_at LIMIT 1)
    )
    FROM public.profiles p
    WHERE p.id = opportunities.user_id
    LIMIT 1
)
WHERE organization_id IS NULL;

-- Step 5: Handle any remaining NULL values
UPDATE public.opportunities
SET organization_id = (
    SELECT id FROM public.organizations ORDER BY created_at LIMIT 1
)
WHERE organization_id IS NULL
  AND EXISTS (SELECT 1 FROM public.organizations);

-- Step 6: Only make NOT NULL if all data is migrated successfully
DO $$
BEGIN
    -- Check if all opportunities have organization_id
    IF NOT EXISTS (SELECT 1 FROM public.opportunities WHERE organization_id IS NULL) THEN
        ALTER TABLE public.opportunities
        ALTER COLUMN organization_id SET NOT NULL;
    ELSE
        RAISE NOTICE 'Some opportunities still have NULL organization_id - skipping NOT NULL constraint';
    END IF;
END $$;

-- Step 7: Update RLS policies to use organization-based access
-- First, safely drop existing policies
DROP POLICY IF EXISTS "Users can view own opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Users can insert own opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Users can update own opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Users can delete own opportunities" ON public.opportunities;

-- Create new organization-based policies
CREATE POLICY "Organization members can view opportunities" ON public.opportunities
    FOR SELECT USING (
        organization_id IN (
            SELECT om.organization_id
            FROM public.organization_members om
            WHERE om.user_id = auth.uid()
        )
    );

CREATE POLICY "Organization members can insert opportunities" ON public.opportunities
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT om.organization_id
            FROM public.organization_members om
            WHERE om.user_id = auth.uid()
        )
    );

CREATE POLICY "Organization members can update opportunities" ON public.opportunities
    FOR UPDATE USING (
        organization_id IN (
            SELECT om.organization_id
            FROM public.organization_members om
            WHERE om.user_id = auth.uid()
        )
    );

CREATE POLICY "Organization members can delete opportunities" ON public.opportunities
    FOR DELETE USING (
        organization_id IN (
            SELECT om.organization_id
            FROM public.organization_members om
            WHERE om.user_id = auth.uid()
        )
    );

-- Step 8: Add helpful comments
COMMENT ON COLUMN public.opportunities.organization_id IS 'Organization ID for multi-tenant access. All organization members can view and manage these opportunities.';

SELECT 'Successfully added organization_id to opportunities table' as status; 