-- Seed sample images for testing the gallery
-- This script runs automatically after migrations

-- First, let's create a test user if it doesn't exist
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'test@example.com',
  '$2a$10$rQZ8k8k8k8k8k8k8k8k8k8k8k8k8k8k8k8k8k8k8k8k8k8k8k8k8k8k',
  NOW(),
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Create a profile for the test user
INSERT INTO public.profiles (id, email, username, full_name, avatar_url, credits, is_premium, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'test@example.com',
  'testuser',
  'Test User',
  NULL,
  100,
  false,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Insert sample images with placeholder URLs (these will be replaced with actual Supabase Storage URLs)
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
  'https://placehold.co/1920x1080/FF6B35/FFFFFF?text=Sunset+Mountains',
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
  'https://placehold.co/1920x1080/6366F1/FFFFFF?text=Futuristic+City',
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
  'https://placehold.co/1080x1920/059669/FFFFFF?text=Serene+Forest',
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
  'https://placehold.co/1024x1024/F59E0B/FFFFFF?text=Cute+Cat',
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
  'https://placehold.co/1024x1024/EC4899/FFFFFF?text=Abstract+Art',
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
  'https://placehold.co/1920x1080/0891B2/FFFFFF?text=Vintage+Car',
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
  'https://placehold.co/1080x1920/7C3AED/FFFFFF?text=Magical+Library',
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
  'https://placehold.co/1024x1024/D97706/FFFFFF?text=Steampunk+Robot',
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
