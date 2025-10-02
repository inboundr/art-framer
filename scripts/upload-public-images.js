#!/usr/bin/env node

/**
 * Script to upload images from public-images folder to Supabase storage bucket
 * This script uploads all JPG images from the public-images directory
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = "https://test.supabase.co";
const supabaseServiceKey = "test.test.test-ts";

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
      width: metadata.width,
      height: metadata.height,
      aspectRatio: metadata.width > metadata.height ? 'wide' : 
                   metadata.width < metadata.height ? 'tall' : 'square'
    };
  } catch (error) {
    console.warn(`⚠️ Could not get dimensions for ${filePath}, using defaults`);
    return {
      width: 800,
      height: 600,
      aspectRatio: 'wide'
    };
  }
}

async function uploadImageToSupabase(fileName, filePath) {
  try {
    // Read the image file
    const imageBuffer = fs.readFileSync(filePath);
    
    // Get image dimensions
    const dimensions = await getImageDimensions(filePath);
    
    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const fileExtension = path.extname(fileName);
    const uniqueFileName = `public-${timestamp}-${randomId}${fileExtension}`;
    
    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(uniqueFileName, imageBuffer, {
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
      .getPublicUrl(uniqueFileName);

    return {
      fileName: uniqueFileName,
      publicUrl,
      originalName: fileName,
      dimensions
    };

  } catch (error) {
    console.error(`❌ Failed to upload ${fileName}:`, error.message);
    return null;
  }
}

async function createDatabaseRecord(uploadResult, index) {
  try {
    // Extract basic info from filename
    const baseName = path.parse(uploadResult.originalName).name;
    const title = baseName.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    // Create database record
    const { data: dbData, error: dbError } = await supabase
      .from('curated_images')
      .insert({
        title: title,
        description: `Uploaded image: ${baseName}`,
        category: 'gallery',
        tags: ['uploaded', 'gallery', 'public'],
        image_url: uploadResult.publicUrl,
        width: uploadResult.dimensions.width,
        height: uploadResult.dimensions.height,
        aspect_ratio: uploadResult.dimensions.aspectRatio,
        display_order: index + 1,
        is_featured: index < 10, // First 10 images are featured
        is_active: true
      })
      .select()
      .single();

    if (dbError) {
      throw new Error(`Database insert failed: ${dbError.message}`);
    }

    return dbData;

  } catch (error) {
    console.error(`❌ Failed to create database record for ${uploadResult.originalName}:`, error.message);
    return null;
  }
}

async function uploadImagesInBatches(imageFiles) {
  const results = [];
  const totalFiles = imageFiles.length;
  
  console.log(`🚀 Starting upload of ${totalFiles} images in batches of ${BATCH_SIZE}...`);
  
  for (let i = 0; i < imageFiles.length; i += BATCH_SIZE) {
    const batch = imageFiles.slice(i, i + BATCH_SIZE);
    console.log(`\n📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(totalFiles / BATCH_SIZE)} (${batch.length} images)`);
    
    // Process batch in parallel
    const batchPromises = batch.map(async (fileName, batchIndex) => {
      const filePath = path.join(IMAGES_DIR, fileName);
      const globalIndex = i + batchIndex;
      
      console.log(`📤 Uploading ${globalIndex + 1}/${totalFiles}: ${fileName}`);
      
      // Upload to Supabase Storage
      const uploadResult = await uploadImageToSupabase(fileName, filePath);
      if (!uploadResult) {
        return null;
      }
      
      // Create database record
      const dbRecord = await createDatabaseRecord(uploadResult, globalIndex);
      if (!dbRecord) {
        return null;
      }
      
      console.log(`✅ Uploaded: ${fileName} (ID: ${dbRecord.id})`);
      return {
        fileName,
        uploadResult,
        dbRecord
      };
    });
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults.filter(result => result !== null));
    
    // Small delay between batches to avoid rate limits
    if (i + BATCH_SIZE < imageFiles.length) {
      console.log('⏳ Waiting 2 seconds before next batch...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  return results;
}

async function uploadPublicImages() {
  console.log('🚀 Starting public images upload to Supabase...');
  
  try {
    // Get list of image files
    const imageFiles = await getImageFiles();
    
    if (imageFiles.length === 0) {
      console.log('❌ No image files found in the public-images directory');
      return;
    }
    
    // Upload images in batches
    const results = await uploadImagesInBatches(imageFiles);
    
    console.log(`\n🎉 Upload completed!`);
    console.log(`✅ Successfully uploaded: ${results.length}/${imageFiles.length} images`);
    
    if (results.length < imageFiles.length) {
      console.log(`⚠️  ${imageFiles.length - results.length} images failed to upload`);
    }
    
    // Verify upload
    console.log('\n🔍 Verifying upload...');
    const { data: uploadedImages, error: verifyError } = await supabase
      .from('curated_images')
      .select('id, title, category, is_featured, image_url')
      .eq('is_active', true)
      .order('display_order');

    if (verifyError) {
      console.error('❌ Verification failed:', verifyError.message);
    } else {
      console.log(`✅ Verification successful: ${uploadedImages.length} images in database`);
      console.log('📋 Sample uploaded images:');
      uploadedImages.slice(0, 10).forEach(img => {
        console.log(`   - ${img.title} (${img.category}) ${img.is_featured ? '⭐' : ''}`);
      });
      if (uploadedImages.length > 10) {
        console.log(`   ... and ${uploadedImages.length - 10} more images`);
      }
    }

  } catch (error) {
    console.error('❌ Upload process failed:', error.message);
    process.exit(1);
  }
}

// Run the upload
uploadPublicImages();
