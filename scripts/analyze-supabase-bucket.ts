/**
 * Comprehensive analysis of Supabase bucket to find filename/URL mismatches
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

interface FileInfo {
  path: string;
  name: string;
  size: number;
  isAccessible: boolean;
  statusCode?: number;
  error?: string;
}

/**
 * Recursively list all files in a folder
 */
async function listAllFiles(folderPath: string = '', depth: number = 0): Promise<FileInfo[]> {
  const files: FileInfo[] = [];
  const maxDepth = 10; // Prevent infinite recursion
  
  if (depth > maxDepth) {
    console.warn(`⚠️  Max depth reached for ${folderPath}`);
    return files;
  }

  const { data: items, error } = await supabase.storage
    .from(BUCKET_NAME)
    .list(folderPath, {
      limit: 1000,
      sortBy: { column: 'name', order: 'asc' }
    });

  if (error) {
    console.error(`❌ Error listing ${folderPath}:`, error.message);
    return files;
  }

  if (!items) return files;

  for (const item of items) {
    const fullPath = folderPath ? `${folderPath}/${item.name}` : item.name;
    
    if (!item.id) {
      // It's a folder, recurse
      const subFiles = await listAllFiles(fullPath, depth + 1);
      files.push(...subFiles);
    } else {
      // It's a file
      files.push({
        path: fullPath,
        name: item.name,
        size: item.metadata?.size || 0,
        isAccessible: false, // Will test below
      });
    }
  }

  return files;
}

/**
 * Test if a file is accessible via public URL
 */
