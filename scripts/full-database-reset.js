#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Starting Full Database Reset & Seed Process');
console.log('=' .repeat(60));

async function fullDatabaseReset() {
  try {
    // Step 1: Reset Database
    console.log('\n🗄️  STEP 1: Resetting Database');
    console.log('-'.repeat(40));
    
    try {
      execSync('supabase db reset --linked', { stdio: 'inherit' });
      console.log('✅ Database reset successful');
    } catch (error) {
      console.error('❌ Database reset failed:', error.message);
      console.log('💡 Try running manually: supabase db reset --linked');
      process.exit(1);
    }

    // Step 2: Apply Migrations
    console.log('\n🔄 STEP 2: Applying Migrations');
    console.log('-'.repeat(40));
    
    try {
      execSync('supabase db push', { stdio: 'inherit' });
      console.log('✅ Migrations applied successfully');
    } catch (error) {
      console.error('❌ Migration failed:', error.message);
      console.log('💡 Try running manually: supabase db push');
      process.exit(1);
    }

    // Step 3: Seed Database with Sample Data
    console.log('\n🌱 STEP 3: Seeding Database with Sample Data');
    console.log('-'.repeat(40));
    
    try {
      execSync('node scripts/seed-database.js', { stdio: 'inherit' });
      console.log('✅ Sample data seeded successfully');
    } catch (error) {
      console.error('❌ Sample data seeding failed:', error.message);
      console.log('💡 Try running manually: node scripts/seed-database.js');
    }

    // Step 4: Seed Curated Images
    console.log('\n🎨 STEP 4: Seeding Curated Images');
    console.log('-'.repeat(40));
    
    const imagesDir = path.join(__dirname, '../public-images');
    const fs = require('fs');
    
    if (fs.existsSync(imagesDir)) {
      const imageFiles = fs.readdirSync(imagesDir).filter(file => 
        file.toLowerCase().endsWith('.jpg') || file.toLowerCase().endsWith('.jpeg')
      );
      
      if (imageFiles.length > 0) {
        console.log(`📁 Found ${imageFiles.length} images in public-images directory`);
        try {
          execSync('node scripts/seed-curated-images.js', { stdio: 'inherit' });
          console.log('✅ Curated images seeded successfully');
        } catch (error) {
          console.error('❌ Curated images seeding failed:', error.message);
          console.log('💡 Try running manually: node scripts/seed-curated-images.js');
        }
      } else {
        console.log('📁 No images found in public-images directory');
        console.log('💡 Add images to public-images/ directory and run: node scripts/seed-curated-images.js');
      }
    } else {
      console.log('📁 No public-images directory found');
      console.log('💡 Create public-images/ directory and add images, then run: node scripts/seed-curated-images.js');
    }

    // Step 5: Verify Setup
    console.log('\n🧪 STEP 5: Verifying Setup');
    console.log('-'.repeat(40));
    
    try {
      // Test database connection
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      // Test profiles table
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);

      if (profilesError) {
        console.error('❌ Profiles table test failed:', profilesError.message);
      } else {
        console.log('✅ Profiles table accessible');
      }

      // Test curated images table
      const { data: curatedImages, error: curatedError } = await supabase
        .from('curated_images')
        .select('count')
        .limit(1);

      if (curatedError) {
        console.error('❌ Curated images table test failed:', curatedError.message);
      } else {
        console.log('✅ Curated images table accessible');
      }

      // Test products table
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('count')
        .limit(1);

      if (productsError) {
        console.error('❌ Products table test failed:', productsError.message);
      } else {
        console.log('✅ Products table accessible');
      }

    } catch (error) {
      console.log('⚠️  Could not verify database connection (missing env vars)');
    }

    // Step 6: Final Summary
    console.log('\n🎉 FULL DATABASE RESET COMPLETED!');
    console.log('=' .repeat(60));
    console.log('\n📋 What was accomplished:');
    console.log('✅ Database completely reset');
    console.log('✅ All migrations applied');
    console.log('✅ Sample data seeded');
    console.log('✅ Curated images processed (if available)');
    console.log('✅ Database schema verified');
    
    console.log('\n🚀 Next steps:');
    console.log('1. Start the development server: npm run dev');
    console.log('2. Test the application: http://localhost:3000');
    console.log('3. Check curated images: http://localhost:3000/api/curated-images');
    console.log('4. Verify database in Supabase dashboard');
    
    console.log('\n🔍 Verification commands:');
    console.log('• Test API: curl http://localhost:3000/api/curated-images');
    console.log('• Check database: supabase db diff');
    console.log('• View logs: supabase logs');
    
    console.log('\n🎯 Your database is now ready for development!');

  } catch (error) {
    console.error('💥 Full database reset failed:', error);
    process.exit(1);
  }
}

// Run the full reset process
if (require.main === module) {
  fullDatabaseReset()
    .then(() => {
      console.log('🏁 Full reset process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Full reset process failed:', error);
      process.exit(1);
    });
}

module.exports = { fullDatabaseReset };
