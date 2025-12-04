/**
 * Script to migrate existing uploads from /public/uploads to Supabase Storage
 * 
 * Usage:
 *   npx tsx scripts/migrate-uploads-to-supabase.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://irugsjzjqdxulliobuwt.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_P57W8qzt7EoPQPkGqX8piA_FXINp1nu';

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
const BUCKET_NAME = 'uploads';

async function migrateUploads() {
  console.log('🚀 Migrating uploads to Supabase Storage...\n');

  // Check if bucket exists
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
  if (bucketsError) {
    console.error('❌ Failed to list buckets:', bucketsError);
    process.exit(1);
  }

  const bucketExists = buckets?.some((b) => b.name === BUCKET_NAME);
  if (!bucketExists) {
    console.log(`📦 Creating bucket "${BUCKET_NAME}"...`);
    const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: 10485760, // 10MB
    });
    
    if (createError) {
      console.error(`❌ Failed to create bucket:`, createError.message);
      process.exit(1);
    }
    console.log(`✅ Bucket "${BUCKET_NAME}" created\n`);
  } else {
    console.log(`✅ Bucket "${BUCKET_NAME}" found\n`);
  }

  // Get all files from public/uploads
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  
  if (!fs.existsSync(uploadsDir)) {
    console.log('ℹ️  No uploads directory found. Nothing to migrate.');
    return;
  }

  const files = fs.readdirSync(uploadsDir).filter(file => {
    const filePath = path.join(uploadsDir, file);
    return fs.statSync(filePath).isFile();
  });

  if (files.length === 0) {
    console.log('ℹ️  No files found in uploads directory.');
    return;
  }

  console.log(`📦 Found ${files.length} files to migrate\n`);

  let successCount = 0;
  let failCount = 0;

  for (const file of files) {
    const localPath = path.join(uploadsDir, file);
    const storagePath = `studio/${file}`; // Keep original filename in studio/ folder

    try {
      const fileContent = fs.readFileSync(localPath);
      const fileBuffer = Buffer.from(fileContent);
      
      // Get file extension to determine content type
      const ext = path.extname(file).toLowerCase();
      const contentTypes: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
      };
      const contentType = contentTypes[ext] || 'image/jpeg';

      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(storagePath, fileBuffer, {
          contentType,
          upsert: true, // Overwrite if exists
        });

      if (error) {
        console.error(`❌ Failed to upload ${file}:`, error.message);
        failCount++;
      } else {
        console.log(`✅ Uploaded: ${file} → ${storagePath}`);
        successCount++;
      }
    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error);
      failCount++;
    }
  }

  console.log(`\n📊 Migration Summary:`);
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   📦 Total: ${files.length}`);

  if (successCount > 0) {
    console.log(`\n⚠️  Note: Files are still in /public/uploads. You can delete them after verifying the migration.`);
  }
}

migrateUploads();

