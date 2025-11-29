/**
 * Prodigi Texture Mapper
 * Maps Prodigi frame types and colors to texture file paths
 */

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
 * Normalizes a color name to a texture-safe name
 */
export function normalizeColorName(color: string): string {
  const normalized = color.toLowerCase().trim();
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
  
  // Build path: /prodigi-assets/frames/{frameType}/textures/{color}-{mapType}-{resolution}.webp
  const path = `/prodigi-assets/frames/${frameType}/textures/${normalizedColor}-${mapType}-${resolution}.${extension}`;
  
  return path;
}

/**
 * Gets mount texture path
 */
export function getMountTexturePath(color: string): string {
  const normalizedColor = normalizeColorName(color);
  return `/prodigi-assets/mounts/${normalizedColor}-mount.webp`;
}

/**
 * Gets canvas texture path
 */
export function getCanvasTexturePath(textureName: 'substrate' | 'blank'): string {
  return `/prodigi-assets/canvas/textures/${textureName}.webp`;
}

/**
 * Gets canvas wrap texture path
 */
export function getCanvasWrapTexturePath(wrapType: 'black' | 'white' | 'image' | 'mirror'): string {
  return `/prodigi-assets/canvas/wraps/${wrapType}-wrap.webp`;
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



