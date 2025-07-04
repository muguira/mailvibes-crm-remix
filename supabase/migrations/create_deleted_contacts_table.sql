-- Create deleted_contacts table for soft delete functionality
CREATE TABLE public.deleted_contacts (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  status TEXT,
  last_activity TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  data JSONB,
  list_id UUID,
  expiry_date TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Add RLS policy for deleted_contacts
ALTER TABLE public.deleted_contacts ENABLE ROW LEVEL SECURITY;

-- Create policy for users to see only their own deleted contacts
CREATE POLICY "Users can view their own deleted contacts"
  ON public.deleted_contacts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy for users to insert their own deleted contacts
CREATE POLICY "Users can insert their own deleted contacts"
  ON public.deleted_contacts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy for users to delete their own deleted contacts (permanent delete)
CREATE POLICY "Users can delete their own deleted contacts"
  ON public.deleted_contacts
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index on expiry_date for efficient cleanup
CREATE INDEX idx_deleted_contacts_expiry ON public.deleted_contacts(expiry_date);

-- Create index on user_id for efficient queries
CREATE INDEX idx_deleted_contacts_user_id ON public.deleted_contacts(user_id);

-- Create function to automatically purge expired deleted contacts
CREATE OR REPLACE FUNCTION cleanup_expired_deleted_contacts()
RETURNS void AS $$
BEGIN
  DELETE FROM public.deleted_contacts
  WHERE expiry_date < NOW();
  
  -- Log the cleanup operation
  RAISE NOTICE 'Cleaned up expired deleted contacts at %', NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to be called when deleting contacts (soft delete)
CREATE OR REPLACE FUNCTION soft_delete_contacts(contact_ids UUID[], user_id_param UUID)
RETURNS TABLE(moved_count INTEGER) AS $$
DECLARE
  expiry_date_val TIMESTAMP WITH TIME ZONE;
  moved_count_val INTEGER := 0;
BEGIN
  -- Calculate expiry date (90 days from now)
  expiry_date_val := NOW() + INTERVAL '90 days';
  
  -- Move contacts to deleted_contacts table
  INSERT INTO public.deleted_contacts (
    id, user_id, name, email, phone, company, status, 
    last_activity, created_at, updated_at, deleted_at, data, list_id, expiry_date
  )
  SELECT 
    c.id, c.user_id, c.name, c.email, c.phone, c.company, c.status,
    c.last_activity, c.created_at, c.updated_at, NOW(), c.data, c.list_id, expiry_date_val
  FROM public.contacts c
  WHERE c.id = ANY(contact_ids) AND c.user_id = user_id_param;
  
  GET DIAGNOSTICS moved_count_val = ROW_COUNT;
  
  -- Delete from contacts table
  DELETE FROM public.contacts 
  WHERE id = ANY(contact_ids) AND user_id = user_id_param;
  
  RETURN QUERY SELECT moved_count_val;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to restore deleted contacts
CREATE OR REPLACE FUNCTION restore_deleted_contact(contact_id_param UUID, user_id_param UUID)
RETURNS TABLE(restored BOOLEAN) AS $$
DECLARE
  contact_record RECORD;
  restored_val BOOLEAN := FALSE;
BEGIN
  -- Get the deleted contact
  SELECT * INTO contact_record 
  FROM public.deleted_contacts 
  WHERE id = contact_id_param AND user_id = user_id_param;
  
  IF FOUND THEN
    -- Insert back into contacts table
    INSERT INTO public.contacts (
      id, user_id, name, email, phone, company, status,
      last_activity, created_at, updated_at, data, list_id
    ) VALUES (
      contact_record.id, contact_record.user_id, contact_record.name, 
      contact_record.email, contact_record.phone, contact_record.company, 
      contact_record.status, contact_record.last_activity, 
      contact_record.created_at, NOW(), contact_record.data, contact_record.list_id
    );
    
    -- Remove from deleted_contacts table
    DELETE FROM public.deleted_contacts 
    WHERE id = contact_id_param AND user_id = user_id_param;
    
    restored_val := TRUE;
  END IF;
  
  RETURN QUERY SELECT restored_val;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 