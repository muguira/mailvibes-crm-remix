-- Create storage bucket for email attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'email-attachments',
  'email-attachments', 
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp', 'image/tiff']
) ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for the email-attachments bucket
CREATE POLICY "Users can view their own email attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'email-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can upload their own email attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'email-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own email attachments"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'email-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own email attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'email-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
); 