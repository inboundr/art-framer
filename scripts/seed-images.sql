-- Seed sample images for testing the gallery
-- This script should be run after the database is set up

-- First, let's create a test user if it doesn't exist
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'test@example.com',
  crypt('password123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Create a profile for the test user
INSERT INTO public.profiles (id, username, full_name, avatar_url, credits, is_premium, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'testuser',
  'Test User',
  NULL,
  100,
  false,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Insert sample images
INSERT INTO public.images (
  id,
  user_id,
  prompt,
  negative_prompt,
  aspect_ratio,
  width,
  height,
  model,
  status,
  image_url,
  likes,
  is_public,
  created_at,
  updated_at
) VALUES 
(
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001',
  'A beautiful sunset over a mountain landscape with vibrant orange and purple clouds',
  'blurry, low quality, distorted',
  'wide',
  1920,
  1080,
  '3.0-latest',
  'completed',
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop',
  42,
  true,
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '2 days'
),
(
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001',
  'A futuristic cityscape with flying cars and neon lights',
  'dark, gloomy, broken',
  'wide',
  1920,
  1080,
  '3.0-latest',
  'completed',
  'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&h=600&fit=crop',
  28,
  true,
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '1 day'
),
(
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001',
  'A serene forest with sunlight filtering through the trees',
  'night, scary, dark',
  'tall',
  1080,
  1920,
  '3.0-latest',
  'completed',
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600&h=800&fit=crop',
  35,
  true,
  NOW() - INTERVAL '12 hours',
  NOW() - INTERVAL '12 hours'
),
(
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001',
  'A cute cat sitting on a windowsill with flowers',
  'ugly, scary, aggressive',
  'square',
  1024,
  1024,
  '3.0-latest',
  'completed',
  'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800&h=800&fit=crop',
  67,
  true,
  NOW() - INTERVAL '6 hours',
  NOW() - INTERVAL '6 hours'
),
(
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001',
  'An abstract painting with swirling colors and geometric shapes',
  'realistic, photographic, simple',
  'square',
  1024,
  1024,
  '3.0-latest',
  'completed',
  'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800&h=800&fit=crop',
  19,
  true,
  NOW() - INTERVAL '3 hours',
  NOW() - INTERVAL '3 hours'
),
(
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001',
  'A vintage car driving on a coastal road with ocean views',
  'modern, broken, ugly',
  'wide',
  1920,
  1080,
  '3.0-latest',
  'completed',
  'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&h=600&fit=crop',
  53,
  true,
  NOW() - INTERVAL '1 hour',
  NOW() - INTERVAL '1 hour'
),
(
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001',
  'A magical library with floating books and glowing orbs',
  'modern, simple, boring',
  'tall',
  1080,
  1920,
  '3.0-latest',
  'completed',
  'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&h=800&fit=crop',
  31,
  true,
  NOW() - INTERVAL '30 minutes',
  NOW() - INTERVAL '30 minutes'
),
(
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001',
  'A steampunk robot with brass gears and steam vents',
  'modern, digital, simple',
  'square',
  1024,
  1024,
  '3.0-latest',
  'completed',
  'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&h=800&fit=crop',
  44,
  true,
  NOW() - INTERVAL '15 minutes',
  NOW() - INTERVAL '15 minutes'
);

-- Add some sample likes
INSERT INTO public.image_likes (image_id, user_id, created_at)
SELECT 
  i.id,
  '00000000-0000-0000-0000-000000000001',
  NOW() - (random() * INTERVAL '2 days')
FROM public.images i
WHERE i.is_public = true
LIMIT 20;
