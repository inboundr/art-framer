/**
 * Prodigi Texture Processing Script
 * 
 * This script processes Prodigi frame blank images into optimized web textures.
 * 
 * Usage:
 *   npx tsx scripts/process-prodigi-textures.ts
 * 
 * Requirements:
 *   - sharp (npm install sharp)
 *   - All Prodigi assets extracted to public/prodigi-assets-extracted/
 */

import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';

interface TextureProcessingConfig {
  inputDir: string;
  outputDir: string;
  frameTypes: FrameTypeConfig[];
}

interface FrameTypeConfig {
  name: string;
  inputPath: string;
  colors: ColorConfig[];
}

interface ColorConfig {
  prodigiName: string;
  normalizedName: string;
  inputFile: string;
}

// Configuration
const CONFIG: TextureProcessingConfig = {
  inputDir: path.join(process.cwd(), 'public', 'prodigi-assets-extracted'),
  outputDir: path.join(process.cwd(), 'public', 'prodigi-assets'),
  frameTypes: [
    {
      name: 'classic',
      inputPath: 'prodigi-classic-frame-blanks',
      colors: [
        { prodigiName: 'Black', normalizedName: 'black', inputFile: 'Black classic frame_blank.png' },
        { prodigiName: 'White', normalizedName: 'white', inputFile: 'White classic frame_blank.png' },
        { prodigiName: 'Brown', normalizedName: 'brown', inputFile: 'Brown classic frame_blank.jpg' },
        { prodigiName: 'Dark grey', normalizedName: 'dark-grey', inputFile: 'Dark grey classic frame_blank.jpg' },
        { prodigiName: 'Light grey', normalizedName: 'light-grey', inputFile: 'Light grey classic frame_blank.jpg' },
        { prodigiName: 'Natural', normalizedName: 'natural', inputFile: 'Natural classic frame_blank.png' },
        { prodigiName: 'Gold', normalizedName: 'gold', inputFile: 'Gold Classic Frame_blank.png' },
        { prodigiName: 'Silver', normalizedName: 'silver', inputFile: 'Silver Classic Frame_blank.png' },
      ],
    },
    {
      name: 'aluminium',
      inputPath: 'prodigi-aluminium-frames-blank-assets/Aluminium frames',
      colors: [
        { prodigiName: 'Black', normalizedName: 'black', inputFile: 'Prodigi-black-aluminium-blank.jpg' },
        { prodigiName: 'Silver', normalizedName: 'silver', inputFile: 'Prodigi-silver-aluminium-frame-blank.jpg' },
        { prodigiName: 'Gold', normalizedName: 'gold', inputFile: 'Prodigi-gold-aluminium-frame-blank.jpg' },
      ],
    },
  ],
};

/**
 * Process a single frame texture
 */
