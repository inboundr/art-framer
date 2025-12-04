/**
 * Normalize asset file names in Supabase and update all code references
 * 
 * This script:
 * 1. Identifies files that need normalization
 * 2. Creates a rename mapping
 * 3. Renames files in Supabase
 * 4. Updates all code references
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
const BUCKET_NAME = 'prodigi-assets';

interface RenameMapping {
  oldPath: string;
  newPath: string;
  reason: string;
  usedByCode: boolean;
}

/**
 * Define the standard naming convention
 */
const STANDARD_NAMES = {
  // Mount textures: {color}-mount.webp
  mounts: {
    'black': 'black-mount.webp',
    'snow-white': 'snow-white-mount.webp',
    'off-white': 'off-white-mount.webp',
  },
  // Frame textures: {color}-{maptype}-{resolution}.webp (already normalized)
  // Canvas textures: {name}.webp (already normalized)
  // Canvas wraps: {color}-wrap.webp (already normalized)
};

/**
 * Find files that need renaming
 */
async function findFilesToRename(): Promise<RenameMapping[]> {
  const mappings: RenameMapping[] = [];

  // Check mount textures
  const { data: mountFiles } = await supabase.storage
    .from(BUCKET_NAME)
    .list('prodigi-assets/mounts', { limit: 1000 });

  if (mountFiles) {
    for (const file of mountFiles) {
      if (!file.id) continue; // Skip folders

      const fileName = file.name.toLowerCase();
      let targetName: string | null = null;
      let reason = '';

      // Map various mount file names to standard names
      if (fileName.includes('black') && fileName.includes('mount')) {
        if (file.name !== 'black-mount.webp') {
          targetName = 'black-mount.webp';
          reason = 'Normalize black mount name';
        }
      } else if ((fileName.includes('snow') && fileName.includes('white')) || 
                 (fileName.includes('white') && !fileName.includes('off'))) {
        if (file.name !== 'snow-white-mount.webp' && !fileName.includes('classic') && !fileName.includes('framed')) {
          targetName = 'snow-white-mount.webp';
          reason = 'Normalize white mount name (snow-white)';
        }
      } else if (fileName.includes('off') && fileName.includes('white')) {
        if (file.name !== 'off-white-mount.webp') {
          targetName = 'off-white-mount.webp';
          reason = 'Normalize off-white mount name';
        }
      }

      if (targetName && file.name !== targetName) {
        mappings.push({
          oldPath: `prodigi-assets/mounts/${file.name}`,
          newPath: `prodigi-assets/mounts/${targetName}`,
          reason,
          usedByCode: true, // Mount textures are used by code
        });
      }
    }
  }

  return mappings;
}

/**
 * Rename file in Supabase
 */
