-- Add missing UPDATE policy for user_activities table
-- This allows users to update their own activities (needed for pin functionality)

CREATE POLICY "Users can update their own activities"
  ON user_activities FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Also add DELETE policy for completeness
CREATE POLICY "Users can delete their own activities"
  ON user_activities FOR DELETE
  USING (auth.uid() = user_id); 