/**
 * Prodigi Texture Mapper
 * Maps Prodigi frame types and colors to texture file paths
 */

import { getSupabaseAssetUrlSync } from '@/lib/prodigi-assets/supabase-assets';

export type FrameType = 'classic' | 'aluminium' | 'box' | 'spacer' | 'float';
export type TextureMapType = 'diffuse' | 'normal' | 'roughness' | 'metalness';
export type TextureResolution = '1x' | '2x';

/**
 * Maps Prodigi color names to normalized texture names
 */
const COLOR_MAPPING: Record<string, string> = {
  // Standard colors
  'black': 'black',
  'white': 'white',
  'brown': 'brown',
  'natural': 'natural',
  
  // Greys
  'dark grey': 'dark-grey',
  'dark gray': 'dark-grey',
  'light grey': 'light-grey',
  'light gray': 'light-grey',
  'grey': 'grey',
  'gray': 'grey',
  
  // Metallics
  'gold': 'gold',
  'silver': 'silver',
  'antique gold': 'antique-gold',
  'antique silver': 'antique-silver',
  'antiquegold': 'antique-gold',
  'antiquesilver': 'antique-silver',
};

/**
 * Maps mount color names to actual texture file names
 * 
 * After normalization, file names follow the pattern: {color}-mount.webp
 * - Spaces are converted to hyphens automatically by the fallback
 * - Special cases for common variations
 */
const MOUNT_COLOR_MAPPING: Record<string, string> = {
  'white': 'snow-white', // Special case: "white" maps to "snow-white" (actual file name)
  'snowwhite': 'snow-white', // Handle edge case: "snowwhite" (no space)
  'offwhite': 'off-white', // Handle edge case: "offwhite" (no space)
  // All other colors (snow white, off white, black, etc.) are handled by fallback:
  // normalizedColor.replace(/\s+/g, '-') converts spaces to hyphens
};

/**
 * Normalizes a color name to a texture-safe name
 * Handles hex color codes by stripping the # and mapping to known colors
 */
export function normalizeColorName(color: string): string {
  let normalized = color.toLowerCase().trim();
  
  // Handle hex color codes (e.g., #1a1a1a)
  if (normalized.startsWith('#')) {
    const hexValue = normalized.slice(1); // Remove #
    
    // Map common hex codes to color names
    const hexToColorMap: Record<string, string> = {
      '1a1a1a': 'black',      // Dark black
      '000000': 'black',       // Pure black
      'ffffff': 'white',       // Pure white
      'f5f5f5': 'white',      // Off-white
      'c19a6b': 'natural',    // Natural wood
      '5c4033': 'brown',       // Brown
      '4a4a4a': 'dark-grey',  // Dark grey
      'b8b8b8': 'light-grey',  // Light grey
      'd4af37': 'gold',        // Gold
      'c0c0c0': 'silver',      // Silver
    };
    
    // If we have a mapping, use it; otherwise use the hex value without #
    if (hexToColorMap[hexValue]) {
      normalized = hexToColorMap[hexValue];
    } else {
      // Fallback: use hex value without #, but this shouldn't happen in normal flow
      normalized = hexValue;
    }
  }
  
  // Check color mapping and apply space-to-hyphen conversion
  return COLOR_MAPPING[normalized] || normalized.replace(/\s+/g, '-');
}

/**
 * Gets the texture path for a frame
 */
export interface GetTexturePathOptions {
  frameType: FrameType;
  color: string;
  mapType: TextureMapType;
  resolution?: TextureResolution;
  style?: string;
}

export function getTexturePath({
  frameType,
  color,
  mapType,
  resolution = '1x',
  style,
}: GetTexturePathOptions): string | null {
  const normalizedColor = normalizeColorName(color);
  const extension = mapType === 'diffuse' ? 'webp' : 'webp';
  
  // Build local path: /prodigi-assets/frames/{frameType}/textures/{color}-{mapType}-{resolution}.webp
  const localPath = `/prodigi-assets/frames/${frameType}/textures/${normalizedColor}-${mapType}-${resolution}.${extension}`;
  
  // Convert to Supabase storage URL
  return getSupabaseAssetUrlSync(localPath);
}

/**
 * Gets mount texture path
 */
export function getMountTexturePath(color: string): string {
  // Use mount-specific color mapping
  const normalizedColor = color.toLowerCase().trim();
  const mountColor = MOUNT_COLOR_MAPPING[normalizedColor] || normalizedColor.replace(/\s+/g, '-');
  const localPath = `/prodigi-assets/mounts/${mountColor}-mount.webp`;
  return getSupabaseAssetUrlSync(localPath);
}

/**
 * Gets canvas texture path
 */
export function getCanvasTexturePath(textureName: 'substrate' | 'blank'): string {
  const localPath = `/prodigi-assets/canvas/textures/${textureName}.webp`;
  return getSupabaseAssetUrlSync(localPath);
}

/**
 * Gets canvas wrap texture path
 */
export function getCanvasWrapTexturePath(wrapType: 'black' | 'white' | 'image' | 'mirror'): string {
  const localPath = `/prodigi-assets/canvas/wraps/${wrapType}-wrap.webp`;
  return getSupabaseAssetUrlSync(localPath);
}

/**
 * Gets fallback color for a frame (when texture fails to load)
 */
export function getFallbackColor(color: string): string {
  const colorMap: Record<string, string> = {
    'black': '#000000',
    'white': '#FFFFFF',
    'natural': '#C19A6B',
    'brown': '#654321',
    'dark grey': '#555555',
    'dark gray': '#555555',
    'light grey': '#CCCCCC',
    'light gray': '#CCCCCC',
    'grey': '#808080',
    'gray': '#808080',
    'gold': '#FFD700',
    'silver': '#C0C0C0',
    'antique gold': '#CD853F',
    'antique silver': '#C0C0C0',
  };
  
  const normalized = color.toLowerCase().trim();
  return colorMap[normalized] || '#000000';
}

/**
 * Gets material properties for a frame type
 */
export function getMaterialProperties(frameType: FrameType, color: string): {
  metalness: number;
  roughness: number;
} {
  const isMetallic = ['gold', 'silver', 'antique gold', 'antique silver'].includes(color.toLowerCase());
  
  const baseProperties: Record<FrameType, { metalness: number; roughness: number }> = {
    classic: {
      metalness: isMetallic ? 0.8 : 0.1,
      roughness: isMetallic ? 0.3 : 0.5,
    },
    aluminium: {
      metalness: 0.9,
      roughness: 0.2,
    },
    box: {
      metalness: 0.1,
      roughness: 0.6,
    },
    spacer: {
      metalness: 0.1,
      roughness: 0.5,
    },
    float: {
      metalness: 0.1,
      roughness: 0.5,
    },
  };
  
  return baseProperties[frameType];
}