async function renameFileInSupabase(oldPath: string, newPath: string): Promise<boolean> {
  try {
    // Supabase doesn't have a direct rename, so we need to:
    // 1. Copy the file to new path
    // 2. Delete the old file
    
    // Get the file
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(BUCKET_NAME)
      .download(oldPath);

    if (downloadError || !fileData) {
      console.error(`❌ Failed to download ${oldPath}:`, downloadError);
      return false;
    }

    // Upload to new path
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(newPath, fileData, {
        contentType: 'image/webp',
        upsert: true,
      });

    if (uploadError) {
      console.error(`❌ Failed to upload ${newPath}:`, uploadError);
      return false;
    }

    // Delete old file
    const { error: deleteError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([oldPath]);

    if (deleteError) {
      console.error(`⚠️  Failed to delete ${oldPath}:`, deleteError);
      // Don't fail - file is already copied
    }

    return true;
  } catch (error) {
    console.error(`❌ Error renaming ${oldPath}:`, error);
    return false;
  }
}

/**
 * Update code references
 */
function updateCodeReferences(mappings: RenameMapping[]): void {
  const codeFiles = [
    'src/lib/prodigi-textures/texture-mapper.ts',
    'src/lib/prodigi-assets/asset-catalog.ts',
    'src/hooks/useMountTexture.ts',
  ];

  console.log('\n📝 Updating code references...\n');

  for (const mapping of mappings) {
    if (!mapping.usedByCode) continue;

    const oldFileName = path.basename(mapping.oldPath);
    const newFileName = path.basename(mapping.newPath);

    for (const codeFile of codeFiles) {
      const filePath = path.join(process.cwd(), codeFile);
      if (!fs.existsSync(filePath)) continue;

      let content = fs.readFileSync(filePath, 'utf-8');
      const originalContent = content;

      // Replace references (be careful with exact matches)
      if (content.includes(oldFileName)) {
        content = content.replace(new RegExp(oldFileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newFileName);
        
        if (content !== originalContent) {
          fs.writeFileSync(filePath, content, 'utf-8');
          console.log(`   ✅ Updated ${codeFile}`);
          console.log(`      ${oldFileName} → ${newFileName}`);
        }
      }
    }
  }
}

/**
 * Normalize local files (if they exist)
 */
function normalizeLocalFiles(mappings: RenameMapping[]): void {
  const publicDir = path.join(process.cwd(), 'public');
  
  console.log('\n📁 Normalizing local files...\n');

  for (const mapping of mappings) {
    const oldLocalPath = path.join(publicDir, mapping.oldPath);
    const newLocalPath = path.join(publicDir, mapping.newPath);

    if (fs.existsSync(oldLocalPath)) {
      // Ensure directory exists
      const newDir = path.dirname(newLocalPath);
      if (!fs.existsSync(newDir)) {
        fs.mkdirSync(newDir, { recursive: true });
      }

      // Copy file to new location
      fs.copyFileSync(oldLocalPath, newLocalPath);
      console.log(`   ✅ Copied ${mapping.oldPath} → ${mapping.newPath}`);

      // Optionally delete old file (uncomment if you want to remove old files)
      // fs.unlinkSync(oldLocalPath);
      // console.log(`   🗑️  Deleted ${mapping.oldPath}`);
    }
  }
}

async function main() {
  console.log('🔄 Asset Name Normalization\n');
  console.log('='.repeat(80));
  console.log('');

  // 1. Find files to rename
  console.log('1️⃣ Finding files that need normalization...');
  const mappings = await findFilesToRename();
  
  if (mappings.length === 0) {
    console.log('   ✅ All files are already normalized!\n');
    return;
  }

  console.log(`   Found ${mappings.length} files to normalize:\n`);
  mappings.forEach((m, i) => {
    console.log(`   ${i + 1}. ${m.oldPath}`);
    console.log(`      → ${m.newPath}`);
    console.log(`      Reason: ${m.reason}`);
    console.log('');
  });

  // 2. Confirm before proceeding
  console.log('⚠️  This will:');
  console.log('   - Rename files in Supabase Storage');
  console.log('   - Update code references');
  console.log('   - Normalize local files (if they exist)');
  console.log('');
  console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
  
  await new Promise(resolve => setTimeout(resolve, 5000));

  // 3. Rename files in Supabase
  console.log('2️⃣ Renaming files in Supabase...\n');
  let successCount = 0;
  let failCount = 0;

  for (const mapping of mappings) {
    console.log(`   Renaming: ${mapping.oldPath}`);
    console.log(`   → ${mapping.newPath}`);
    
    const success = await renameFileInSupabase(mapping.oldPath, mapping.newPath);
    
    if (success) {
      console.log(`   ✅ Success\n`);
      successCount++;
    } else {
      console.log(`   ❌ Failed\n`);
      failCount++;
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // 4. Update code references
  if (successCount > 0) {
    updateCodeReferences(mappings);
  }

  // 5. Normalize local files
  normalizeLocalFiles(mappings);

  // 6. Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 SUMMARY\n');
  console.log(`Total files to normalize: ${mappings.length}`);
  console.log(`✅ Successfully renamed: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log('');
  
  if (successCount > 0) {
    console.log('✅ Normalization complete!');
    console.log('   - Files renamed in Supabase');
    console.log('   - Code references updated');
    console.log('   - Local files normalized');
  }
}

main().catch(console.error);

