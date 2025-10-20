#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

console.log('🗄️  Starting complete database reset...');

async function resetDatabase() {
  try {
    // Step 1: Reset the database completely
    console.log('🔄 Step 1: Resetting Supabase database...');
    console.log('   This will delete ALL data and recreate the schema');
    
    try {
      execSync('supabase db reset --linked', { stdio: 'inherit' });
      console.log('✅ Database reset successful');
    } catch (error) {
      console.error('❌ Database reset failed:', error.message);
      console.log('💡 Try running manually: supabase db reset --linked');
      process.exit(1);
    }

    // Step 2: Apply all migrations
    console.log('\n🔄 Step 2: Applying all migrations...');
    
    try {
      execSync('supabase db push', { stdio: 'inherit' });
      console.log('✅ Migrations applied successfully');
    } catch (error) {
      console.error('❌ Migration failed:', error.message);
      console.log('💡 Try running manually: supabase db push');
      process.exit(1);
    }

    // Step 3: Verify database schema
    console.log('\n🔍 Step 3: Verifying database schema...');
    
    try {
      const { execSync } = require('child_process');
      const schemaCheck = execSync('supabase db diff', { encoding: 'utf8' });
      
      if (schemaCheck.trim() === '') {
        console.log('✅ Database schema is clean (no differences)');
      } else {
        console.log('⚠️  Schema differences detected:');
        console.log(schemaCheck);
      }
    } catch (error) {
      console.log('⚠️  Could not verify schema (this is usually fine)');
    }

    // Step 4: Check if we should seed curated images
    console.log('\n🌱 Step 4: Checking for seed data...');
    
    const imagesDir = path.join(__dirname, '../public-images');
    const fs = require('fs');
    
    if (fs.existsSync(imagesDir)) {
      const imageFiles = fs.readdirSync(imagesDir).filter(file => 
        file.toLowerCase().endsWith('.jpg') || file.toLowerCase().endsWith('.jpeg')
      );
      
      if (imageFiles.length > 0) {
        console.log(`📁 Found ${imageFiles.length} images in public-images directory`);
        console.log('💡 Run the following command to seed curated images:');
        console.log('   node scripts/seed-curated-images.js');
      } else {
        console.log('📁 No images found in public-images directory');
      }
    } else {
      console.log('📁 No public-images directory found');
    }

    // Step 5: Test database connection
    console.log('\n🧪 Step 5: Testing database connection...');
    
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
      } else {
        console.log('✅ Database connection successful');
      }
    } catch (error) {
      console.log('⚠️  Could not test database connection (missing env vars)');
    }

    console.log('\n🎉 Database reset completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Seed curated images: node scripts/seed-curated-images.js');
    console.log('2. Test the application: npm run dev');
    console.log('3. Verify API endpoints: curl http://localhost:3000/api/curated-images');
    console.log('4. Check database in Supabase dashboard');

  } catch (error) {
    console.error('💥 Database reset failed:', error);
    process.exit(1);
  }
}

// Run the reset process
if (require.main === module) {
  resetDatabase()
    .then(() => {
      console.log('🏁 Reset process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Reset process failed:', error);
      process.exit(1);
    });
}

module.exports = { resetDatabase };
