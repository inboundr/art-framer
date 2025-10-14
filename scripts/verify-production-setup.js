#!/usr/bin/env node

/**
 * Script to verify production setup for curated images
 * This checks if everything is properly configured in production
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyProductionSetup() {
  console.log('🔍 Verifying production setup for curated images...');
  console.log('');
  
  let allChecksPassed = true;
  
  // Check 1: Database Connection
  console.log('1️⃣ Testing database connection...');
  try {
    const { data, error } = await supabase
      .from('curated_images')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('   ❌ Database connection failed:', error.message);
      allChecksPassed = false;
    } else {
      console.log('   ✅ Database connection successful');
    }
  } catch (err) {
    console.error('   ❌ Database connection error:', err.message);
    allChecksPassed = false;
  }
  
  // Check 2: Table Exists
  console.log('');
  console.log('2️⃣ Checking if curated_images table exists...');
  try {
    const { data, error } = await supabase
      .from('curated_images')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('   ❌ curated_images table does not exist:', error.message);
      console.error('   💡 Solution: Run migration script first');
      allChecksPassed = false;
    } else {
      console.log('   ✅ curated_images table exists');
    }
  } catch (err) {
    console.error('   ❌ Table check error:', err.message);
    allChecksPassed = false;
  }
  
  // Check 3: Data Exists
  console.log('');
  console.log('3️⃣ Checking if curated images data exists...');
  try {
    const { data, error, count } = await supabase
      .from('curated_images')
      .select('*', { count: 'exact' })
      .eq('is_active', true);
    
    if (error) {
      console.error('   ❌ Error fetching curated images:', error.message);
      allChecksPassed = false;
    } else {
      console.log(`   ✅ Found ${count} active curated images`);
      if (count === 0) {
        console.log('   ⚠️  No curated images found - need to seed data');
        allChecksPassed = false;
      }
    }
  } catch (err) {
    console.error('   ❌ Data check error:', err.message);
    allChecksPassed = false;
  }
  
  // Check 4: RLS Policies
  console.log('');
  console.log('4️⃣ Checking RLS policies...');
  try {
    const { data, error } = await supabase
      .from('curated_images')
      .select('id, title, is_active')
      .eq('is_active', true)
      .limit(5);
    
    if (error) {
      console.error('   ❌ RLS policy issue:', error.message);
      console.error('   💡 Solution: Check RLS policies in Supabase dashboard');
      allChecksPassed = false;
    } else {
      console.log('   ✅ RLS policies working correctly');
    }
  } catch (err) {
    console.error('   ❌ RLS check error:', err.message);
    allChecksPassed = false;
  }
  
  // Check 5: API Endpoint
  console.log('');
  console.log('5️⃣ Testing API endpoint...');
  try {
    const response = await fetch(`${supabaseUrl.replace('supabase.co', 'supabase.co')}/rest/v1/curated_images?select=*&is_active=eq.true&limit=5`, {
      headers: {
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ API endpoint working - found ${data.length} images`);
    } else {
      console.error('   ❌ API endpoint failed:', response.status, response.statusText);
      allChecksPassed = false;
    }
  } catch (err) {
    console.error('   ❌ API test error:', err.message);
    allChecksPassed = false;
  }
  
  // Summary
  console.log('');
  console.log('📊 VERIFICATION SUMMARY');
  console.log('=======================');
  
  if (allChecksPassed) {
    console.log('✅ All checks passed! Production setup is correct.');
    console.log('');
    console.log('🎉 Next steps:');
    console.log('   1. Test your production site');
    console.log('   2. Verify images load on home page');
    console.log('   3. Test cart functionality');
  } else {
    console.log('❌ Some checks failed. Please fix the issues above.');
    console.log('');
    console.log('🔧 Recommended actions:');
    console.log('   1. Run: node scripts/apply-production-migration.js');
    console.log('   2. Run: node scripts/seed-production-curated-images.js');
    console.log('   3. Run this verification script again');
  }
}

async function main() {
  console.log('🔍 Production Setup Verification Tool');
  console.log('=====================================');
  console.log(`📡 Target: ${supabaseUrl}`);
  console.log('');
  
  await verifyProductionSetup();
}

main().catch(console.error);
