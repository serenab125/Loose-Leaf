-- 20261127_profile_photo.sql
-- Profile customization: store the profile photo URL and settings.

-- 1) Store a reference to the uploaded photo object on the profiles table.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS photo_object TEXT;

-- 2) Settings columns: reading reminders and new recommendations.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS reading_reminders BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS new_recommendations BOOLEAN NOT NULL DEFAULT TRUE;

-- 3) Storage bucket for profile photos (create only when it does not exist).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_storage_buckets() WHERE bucket_name = 'profile_images'
  ) THEN
    CREATE STORAGE BUCKET profile_images;
  END IF;
END
$$;

-- 4) Public read access so the avatar image can be displayed from the URL.
ALTER BUCKET "profile_images" SET PUBLIC;

-- 5) Only the owning user may delete their own photo object.
CREATE POLICY IF NOT EXISTS profile_images_delete_own
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'profile_images' AND auth.uid() = owner);
