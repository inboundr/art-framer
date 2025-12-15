/**
 * Frame Material Configuration
 * Stores color-based material properties for each frame type and color
 * 
 * IMPORTANT: This is the PRIMARY rendering method. Material properties (baseColor, 
 * metalness, roughness) were extracted by analyzing Prodigi's frame images/textures.
 * 
 * Textures are OPTIONAL and only used for enhancement. The system always uses
 * color-based materials from this configuration, which provides:
 * - Accurate colors extracted from Prodigi images
 * - Realistic material properties (metalness, roughness) discovered from textures
 * - No dependency on texture files at runtime
 * 
 * The textureSource field is for reference only - it shows which Prodigi image
 * was analyzed to extract these material properties.
 */

export interface FrameTextureConfig {
  // Material properties
  baseColor: string; // Fallback color
  metalness: number; // 0-1, how metallic the surface is
  roughness: number; // 0-1, how rough/smooth the surface is
  
  // Texture settings
  textureRepeat?: [number, number]; // How many times to repeat the texture [u, v]
  textureRotation?: number; // Rotation in radians
  textureScale?: number; // Overall scale multiplier
  
  // Visual properties
  envMapIntensity?: number; // How much environment reflections affect the material
  bumpScale?: number; // If we have bump/normal maps
  
  // Texture source info (for reference)
  textureSource?: string; // Where we got this texture configuration from
  notes?: string; // Any special notes about this frame type
}

/**
 * Frame configuration database
 * Each frame type (classic, aluminium, box, etc.) has configurations for each color
 */
