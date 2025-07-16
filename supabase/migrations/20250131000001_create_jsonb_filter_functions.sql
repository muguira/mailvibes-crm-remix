-- Function to get unique values from JSONB field efficiently
CREATE OR REPLACE FUNCTION get_unique_jsonb_field_values(
  p_user_id UUID,
  p_field_name TEXT,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE(value TEXT, count BIGINT)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DISTINCT(data->>p_field_name)::TEXT as value,
    COUNT(*)::BIGINT as count
  FROM contacts 
  WHERE 
    user_id = p_user_id 
    AND data IS NOT NULL 
    AND data->>p_field_name IS NOT NULL 
    AND TRIM(data->>p_field_name) != ''
  GROUP BY data->>p_field_name
  ORDER BY value
  LIMIT p_limit;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_unique_jsonb_field_values(UUID, TEXT, INTEGER) TO authenticated;

-- Function to get count of unique values for a JSONB field (for debugging)
CREATE OR REPLACE FUNCTION count_unique_jsonb_field_values(
  p_user_id UUID,
  p_field_name TEXT
)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
  result_count BIGINT;
BEGIN
  SELECT COUNT(DISTINCT(data->>p_field_name))
  INTO result_count
  FROM contacts 
  WHERE 
    user_id = p_user_id 
    AND data IS NOT NULL 
    AND data->>p_field_name IS NOT NULL 
    AND TRIM(data->>p_field_name) != '';
    
  RETURN result_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION count_unique_jsonb_field_values(UUID, TEXT) TO authenticated;

-- Create an index to speed up JSONB queries on the data column
CREATE INDEX IF NOT EXISTS idx_contacts_data_gin ON contacts USING GIN (data);

-- Create a functional index for faster JSONB field extraction (example for common fields)
-- These can be added for specific fields that are queried frequently
CREATE INDEX IF NOT EXISTS idx_contacts_job_title ON contacts ((data->>'jobTitle')) WHERE data->>'jobTitle' IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts ((data->>'company')) WHERE data->>'company' IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_industry ON contacts ((data->>'industry')) WHERE data->>'industry' IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_source ON contacts ((data->>'source')) WHERE data->>'source' IS NOT NULL; 