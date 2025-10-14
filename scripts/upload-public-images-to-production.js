#!/usr/bin/env node

/**
 * Script to upload public-images folder to production Supabase storage and database
 * This will upload all images from the public-images folder to production
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

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

// Configuration
const IMAGES_DIR = path.join(__dirname, '..', 'public-images');
const BUCKET_NAME = 'curated-images';
const BATCH_SIZE = 5; // Upload 5 images at a time to avoid rate limits

async function getImageFiles() {
  try {
    const files = fs.readdirSync(IMAGES_DIR);
    const imageFiles = files.filter(file => 
      file.toLowerCase().endsWith('.jpg') || 
      file.toLowerCase().endsWith('.jpeg') ||
      file.toLowerCase().endsWith('.png')
    );
    
    console.log(`📁 Found ${imageFiles.length} image files in ${IMAGES_DIR}`);
    return imageFiles;
  } catch (error) {
    console.error('❌ Error reading images directory:', error.message);
    process.exit(1);
  }
}

async function getImageDimensions(filePath) {
  try {
    const metadata = await sharp(filePath).metadata();
    return {
      width: metadata.width || 800,
      height: metadata.height || 800
    };
  } catch (error) {
    console.warn(`⚠️  Could not get dimensions for ${filePath}, using defaults`);
    return { width: 800, height: 800 };
  }
}

function calculateAspectRatio(width, height) {
  if (width === height) return 'square';
  if (width > height) return 'wide';
  return 'tall';
}

async function uploadImageToSupabase(fileName, filePath) {
  try {
    // Get image dimensions
    const dimensions = await getImageDimensions(filePath);
    const aspectRatio = calculateAspectRatio(dimensions.width, dimensions.height);
    
    // Read image file
    const imageBuffer = fs.readFileSync(filePath);
    
    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, imageBuffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'image/jpeg',
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);

    return {
      fileName,
      publicUrl,
      dimensions,
      aspectRatio
    };
  } catch (error) {
    console.error(`❌ Error uploading ${fileName}:`, error.message);
    throw error;
  }
}

async function createDatabaseRecord(uploadResult, index) {
  try {
    const { data: insertData, error: insertError } = await supabase
      .from('curated_images')
      .insert({
        title: `Curated Artwork ${index + 1}`,
        description: `Beautiful curated digital artwork - ${uploadResult.fileName}`,
        category: 'art',
        tags: ['curated', 'artwork', 'digital', 'beautiful'],
        image_url: uploadResult.publicUrl,
        width: uploadResult.dimensions.width,
        height: uploadResult.dimensions.height,
        aspect_ratio: uploadResult.aspectRatio,
        display_order: index + 1,
        is_featured: Math.random() > 0.8, // 20% chance of being featured
        is_active: true
      })
      .select('id, title, image_url');

    if (insertError) {
      throw new Error(`Database insert failed: ${insertError.message}`);
    }

    return insertData[0];
  } catch (error) {
    console.error(`❌ Error creating database record for ${uploadResult.fileName}:`, error.message);
    throw error;
  }
}

async function uploadImagesInBatches(imageFiles) {
  console.log(`📤 Uploading ${imageFiles.length} images to production...`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < imageFiles.length; i += BATCH_SIZE) {
    const batch = imageFiles.slice(i, i + BATCH_SIZE);
    console.log(`📦 Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(imageFiles.length/BATCH_SIZE)} (${batch.length} files)`);
    
    const batchPromises = batch.map(async (file, batchIndex) => {
      const globalIndex = i + batchIndex;
      const filePath = path.join(IMAGES_DIR, file);
      
      try {
        // Upload to storage
        const uploadResult = await uploadImageToSupabase(file, filePath);
        
        // Create database record
        const dbRecord = await createDatabaseRecord(uploadResult, globalIndex);
        
        console.log(`   ✅ ${file} → ${dbRecord.id}`);
        successCount++;
        
        return { success: true, file, record: dbRecord };
      } catch (error) {
        console.error(`   ❌ ${file}: ${error.message}`);
        errorCount++;
        return { success: false, file, error: error.message };
      }
    });
    
    // Wait for batch to complete
    await Promise.all(batchPromises);
    
    // Small delay between batches
    if (i + BATCH_SIZE < imageFiles.length) {
      console.log('   ⏳ Waiting 2 seconds before next batch...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  return { successCount, errorCount };
}

async function uploadPublicImagesToProduction() {
  console.log('🚀 UPLOADING PUBLIC IMAGES TO PRODUCTION');
  console.log('========================================');
  console.log(`📡 Target: ${supabaseUrl}`);
  console.log(`📁 Source: ${IMAGES_DIR}`);
  console.log(`🪣 Bucket: ${BUCKET_NAME}`);
  console.log('');
  
  try {
    // Step 1: Get image files
    console.log('1️⃣ Scanning for image files...');
    const imageFiles = await getImageFiles();
    
    if (imageFiles.length === 0) {
      console.log('   ⚠️  No image files found');
      return;
    }
    
    // Step 2: Clear existing data (optional)
    console.log('');
    console.log('2️⃣ Clearing existing curated images...');
    const { error: deleteError } = await supabase
      .from('curated_images')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (deleteError) {
      console.warn('   ⚠️  Could not clear existing images:', deleteError.message);
    } else {
      console.log('   ✅ Existing images cleared');
    }
    
    // Step 3: Upload images in batches
    console.log('');
    console.log('3️⃣ Uploading images to production...');
    const { successCount, errorCount } = await uploadImagesInBatches(imageFiles);
    
    // Step 4: Verify upload
    console.log('');
    console.log('4️⃣ Verifying upload...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('curated_images')
      .select('id, title, image_url, is_active')
      .eq('is_active', true);
    
    if (verifyError) {
      console.error('❌ Error verifying upload:', verifyError);
      throw verifyError;
    }
    
    console.log(`   📊 Database records: ${verifyData.length}`);
    console.log(`   ✅ Successfully uploaded: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    
    // Step 5: Test API
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
    console.log('🎉 UPLOAD COMPLETED SUCCESSFULLY!');
    console.log('');
    console.log('📋 Summary:');
    console.log(`   📁 Source files: ${imageFiles.length}`);
    console.log(`   📊 Database records: ${verifyData.length}`);
    console.log(`   ✅ Successfully uploaded: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log('');
    console.log('🚀 Next steps:');
    console.log('   1. Test your production site');
    console.log('   2. Verify images load on home page');
    console.log('   3. Test "Buy as Frame" functionality');
    
  } catch (error) {
    console.error('❌ Error uploading public images to production:', error);
    process.exit(1);
  }
}

async function main() {
  await uploadPublicImagesToProduction();
}

main().catch(console.error);
