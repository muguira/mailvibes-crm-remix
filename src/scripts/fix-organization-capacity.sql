-- Fix organization capacity issue

-- Update SalesSheet.ai organization to have higher capacity
UPDATE organizations 
SET max_members = 25, 
    member_count = 1  -- Reset to actual count (just you)
WHERE domain = 'salessheet.io';

-- Verify the fix
SELECT 
    name,
    domain,
    member_count,
    max_members,
    (member_count::float / max_members * 100)::int as capacity_used_percent
FROM organizations 
WHERE domain = 'salessheet.io';

-- Check current actual usage
WITH actual_usage AS (
    SELECT 
        o.id,
        o.name,
        o.domain,
        o.max_members,
        COUNT(DISTINCT om.user_id) as actual_members,
        COUNT(DISTINCT oi.id) FILTER (WHERE oi.status = 'pending') as pending_invitations
    FROM organizations o
    LEFT JOIN organization_members om ON o.id = om.organization_id
    LEFT JOIN organization_invitations oi ON o.id = oi.organization_id AND oi.accepted_at IS NULL
    WHERE o.domain = 'salessheet.io'
    GROUP BY o.id, o.name, o.domain, o.max_members
)
SELECT 
    name,
    domain,
    actual_members,
    pending_invitations,
    (actual_members + pending_invitations) as total_usage,
    max_members,
    ((actual_members + pending_invitations)::float / max_members * 100)::int as capacity_used_percent,
    (max_members - (actual_members + pending_invitations)) as remaining_capacity
FROM actual_usage; 