-- Fix username and email conflicts in profile creation
-- This migration updates the handle_new_user function to handle conflicts gracefully

-- Update the trigger function to handle username/email conflicts
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  username_counter INTEGER := 1;
  email_exists BOOLEAN := FALSE;
  username_exists BOOLEAN := FALSE;
BEGIN
  -- Extract base username from email
  base_username := split_part(NEW.email, '@', 1);
  final_username := base_username;
  
  -- Check if email already exists in profiles
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE email = NEW.email) INTO email_exists;
  
  -- If email exists, we need to handle this conflict
  IF email_exists THEN
    -- For now, we'll skip creating the profile if email exists
    -- This prevents duplicate email errors
    RAISE WARNING 'Profile with email % already exists, skipping profile creation', NEW.email;
    RETURN NEW;
  END IF;
  
  -- Check if username already exists and generate unique one
  LOOP
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE username = final_username) INTO username_exists;
    
    IF NOT username_exists THEN
      EXIT; -- Username is unique, we can use it
    END IF;
    
    -- Username exists, try with a number suffix
    username_counter := username_counter + 1;
    final_username := base_username || username_counter;
    
    -- Prevent infinite loop (max 999 attempts)
    IF username_counter > 999 THEN
      final_username := base_username || '_' || extract(epoch from now())::text;
      EXIT;
    END IF;
  END LOOP;
  
  -- Try to insert with email field first (for initial schema)
  BEGIN
    INSERT INTO public.profiles (id, email, username, full_name)
    VALUES (
      NEW.id,
      NEW.email,
      final_username,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '')
    );
  EXCEPTION
    WHEN undefined_column THEN
      -- If email column doesn't exist, insert without it (for complete schema)
      INSERT INTO public.profiles (id, username, full_name)
      VALUES (
        NEW.id,
        final_username,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '')
      );
    WHEN unique_violation THEN
      -- Handle any remaining unique constraint violations gracefully
      RAISE WARNING 'Profile creation failed due to unique constraint violation for user %', NEW.email;
      RETURN NEW;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
