#!/usr/bin/env node

/**
 * Script to sync existing images from Supabase storage to production database
 * This will create database records for all images that exist in storage
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

async function syncStorageToProductionDB() {
  console.log('🔄 SYNCING STORAGE TO PRODUCTION DATABASE');
  console.log('==========================================');
  console.log(`📡 Target: ${supabaseUrl}`);
  console.log('');
  
  try {
    // Step 1: List all files in storage bucket
    console.log('1️⃣ Listing files in curated-images storage bucket...');
    const { data: storageFiles, error: listError } = await supabase.storage
      .from('curated-images')
      .list('', {
        limit: 1000,
        sortBy: { column: 'created_at', order: 'asc' }
      });
    
    if (listError) {
      console.error('❌ Error listing storage files:', listError);
      throw listError;
    }
    
    console.log(`   📁 Found ${storageFiles.length} files in storage`);
    
    if (storageFiles.length === 0) {
      console.log('   ⚠️  No files found in storage bucket');
      console.log('   💡 Make sure the bucket exists and has files');
      return;
    }
    
    // Step 2: Check current database records
    console.log('');
    console.log('2️⃣ Checking current database records...');
    const { data: existingRecords, error: dbError } = await supabase
      .from('curated_images')
      .select('id, image_url')
      .limit(10);
    
    if (dbError) {
      console.error('❌ Error checking database:', dbError);
      throw dbError;
    }
    
    console.log(`   📊 Found ${existingRecords.length} existing database records`);
    
    // Step 3: Create database records for storage files
    console.log('');
    console.log('3️⃣ Creating database records for storage files...');
    
    const batchSize = 10; // Process in batches to avoid rate limits
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < storageFiles.length; i += batchSize) {
      const batch = storageFiles.slice(i, i + batchSize);
      console.log(`   📦 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(storageFiles.length/batchSize)} (${batch.length} files)`);
      
      for (const file of batch) {
        try {
          // Get public URL for the file
          const { data: { publicUrl } } = supabase.storage
            .from('curated-images')
            .getPublicUrl(file.name);
          
          // Create database record
          const { data: insertData, error: insertError } = await supabase
            .from('curated_images')
            .insert({
              title: `Curated Image ${file.name.split('.')[0]}`,
              description: `Beautiful curated artwork - ${file.name}`,
              category: 'art',
              tags: ['curated', 'artwork', 'beautiful'],
              image_url: publicUrl,
              width: 800, // Default dimensions
              height: 800,
              aspect_ratio: 'square',
              display_order: i + 1,
              is_featured: Math.random() > 0.7, // 30% chance of being featured
              is_active: true
            })
            .select('id, title, image_url');
          
          if (insertError) {
            console.error(`   ❌ Error inserting ${file.name}:`, insertError.message);
            errorCount++;
          } else {
            console.log(`   ✅ Created record for ${file.name}`);
            successCount++;
          }
        } catch (error) {
          console.error(`   ❌ Error processing ${file.name}:`, error.message);
          errorCount++;
        }
      }
      
      // Small delay between batches
      if (i + batchSize < storageFiles.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Step 4: Verify the sync
    console.log('');
    console.log('4️⃣ Verifying sync results...');
    const { data: finalRecords, error: verifyError } = await supabase
      .from('curated_images')
      .select('id, title, image_url, is_active')
      .eq('is_active', true);
    
    if (verifyError) {
      console.error('❌ Error verifying sync:', verifyError);
      throw verifyError;
    }
    
    console.log(`   📊 Final database records: ${finalRecords.length}`);
    console.log(`   ✅ Successfully created: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    
    // Step 5: Test API endpoint
    console.log('');
    console.log('5️⃣ Testing API endpoint...');
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/curated_images?select=*&is_active=eq.true&limit=5`, {
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
        }
      });
      
      if (response.ok) {
        const apiData = await response.json();
        console.log(`   ✅ API endpoint working - ${apiData.length} images accessible`);
      } else {
        console.error('   ❌ API endpoint failed:', response.status, response.statusText);
      }
    } catch (apiError) {
      console.error('   ❌ API test error:', apiError.message);
    }
    
    console.log('');
    console.log('🎉 SYNC COMPLETED SUCCESSFULLY!');
    console.log('');
    console.log('📋 Summary:');
    console.log(`   📁 Storage files: ${storageFiles.length}`);
    console.log(`   📊 Database records: ${finalRecords.length}`);
    console.log(`   ✅ Successfully synced: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log('');
    console.log('🚀 Next steps:');
    console.log('   1. Test your production site');
    console.log('   2. Verify images load on home page');
    console.log('   3. Test "Buy as Frame" functionality');
    
  } catch (error) {
    console.error('❌ Error syncing storage to production database:', error);
    process.exit(1);
  }
}

async function main() {
  await syncStorageToProductionDB();
}

main().catch(console.error);
