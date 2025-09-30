-- Create curated images system for home page
-- This replaces the complex user-generated image system with a simple curated bucket

-- Create curated_images table
CREATE TABLE IF NOT EXISTS public.curated_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'art',
  tags TEXT[] DEFAULT '{}',
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  aspect_ratio TEXT NOT NULL DEFAULT 'square',
  display_order INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create curated-images storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('curated-images', 'curated-images', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for curated images
CREATE POLICY "Curated images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'curated-images');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_curated_images_category ON public.curated_images(category);
CREATE INDEX IF NOT EXISTS idx_curated_images_active ON public.curated_images(is_active);
CREATE INDEX IF NOT EXISTS idx_curated_images_featured ON public.curated_images(is_featured);
CREATE INDEX IF NOT EXISTS idx_curated_images_display_order ON public.curated_images(display_order);
CREATE INDEX IF NOT EXISTS idx_curated_images_created_at ON public.curated_images(created_at);

-- Enable RLS but allow public access
ALTER TABLE public.curated_images ENABLE ROW LEVEL SECURITY;

-- Allow public read access to curated images
CREATE POLICY "Public can view curated images" ON public.curated_images
  FOR SELECT USING (is_active = true);

-- Only allow authenticated users to manage curated images (for admin)
CREATE POLICY "Authenticated users can manage curated images" ON public.curated_images
  FOR ALL USING (auth.role() = 'authenticated');

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_curated_images_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_curated_images_updated_at
  BEFORE UPDATE ON public.curated_images
  FOR EACH ROW EXECUTE FUNCTION public.handle_curated_images_updated_at();

-- Insert some sample curated images (these will be replaced with real curated content)
INSERT INTO public.curated_images (title, description, category, tags, image_url, width, height, aspect_ratio, display_order, is_featured) VALUES
('Abstract Art 1', 'Beautiful abstract digital art', 'abstract', ARRAY['abstract', 'digital', 'art'], 'https://via.placeholder.com/800x800/FF6B6B/FFFFFF?text=Abstract+1', 800, 800, 'square', 1, true),
('Nature Scene 1', 'Serene nature landscape', 'nature', ARRAY['nature', 'landscape', 'peaceful'], 'https://via.placeholder.com/800x600/4ECDC4/FFFFFF?text=Nature+1', 800, 600, 'wide', 2, false),
('Portrait Art 1', 'Elegant portrait artwork', 'portrait', ARRAY['portrait', 'elegant', 'art'], 'https://via.placeholder.com/600x800/45B7D1/FFFFFF?text=Portrait+1', 600, 800, 'tall', 3, true),
('Modern Design 1', 'Contemporary design piece', 'modern', ARRAY['modern', 'contemporary', 'design'], 'https://via.placeholder.com/800x800/96CEB4/FFFFFF?text=Modern+1', 800, 800, 'square', 4, false),
('Artistic Vision 1', 'Creative artistic vision', 'artistic', ARRAY['artistic', 'creative', 'vision'], 'https://via.placeholder.com/800x600/FFEAA7/FFFFFF?text=Artistic+1', 800, 600, 'wide', 5, true);
