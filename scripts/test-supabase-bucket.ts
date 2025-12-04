/**
 * Test script to verify Supabase bucket exists and check contents
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  console.error('\n💡 Make sure these are set in your .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
const BUCKET_NAME = 'prodigi-assets';

async function testBucket() {
  console.log('🔍 Testing Supabase bucket...\n');
  console.log(`📦 Bucket name: ${BUCKET_NAME}`);
  console.log(`🌐 Supabase URL: ${supabaseUrl}\n`);

  // 1. Check if bucket exists
  console.log('1️⃣ Checking if bucket exists...');
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
  
  if (bucketsError) {
    console.error('❌ Failed to list buckets:', bucketsError);
    process.exit(1);
  }

  const bucketExists = buckets?.some((b) => b.name === BUCKET_NAME);
  
  if (!bucketExists) {
    console.error(`❌ Bucket "${BUCKET_NAME}" does not exist!`);
    console.error('\n💡 To create the bucket:');
    console.error('   1. Go to Supabase Dashboard → Storage');
    console.error(`   2. Click "New bucket"`);
    console.error(`   3. Name: ${BUCKET_NAME}`);
    console.error('   4. Toggle "Public bucket" to ON');
    console.error('   5. Click "Create bucket"');
    process.exit(1);
  }

  console.log(`✅ Bucket "${BUCKET_NAME}" exists!\n`);

  // 2. Check bucket details
  const bucket = buckets?.find((b) => b.name === BUCKET_NAME);
  if (bucket) {
    console.log('📋 Bucket details:');
    console.log(`   Name: ${bucket.name}`);
    console.log(`   ID: ${bucket.id}`);
    console.log(`   Public: ${bucket.public ? '✅ Yes' : '❌ No'}`);
    console.log(`   Created: ${bucket.created_at}`);
    console.log('');
    
    if (!bucket.public) {
      console.warn('⚠️  WARNING: Bucket is not public!');
      console.warn('   Assets will not be accessible via public URLs.');
      console.warn('   Please make the bucket public in Supabase Dashboard.\n');
    }
  }

  // 3. List files in bucket
  console.log('2️⃣ Listing files in bucket...');
  const { data: files, error: listError } = await supabase.storage
    .from(BUCKET_NAME)
    .list('', {
      limit: 100,
      offset: 0,
      sortBy: { column: 'name', order: 'asc' }
    });

  if (listError) {
    console.error('❌ Failed to list files:', listError);
    process.exit(1);
  }

  if (!files || files.length === 0) {
    console.log('📭 Bucket is empty - no files found.\n');
    console.log('💡 To upload assets, run:');
    console.log('   npx tsx scripts/upload-prodigi-assets-to-supabase.ts\n');
  } else {
    console.log(`✅ Found ${files.length} files/folders:\n`);
    
    // Group by type (file vs folder)
    const folders = files.filter(f => !f.id); // Folders don't have an id
    const fileList = files.filter(f => f.id);
    
    if (folders.length > 0) {
      console.log(`📁 Folders (${folders.length}):`);
      folders.forEach(folder => {
        console.log(`   📂 ${folder.name}/`);
      });
      console.log('');
    }
    
    if (fileList.length > 0) {
      console.log(`📄 Files (${fileList.length}):`);
      fileList.slice(0, 10).forEach(file => {
        const sizeKB = file.metadata?.size ? (file.metadata.size / 1024).toFixed(2) : '?';
        console.log(`   📄 ${file.name} (${sizeKB} KB)`);
      });
      if (fileList.length > 10) {
        console.log(`   ... and ${fileList.length - 10} more files`);
      }
      console.log('');
    }

    // Check for specific texture files
    console.log('3️⃣ Checking for texture files...');
    const texturePaths = [
      'prodigi-assets/frames/classic/textures/black-diffuse-1x.webp',
      'prodigi-assets/mounts/black-mount.webp',
    ];

    for (const path of texturePaths) {
      const { data: fileData, error: fileError } = await supabase.storage
        .from(BUCKET_NAME)
        .list(path.split('/').slice(0, -1).join('/'), {
          limit: 1,
        });

      const fileName = path.split('/').pop();
      const exists = fileData?.some(f => f.name === fileName);

      if (exists) {
        console.log(`   ✅ ${path}`);
      } else {
        console.log(`   ❌ ${path} (not found)`);
      }
    }
    console.log('');
  }

  // 4. Test public URL access
  console.log('4️⃣ Testing public URL generation...');
  const testPath = 'prodigi-assets/frames/classic/textures/black-diffuse-1x.webp';
  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(testPath);
  
  console.log(`   Test URL: ${publicUrl}`);
  console.log('');
  
  // Try to fetch the file
  try {
    const response = await fetch(publicUrl, { method: 'HEAD' });
    if (response.ok) {
      console.log(`   ✅ File is accessible via public URL`);
    } else if (response.status === 404) {
      console.log(`   ⚠️  File not found (404) - this is expected if assets aren't uploaded yet`);
    } else {
      console.log(`   ⚠️  HTTP ${response.status} - ${response.statusText}`);
    }
  } catch (error) {
    console.log(`   ⚠️  Could not test URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  console.log('\n✅ Bucket test complete!\n');
  
  if (!files || files.length === 0) {
    console.log('📤 Next step: Upload assets');
    console.log('   Run: npx tsx scripts/upload-prodigi-assets-to-supabase.ts\n');
  } else {
    console.log('✅ Assets appear to be uploaded!');
    console.log('   If textures still fail to load, check:');
    console.log('   1. File paths match exactly');
    console.log('   2. Bucket is public');
    console.log('   3. NEXT_PUBLIC_SUPABASE_URL is set correctly\n');
  }
}

testBucket().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

