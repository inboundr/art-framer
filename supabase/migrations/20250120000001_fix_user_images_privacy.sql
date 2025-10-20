-- Fix RLS policies to ensure user images are always private
-- Only curated images should be public

-- Drop the problematic policy that allows public access to user images
DROP POLICY IF EXISTS "Images are viewable by everyone if public" ON public.images;
DROP POLICY IF EXISTS "Public images are viewable by everyone" ON public.images;

-- Ensure user images are only accessible by their owner
-- This policy should be the ONLY policy for user images
-- First drop it if it exists, then recreate it
DROP POLICY IF EXISTS "Users can view own images" ON public.images;
CREATE POLICY "Users can view own images" ON public.images
  FOR SELECT USING (auth.uid() = user_id);

-- Keep the existing policies for user image management
-- Users can insert their own images
DROP POLICY IF EXISTS "Users can insert own images" ON public.images;
CREATE POLICY "Users can insert own images" ON public.images
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own images
DROP POLICY IF EXISTS "Users can update own images" ON public.images;
CREATE POLICY "Users can update own images" ON public.images
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own images
DROP POLICY IF EXISTS "Users can delete own images" ON public.images;
CREATE POLICY "Users can delete own images" ON public.images
  FOR DELETE USING (auth.uid() = user_id);

-- Ensure curated images remain public (this should already exist)
-- This allows non-authenticated users to see curated images on home page
DROP POLICY IF EXISTS "Public can view curated images" ON public.curated_images;
CREATE POLICY "Public can view curated images" ON public.curated_images
  FOR SELECT USING (is_active = true);

-- Add a comment to clarify the architecture
COMMENT ON TABLE public.images IS 'User-generated images - always private, only accessible by the user who created them';
COMMENT ON TABLE public.curated_images IS 'Admin-curated images - always public, accessible by everyone for home page gallery';

-- Verify the policies are correct
-- This query will show all current policies for the images table
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual 
FROM pg_policies 
WHERE tablename = 'images'
ORDER BY policyname;
