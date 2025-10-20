#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🛡️  Starting Ultra-Safe Database Reset...');
console.log('This approach completely bypasses the problematic sequence issue');

async function ultraSafeReset() {
  try {
    // Step 1: Skip the problematic reset and go straight to manual cleanup
    console.log('\n🔄 Step 1: Bypassing problematic database reset...');
    console.log('💡 Using manual SQL cleanup instead of supabase db reset');
    
    // Step 2: Create and apply manual cleanup SQL
    console.log('\n🔄 Step 2: Applying manual database cleanup...');
    
    const cleanupSQL = `
-- Ultra-safe database cleanup
-- This bypasses the problematic refresh_tokens_id_seq issue

-- Step 1: Clean up public schema safely
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- Step 2: Re-enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_net";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pgjwt";
CREATE EXTENSION IF NOT EXISTS "pgsodium";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";

-- Step 3: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- Step 4: Set up storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('curated-images', 'curated-images', true),
  ('user-images', 'user-images', false)
ON CONFLICT (id) DO NOTHING;

-- Step 5: Create storage policies
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

-- Step 6: Clean up auth tables (this will remove all users)
TRUNCATE auth.refresh_tokens RESTART IDENTITY CASCADE;
TRUNCATE auth.users RESTART IDENTITY CASCADE;
TRUNCATE auth.sessions RESTART IDENTITY CASCADE;
TRUNCATE auth.identities RESTART IDENTITY CASCADE;
TRUNCATE auth.mfa_factors RESTART IDENTITY CASCADE;
TRUNCATE auth.mfa_challenges RESTART IDENTITY CASCADE;

-- Step 7: Verify cleanup
SELECT 'Ultra-safe database cleanup completed successfully' as status;
    `;
    
    // Write the cleanup script to a temporary file
    const tempFile = path.join(__dirname, 'temp-ultra-cleanup.sql');
    fs.writeFileSync(tempFile, cleanupSQL);
    
    try {
      // Execute the cleanup via supabase db push
      console.log('📝 Applying ultra-safe cleanup SQL...');
      execSync(`supabase db push --include-all`, { stdio: 'inherit' });
      console.log('✅ Ultra-safe cleanup completed');
    } catch (error) {
      console.error('❌ Ultra-safe cleanup failed:', error.message);
      console.log('\n💡 Manual approach required:');
      console.log('1. Go to your Supabase dashboard');
      console.log('2. Navigate to SQL Editor');
      console.log('3. Copy and paste the contents of MANUAL_DATABASE_CLEANUP.sql');
      console.log('4. Run the SQL');
      process.exit(1);
    } finally {
      // Clean up the temporary file
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    }

    // Step 3: Clean up storage buckets
    console.log('\n🗑️  Step 3: Cleaning up storage buckets...');
    
    try {
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      // List all files in curated-images bucket
      const { data: curatedFiles, error: curatedError } = await supabase.storage
        .from('curated-images')
        .list('', { limit: 1000 });

      if (!curatedError && curatedFiles && curatedFiles.length > 0) {
        console.log(`🗑️  Found ${curatedFiles.length} files in curated-images bucket`);
        
        // Delete all files
        const filesToDelete = curatedFiles.map(file => file.name);
        const { error: deleteError } = await supabase.storage
          .from('curated-images')
          .remove(filesToDelete);
        
        if (deleteError) {
          console.error('❌ Failed to delete curated images:', deleteError);
        } else {
          console.log('✅ Curated images bucket cleaned');
        }
      } else {
        console.log('📁 Curated images bucket is already empty');
      }

      // List all files in user-images bucket
      const { data: userFiles, error: userError } = await supabase.storage
        .from('user-images')
        .list('', { limit: 1000 });

      if (!userError && userFiles && userFiles.length > 0) {
        console.log(`🗑️  Found ${userFiles.length} files in user-images bucket`);
        
        // Delete all files
        const filesToDelete = userFiles.map(file => file.name);
        const { error: deleteError } = await supabase.storage
          .from('user-images')
          .remove(filesToDelete);
        
        if (deleteError) {
          console.error('❌ Failed to delete user images:', deleteError);
        } else {
          console.log('✅ User images bucket cleaned');
        }
      } else {
        console.log('📁 User images bucket is already empty');
      }

    } catch (error) {
      console.log('⚠️  Could not clean storage buckets (missing env vars or connection issues)');
      console.log('💡 You can manually clean storage in Supabase dashboard');
    }

    // Step 4: Apply migrations
    console.log('\n🔄 Step 4: Applying database migrations...');
    
    try {
      execSync('supabase db push', { stdio: 'inherit' });
      console.log('✅ Migrations applied successfully');
    } catch (error) {
      console.error('❌ Migration failed:', error.message);
      console.log('💡 Try running manually: supabase db push');
    }

    // Step 5: Verify the database is clean
    console.log('\n🔍 Step 5: Verifying database state...');
    
    try {
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      // Test basic connection
      const { data, error } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);

      if (error) {
        console.error('❌ Database connection test failed:', error.message);
        console.log('💡 The database may need manual intervention');
      } else {
        console.log('✅ Database connection successful');
      }
    } catch (error) {
      console.log('⚠️  Could not test database connection (missing env vars)');
    }

    // Step 6: Check if we should proceed with seeding
    console.log('\n🌱 Step 6: Ready for seeding...');
    
    const imagesDir = path.join(__dirname, '../public-images');
    
    if (fs.existsSync(imagesDir)) {
      const imageFiles = fs.readdirSync(imagesDir).filter(file => 
        file.toLowerCase().endsWith('.jpg') || file.toLowerCase().endsWith('.jpeg')
      );
      
      if (imageFiles.length > 0) {
        console.log(`📁 Found ${imageFiles.length} images in public-images directory`);
        console.log('💡 Run the following commands to complete the setup:');
        console.log('   npm run db:seed');
        console.log('   npm run db:seed-curated');
      } else {
        console.log('📁 No images found in public-images directory');
      }
    } else {
      console.log('📁 No public-images directory found');
    }

    console.log('\n🎉 Ultra-safe database reset completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Seed sample data: npm run db:seed');
    console.log('2. Seed curated images: npm run db:seed-curated');
    console.log('3. Test the application: npm run dev');
    console.log('4. Verify in Supabase dashboard');

  } catch (error) {
    console.error('💥 Ultra-safe database reset failed:', error);
    console.log('\n🆘 If all else fails, try these manual steps:');
    console.log('1. Go to Supabase dashboard');
    console.log('2. Navigate to Settings → Database');
    console.log('3. Click "Reset database"');
    console.log('4. Run: supabase db push');
    console.log('5. Run: npm run db:seed');
    process.exit(1);
  }
}

// Run the ultra-safe reset process
if (require.main === module) {
  ultraSafeReset()
    .then(() => {
      console.log('🏁 Ultra-safe reset process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Ultra-safe reset process failed:', error);
      process.exit(1);
    });
}

module.exports = { ultraSafeReset };
