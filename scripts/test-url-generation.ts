/**
 * Test URL generation for various paths to find issues
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const BUCKET_NAME = 'prodigi-assets';

function getSupabaseAssetUrlSync(localPath: string): string {
  let storagePath = localPath.startsWith('/') ? localPath.slice(1) : localPath;
  
  // Sanitize (simplified version)
  function sanitizeStoragePath(filePath: string): string {
    const pathParts = filePath.split('/');
    const directory = pathParts.slice(0, -1).join('/');
    const filename = pathParts[pathParts.length - 1];
    
    const sanitizedFilename = filename
      .replace(/–/g, '-')
      .replace(/—/g, '-')
      .replace(/['"]/g, '')
      .replace(/[^\w\s\-._()]/g, '-')
      .replace(/\s+/g, ' ')
      .replace(/-+/g, '-')
      .trim();
    
    return directory ? `${directory}/${sanitizedFilename}` : sanitizedFilename;
  }
  
  storagePath = sanitizeStoragePath(storagePath);
  
  const encodedPath = storagePath
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/');
  
  return `${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/${encodedPath}`;
}

// Test various paths
const testCases = [
  // Frame textures
  '/prodigi-assets/frames/classic/textures/black-diffuse-1x.webp',
  '/prodigi-assets/frames/classic/textures/white-diffuse-1x.webp',
  
  // Mount textures (the problematic ones)
  '/prodigi-assets/mounts/black-mount.webp',
  '/prodigi-assets/mounts/white-mount.webp', // This doesn't exist!
  '/prodigi-assets/mounts/snow-white-mount.webp',
  '/prodigi-assets/mounts/off-white-mount.webp',
  
  // Files with spaces
  '/prodigi-assets/frames/classic/textures/Black classic frame_blank.png',
  
  // Files with special characters
  '/prodigi-assets-extracted/Prodigi packaging/Prodigi cardboard tubes - prints, posters, rolled canvas 1.jpg',
];

console.log('🔍 Testing URL Generation\n');
console.log('='.repeat(80));
console.log('');

for (const testPath of testCases) {
  const url = getSupabaseAssetUrlSync(testPath);
  const storagePath = testPath.startsWith('/') ? testPath.slice(1) : testPath;
  
  console.log(`Input:    ${testPath}`);
  console.log(`Storage:  ${storagePath}`);
  console.log(`URL:      ${url}`);
  
  // Test if accessible
  fetch(url, { method: 'HEAD' })
    .then(response => {
      if (response.ok) {
        console.log(`Status:   ✅ ${response.status} OK`);
      } else {
        console.log(`Status:   ❌ ${response.status} ${response.statusText}`);
      }
    })
    .catch(error => {
      console.log(`Status:   ❌ Error: ${error.message}`);
    });
  
  console.log('');
}

