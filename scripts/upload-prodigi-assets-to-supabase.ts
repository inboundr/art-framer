/**
 * Script to upload Prodigi assets from public folder to Supabase storage
 * 
 * Usage:
 *   npx tsx scripts/upload-prodigi-assets-to-supabase.ts
 * 
 * Prerequisites:
 *   1. Create a bucket named "prodigi-assets" in Supabase Storage
 *   2. Set bucket to public
 *   3. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Get project root (assuming script is in scripts/ folder)
const projectRoot = path.resolve(process.cwd());

// Get environment variables
  const supabaseUrl = 'https://irugsjzjqdxulliobuwt.supabase.co';
  const supabaseServiceRoleKey = 'sb_secret_P57W8qzt7EoPQPkGqX8piA_FXINp1nu';
  
  if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
const BUCKET_NAME = 'prodigi-assets';

/**
 * Recursively get all files in a directory
 */
function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
    } else {
      arrayOfFiles.push(filePath);
    }
  });

  return arrayOfFiles;
}

/**
 * Sanitize file path for Supabase Storage
 * Replaces problematic characters that Supabase doesn't accept
 * Preserves directory structure, only sanitizes problematic characters
 */
function sanitizeStoragePath(filePath: string): string {
  // Split path into directory and filename
  const pathParts = filePath.split('/');
  const directory = pathParts.slice(0, -1).join('/');
  const filename = pathParts[pathParts.length - 1];
  
  // Sanitize only the filename (not directory structure)
  const sanitizedFilename = filename
    .replace(/–/g, '-') // Replace em dash (U+2013) with regular dash
    .replace(/—/g, '-') // Replace en dash (U+2014) with regular dash
    .replace(/['"]/g, '') // Remove quotes
    .replace(/[^\w\s\-._()]/g, '-') // Replace other special chars with dash (keep dots, underscores, parens, spaces)
    .replace(/\s+/g, ' ') // Normalize multiple spaces to single space (keep spaces)
    .replace(/-+/g, '-') // Replace multiple dashes with single dash
    .trim();
  
  // Reconstruct path
  return directory ? `${directory}/${sanitizedFilename}` : sanitizedFilename;
}

/**
 * Upload a file to Supabase storage
 */
async function uploadFile(localPath: string, storagePath: string): Promise<boolean> {
  try {
    const fileContent = fs.readFileSync(localPath);
    const fileBuffer = Buffer.from(fileContent);

    // Sanitize the storage path to handle special characters
    const sanitizedPath = sanitizeStoragePath(storagePath);

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(sanitizedPath, fileBuffer, {
        contentType: getContentType(localPath),
        upsert: true, // Overwrite if exists
      });

    if (error) {
      console.error(`❌ Failed to upload ${storagePath}:`, error.message);
      if (sanitizedPath !== storagePath) {
        console.error(`   (Sanitized path: ${sanitizedPath})`);
      }
      return false;
    }

    if (sanitizedPath !== storagePath) {
      console.log(`✅ Uploaded: ${storagePath} → ${sanitizedPath}`);
    } else {
      console.log(`✅ Uploaded: ${storagePath}`);
    }
    return true;
  } catch (error) {
    console.error(`❌ Error uploading ${storagePath}:`, error);
    return false;
  }
}

/**
 * Get content type from file extension
 */
function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const contentTypes: Record<string, string> = {
    '.webp': 'image/webp',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
  };
  return contentTypes[ext] || 'application/octet-stream';
}

/**
 * Main upload function
 */
async function uploadAssets() {
  console.log('🚀 Starting Prodigi assets upload to Supabase...\n');

  // Check if bucket exists
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
  if (bucketsError) {
    console.error('❌ Failed to list buckets:', bucketsError);
    process.exit(1);
  }

  const bucketExists = buckets?.some((b) => b.name === BUCKET_NAME);
  if (!bucketExists) {
    console.error(`❌ Bucket "${BUCKET_NAME}" does not exist. Please create it in Supabase Storage first.`);
    process.exit(1);
  }

  console.log(`✅ Bucket "${BUCKET_NAME}" found\n`);

  // Get all files from public/prodigi-assets and public/prodigi-assets-extracted
  const publicDir = path.join(projectRoot, 'public');
  const prodigiAssetsDir = path.join(publicDir, 'prodigi-assets');
  const prodigiAssetsExtractedDir = path.join(publicDir, 'prodigi-assets-extracted');

  const allFiles: Array<{ localPath: string; storagePath: string }> = [];

  // Process prodigi-assets folder
  if (fs.existsSync(prodigiAssetsDir)) {
    const files = getAllFiles(prodigiAssetsDir);
    files.forEach((file) => {
      const relativePath = path.relative(publicDir, file);
      allFiles.push({
        localPath: file,
        storagePath: relativePath.replace(/\\/g, '/'), // Normalize path separators
      });
    });
  }

  // Process prodigi-assets-extracted folder
  if (fs.existsSync(prodigiAssetsExtractedDir)) {
    const files = getAllFiles(prodigiAssetsExtractedDir);
    files.forEach((file) => {
      const relativePath = path.relative(publicDir, file);
      allFiles.push({
        localPath: file,
        storagePath: relativePath.replace(/\\/g, '/'), // Normalize path separators
      });
    });
  }

  console.log(`📦 Found ${allFiles.length} files to upload\n`);

  // Upload files in batches
  const BATCH_SIZE = 10;
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < allFiles.length; i += BATCH_SIZE) {
    const batch = allFiles.slice(i, i + BATCH_SIZE);
    console.log(`📤 Uploading batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(allFiles.length / BATCH_SIZE)}...`);

    const results = await Promise.all(
      batch.map(({ localPath, storagePath }) => uploadFile(localPath, storagePath))
    );

    results.forEach((success) => {
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
    });

    // Small delay between batches to avoid rate limiting
    if (i + BATCH_SIZE < allFiles.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  console.log('\n📊 Upload Summary:');
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   📦 Total: ${allFiles.length}`);

  if (failCount === 0) {
    console.log('\n🎉 All assets uploaded successfully!');
  } else {
    console.log('\n⚠️  Some assets failed to upload. Please check the errors above.');
    process.exit(1);
  }
}

// Run the upload
uploadAssets().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

