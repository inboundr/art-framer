#!/usr/bin/env node

/**
 * Script to upload curated images to Supabase storage bucket
 * This script helps you manually upload and manage curated images for the home page
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

// Sample curated images data
const curatedImagesData = [
  {
    title: "Abstract Harmony",
    description: "A beautiful abstract digital artwork featuring vibrant colors and flowing forms",
    category: "abstract",
    tags: ["abstract", "digital", "colorful", "modern"],
    imageUrl: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800&h=800&fit=crop&crop=center",
    width: 800,
    height: 800,
    aspect_ratio: "square",
    display_order: 1,
    is_featured: true
  },
  {
    title: "Mountain Serenity",
    description: "Peaceful mountain landscape with misty peaks and serene atmosphere",
    category: "nature",
    tags: ["nature", "landscape", "mountains", "peaceful"],
    imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop&crop=center",
    width: 800,
    height: 600,
    aspect_ratio: "wide",
    display_order: 2,
    is_featured: false
  },
  {
    title: "Urban Portrait",
    description: "Stylish urban portrait with modern aesthetic and professional lighting",
    category: "portrait",
    tags: ["portrait", "urban", "modern", "professional"],
    imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=800&fit=crop&crop=center",
    width: 600,
    height: 800,
    aspect_ratio: "tall",
    display_order: 3,
    is_featured: true
  },
  {
    title: "Digital Dreams",
    description: "Futuristic digital art with neon colors and cyberpunk aesthetics",
    category: "digital",
    tags: ["digital", "cyberpunk", "neon", "futuristic"],
    imageUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=800&h=800&fit=crop&crop=center",
    width: 800,
    height: 800,
    aspect_ratio: "square",
    display_order: 4,
    is_featured: false
  },
  {
    title: "Ocean Waves",
    description: "Dynamic ocean waves captured in motion with dramatic lighting",
    category: "nature",
    tags: ["nature", "ocean", "waves", "dramatic"],
    imageUrl: "https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=800&h=600&fit=crop&crop=center",
    width: 800,
    height: 600,
    aspect_ratio: "wide",
    display_order: 5,
    is_featured: true
  }
];

async function uploadCuratedImages() {
  console.log('🚀 Starting curated images upload...');
  
  try {
    // Clear existing curated images (optional - remove this if you want to keep existing data)
    console.log('🧹 Clearing existing curated images...');
    const { error: deleteError } = await supabase
      .from('curated_images')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
    
    if (deleteError) {
      console.warn('⚠️ Warning: Could not clear existing images:', deleteError.message);
    } else {
      console.log('✅ Existing images cleared');
    }

    // Upload each curated image
    for (const imageData of curatedImagesData) {
      console.log(`📤 Uploading: ${imageData.title}`);
      
      try {
        // Fetch the image from the URL
        const response = await fetch(imageData.imageUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.statusText}`);
        }
        
        const imageBuffer = await response.arrayBuffer();
        const imageBlob = new Blob([imageBuffer], { 
          type: response.headers.get('content-type') || 'image/jpeg' 
        });
        
        // Generate unique filename
        const fileExtension = 'jpg';
        const fileName = `curated-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExtension}`;
        
        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('curated-images')
          .upload(fileName, imageBlob, {
            cacheControl: '3600',
            upsert: false,
            contentType: imageBlob.type,
          });

        if (uploadError) {
          throw new Error(`Upload failed: ${uploadError.message}`);
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('curated-images')
          .getPublicUrl(fileName);

        // Save to database
        const { data: dbData, error: dbError } = await supabase
          .from('curated_images')
          .insert({
            title: imageData.title,
            description: imageData.description,
            category: imageData.category,
            tags: imageData.tags,
            image_url: publicUrl,
            width: imageData.width,
            height: imageData.height,
            aspect_ratio: imageData.aspect_ratio,
            display_order: imageData.display_order,
            is_featured: imageData.is_featured,
            is_active: true
          })
          .select()
          .single();

        if (dbError) {
          throw new Error(`Database insert failed: ${dbError.message}`);
        }

        console.log(`✅ Uploaded: ${imageData.title} (ID: ${dbData.id})`);
        
      } catch (error) {
        console.error(`❌ Failed to upload ${imageData.title}:`, error.message);
      }
    }

    console.log('🎉 Curated images upload completed!');
    
    // Verify upload
    const { data: uploadedImages, error: verifyError } = await supabase
      .from('curated_images')
      .select('id, title, category, is_featured')
      .eq('is_active', true)
      .order('display_order');

    if (verifyError) {
      console.error('❌ Verification failed:', verifyError.message);
    } else {
      console.log(`✅ Verification successful: ${uploadedImages.length} images uploaded`);
      console.log('📋 Uploaded images:');
      uploadedImages.forEach(img => {
        console.log(`   - ${img.title} (${img.category}) ${img.is_featured ? '⭐' : ''}`);
      });
    }

  } catch (error) {
    console.error('❌ Upload process failed:', error.message);
    process.exit(1);
  }
}

// Run the upload
uploadCuratedImages();
