-- Comprehensive RLS fix to ensure the trigger can work properly
-- This migration ensures all necessary permissions are in place

-- Drop all existing policies on profiles table to start fresh
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow profile creation during signup" ON public.profiles;

-- Create comprehensive policies for profiles table
-- Allow public read access to profiles (for user discovery, etc.)
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

-- Allow users to view their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Allow profile creation during signup (needed for the trigger)
-- This policy allows the trigger function to insert profiles
CREATE POLICY "Allow profile creation during signup" ON public.profiles
  FOR INSERT WITH CHECK (true);

-- Ensure the trigger function has the right permissions
-- Grant necessary permissions to the function
GRANT USAGE ON SCHEMA public TO postgres;
GRANT INSERT ON public.profiles TO postgres;
