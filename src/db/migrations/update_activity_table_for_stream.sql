-- Add new type for stream view activities
ALTER TABLE user_activities
  ADD COLUMN stream_view BOOLEAN DEFAULT FALSE;

-- Create an index for faster querying of stream view activities
CREATE INDEX IF NOT EXISTS idx_user_activities_stream_view
  ON user_activities (stream_view);

-- Create a view to simplify querying of recent activities
CREATE OR REPLACE VIEW recent_activities AS
SELECT *
FROM user_activities
ORDER BY timestamp DESC
LIMIT 100;

-- Create a function to merge duplicate activities
CREATE OR REPLACE FUNCTION merge_duplicate_activities()
RETURNS TRIGGER AS $$
DECLARE
  duplicate_count INT;
BEGIN
  -- Check for duplicate activities in the last minute
  SELECT COUNT(*) INTO duplicate_count
  FROM user_activities
  WHERE user_id = NEW.user_id
    AND activity_type = NEW.activity_type
    AND entity_id = NEW.entity_id
    AND field_name = NEW.field_name
    AND timestamp > (NOW() - INTERVAL '1 minute');
    
  -- If duplicates found, don't insert
  IF duplicate_count > 0 THEN
    RETURN NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to avoid duplicate activities
DROP TRIGGER IF EXISTS prevent_duplicate_activities ON user_activities;
CREATE TRIGGER prevent_duplicate_activities
BEFORE INSERT ON user_activities
FOR EACH ROW
EXECUTE FUNCTION merge_duplicate_activities(); 