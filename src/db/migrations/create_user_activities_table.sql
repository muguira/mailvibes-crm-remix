-- Create a table for user activities
CREATE TABLE IF NOT EXISTS user_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  user_email TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activity_type TEXT NOT NULL,
  entity_id TEXT,
  entity_type TEXT,
  entity_name TEXT,
  field_name TEXT,
  old_value JSONB,
  new_value JSONB,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;

-- Users can only view their own activities and team activities
CREATE POLICY "Users can view their own activities"
  ON user_activities FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own activities
CREATE POLICY "Users can insert their own activities"
  ON user_activities FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create an index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON user_activities (user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_timestamp ON user_activities (timestamp);

-- Create function to notify for new activities
CREATE OR REPLACE FUNCTION notify_new_activity()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify('new_activity', row_to_json(NEW)::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call function on insert
DROP TRIGGER IF EXISTS on_new_activity ON user_activities;
CREATE TRIGGER on_new_activity
AFTER INSERT ON user_activities
FOR EACH ROW EXECUTE PROCEDURE notify_new_activity(); 