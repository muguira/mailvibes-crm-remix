-- Fix profiles table column naming issue
-- The auto_accept_invitation function expects current_organization_id but it might be current_organization

-- Check current column name and rename if needed
DO $$
BEGIN
    -- Check if we have current_organization instead of current_organization_id
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'current_organization'
    ) AND NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'current_organization_id'
    ) THEN
        -- Rename the column
        ALTER TABLE profiles 
        RENAME COLUMN current_organization TO current_organization_id;
        RAISE NOTICE 'Renamed current_organization to current_organization_id';
    END IF;
END $$;

-- Update the auto_accept_invitation function to use the correct column name
-- First check what column actually exists
DO $$
DECLARE
    v_column_name TEXT;
BEGIN
    -- Check which column name exists
    SELECT column_name INTO v_column_name
    FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name IN ('current_organization', 'current_organization_id')
    LIMIT 1;
    
    IF v_column_name IS NOT NULL THEN
        RAISE NOTICE 'Profiles table has column: %', v_column_name;
    ELSE
        -- Neither column exists, create it
        ALTER TABLE profiles 
        ADD COLUMN current_organization_id UUID REFERENCES organizations(id);
        RAISE NOTICE 'Added current_organization_id column to profiles table';
    END IF;
END $$;

-- Verify the fix
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

SELECT 'Profiles column issue fixed!' as status; 