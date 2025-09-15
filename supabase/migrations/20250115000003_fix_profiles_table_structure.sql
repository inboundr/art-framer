-- Fix profiles table structure to ensure it has all required fields
-- This migration ensures the profiles table has the correct structure for both schemas

-- First, check if email column exists and add it if it doesn't
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'email'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN email TEXT UNIQUE NOT NULL DEFAULT '';
    END IF;
END $$;

-- Update the trigger function to handle all possible field combinations
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Try to insert with email field first (for initial schema)
  BEGIN
    INSERT INTO public.profiles (id, email, username, full_name)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '')
    );
  EXCEPTION
    WHEN undefined_column THEN
      -- If email column doesn't exist, insert without it (for complete schema)
      INSERT INTO public.profiles (id, username, full_name)
      VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '')
      );
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
