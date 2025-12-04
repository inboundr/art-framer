/**
 * Analyze current naming patterns in Supabase bucket
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
  folder: string;
  type: 'frame-texture' | 'mount' | 'canvas-texture' | 'canvas-wrap' | 'other';
}

async function listAllFiles(folderPath: string = '', depth: number = 0): Promise<FileInfo[]> {
  const files: FileInfo[] = [];
  if (depth > 10) return files;

  const { data: items, error } = await supabase.storage
    .from(BUCKET_NAME)
    .list(folderPath, {
      limit: 1000,
      sortBy: { column: 'name', order: 'asc' }
    });

  if (error || !items) return files;

  for (const item of items) {
    const fullPath = folderPath ? `${folderPath}/${item.name}` : item.name;
    
    if (!item.id) {
      // Folder
      const subFiles = await listAllFiles(fullPath, depth + 1);
      files.push(...subFiles);
    } else {
      // File
      let type: FileInfo['type'] = 'other';
      if (fullPath.includes('/frames/') && fullPath.includes('/textures/')) {
        type = 'frame-texture';
      } else if (fullPath.includes('/mounts/')) {
        type = 'mount';
      } else if (fullPath.includes('/canvas/textures/')) {
        type = 'canvas-texture';
      } else if (fullPath.includes('/canvas/wraps/')) {
        type = 'canvas-wrap';
      }

      files.push({
        path: fullPath,
        name: item.name,
        folder: folderPath,
        type,
      });
    }
  }

  return files;
}

function analyzeNamingPattern(files: FileInfo[]) {
  const patterns = {
    'frame-texture': new Set<string>(),
    'mount': new Set<string>(),
    'canvas-texture': new Set<string>(),
    'canvas-wrap': new Set<string>(),
  };

  files.forEach(file => {
    if (file.type !== 'other') {
      patterns[file.type].add(file.name);
    }
  });

  return patterns;
}

function suggestNormalizedName(originalName: string, type: FileInfo['type']): string {
  let normalized = originalName;

  // Convert to lowercase
  normalized = normalized.toLowerCase();

  // Replace spaces with hyphens
  normalized = normalized.replace(/\s+/g, '-');

  // Replace underscores with hyphens
  normalized = normalized.replace(/_/g, '-');

  // Remove special characters except dots, hyphens, and file extensions
  normalized = normalized.replace(/[^a-z0-9.\-]/g, '');

  // Remove multiple consecutive hyphens
  normalized = normalized.replace(/-+/g, '-');

  // Remove leading/trailing hyphens
  normalized = normalized.replace(/^-+|-+$/g, '');

  // Normalize specific patterns based on type
  if (type === 'frame-texture') {
    // Pattern: {color}-{maptype}-{resolution}.webp
    // e.g., black-diffuse-1x.webp
    normalized = normalized.replace(/classic-frame-blank|frame-blank/gi, '');
    normalized = normalized.replace(/^black-classic|^white-classic|^brown-classic/gi, (match) => {
      return match.replace('-classic', '').toLowerCase();
    });
  } else if (type === 'mount') {
    // Pattern: {color}-mount.webp
    // e.g., black-mount.webp, snow-white-mount.webp
    normalized = normalized.replace(/mount\.(webp|jpg|png)$/i, 'mount.webp');
    normalized = normalized.replace(/^mount-|^-mount/gi, '');
    // Normalize white variants
    if (normalized.includes('snow') && normalized.includes('white')) {
      normalized = 'snow-white-mount.webp';
    } else if (normalized.includes('off') && normalized.includes('white')) {
      normalized = 'off-white-mount.webp';
    } else if (normalized.includes('white') && !normalized.includes('snow') && !normalized.includes('off')) {
      normalized = 'snow-white-mount.webp'; // Default white to snow-white
    }
  } else if (type === 'canvas-wrap') {
    // Pattern: {color}-wrap.webp
    // e.g., black-wrap.webp, white-wrap.webp
    normalized = normalized.replace(/wrap\.(webp|jpg|png)$/i, 'wrap.webp');
  }

  return normalized;
}

async function main() {
  console.log('🔍 Analyzing naming patterns...\n');

  const allFiles = await listAllFiles();
  console.log(`Found ${allFiles.length} files\n`);

  // Group by type
  const byType = {
    'frame-texture': allFiles.filter(f => f.type === 'frame-texture'),
    'mount': allFiles.filter(f => f.type === 'mount'),
    'canvas-texture': allFiles.filter(f => f.type === 'canvas-texture'),
    'canvas-wrap': allFiles.filter(f => f.type === 'canvas-wrap'),
  };

  // Analyze each type
  console.log('📊 Current Naming Patterns:\n');
  
  console.log('1️⃣ Frame Textures:');
  byType['frame-texture'].forEach(f => {
    const suggested = suggestNormalizedName(f.name, 'frame-texture');
    const needsRename = f.name !== suggested;
    console.log(`   ${needsRename ? '⚠️' : '✅'} ${f.name}`);
    if (needsRename) {
      console.log(`      → ${suggested}`);
    }
  });
  console.log('');

  console.log('2️⃣ Mount Textures:');
  byType['mount'].forEach(f => {
    const suggested = suggestNormalizedName(f.name, 'mount');
    const needsRename = f.name !== suggested;
    console.log(`   ${needsRename ? '⚠️' : '✅'} ${f.name}`);
    if (needsRename) {
      console.log(`      → ${suggested}`);
    }
  });
  console.log('');

  console.log('3️⃣ Canvas Textures:');
  byType['canvas-texture'].forEach(f => {
    const suggested = suggestNormalizedName(f.name, 'canvas-texture');
    const needsRename = f.name !== suggested;
    console.log(`   ${needsRename ? '⚠️' : '✅'} ${f.name}`);
    if (needsRename) {
      console.log(`      → ${suggested}`);
    }
  });
  console.log('');

  console.log('4️⃣ Canvas Wraps:');
  byType['canvas-wrap'].forEach(f => {
    const suggested = suggestNormalizedName(f.name, 'canvas-wrap');
    const needsRename = f.name !== suggested;
    console.log(`   ${needsRename ? '⚠️' : '✅'} ${f.name}`);
    if (needsRename) {
      console.log(`      → ${suggested}`);
    }
  });
  console.log('');

  // Generate rename mapping
  console.log('📝 Rename Mapping:\n');
  const renameMap: Array<{ oldPath: string; newPath: string; type: FileInfo['type'] }> = [];

  allFiles.forEach(file => {
    if (file.type !== 'other') {
      const suggested = suggestNormalizedName(file.name, file.type);
      if (file.name !== suggested) {
        const oldPath = file.path;
        const newPath = file.folder ? `${file.folder}/${suggested}` : suggested;
        renameMap.push({ oldPath, newPath, type: file.type });
        console.log(`${oldPath}`);
        console.log(`  → ${newPath}`);
        console.log('');
      }
    }
  });

  console.log(`\n📊 Summary: ${renameMap.length} files need renaming`);
}

main().catch(console.error);

