/**
 * Test the actual texture URL that would be generated
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const BUCKET_NAME = 'prodigi-assets';

function getSupabaseAssetUrlSync(localPath: string): string {
  let storagePath = localPath.startsWith('/') ? localPath.slice(1) : localPath;
  
  const encodedPath = storagePath
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/');
  
  return `${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/${encodedPath}`;
}

// Test the exact path that would be used
const testPath = '/prodigi-assets/frames/classic/textures/black-diffuse-1x.webp';
const url = getSupabaseAssetUrlSync(testPath);

console.log('🔍 Testing texture URL generation...\n');
console.log('Input path:', testPath);
console.log('Generated URL:', url);
console.log('');

// Try to fetch it
console.log('🌐 Testing URL accessibility...');
fetch(url, { method: 'HEAD' })
  .then(response => {
    console.log(`Status: ${response.status} ${response.statusText}`);
    if (response.ok) {
      console.log('✅ File is accessible!');
      console.log('Content-Type:', response.headers.get('content-type'));
      console.log('Content-Length:', response.headers.get('content-length'));
    } else {
      console.log('❌ File not accessible');
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    }
  })
  .catch(error => {
    console.error('❌ Error fetching:', error.message);
  });

