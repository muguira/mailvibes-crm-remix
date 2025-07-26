-- =====================================================
-- Migration: Enhance user_activities for Team Activity Feed
-- Purpose: Add team context to activities and enable team-wide visibility
-- =====================================================

-- 1. Add organization_id column to user_activities table
ALTER TABLE public.user_activities 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- 2. Create index for efficient team activity queries
CREATE INDEX IF NOT EXISTS idx_user_activities_org_timestamp 
ON public.user_activities(organization_id, timestamp DESC) 
WHERE organization_id IS NOT NULL;

-- 3. Create composite index for user + team activity queries
CREATE INDEX IF NOT EXISTS idx_user_activities_user_org_timestamp 
ON public.user_activities(user_id, organization_id, timestamp DESC);

-- 4. Add activity_scope column to distinguish personal vs team activities
ALTER TABLE public.user_activities 
ADD COLUMN IF NOT EXISTS activity_scope TEXT DEFAULT 'personal' 
CHECK (activity_scope IN ('personal', 'team', 'public'));

-- 5. Create index for activity scope filtering
CREATE INDEX IF NOT EXISTS idx_user_activities_scope_timestamp 
ON public.user_activities(activity_scope, timestamp DESC);

-- 6. Update the user_activities trigger to populate organization_id automatically
CREATE OR REPLACE FUNCTION populate_user_activity_organization()
RETURNS TRIGGER AS $$
DECLARE
    user_org_id UUID;
BEGIN
    -- Get the user's current organization_id from profiles
    SELECT current_organization_id INTO user_org_id
    FROM public.profiles
    WHERE id = NEW.user_id;
    
    -- Set organization_id if user has one and activity scope allows team visibility
    IF user_org_id IS NOT NULL AND NEW.activity_scope IN ('team', 'public') THEN
        NEW.organization_id := user_org_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Create trigger to auto-populate organization context
DROP TRIGGER IF EXISTS populate_user_activity_organization_trigger ON public.user_activities;
CREATE TRIGGER populate_user_activity_organization_trigger
    BEFORE INSERT ON public.user_activities
    FOR EACH ROW
    EXECUTE FUNCTION populate_user_activity_organization();

-- 8. Update RLS policies for team activity visibility
DROP POLICY IF EXISTS "Users can view their own activities" ON public.user_activities;
DROP POLICY IF EXISTS "Users can view team activities" ON public.user_activities;

-- Policy: Users can view their own activities (all scopes)
CREATE POLICY "Users can view their own activities"
ON public.user_activities
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can view team activities from their organization
CREATE POLICY "Users can view team activities"
ON public.user_activities
FOR SELECT
USING (
    activity_scope IN ('team', 'public') 
    AND organization_id IN (
        SELECT organization_id 
        FROM public.organization_members 
        WHERE user_id = auth.uid() AND status = 'active'
    )
);

-- 9. Update insert policy to allow team activities
DROP POLICY IF EXISTS "Users can insert their own activities" ON public.user_activities;
CREATE POLICY "Users can insert their own activities"
ON public.user_activities
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 10. Update update policy for team context
DROP POLICY IF EXISTS "Users can update their own activities" ON public.user_activities;
CREATE POLICY "Users can update their own activities"
ON public.user_activities
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 11. Enhanced notification function for team activities
CREATE OR REPLACE FUNCTION notify_team_activity()
RETURNS TRIGGER AS $$
DECLARE
    notification_payload JSON;
BEGIN
    -- Create enhanced notification payload
    notification_payload := json_build_object(
        'id', NEW.id,
        'user_id', NEW.user_id,
        'user_name', NEW.user_name,
        'organization_id', NEW.organization_id,
        'activity_type', NEW.activity_type,
        'activity_scope', NEW.activity_scope,
        'timestamp', NEW.timestamp,
        'entity_type', NEW.entity_type,
        'entity_name', NEW.entity_name
    );
    
    -- Notify personal activity channel
    PERFORM pg_notify('user_activity_' || NEW.user_id, notification_payload::text);
    
    -- Notify team activity channel if applicable
    IF NEW.organization_id IS NOT NULL AND NEW.activity_scope IN ('team', 'public') THEN
        PERFORM pg_notify('team_activity_' || NEW.organization_id, notification_payload::text);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 12. Update the trigger to use enhanced notification
DROP TRIGGER IF EXISTS on_new_activity ON public.user_activities;
CREATE TRIGGER on_new_activity
    AFTER INSERT ON public.user_activities
    FOR EACH ROW
    EXECUTE FUNCTION notify_team_activity();

-- 13. Create function to backfill organization_id for existing activities
CREATE OR REPLACE FUNCTION backfill_activity_organization_ids()
RETURNS INTEGER AS $$
DECLARE
    rows_updated INTEGER := 0;
BEGIN
    UPDATE public.user_activities ua
    SET organization_id = p.current_organization_id,
        activity_scope = CASE 
            WHEN ua.activity_type IN ('login', 'note_add', 'contact_add', 'email', 'call', 'meeting') THEN 'team'
            ELSE 'personal'
        END
    FROM public.profiles p
    WHERE ua.user_id = p.id 
    AND ua.organization_id IS NULL 
    AND p.current_organization_id IS NOT NULL;
    
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    
    RAISE NOTICE 'Backfilled organization_id for % activity records', rows_updated;
    RETURN rows_updated;
END;
$$ LANGUAGE plpgsql;

-- 14. Execute backfill (optional - run manually if needed)
-- SELECT backfill_activity_organization_ids();

COMMENT ON COLUMN public.user_activities.organization_id IS 'Organization context for team activity visibility';
COMMENT ON COLUMN public.user_activities.activity_scope IS 'Visibility scope: personal (user only), team (organization), public (all)';

-- Migration completed successfully
SELECT 'Enhanced user_activities table for team activity feed support' as migration_status; 