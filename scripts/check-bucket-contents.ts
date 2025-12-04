/**
 * Check what files are actually in the Supabase bucket
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
const BUCKET_NAME = 'prodigi-assets';

async function checkFolder(folderPath: string, depth: number = 0) {
  const indent = '  '.repeat(depth);
  console.log(`${indent}📂 ${folderPath || '(root)'}`);
  
  const { data: files, error } = await supabase.storage
    .from(BUCKET_NAME)
    .list(folderPath, {
      limit: 1000,
      sortBy: { column: 'name', order: 'asc' }
    });

  if (error) {
    console.log(`${indent}   ❌ Error: ${error.message}`);
    return;
  }

  if (!files || files.length === 0) {
    console.log(`${indent}   📭 Empty`);
    return;
  }

  // Separate folders and files
  const folders = files.filter(f => !f.id);
  const fileList = files.filter(f => f.id);

  // List folders first
  for (const folder of folders) {
    const fullPath = folderPath ? `${folderPath}/${folder.name}` : folder.name;
    await checkFolder(fullPath, depth + 1);
  }

  // List files
  for (const file of fileList.slice(0, 20)) {
    const sizeKB = file.metadata?.size ? (file.metadata.size / 1024).toFixed(1) : '?';
    console.log(`${indent}   📄 ${file.name} (${sizeKB} KB)`);
  }
  
  if (fileList.length > 20) {
    console.log(`${indent}   ... and ${fileList.length - 20} more files`);
  }
}

async function main() {
  console.log('🔍 Checking bucket contents...\n');
  
  // Check main folders
  await checkFolder('prodigi-assets');
  console.log('');
  await checkFolder('prodigi-assets-extracted');
  console.log('');
  
  // Specifically check for texture files
  console.log('🔍 Checking for texture files...\n');
  const texturePaths = [
    'prodigi-assets/frames',
    'prodigi-assets/frames/classic',
    'prodigi-assets/frames/classic/textures',
    'prodigi-assets/mounts',
  ];

  for (const path of texturePaths) {
    const { data: files } = await supabase.storage
      .from(BUCKET_NAME)
      .list(path, { limit: 10 });
    
    if (files && files.length > 0) {
      console.log(`✅ ${path}: ${files.length} items`);
      files.slice(0, 5).forEach(f => {
        console.log(`   - ${f.name}${f.id ? ` (${(f.metadata?.size || 0 / 1024).toFixed(1)} KB)` : ' (folder)'}`);
      });
    } else {
      console.log(`❌ ${path}: Not found or empty`);
    }
  }
}

main().catch(console.error);