async function processFrameTexture(
  frameType: string,
  color: ColorConfig,
  inputPath: string,
  outputBasePath: string
): Promise<void> {
  const inputFile = path.join(inputPath, color.inputFile);
  
  if (!fs.existsSync(inputFile)) {
    console.warn(`⚠️  File not found: ${inputFile}`);
    return;
  }

  const outputDir = path.join(outputBasePath, 'frames', frameType, 'textures');
  fs.mkdirSync(outputDir, { recursive: true });

  const outputFile1x = path.join(outputDir, `${color.normalizedName}-diffuse-1x.webp`);
  const outputFile2x = path.join(outputDir, `${color.normalizedName}-diffuse-2x.webp`);

  try {
    // Get image metadata
    const metadata = await sharp(inputFile).metadata();
    
    // Process 1x texture (2048x2048)
    await sharp(inputFile)
      .resize(2048, 2048, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 },
      })
      .webp({ quality: 85, effort: 6 })
      .toFile(outputFile1x);

    console.log(`✅ Created: ${outputFile1x}`);

    // Process 2x texture (4096x4096) if source is large enough
    if (metadata.width && metadata.width >= 2048) {
      await sharp(inputFile)
        .resize(4096, 4096, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 },
        })
        .webp({ quality: 85, effort: 6 })
        .toFile(outputFile2x);

      console.log(`✅ Created: ${outputFile2x}`);
    }

    // Get file sizes
    const stats1x = fs.statSync(outputFile1x);
    const stats2x = fs.existsSync(outputFile2x) ? fs.statSync(outputFile2x) : null;

    console.log(`   📦 1x: ${(stats1x.size / 1024).toFixed(2)} KB`);
    if (stats2x) {
      console.log(`   📦 2x: ${(stats2x.size / 1024).toFixed(2)} KB`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${inputFile}:`, error);
  }
}

/**
 * Process mount textures
 */
async function processMountTextures(
  inputDir: string,
  outputDir: string
): Promise<void> {
  const mountDir = path.join(outputDir, 'mounts');
  fs.mkdirSync(mountDir, { recursive: true });

  const mounts = [
    { name: 'black', file: 'Black mount.jpg', source: 'prodigi-classic-frames-photo-assets' },
    { name: 'off-white', file: 'Off-white mount.jpg', source: 'prodigi-classic-frames-photo-assets' },
    { name: 'snow-white', file: 'Snow white mount.jpg', source: 'prodigi-classic-frames-photo-assets' },
  ];

  for (const mount of mounts) {
    const inputFile = path.join(inputDir, mount.source, mount.file);
    
    if (!fs.existsSync(inputFile)) {
      console.warn(`⚠️  Mount file not found: ${inputFile}`);
      continue;
    }

    const outputFile = path.join(mountDir, `${mount.name}-mount.webp`);

    try {
      await sharp(inputFile)
        .resize(1024, 1024, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 },
        })
        .webp({ quality: 85, effort: 6 })
        .toFile(outputFile);

      const stats = fs.statSync(outputFile);
      console.log(`✅ Created mount: ${outputFile} (${(stats.size / 1024).toFixed(2)} KB)`);
    } catch (error) {
      console.error(`❌ Error processing mount ${inputFile}:`, error);
    }
  }
}

/**
 * Process canvas textures
 */
async function processCanvasTextures(
  inputDir: string,
  outputDir: string
): Promise<void> {
  const canvasDir = path.join(outputDir, 'canvas', 'textures');
  fs.mkdirSync(canvasDir, { recursive: true });

  const canvasTextures = [
    {
      name: 'substrate',
      file: 'Canvas-substrate-texture.jpg',
      source: 'prodigi-stretched-canvas-photo-assets',
    },
    {
      name: 'blank',
      file: 'Prodigi-global-canvas-8x10-blank.jpg',
      source: 'prodigi-stretched-canvas-photo-assets',
    },
  ];

  for (const texture of canvasTextures) {
    const inputFile = path.join(inputDir, texture.source, texture.file);
    
    if (!fs.existsSync(inputFile)) {
      console.warn(`⚠️  Canvas texture not found: ${inputFile}`);
      continue;
    }

    const outputFile = path.join(canvasDir, `${texture.name}.webp`);

    try {
      await sharp(inputFile)
        .resize(2048, 2048, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 },
        })
        .webp({ quality: 85, effort: 6 })
        .toFile(outputFile);

      const stats = fs.statSync(outputFile);
      console.log(`✅ Created canvas texture: ${outputFile} (${(stats.size / 1024).toFixed(2)} KB)`);
    } catch (error) {
      console.error(`❌ Error processing canvas texture ${inputFile}:`, error);
    }
  }
}

/**
 * Main processing function
 */
async function main() {
  console.log('🎨 Prodigi Texture Processing\n');
  console.log(`Input: ${CONFIG.inputDir}`);
  console.log(`Output: ${CONFIG.outputDir}\n`);

  // Check if input directory exists
  if (!fs.existsSync(CONFIG.inputDir)) {
    console.error(`❌ Input directory not found: ${CONFIG.inputDir}`);
    process.exit(1);
  }

  // Create output directory structure
  fs.mkdirSync(CONFIG.outputDir, { recursive: true });

  // Process frame textures
  console.log('📦 Processing frame textures...\n');
  for (const frameType of CONFIG.frameTypes) {
    const inputPath = path.join(CONFIG.inputDir, frameType.inputPath);
    
    if (!fs.existsSync(inputPath)) {
      console.warn(`⚠️  Frame type directory not found: ${inputPath}`);
      continue;
    }

    console.log(`\n🎯 Processing ${frameType.name} frames:`);
    
    for (const color of frameType.colors) {
      await processFrameTexture(
        frameType.name,
        color,
        inputPath,
        CONFIG.outputDir
      );
    }
  }

  // Process mount textures
  console.log('\n📦 Processing mount textures...\n');
  await processMountTextures(CONFIG.inputDir, CONFIG.outputDir);

  // Process canvas textures
  console.log('\n📦 Processing canvas textures...\n');
  await processCanvasTextures(CONFIG.inputDir, CONFIG.outputDir);

  console.log('\n✨ Texture processing complete!');
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

export { processFrameTexture, processMountTextures, processCanvasTextures };



