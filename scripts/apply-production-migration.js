#!/usr/bin/env node

/**
 * Script to apply curated images migration to production database
 * This ensures the curated_images table and policies exist in production
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

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

async function applyMigration() {
  console.log('🚀 Applying curated images migration to production...');
  
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250115000009_create_curated_images_system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration SQL loaded, applying to production database...');
    
    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    
    if (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
    
    console.log('✅ Migration applied successfully to production database');
    
    // Verify the table exists
    const { data: tableCheck, error: tableError } = await supabase
      .from('curated_images')
      .select('count')
      .limit(1);
    
    if (tableError) {
      console.error('❌ Table verification failed:', tableError);
      throw tableError;
    }
    
    console.log('✅ curated_images table verified in production');
    
  } catch (error) {
    console.error('❌ Error applying migration:', error);
    process.exit(1);
  }
}

async function main() {
  console.log('🔧 Production Database Migration Tool');
  console.log('=====================================');
  console.log(`📡 Target: ${supabaseUrl}`);
  console.log('');
  
  await applyMigration();
  
  console.log('');
  console.log('🎉 Migration completed successfully!');
  console.log('📋 Next steps:');
  console.log('   1. Run: node scripts/upload-curated-images.js');
  console.log('   2. Verify images load in production');
  console.log('   3. Test cart functionality');
}

main().catch(console.error);
