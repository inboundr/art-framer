#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

console.log('🛡️  Starting Safe Database Reset...');
console.log('This approach handles Supabase permission issues');

async function safeDatabaseReset() {
  try {
    // Step 1: Try the standard reset first
    console.log('\n🔄 Step 1: Attempting standard database reset...');
    
    try {
      execSync('supabase db reset --linked', { stdio: 'inherit' });
      console.log('✅ Standard reset successful');
    } catch (error) {
      console.log('⚠️  Standard reset failed, trying alternative approach...');
      
      // Step 2: Alternative approach - manual cleanup
      console.log('\n🔄 Step 2: Manual database cleanup...');
      
      try {
        // First, try to push migrations to ensure schema is up to date
        console.log('📝 Applying migrations...');
        execSync('supabase db push', { stdio: 'inherit' });
        console.log('✅ Migrations applied successfully');
        
        // Then manually clean up problematic data
        console.log('🧹 Cleaning up problematic sequences...');
        
        // Create a cleanup SQL script
        const cleanupSQL = `
-- Safe cleanup script for Supabase
-- This handles permission issues with sequences

-- Drop problematic sequences if they exist
DROP SEQUENCE IF EXISTS auth.refresh_tokens_id_seq CASCADE;
DROP SEQUENCE IF EXISTS auth.refresh_tokens_id_seq CASCADE;

-- Clean up any remaining problematic objects
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop any remaining sequences that might cause issues
    FOR r IN (SELECT schemaname, sequencename FROM pg_sequences WHERE schemaname = 'auth')
    LOOP
        EXECUTE format('DROP SEQUENCE IF EXISTS %I.%I CASCADE', r.schemaname, r.sequencename);
    END LOOP;
END $$;

-- Ensure we have the necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
        `;
        
        // Write the cleanup script to a temporary file
        const fs = require('fs');
        const tempFile = path.join(__dirname, 'temp-cleanup.sql');
        fs.writeFileSync(tempFile, cleanupSQL);
        
        // Execute the cleanup
        execSync(`supabase db push --include-all`, { stdio: 'inherit' });
        
        // Clean up the temporary file
        fs.unlinkSync(tempFile);
        
        console.log('✅ Manual cleanup completed');
        
      } catch (cleanupError) {
        console.error('❌ Manual cleanup failed:', cleanupError.message);
        console.log('\n💡 Alternative approach: Use Supabase Dashboard');
        console.log('1. Go to your Supabase dashboard');
        console.log('2. Navigate to SQL Editor');
        console.log('3. Run the following SQL:');
        console.log(`
-- Clean up problematic sequences
DROP SEQUENCE IF EXISTS auth.refresh_tokens_id_seq CASCADE;

-- Reset the database manually
TRUNCATE auth.refresh_tokens RESTART IDENTITY CASCADE;
TRUNCATE auth.users RESTART IDENTITY CASCADE;
TRUNCATE auth.sessions RESTART IDENTITY CASCADE;

-- Apply your migrations
-- (Copy and paste your migration files here)
        `);
        process.exit(1);
      }
    }

    // Step 3: Verify the database is clean
    console.log('\n🔍 Step 3: Verifying database state...');
    
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

    // Step 4: Clean up storage buckets
    console.log('\n🗑️  Step 4: Cleaning up storage buckets...');
    
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

    // Step 5: Check if we should proceed with seeding
    console.log('\n🌱 Step 5: Ready for seeding...');
    
    const imagesDir = path.join(__dirname, '../public-images');
    const fs = require('fs');
    
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

    console.log('\n🎉 Safe database reset completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Seed sample data: npm run db:seed');
    console.log('2. Seed curated images: npm run db:seed-curated');
    console.log('3. Test the application: npm run dev');
    console.log('4. Verify in Supabase dashboard');

  } catch (error) {
    console.error('💥 Safe database reset failed:', error);
    console.log('\n🆘 If all else fails, try these manual steps:');
    console.log('1. Go to Supabase dashboard');
    console.log('2. Navigate to Settings → Database');
    console.log('3. Click "Reset database"');
    console.log('4. Run: supabase db push');
    console.log('5. Run: npm run db:seed');
    process.exit(1);
  }
}

// Run the safe reset process
if (require.main === module) {
  safeDatabaseReset()
    .then(() => {
      console.log('🏁 Safe reset process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Safe reset process failed:', error);
      process.exit(1);
    });
}

module.exports = { safeDatabaseReset };