export const FRAME_TEXTURE_DATABASE: Record<string, Record<string, FrameTextureConfig>> = {
  classic: {
    black: {
      baseColor: '#1a1a1a',
      metalness: 0.05,
      roughness: 0.6,
      textureRepeat: [4, 4],
      envMapIntensity: 0.3,
      textureSource: 'Black classic frame_blank.png',
      notes: 'Matte black wood finish with subtle grain',
    },
    white: {
      baseColor: '#f5f5f5',
      metalness: 0.05,
      roughness: 0.65,
      textureRepeat: [4, 4],
      envMapIntensity: 0.25,
      textureSource: 'White classic frame_blank.png',
      notes: 'Matte white painted wood',
    },
    brown: {
      baseColor: '#5c4033',
      metalness: 0.1,
      roughness: 0.5,
      textureRepeat: [3, 3],
      envMapIntensity: 0.4,
      textureSource: 'Brown classic frame_blank.jpg',
      notes: 'Natural wood with visible grain, slightly glossy',
    },
    natural: {
      baseColor: '#c19a6b',
      metalness: 0.08,
      roughness: 0.55,
      textureRepeat: [3, 3],
      envMapIntensity: 0.35,
      textureSource: 'Natural classic frame_blank.png',
      notes: 'Light natural wood with prominent grain pattern',
    },
    'dark-grey': {
      baseColor: '#4a4a4a',
      metalness: 0.05,
      roughness: 0.65,
      textureRepeat: [4, 4],
      envMapIntensity: 0.3,
      textureSource: 'Dark grey classic frame_blank.jpg',
      notes: 'Dark grey painted wood, matte finish',
    },
    'light-grey': {
      baseColor: '#b8b8b8',
      metalness: 0.05,
      roughness: 0.65,
      textureRepeat: [4, 4],
      envMapIntensity: 0.25,
      textureSource: 'Light grey classic frame_blank.jpg',
      notes: 'Light grey painted wood, soft matte finish',
    },
    gold: {
      baseColor: '#d4af37',
      metalness: 0.75,
      roughness: 0.25,
      textureRepeat: [6, 6],
      envMapIntensity: 1.2,
      textureSource: 'Gold Classic Frame_blank.png',
      notes: 'Polished gold finish, highly reflective',
    },
    silver: {
      baseColor: '#c0c0c0',
      metalness: 0.8,
      roughness: 0.2,
      textureRepeat: [6, 6],
      envMapIntensity: 1.3,
      textureSource: 'Silver Classic Frame_blank.png',
      notes: 'Polished silver finish, mirror-like reflection',
    },
    'antique-gold': {
      baseColor: '#b8860b',
      metalness: 0.6,
      roughness: 0.4,
      textureRepeat: [5, 5],
      envMapIntensity: 0.8,
      textureSource: 'Classic Antique Gold Frame_blank.png (if exists)',
      notes: 'Aged gold with weathered look, less reflective',
    },
    'antique-silver': {
      baseColor: '#989898',
      metalness: 0.65,
      roughness: 0.35,
      textureRepeat: [5, 5],
      envMapIntensity: 0.85,
      textureSource: 'Classic Antique Silver Frame_blank.png (if exists)',
      notes: 'Aged silver with patina, subdued reflection',
    },
  },
  
  aluminium: {
    black: {
      baseColor: '#2a2a2a',
      metalness: 0.85,
      roughness: 0.25,
      textureRepeat: [8, 8],
      envMapIntensity: 1.1,
      textureSource: 'Prodigi-black-aluminium-blank.jpg',
      notes: 'Anodized black aluminium, sleek and modern',
    },
    silver: {
      baseColor: '#d0d0d0',
      metalness: 0.9,
      roughness: 0.15,
      textureRepeat: [8, 8],
      envMapIntensity: 1.4,
      textureSource: 'Prodigi-silver-aluminium-frame-blank.jpg',
      notes: 'Brushed aluminium, highly reflective',
    },
    gold: {
      baseColor: '#d4a764',
      metalness: 0.88,
      roughness: 0.18,
      textureRepeat: [8, 8],
      envMapIntensity: 1.35,
      textureSource: 'Prodigi-gold-aluminium-frame-blank.jpg',
      notes: 'Anodized gold aluminium, warm metallic look',
    },
  },
  
  box: {
    black: {
      baseColor: '#1a1a1a',
      metalness: 0.05,
      roughness: 0.7,
      textureRepeat: [3, 3],
      envMapIntensity: 0.25,
      notes: 'Deep box frame, matte black wood',
    },
    white: {
      baseColor: '#f5f5f5',
      metalness: 0.05,
      roughness: 0.7,
      textureRepeat: [3, 3],
      envMapIntensity: 0.2,
      notes: 'Deep box frame, soft white finish',
    },
    brown: {
      baseColor: '#5c4033',
      metalness: 0.08,
      roughness: 0.65,
      textureRepeat: [2.5, 2.5],
      envMapIntensity: 0.3,
      notes: 'Deep box frame, natural brown wood',
    },
    natural: {
      baseColor: '#c19a6b',
      metalness: 0.08,
      roughness: 0.65,
      textureRepeat: [2.5, 2.5],
      envMapIntensity: 0.3,
      notes: 'Deep box frame, light natural wood',
    },
  },
  
  spacer: {
    black: {
      baseColor: '#1a1a1a',
      metalness: 0.05,
      roughness: 0.65,
      textureRepeat: [4, 4],
      envMapIntensity: 0.3,
      notes: 'Spacer frame with depth, black wood',
    },
    white: {
      baseColor: '#f5f5f5',
      metalness: 0.05,
      roughness: 0.65,
      textureRepeat: [4, 4],
      envMapIntensity: 0.25,
      notes: 'Spacer frame with depth, white finish',
    },
    brown: {
      baseColor: '#5c4033',
      metalness: 0.08,
      roughness: 0.6,
      textureRepeat: [3, 3],
      envMapIntensity: 0.35,
      notes: 'Spacer frame with depth, brown wood',
    },
    natural: {
      baseColor: '#c19a6b',
      metalness: 0.08,
      roughness: 0.6,
      textureRepeat: [3, 3],
      envMapIntensity: 0.35,
      notes: 'Spacer frame with depth, natural wood',
    },
  },
  
  float: {
    black: {
      baseColor: '#1a1a1a',
      metalness: 0.05,
      roughness: 0.6,
      textureRepeat: [4, 4],
      envMapIntensity: 0.3,
      notes: 'Float frame for canvas, black wood',
    },
    white: {
      baseColor: '#f5f5f5',
      metalness: 0.05,
      roughness: 0.65,
      textureRepeat: [4, 4],
      envMapIntensity: 0.25,
      notes: 'Float frame for canvas, white finish',
    },
    brown: {
      baseColor: '#5c4033',
      metalness: 0.08,
      roughness: 0.55,
      textureRepeat: [3, 3],
      envMapIntensity: 0.35,
      notes: 'Float frame for canvas, brown wood',
    },
  },
};

/**
 * Get frame texture configuration
 */
