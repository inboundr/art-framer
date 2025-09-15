const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: 'art-framer/.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Sample image data with prompts
const sampleImages = [
  {
    prompt: 'A beautiful sunset over a mountain landscape with vibrant orange and purple clouds',
    aspect_ratio: 'wide',
    width: 1920,
    height: 1080,
    color: '#FF6B35',
    text: 'Sunset Mountains'
  },
  {
    prompt: 'A futuristic cityscape with flying cars and neon lights',
    aspect_ratio: 'wide',
    width: 1920,
    height: 1080,
    color: '#6366F1',
    text: 'Futuristic City'
  },
  {
    prompt: 'A serene forest with sunlight filtering through the trees',
    aspect_ratio: 'tall',
    width: 1080,
    height: 1920,
    color: '#059669',
    text: 'Serene Forest'
  },
  {
    prompt: 'A cute cat sitting on a windowsill with flowers',
    aspect_ratio: 'square',
    width: 1024,
    height: 1024,
    color: '#F59E0B',
    text: 'Cute Cat'
  },
  {
    prompt: 'An abstract painting with swirling colors and geometric shapes',
    aspect_ratio: 'square',
    width: 1024,
    height: 1024,
    color: '#EC4899',
    text: 'Abstract Art'
  },
  {
    prompt: 'A vintage car driving on a coastal road with ocean views',
    aspect_ratio: 'wide',
    width: 1920,
    height: 1080,
    color: '#0891B2',
    text: 'Vintage Car'
  },
  {
    prompt: 'A magical library with floating books and glowing orbs',
    aspect_ratio: 'tall',
    width: 1080,
    height: 1920,
    color: '#7C3AED',
    text: 'Magical Library'
  },
  {
    prompt: 'A steampunk robot with brass gears and steam vents',
    aspect_ratio: 'square',
    width: 1024,
    height: 1024,
    color: '#D97706',
    text: 'Steampunk Robot'
  }
];

async function createSampleImage(color, width, height, text) {
  // Create a simple SVG image with the specified dimensions and color
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${color}"/>
      <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="48" 
            text-anchor="middle" dominant-baseline="middle" fill="white">
        ${text}
      </text>
    </svg>
  `;
  
  return Buffer.from(svg);
}

async function uploadSampleImages() {
  try {
    console.log('🚀 Starting sample image upload to Supabase Storage...');
    
    // Get the test user ID
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', 'test@example.com')
      .single();
    
    if (userError || !user) {
      throw new Error('Test user not found');
    }
    
    const userId = user.id;
    console.log(`✅ Found test user: ${userId}`);
    
    // Upload each sample image
    for (let i = 0; i < sampleImages.length; i++) {
      const imageData = sampleImages[i];
      console.log(`📸 Uploading image ${i + 1}/${sampleImages.length}: ${imageData.text}`);
      
      // Create SVG image
      const imageBuffer = await createSampleImage(
        imageData.color,
        imageData.width,
        imageData.height,
        imageData.text
      );
      
      // Generate filename
      const fileName = `sample-${i + 1}-${Date.now()}.svg`;
      
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('images')
        .upload(fileName, imageBuffer, {
          contentType: 'image/svg+xml',
          cacheControl: '3600',
          upsert: false
        });
      
      if (uploadError) {
        throw new Error(`Failed to upload ${fileName}: ${uploadError.message}`);
      }
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(fileName);
      
      // Update database record
      const { error: updateError } = await supabase
        .from('images')
        .update({
          image_url: publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('prompt', imageData.prompt);
      
      if (updateError) {
        throw new Error(`Failed to update database for ${fileName}: ${updateError.message}`);
      }
      
      console.log(`✅ Successfully uploaded: ${fileName}`);
    }
    
    console.log('🎉 All sample images uploaded successfully!');
    
  } catch (error) {
    console.error('❌ Error uploading sample images:', error);
    process.exit(1);
  }
}

// Run the upload
uploadSampleImages();
