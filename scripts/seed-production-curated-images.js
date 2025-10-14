#!/usr/bin/env node

/**
 * Script to seed curated images in production database
 * This ensures production has the same curated images as local development
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

// Production curated images data (same as local)
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
    title: "Ocean Waves",
    description: "Serene ocean waves with calming blue tones and natural beauty",
    category: "nature",
    tags: ["nature", "ocean", "waves", "blue", "calming"],
    imageUrl: "https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=800&h=600&fit=crop&crop=center",
    width: 800,
    height: 600,
    aspect_ratio: "wide",
    display_order: 4,
    is_featured: true
  }
];

async function seedProductionImages() {
  console.log('🌱 Seeding curated images in production...');
  
  try {
    // Check if images already exist
    const { data: existingImages, error: checkError } = await supabase
      .from('curated_images')
      .select('id, title')
      .limit(5);
    
    if (checkError) {
      console.error('❌ Error checking existing images:', checkError);
      throw checkError;
    }
    
    if (existingImages && existingImages.length > 0) {
      console.log(`📋 Found ${existingImages.length} existing curated images in production`);
      console.log('🔄 Clearing existing images before seeding...');
      
      // Clear existing images
      const { error: deleteError } = await supabase
        .from('curated_images')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      
      if (deleteError) {
        console.warn('⚠️ Warning: Could not clear existing images:', deleteError.message);
      } else {
        console.log('✅ Existing images cleared');
      }
    }
    
    // Insert curated images
    const { data: insertedImages, error: insertError } = await supabase
      .from('curated_images')
      .insert(curatedImagesData.map(image => ({
        title: image.title,
        description: image.description,
        category: image.category,
        tags: image.tags,
        image_url: image.imageUrl,
        width: image.width,
        height: image.height,
        aspect_ratio: image.aspect_ratio,
        display_order: image.display_order,
        is_featured: image.is_featured,
        is_active: true
      })))
      .select('id, title, category, is_featured');
    
    if (insertError) {
      console.error('❌ Error inserting curated images:', insertError);
      throw insertError;
    }
    
    console.log(`✅ Successfully seeded ${insertedImages.length} curated images in production`);
    
    // Verify the data
    const { data: verifyData, error: verifyError } = await supabase
      .from('curated_images')
      .select('id, title, category, is_featured, is_active')
      .eq('is_active', true);
    
    if (verifyError) {
      console.error('❌ Error verifying data:', verifyError);
      throw verifyError;
    }
    
    console.log('📊 Production database verification:');
    console.log(`   Total active images: ${verifyData.length}`);
    console.log(`   Featured images: ${verifyData.filter(img => img.is_featured).length}`);
    console.log(`   Categories: ${[...new Set(verifyData.map(img => img.category))].join(', ')}`);
    
    console.log('');
    console.log('🎉 Production seeding completed successfully!');
    console.log('📋 Next steps:');
    console.log('   1. Test production site: https://your-domain.com');
    console.log('   2. Verify images load on home page');
    console.log('   3. Test "Buy as Frame" functionality');
    
  } catch (error) {
    console.error('❌ Error seeding production images:', error);
    process.exit(1);
  }
}

async function main() {
  console.log('🌱 Production Curated Images Seeding Tool');
  console.log('==========================================');
  console.log(`📡 Target: ${supabaseUrl}`);
  console.log('');
  
  await seedProductionImages();
}

main().catch(console.error);
