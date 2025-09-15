# Setup Remote Supabase Database

## Current Status

✅ **API Connection**: Working (no more 404 error)  
❌ **Database Schema**: Missing - the `images` table doesn't exist yet

## Solution: Create Database Schema via Supabase Dashboard

### Step 1: Access Supabase Dashboard

1. Go to [https://supabase.com/dashboard/project/irugsjzjqdxulliobuwt](https://supabase.com/dashboard/project/irugsjzjqdxulliobuwt)
2. Navigate to **SQL Editor** in the left sidebar

### Step 2: Run the Database Schema

Copy and paste the following SQL into the SQL Editor and run it:

```sql
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
CREATE TYPE image_status AS ENUM ('pending', 'generating', 'completed', 'failed');
CREATE TYPE image_aspect_ratio AS ENUM ('square', 'tall', 'wide');
CREATE TYPE generation_model AS ENUM ('3.0-latest', '3.0', '2.1', '1.5');

-- Create users table (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  credits INTEGER DEFAULT 100,
  is_premium BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create images table
CREATE TABLE public.images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  prompt TEXT NOT NULL,
  negative_prompt TEXT,
  aspect_ratio image_aspect_ratio NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  model generation_model NOT NULL,
  status image_status DEFAULT 'pending',
  image_url TEXT,
  thumbnail_url TEXT,
  metadata JSONB,
  likes INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create image_likes table for tracking user likes
CREATE TABLE public.image_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  image_id UUID REFERENCES public.images(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, image_id)
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.image_likes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Public images are viewable by everyone" ON public.images
  FOR SELECT USING (is_public = true);

CREATE POLICY "Users can view own images" ON public.images
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own images" ON public.images
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own images" ON public.images
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own images" ON public.images
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_images_user_id ON public.images(user_id);
CREATE INDEX idx_images_status ON public.images(status);
CREATE INDEX idx_images_created_at ON public.images(created_at DESC);
CREATE INDEX idx_images_public ON public.images(is_public) WHERE is_public = true;
CREATE INDEX idx_image_likes_image_id ON public.image_likes(image_id);
```

### Step 3: Test the API

After running the SQL, test your API endpoint:

```bash
curl -X GET 'https://irugsjzjqdxulliobuwt.supabase.co/rest/v1/images?select=*&is_public=eq.true' \
  -H 'apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlydWdzanpqcWR4dWxsaW9idXd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4NTY4MDgsImV4cCI6MjA3MzQzMjgwOH0.ehJ7DhZMVuHCibUqFvNzdT5rWE4r362pSaUWeCwK6OQ' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlydWdzanpqcWR4dWxsaW9idXd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4NTY4MDgsImV4cCI6MjA3MzQzMjgwOH0.ehJ7DhZMVuHCibUqFvNzdT5rWE4r362pSaUWeCwK6OQ'
```

This should return an empty array `[]` instead of an error.

## Alternative: Get Database Password

If you prefer to use the CLI approach, you can:

1. Go to your Supabase dashboard
2. Navigate to **Settings** → **Database**
3. Find your database password
4. Then run: `supabase db push` and enter the password when prompted
