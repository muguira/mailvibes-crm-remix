-- Add is_pinned column to user_activities table
ALTER TABLE user_activities
ADD COLUMN is_pinned BOOLEAN DEFAULT FALSE;

-- Add index for optimized queries on pinned activities
CREATE INDEX idx_user_activities_pinned ON user_activities(is_pinned, timestamp DESC);

-- Update existing activities to have is_pinned = false (just to be explicit)
UPDATE user_activities SET is_pinned = FALSE WHERE is_pinned IS NULL; 