export function getFrameTextureConfig(
  frameType: string,
  color: string
): FrameTextureConfig {
  const normalizedFrameType = frameType.toLowerCase();
  
  // Use normalizeColorName to handle hex codes and normalize properly
  // Import normalizeColorName from texture-mapper
  let normalizedColor = color.toLowerCase().trim();
  
  // Handle hex color codes (e.g., #1a1a1a)
  if (normalizedColor.startsWith('#')) {
    const hexValue = normalizedColor.slice(1); // Remove #
    
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
      normalizedColor = hexToColorMap[hexValue];
    } else {
      // Fallback: use hex value without #, but this shouldn't happen in normal flow
      normalizedColor = hexValue;
    }
  }
  
  // Replace spaces with hyphens for consistency
  normalizedColor = normalizedColor.replace(/\s+/g, '-');
  
  // Try to get from database
  const frameConfigs = FRAME_TEXTURE_DATABASE[normalizedFrameType];
  if (frameConfigs && frameConfigs[normalizedColor]) {
    return frameConfigs[normalizedColor];
  }
  
  // Fallback: return default config based on color hints
  return createFallbackConfig(color);
}

/**
 * Create fallback configuration when exact match not found
 */
function createFallbackConfig(color: string): FrameTextureConfig {
  const colorLower = color.toLowerCase();
  
  // Metallic colors
  if (colorLower.includes('gold')) {
    return {
      baseColor: '#d4af37',
      metalness: 0.75,
      roughness: 0.25,
      textureRepeat: [6, 6],
      envMapIntensity: 1.2,
      notes: 'Fallback gold configuration',
    };
  }
  
  if (colorLower.includes('silver')) {
    return {
      baseColor: '#c0c0c0',
      metalness: 0.8,
      roughness: 0.2,
      textureRepeat: [6, 6],
      envMapIntensity: 1.3,
      notes: 'Fallback silver configuration',
    };
  }
  
  if (colorLower.includes('aluminium') || colorLower.includes('aluminum')) {
    return {
      baseColor: '#b0b0b0',
      metalness: 0.9,
      roughness: 0.15,
      textureRepeat: [8, 8],
      envMapIntensity: 1.4,
      notes: 'Fallback aluminium configuration',
    };
  }
  
  // Wood colors
  if (colorLower.includes('natural') || colorLower.includes('oak') || colorLower.includes('maple')) {
    return {
      baseColor: '#c19a6b',
      metalness: 0.08,
      roughness: 0.55,
      textureRepeat: [3, 3],
      envMapIntensity: 0.35,
      notes: 'Fallback natural wood configuration',
    };
  }
  
  if (colorLower.includes('brown') || colorLower.includes('walnut') || colorLower.includes('mahogany')) {
    return {
      baseColor: '#5c4033',
      metalness: 0.1,
      roughness: 0.5,
      textureRepeat: [3, 3],
      envMapIntensity: 0.4,
      notes: 'Fallback brown wood configuration',
    };
  }
  
  // Basic colors
  if (colorLower.includes('white') || colorLower.includes('cream') || colorLower.includes('ivory')) {
    return {
      baseColor: '#f5f5f5',
      metalness: 0.05,
      roughness: 0.65,
      textureRepeat: [4, 4],
      envMapIntensity: 0.25,
      notes: 'Fallback white configuration',
    };
  }
  
  if (colorLower.includes('black') || colorLower.includes('ebony')) {
    return {
      baseColor: '#1a1a1a',
      metalness: 0.05,
      roughness: 0.6,
      textureRepeat: [4, 4],
      envMapIntensity: 0.3,
      notes: 'Fallback black configuration',
    };
  }
  
  if (colorLower.includes('grey') || colorLower.includes('gray')) {
    const isDark = colorLower.includes('dark') || colorLower.includes('charcoal');
    return {
      baseColor: isDark ? '#4a4a4a' : '#b8b8b8',
      metalness: 0.05,
      roughness: 0.65,
      textureRepeat: [4, 4],
      envMapIntensity: 0.3,
      notes: `Fallback ${isDark ? 'dark' : 'light'} grey configuration`,
    };
  }
  
  // Ultimate fallback: neutral grey wood
  return {
    baseColor: '#808080',
    metalness: 0.05,
    roughness: 0.6,
    textureRepeat: [4, 4],
    envMapIntensity: 0.3,
    notes: 'Ultimate fallback configuration',
  };
}