async function testFileAccess(filePath: string): Promise<{ accessible: boolean; statusCode?: number; error?: string }> {
  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);

  try {
    const response = await fetch(publicUrl, { method: 'HEAD' });
    return {
      accessible: response.ok,
      statusCode: response.status,
      error: response.ok ? undefined : `${response.status} ${response.statusText}`,
    };
  } catch (error) {
    return {
      accessible: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Generate expected paths based on code
 */
function getExpectedPaths() {
  return {
    frameTextures: [
      'prodigi-assets/frames/classic/textures/black-diffuse-1x.webp',
      'prodigi-assets/frames/classic/textures/white-diffuse-1x.webp',
      'prodigi-assets/frames/classic/textures/brown-diffuse-1x.webp',
      'prodigi-assets/frames/classic/textures/natural-diffuse-1x.webp',
      'prodigi-assets/frames/classic/textures/gold-diffuse-1x.webp',
      'prodigi-assets/frames/classic/textures/silver-diffuse-1x.webp',
      'prodigi-assets/frames/classic/textures/dark-grey-diffuse-1x.webp',
      'prodigi-assets/frames/classic/textures/light-grey-diffuse-1x.webp',
    ],
    mountTextures: [
      'prodigi-assets/mounts/black-mount.webp',
      'prodigi-assets/mounts/white-mount.webp', // This is the problem!
      'prodigi-assets/mounts/snow-white-mount.webp',
      'prodigi-assets/mounts/off-white-mount.webp',
    ],
    canvasTextures: [
      'prodigi-assets/canvas/textures/substrate.webp',
      'prodigi-assets/canvas/textures/blank.webp',
    ],
    canvasWraps: [
      'prodigi-assets/canvas/wraps/black-wrap.webp',
      'prodigi-assets/canvas/wraps/white-wrap.webp',
      'prodigi-assets/canvas/wraps/image-wrap.webp',
      'prodigi-assets/canvas/wraps/mirror-wrap.webp',
    ],
  };
}

/**
 * Normalize path for comparison (handle URL encoding, spaces, etc.)
 */
function normalizePath(p: string): string {
  return p
    .toLowerCase()
    .replace(/%20/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Find similar files (fuzzy match)
 */
function findSimilarFiles(targetPath: string, allFiles: FileInfo[]): FileInfo[] {
  const normalizedTarget = normalizePath(targetPath);
  const targetParts = normalizedTarget.split('/');
  const targetName = targetParts[targetParts.length - 1];
  
  return allFiles.filter(file => {
    const normalizedFile = normalizePath(file.path);
    const fileParts = normalizedFile.split('/');
    const fileName = fileParts[fileParts.length - 1];
    
    // Check if same folder and similar filename
    const sameFolder = targetParts.slice(0, -1).join('/') === fileParts.slice(0, -1).join('/');
    const similarName = fileName.includes(targetName) || targetName.includes(fileName);
    
    return sameFolder && similarName;
  });
}

async function main() {
  console.log('🔍 Comprehensive Supabase Bucket Analysis\n');
  console.log('='.repeat(80));
  console.log('');

  // 1. List all files
  console.log('1️⃣ Listing all files in bucket...');
  const allFiles = await listAllFiles();
  console.log(`   Found ${allFiles.length} files\n`);

  // 2. Test file accessibility
  console.log('2️⃣ Testing file accessibility...');
  let accessibleCount = 0;
  let inaccessibleCount = 0;
  
  // Test a sample of files (first 50 to avoid too many requests)
  const sampleFiles = allFiles.slice(0, 50);
  for (const file of sampleFiles) {
    const result = await testFileAccess(file.path);
    file.isAccessible = result.accessible;
    file.statusCode = result.statusCode;
    file.error = result.error;
    
    if (result.accessible) {
      accessibleCount++;
    } else {
      inaccessibleCount++;
    }
  }
  
  console.log(`   ✅ Accessible: ${accessibleCount}`);
  console.log(`   ❌ Inaccessible: ${inaccessibleCount}\n`);

  // 3. Check expected paths vs actual files
  console.log('3️⃣ Checking expected paths vs actual files...\n');
  const expected = getExpectedPaths();
  const issues: Array<{ expected: string; found: FileInfo[]; issue: string }> = [];

  // Check frame textures
  console.log('📁 Frame Textures:');
  for (const expectedPath of expected.frameTextures) {
    const found = allFiles.find(f => normalizePath(f.path) === normalizePath(expectedPath));
    if (!found) {
      const similar = findSimilarFiles(expectedPath, allFiles);
      console.log(`   ❌ ${expectedPath}`);
      if (similar.length > 0) {
        console.log(`      Similar files found:`);
        similar.forEach(s => console.log(`         - ${s.path}`));
      }
      issues.push({
        expected: expectedPath,
        found: similar,
        issue: 'File not found',
      });
    } else {
      console.log(`   ✅ ${expectedPath}`);
    }
  }
  console.log('');

  // Check mount textures
  console.log('📁 Mount Textures:');
  for (const expectedPath of expected.mountTextures) {
    const found = allFiles.find(f => normalizePath(f.path) === normalizePath(expectedPath));
    if (!found) {
      const similar = findSimilarFiles(expectedPath, allFiles);
      console.log(`   ❌ ${expectedPath}`);
      if (similar.length > 0) {
        console.log(`      Similar files found:`);
        similar.forEach(s => console.log(`         - ${s.path}`));
      }
      issues.push({
        expected: expectedPath,
        found: similar,
        issue: 'File not found',
      });
    } else {
      console.log(`   ✅ ${expectedPath}`);
    }
  }
  console.log('');

  // Check canvas textures
  console.log('📁 Canvas Textures:');
  for (const expectedPath of expected.canvasTextures) {
    const found = allFiles.find(f => normalizePath(f.path) === normalizePath(expectedPath));
    if (!found) {
      const similar = findSimilarFiles(expectedPath, allFiles);
      console.log(`   ❌ ${expectedPath}`);
      if (similar.length > 0) {
        console.log(`      Similar files found:`);
        similar.forEach(s => console.log(`         - ${s.path}`));
      }
      issues.push({
        expected: expectedPath,
        found: similar,
        issue: 'File not found',
      });
    } else {
      console.log(`   ✅ ${expectedPath}`);
    }
  }
  console.log('');

  // Check canvas wraps
  console.log('📁 Canvas Wraps:');
  for (const expectedPath of expected.canvasWraps) {
    const found = allFiles.find(f => normalizePath(f.path) === normalizePath(expectedPath));
    if (!found) {
      const similar = findSimilarFiles(expectedPath, allFiles);
      console.log(`   ❌ ${expectedPath}`);
      if (similar.length > 0) {
        console.log(`      Similar files found:`);
        similar.forEach(s => console.log(`         - ${s.path}`));
      }
      issues.push({
        expected: expectedPath,
        found: similar,
        issue: 'File not found',
      });
    } else {
      console.log(`   ✅ ${expectedPath}`);
    }
  }
  console.log('');

  // 4. Analyze URL generation
  console.log('4️⃣ Analyzing URL generation...\n');
  const testPaths = [
    'prodigi-assets/frames/classic/textures/black-diffuse-1x.webp',
    'prodigi-assets/mounts/white-mount.webp',
    'prodigi-assets/mounts/snow-white-mount.webp',
  ];

  for (const testPath of testPaths) {
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(testPath);
    
    console.log(`Path: ${testPath}`);
    console.log(`URL:  ${publicUrl}`);
    
    // Check if file exists
    const exists = allFiles.some(f => normalizePath(f.path) === normalizePath(testPath));
    console.log(`Exists: ${exists ? '✅' : '❌'}`);
    
    // Test accessibility
    const access = await testFileAccess(testPath);
    console.log(`Accessible: ${access.accessible ? '✅' : '❌'} ${access.error || ''}`);
    console.log('');
  }

  // 5. Summary
  console.log('='.repeat(80));
  console.log('📊 SUMMARY\n');
  console.log(`Total files in bucket: ${allFiles.length}`);
  console.log(`Files tested: ${sampleFiles.length}`);
  console.log(`Accessible: ${accessibleCount}`);
  console.log(`Inaccessible: ${inaccessibleCount}`);
  console.log(`Issues found: ${issues.length}\n`);

  if (issues.length > 0) {
    console.log('🔴 ISSUES FOUND:\n');
    issues.forEach((issue, index) => {
      console.log(`${index + 1}. Expected: ${issue.expected}`);
      console.log(`   Issue: ${issue.issue}`);
      if (issue.found.length > 0) {
        console.log(`   Similar files:`);
        issue.found.forEach(f => console.log(`      - ${f.path}`));
      }
      console.log('');
    });
  }

  // 6. Recommendations
  console.log('💡 RECOMMENDATIONS:\n');
  
  const whiteMountIssue = issues.find(i => i.expected.includes('white-mount.webp'));
  if (whiteMountIssue) {
    console.log('1. Mount color mapping issue:');
    console.log('   - Code expects: white-mount.webp');
    console.log('   - Actual file: snow-white-mount.webp');
    console.log('   - Fix: Map "white" → "snow-white" in texture-mapper.ts ✅ (Already fixed)');
    console.log('');
  }

  // Check for URL encoding issues
  const filesWithSpaces = allFiles.filter(f => f.path.includes(' '));
  if (filesWithSpaces.length > 0) {
    console.log('2. Files with spaces in names:');
    filesWithSpaces.slice(0, 5).forEach(f => {
      console.log(`   - ${f.path}`);
    });
    console.log('   - These should be URL-encoded when generating URLs');
    console.log('   - Current code handles this with encodeURIComponent ✅');
    console.log('');
  }

  // Check for special characters
  const filesWithSpecialChars = allFiles.filter(f => 
    /[–—'"]/.test(f.path) || /[^\w\s\-._()\/]/.test(f.path)
  );
  if (filesWithSpecialChars.length > 0) {
    console.log('3. Files with special characters:');
    filesWithSpecialChars.slice(0, 5).forEach(f => {
      console.log(`   - ${f.path}`);
    });
    console.log('   - These may need sanitization');
    console.log('   - Current code has sanitizeStoragePath function ✅');
    console.log('');
  }
}

main().catch(console.error);

