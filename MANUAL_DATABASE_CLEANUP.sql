-- 🛡️ Manual Database Cleanup Script
-- Run this in your Supabase Dashboard SQL Editor if automated reset fails

-- Step 1: Clean up problematic sequences
DROP SEQUENCE IF EXISTS auth.refresh_tokens_id_seq CASCADE;

-- Step 2: Clean up auth tables (this will remove all users)
TRUNCATE auth.refresh_tokens RESTART IDENTITY CASCADE;
TRUNCATE auth.users RESTART IDENTITY CASCADE;
TRUNCATE auth.sessions RESTART IDENTITY CASCADE;
TRUNCATE auth.identities RESTART IDENTITY CASCADE;
TRUNCATE auth.mfa_factors RESTART IDENTITY CASCADE;
TRUNCATE auth.mfa_challenges RESTART IDENTITY CASCADE;

-- Step 3: Clean up public schema
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- Step 4: Re-enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_net";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pgjwt";
CREATE EXTENSION IF NOT EXISTS "pgsodium";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";

-- Step 5: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- Step 6: Set up storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('curated-images', 'curated-images', true),
  ('user-images', 'user-images', false)
ON CONFLICT (id) DO NOTHING;

-- Step 7: Create storage policies
CREATE POLICY "Curated images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'curated-images');

CREATE POLICY "Users can upload their own images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'user-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own images" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'user-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Step 8: Clean up storage buckets
-- Note: Storage cleanup must be done manually in Supabase dashboard
-- Go to Storage section and delete all files from:
-- - curated-images bucket
-- - user-images bucket
-- - any other custom buckets

-- Step 9: Verify cleanup
SELECT 'Database cleanup completed successfully' as status;

-- After running this script, you can:
-- 1. Manually clean storage buckets in Supabase dashboard
-- 2. Run: supabase db push
-- 3. Run: npm run db:seed
-- 4. Run: npm run db:seed-curated
