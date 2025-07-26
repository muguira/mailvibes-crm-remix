-- =====================================================
-- Migration: Create Team Activity Views and Functions
-- Purpose: Optimized views for team activity feed dashboard
-- =====================================================

-- 1. Create materialized view for team activity aggregation
CREATE MATERIALIZED VIEW IF NOT EXISTS public.team_activity_feed AS
SELECT 
    ua.id,
    ua.user_id,
    ua.user_name,
    ua.user_email,
    ua.timestamp,
    ua.activity_type,
    ua.entity_id,
    ua.entity_type,
    ua.entity_name,
    ua.field_name,
    ua.old_value,
    ua.new_value,
    ua.details,
    ua.is_pinned,
    ua.organization_id,
    ua.activity_scope,
    o.name as organization_name,
    om.role as user_role,
    p.full_name as user_full_name,
    p.avatar_url as user_avatar_url,
    -- Calculated fields for feed optimization
    DATE(ua.timestamp) as activity_date,
    EXTRACT(HOUR FROM ua.timestamp) as activity_hour,
    CASE 
        WHEN ua.timestamp >= NOW() - INTERVAL '1 hour' THEN 'recent'
        WHEN ua.timestamp >= NOW() - INTERVAL '24 hours' THEN 'today'
        WHEN ua.timestamp >= NOW() - INTERVAL '7 days' THEN 'this_week'
        ELSE 'older'
    END as activity_recency
FROM public.user_activities ua
JOIN public.profiles p ON ua.user_id = p.id
LEFT JOIN public.organizations o ON ua.organization_id = o.id
LEFT JOIN public.organization_members om ON (ua.user_id = om.user_id AND ua.organization_id = om.organization_id)
WHERE ua.activity_scope IN ('team', 'public')
AND ua.organization_id IS NOT NULL;

-- 2. Create indexes on the materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_activity_feed_id 
ON public.team_activity_feed(id);

