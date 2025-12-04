/**
 * Clean up mount folder - remove non-mount files
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

const VALID_MOUNT_FILES = [
  'black-mount.webp',
  'snow-white-mount.webp',
  'off-white-mount.webp',
];

async function cleanup() {
  console.log('🧹 Cleaning up mount folder...\n');

  const { data: files, error } = await supabase.storage
    .from(BUCKET_NAME)
    .list('prodigi-assets/mounts', { limit: 1000 });

  if (error) {
    console.error('❌ Error listing files:', error);
    return;
  }

  if (!files) {
    console.log('No files found');
    return;
  }

  console.log('Files in mounts folder:');
  const toRemove: string[] = [];

  for (const file of files) {
    if (!file.id) continue; // Skip folders

    const isValid = VALID_MOUNT_FILES.includes(file.name);
    console.log(`   ${isValid ? '✅' : '❌'} ${file.name}`);

    if (!isValid) {
      toRemove.push(`prodigi-assets/mounts/${file.name}`);
    }
  }

  if (toRemove.length === 0) {
    console.log('\n✅ All files are valid mount textures!');
    return;
  }

  console.log(`\n⚠️  Found ${toRemove.length} files to remove:`);
  toRemove.forEach(f => console.log(`   - ${f}`));
  console.log('\nThese are lifestyle/reference images, not mount textures.');
  console.log('They should be in prodigi-assets-extracted/ folder.\n');

  // Ask for confirmation
  console.log('Press Ctrl+C to cancel, or wait 3 seconds to remove...\n');
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Remove files
  console.log('Removing files...\n');
  const { error: removeError } = await supabase.storage
    .from(BUCKET_NAME)
    .remove(toRemove);

  if (removeError) {
    console.error('❌ Error removing files:', removeError);
  } else {
    console.log(`✅ Removed ${toRemove.length} files`);
  }
}

cleanup().catch(console.error);

