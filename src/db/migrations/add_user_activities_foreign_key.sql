-- Add foreign key constraint to user_activities table
ALTER TABLE user_activities
  ADD CONSTRAINT fk_user_activities_auth_user
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

-- Create an index to improve foreign key lookup performance
CREATE INDEX IF NOT EXISTS idx_user_activities_user_id
  ON user_activities(user_id); 