CREATE INDEX IF NOT EXISTS idx_team_activity_feed_org_timestamp 
ON public.team_activity_feed(organization_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_team_activity_feed_user_timestamp 
ON public.team_activity_feed(user_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_team_activity_feed_recency 
ON public.team_activity_feed(organization_id, activity_recency, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_team_activity_feed_type 
ON public.team_activity_feed(organization_id, activity_type, timestamp DESC);

-- 3. Create function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_team_activity_feed()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.team_activity_feed;
    
    -- Log the refresh
    RAISE NOTICE 'Team activity feed refreshed at %', NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create function to get team activity feed with pagination
CREATE OR REPLACE FUNCTION get_team_activity_feed(
    p_organization_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0,
    p_activity_type TEXT DEFAULT NULL,
    p_user_id UUID DEFAULT NULL,
    p_hours_back INTEGER DEFAULT 168 -- Default 7 days
)
RETURNS TABLE(
    id UUID,
    user_id UUID,
    user_name TEXT,
    user_full_name TEXT,
    user_avatar_url TEXT,
    user_role TEXT,
    timestamp TIMESTAMPTZ,
    activity_type TEXT,
    entity_id TEXT,
    entity_type TEXT,
    entity_name TEXT,
    field_name TEXT,
    old_value JSONB,
    new_value JSONB,
    details JSONB,
    is_pinned BOOLEAN,
    activity_recency TEXT,
    total_count BIGINT
) AS $$
DECLARE
    total_activities BIGINT;
BEGIN
    -- Get total count for pagination
    SELECT COUNT(*) INTO total_activities
    FROM public.team_activity_feed taf
    WHERE taf.organization_id = p_organization_id
    AND taf.timestamp >= NOW() - (p_hours_back || ' hours')::INTERVAL
    AND (p_activity_type IS NULL OR taf.activity_type = p_activity_type)
    AND (p_user_id IS NULL OR taf.user_id = p_user_id);

    -- Return paginated results with total count
    RETURN QUERY
    SELECT 
        taf.id,
        taf.user_id,
        taf.user_name,
        taf.user_full_name,
        taf.user_avatar_url,
        taf.user_role,
        taf.timestamp,
        taf.activity_type,
        taf.entity_id,
        taf.entity_type,
        taf.entity_name,
        taf.field_name,
        taf.old_value,
        taf.new_value,
        taf.details,
        taf.is_pinned,
        taf.activity_recency,
        total_activities
    FROM public.team_activity_feed taf
    WHERE taf.organization_id = p_organization_id
    AND taf.timestamp >= NOW() - (p_hours_back || ' hours')::INTERVAL
    AND (p_activity_type IS NULL OR taf.activity_type = p_activity_type)
    AND (p_user_id IS NULL OR taf.user_id = p_user_id)
    ORDER BY taf.timestamp DESC, taf.id DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create function to get team activity statistics
CREATE OR REPLACE FUNCTION get_team_activity_stats(
    p_organization_id UUID,
    p_hours_back INTEGER DEFAULT 24
)
RETURNS TABLE(
    total_activities BIGINT,
    active_users BIGINT,
    activity_types JSONB,
    hourly_distribution JSONB,
    top_contributors JSONB
) AS $$
DECLARE
    result_total_activities BIGINT;
    result_active_users BIGINT;
    result_activity_types JSONB;
    result_hourly_distribution JSONB;
    result_top_contributors JSONB;
BEGIN
    -- Total activities
    SELECT COUNT(*) INTO result_total_activities
    FROM public.team_activity_feed taf
    WHERE taf.organization_id = p_organization_id
    AND taf.timestamp >= NOW() - (p_hours_back || ' hours')::INTERVAL;

    -- Active users
    SELECT COUNT(DISTINCT taf.user_id) INTO result_active_users
    FROM public.team_activity_feed taf
    WHERE taf.organization_id = p_organization_id
    AND taf.timestamp >= NOW() - (p_hours_back || ' hours')::INTERVAL;

    -- Activity types distribution
    SELECT jsonb_object_agg(activity_type, activity_count) INTO result_activity_types
    FROM (
        SELECT 
            taf.activity_type,
            COUNT(*) as activity_count
        FROM public.team_activity_feed taf
        WHERE taf.organization_id = p_organization_id
        AND taf.timestamp >= NOW() - (p_hours_back || ' hours')::INTERVAL
        GROUP BY taf.activity_type
        ORDER BY activity_count DESC
    ) activity_stats;

    -- Hourly distribution
    SELECT jsonb_object_agg(activity_hour::text, hour_count) INTO result_hourly_distribution
    FROM (
        SELECT 
            taf.activity_hour,
            COUNT(*) as hour_count
        FROM public.team_activity_feed taf
        WHERE taf.organization_id = p_organization_id
        AND taf.timestamp >= NOW() - (p_hours_back || ' hours')::INTERVAL
        GROUP BY taf.activity_hour
        ORDER BY taf.activity_hour
    ) hourly_stats;

    -- Top contributors
    SELECT jsonb_agg(
        jsonb_build_object(
            'user_id', user_id,
            'user_name', user_name,
            'user_full_name', user_full_name,
            'user_avatar_url', user_avatar_url,
            'activity_count', activity_count
        )
    ) INTO result_top_contributors
    FROM (
        SELECT 
            taf.user_id,
            taf.user_name,
            taf.user_full_name,
            taf.user_avatar_url,
            COUNT(*) as activity_count
        FROM public.team_activity_feed taf
        WHERE taf.organization_id = p_organization_id
        AND taf.timestamp >= NOW() - (p_hours_back || ' hours')::INTERVAL
        GROUP BY taf.user_id, taf.user_name, taf.user_full_name, taf.user_avatar_url
        ORDER BY activity_count DESC
        LIMIT 10
    ) contributor_stats;

    -- Return all statistics
    RETURN QUERY SELECT 
        result_total_activities,
        result_active_users,
        COALESCE(result_activity_types, '{}'::jsonb),
        COALESCE(result_hourly_distribution, '{}'::jsonb),
        COALESCE(result_top_contributors, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create trigger to auto-refresh materialized view
CREATE OR REPLACE FUNCTION trigger_refresh_team_activity_feed()
RETURNS TRIGGER AS $$
BEGIN
    -- Only refresh for team/public activities
    IF (TG_OP = 'INSERT' AND NEW.activity_scope IN ('team', 'public') AND NEW.organization_id IS NOT NULL) OR
       (TG_OP = 'UPDATE' AND (NEW.activity_scope IN ('team', 'public') OR OLD.activity_scope IN ('team', 'public'))) OR
       (TG_OP = 'DELETE' AND OLD.activity_scope IN ('team', 'public') AND OLD.organization_id IS NOT NULL) THEN
        
        -- Refresh the materialized view (non-blocking)
        PERFORM refresh_team_activity_feed();
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 7. Create trigger on user_activities table
DROP TRIGGER IF EXISTS refresh_team_activity_feed_trigger ON public.user_activities;
CREATE TRIGGER refresh_team_activity_feed_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.user_activities
    FOR EACH ROW
    EXECUTE FUNCTION trigger_refresh_team_activity_feed();

-- 8. Grant necessary permissions
GRANT SELECT ON public.team_activity_feed TO authenticated;
GRANT EXECUTE ON FUNCTION get_team_activity_feed(UUID, INTEGER, INTEGER, TEXT, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_team_activity_stats(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_team_activity_feed() TO authenticated;

-- 9. Create RLS policies for the materialized view
ALTER TABLE public.team_activity_feed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view their organization's activity feed"
ON public.team_activity_feed
FOR SELECT
USING (
    organization_id IN (
        SELECT om.organization_id 
        FROM public.organization_members om
        WHERE om.user_id = auth.uid() 
        AND om.status = 'active'
    )
);

-- 10. Initial population of the materialized view
SELECT refresh_team_activity_feed();

-- 11. Create view for personal activity feed (optimized)
CREATE OR REPLACE VIEW public.personal_activity_feed AS
SELECT 
    ua.id,
    ua.user_id,
    ua.user_name,
    ua.user_email,
    ua.timestamp,
    ua.activity_type,
    ua.entity_id,
    ua.entity_type,
    ua.entity_name,
    ua.field_name,
    ua.old_value,
    ua.new_value,
    ua.details,
    ua.is_pinned,
    ua.organization_id,
    ua.activity_scope,
    p.full_name as user_full_name,
    p.avatar_url as user_avatar_url,
    -- Calculated fields
    DATE(ua.timestamp) as activity_date,
    CASE 
        WHEN ua.timestamp >= NOW() - INTERVAL '1 hour' THEN 'recent'
        WHEN ua.timestamp >= NOW() - INTERVAL '24 hours' THEN 'today'
        WHEN ua.timestamp >= NOW() - INTERVAL '7 days' THEN 'this_week'
        ELSE 'older'
    END as activity_recency
FROM public.user_activities ua
JOIN public.profiles p ON ua.user_id = p.id
WHERE ua.user_id = auth.uid()
ORDER BY ua.timestamp DESC;

-- 12. Grant permissions for personal feed
GRANT SELECT ON public.personal_activity_feed TO authenticated;

-- Migration completed successfully
SELECT 'Created team activity views and functions successfully' as migration_status; 