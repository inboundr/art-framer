/**
 * Texture Loading Issue Analysis
 * 
 * Analyzes why textures fail to load and creates a plan to fix
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') });
config({ path: resolve(__dirname, '../.env') });

import { getSupabaseAssetUrlSync } from '../src/lib/prodigi-assets/supabase-assets';
import { getTexturePath } from '../src/lib/prodigi-textures/texture-mapper';

interface TextureTest {
  frameType: string;
  color: string;
  mapType: string;
  resolution: string;
  expectedPath: string;
  generatedUrl: string;
  existsLocally: boolean;
  existsInSupabase: boolean;
}

/**
 * Check if file exists locally
 */
function fileExistsLocally(filePath: string): boolean {
  const fullPath = path.join(process.cwd(), 'public', filePath);
  return fs.existsSync(fullPath);
}

/**
 * Test texture path generation
 */
function testTexturePath(
  frameType: string,
  color: string,
  mapType: string = 'diffuse',
  resolution: string = '1x'
): TextureTest {
  const localPath = `/prodigi-assets/frames/${frameType}/textures/${color}-${mapType}-${resolution}.webp`;
  const generatedUrl = getTexturePath({ frameType: frameType as any, color, mapType: mapType as any, resolution: resolution as any }) || '';
  
  return {
    frameType,
    color,
    mapType,
    resolution,
    expectedPath: localPath,
    generatedUrl,
    existsLocally: fileExistsLocally(localPath),
    existsInSupabase: false, // Would need to check Supabase API
  };
}

/**
 * Analyze all texture combinations
 */
function analyzeTextures() {
  console.log('🔍 Texture Loading Issue Analysis\n');
  console.log('='.repeat(80));
  
  const frameTypes = ['classic', 'aluminium', 'box', 'spacer', 'float'];
  const colors = ['black', 'white', 'brown', 'natural', 'dark-grey', 'light-grey', 'gold', 'silver'];
  const mapTypes = ['diffuse'];
  const resolutions = ['1x', '2x'];
  
  const results: TextureTest[] = [];
  
  console.log('\n📋 Testing Texture Paths:\n');
  
  for (const frameType of frameTypes) {
    for (const color of colors) {
      for (const mapType of mapTypes) {
        for (const resolution of resolutions) {
          const test = testTexturePath(frameType, color, mapType, resolution);
          results.push(test);
          
          const status = test.existsLocally ? '✅' : '❌';
          console.log(`${status} ${frameType}/${color}/${mapType}-${resolution}.webp`);
          if (!test.existsLocally) {
            console.log(`   Expected: ${test.expectedPath}`);
            console.log(`   Generated URL: ${test.generatedUrl}`);
          }
        }
      }
    }
  }
  
  // Summary
  console.log('\n\n📊 Summary\n');
  console.log('='.repeat(80));
  
  const total = results.length;
  const existsLocally = results.filter(r => r.existsLocally).length;
  const missing = total - existsLocally;
  
  console.log(`Total Texture Paths: ${total}`);
  console.log(`✅ Exist Locally: ${existsLocally} (${((existsLocally / total) * 100).toFixed(1)}%)`);
  console.log(`❌ Missing Locally: ${missing} (${((missing / total) * 100).toFixed(1)}%)`);
  
  // Group by frame type
  console.log('\n📦 By Frame Type:\n');
  frameTypes.forEach(frameType => {
    const typeResults = results.filter(r => r.frameType === frameType);
    const typeExists = typeResults.filter(r => r.existsLocally).length;
    console.log(`  ${frameType}: ${typeExists}/${typeResults.length} (${((typeExists / typeResults.length) * 100).toFixed(1)}%)`);
  });
  
  // Group by color
  console.log('\n🎨 By Color:\n');
  colors.forEach(color => {
    const colorResults = results.filter(r => r.color === color);
    const colorExists = colorResults.filter(r => r.existsLocally).length;
    console.log(`  ${color}: ${colorExists}/${colorResults.length} (${((colorExists / colorResults.length) * 100).toFixed(1)}%)`);
  });
  
  // Missing textures
  const missingTextures = results.filter(r => !r.existsLocally);
  if (missingTextures.length > 0) {
    console.log('\n❌ Missing Textures:\n');
    missingTextures.slice(0, 20).forEach(test => {
      console.log(`  - ${test.frameType}/${test.color}/${test.mapType}-${test.resolution}.webp`);
    });
    if (missingTextures.length > 20) {
      console.log(`  ... and ${missingTextures.length - 20} more`);
    }
  }
  
  // Root cause analysis
  console.log('\n\n🔍 Root Cause Analysis\n');
  console.log('='.repeat(80));
  
  console.log('\n1. Texture Discovery Issue:');
  console.log('   - Textures were discovered from Prodigi product images');
  console.log('   - This created a dependency on Prodigi API responses');
  console.log('   - When Prodigi API changes or products are unavailable, textures break');
  
  console.log('\n2. File Organization Issue:');
  console.log('   - Textures are stored in public/prodigi-assets/frames/{type}/textures/');
  console.log('   - Migration to Supabase broke URL generation (duplicate prefix)');
  console.log('   - Files may not be uploaded to Supabase yet');
  
  console.log('\n3. Fallback System Issue:');
  console.log('   - useProdigiTexture throws errors when textures fail to load');
  console.log('   - ErrorBoundary catches errors but doesn\'t gracefully degrade');
  console.log('   - No robust fallback to color-based materials');
  
  // Recommendations
  console.log('\n\n💡 Recommendations\n');
  console.log('='.repeat(80));
  
  console.log('\n1. Decouple from Prodigi Images:');
  console.log('   - Use Prodigi API to discover available frame types/colors');
  console.log('   - But maintain local texture library independent of API');
  console.log('   - Use Prodigi data for configuration, not for texture discovery');
  
  console.log('\n2. Robust Fallback System:');
  console.log('   - Always fall back to color-based materials when textures fail');
  console.log('   - Use material properties from frame-texture-config.ts');
  console.log('   - Never throw errors - always degrade gracefully');
  
  console.log('\n3. Texture Validation:');
  console.log('   - Pre-validate texture paths before loading');
  console.log('   - Check both local and Supabase storage');
  console.log('   - Cache validation results');
  
  console.log('\n4. Upload Missing Textures:');
  console.log('   - Run upload script to sync all textures to Supabase');
  console.log('   - Verify all texture paths are correct');
  console.log('   - Test texture loading after upload');
}

// Run analysis
analyzeTextures();

