-- 🔒 User Images Privacy Fix - Run this in Supabase Dashboard SQL Editor
-- This ensures user-generated images are always private

-- Step 1: Remove problematic policies that allow public access to user images
DROP POLICY IF EXISTS "Images are viewable by everyone if public" ON public.images;
DROP POLICY IF EXISTS "Public images are viewable by everyone" ON public.images;

-- Step 2: Ensure user images are only accessible by their owner
DROP POLICY IF EXISTS "Users can view own images" ON public.images;
CREATE POLICY "Users can view own images" ON public.images
  FOR SELECT USING (auth.uid() = user_id);

-- Step 3: Ensure other user image policies exist
DROP POLICY IF EXISTS "Users can insert own images" ON public.images;
CREATE POLICY "Users can insert own images" ON public.images
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own images" ON public.images;
CREATE POLICY "Users can update own images" ON public.images
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own images" ON public.images;
CREATE POLICY "Users can delete own images" ON public.images
  FOR DELETE USING (auth.uid() = user_id);

-- Step 4: Ensure curated images remain public (for home page)
DROP POLICY IF EXISTS "Public can view curated images" ON public.curated_images;
CREATE POLICY "Public can view curated images" ON public.curated_images
  FOR SELECT USING (is_active = true);

-- Step 5: Add comments to clarify the architecture
COMMENT ON TABLE public.images IS 'User-generated images - always private, only accessible by the user who created them';
COMMENT ON TABLE public.curated_images IS 'Admin-curated images - always public, accessible by everyone for home page gallery';

-- Step 6: Verify the policies (this will show current policies)
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
