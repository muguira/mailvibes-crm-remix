-- Migration: Optimize Activity Feed Performance
-- Description: Add indexes and optimizations for faster activity feed queries

-- 1. Add composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_user_activities_user_timestamp 
ON user_activities(user_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_user_activities_org_scope_timestamp 
ON user_activities(organization_id, activity_scope, timestamp DESC) 
WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_activities_pinned 
ON user_activities(user_id, is_pinned, timestamp DESC) 
WHERE is_pinned = true;

-- 2. Add index for team activities filtering
CREATE INDEX IF NOT EXISTS idx_user_activities_team_filter 
ON user_activities(organization_id, activity_scope, user_id, timestamp DESC) 
WHERE organization_id IS NOT NULL AND activity_scope IN ('team', 'public');

-- 3. Add index for combined feed queries (personal + team)
CREATE INDEX IF NOT EXISTS idx_user_activities_combined_feed 
ON user_activities(timestamp DESC) 
WHERE user_id IS NOT NULL OR (organization_id IS NOT NULL AND activity_scope IN ('team', 'public'));

-- 4. Add partial index for recent activities (last 30 days) to speed up common queries
CREATE INDEX IF NOT EXISTS idx_user_activities_recent 
ON user_activities(user_id, timestamp DESC) 
WHERE timestamp > (NOW() - INTERVAL '30 days');

-- 5. Optimize activity_type queries for filtering
CREATE INDEX IF NOT EXISTS idx_user_activities_type_timestamp 
ON user_activities(activity_type, timestamp DESC);

-- 6. Add index for entity-based queries (contact activities)
CREATE INDEX IF NOT EXISTS idx_user_activities_entity 
ON user_activities(entity_id, entity_type, timestamp DESC) 
WHERE entity_id IS NOT NULL;

-- 7. Update table statistics for better query planning
ANALYZE user_activities;

-- 8. Add comments for documentation
COMMENT ON INDEX idx_user_activities_user_timestamp IS 'Optimizes personal activity feed queries';
COMMENT ON INDEX idx_user_activities_org_scope_timestamp IS 'Optimizes team activity feed queries';
COMMENT ON INDEX idx_user_activities_pinned IS 'Optimizes pinned activities queries';
COMMENT ON INDEX idx_user_activities_team_filter IS 'Optimizes team activity filtering';
COMMENT ON INDEX idx_user_activities_combined_feed IS 'Optimizes combined personal+team queries';
COMMENT ON INDEX idx_user_activities_recent IS 'Optimizes recent activities queries (30 days)';
COMMENT ON INDEX idx_user_activities_type_timestamp IS 'Optimizes activity type filtering';
COMMENT ON INDEX idx_user_activities_entity IS 'Optimizes entity-based activity queries'; 