-- Fix RLS policies to allow anonymous access to public images
-- Drop existing policies
DROP POLICY IF EXISTS "Public images are viewable by everyone" ON public.images;
DROP POLICY IF EXISTS "Users can view own images" ON public.images;

-- Create new policies that work with anonymous users
CREATE POLICY "Public images are viewable by everyone" ON public.images
  FOR SELECT USING (is_public = true);

CREATE POLICY "Users can view own images" ON public.images
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND auth.uid() = user_id
  );

-- Also fix the image_likes policy for anonymous access
DROP POLICY IF EXISTS "Users can view all likes" ON public.image_likes;
CREATE POLICY "Users can view all likes" ON public.image_likes
  FOR SELECT USING (true);
