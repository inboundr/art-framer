-- Add login tracking fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN login_count INTEGER DEFAULT 0,
ADD COLUMN last_login_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN has_seen_styles_onboarding BOOLEAN DEFAULT FALSE;

-- Create function to track user logins
CREATE OR REPLACE FUNCTION public.handle_user_login()
RETURNS TRIGGER AS $$
BEGIN
  -- Only increment on sign in events, not initial session loads
  IF NEW.last_sign_in_at IS DISTINCT FROM OLD.last_sign_in_at THEN
    UPDATE public.profiles 
    SET 
      login_count = COALESCE(login_count, 0) + 1,
      last_login_at = NEW.last_sign_in_at
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to track logins on auth.users updates
CREATE TRIGGER on_auth_user_login
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_login();
