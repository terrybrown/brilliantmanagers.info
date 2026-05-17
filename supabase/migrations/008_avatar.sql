-- Add avatar_path to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_path text;

-- Create the avatars bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', false)
ON CONFLICT (id) DO NOTHING;

-- Owner can upload
CREATE POLICY "avatar insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Owner can replace
CREATE POLICY "avatar update" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Owner can delete their own avatar
CREATE POLICY "avatar delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Owner + active connections can read
CREATE POLICY "avatar select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'avatars'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR EXISTS (
        SELECT 1 FROM public.connections
        WHERE status = 'active'
          AND (
            (manager_id = auth.uid() AND direct_report_id::text = (storage.foldername(name))[1])
            OR (direct_report_id = auth.uid() AND manager_id::text = (storage.foldername(name))[1])
          )
      )
    )
  );
