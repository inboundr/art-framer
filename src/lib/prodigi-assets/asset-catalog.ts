/**
 * Prodigi Asset Catalog
 * Provides metadata and paths for all Prodigi assets
 */

export type ProductType = 
  | 'framed-print'
  | 'framed-canvas'
  | 'canvas'
  | 'acrylic'
  | 'dibond'
  | 'mounted'
  | 'rolled-canvas'
  | 'eco-canvas'
  | 'photo-tiles'
  | 'instagram'
  | 'cork';

export type ViewType = 
  | 'blank'
  | 'chevron'
  | 'corner'
  | 'near-corner'
  | 'far-corner'
  | 'face-on'
  | 'end-on'
  | 'wall'
  | 'rear'
  | 'back'
  | 'angled'
  | 'cross-section'
  | 'lifestyle';

export interface AssetReference {
  path: string;
  type: ViewType;
  productType?: ProductType;
  frameType?: string;
  color?: string;
  description?: string;
}

/**
 * Gets lifestyle images for a product type
 * @param productType - Product type
 * @param hasMount - Optional: true for images with mount, false for images without mount, undefined for all
 */
export function getLifestyleImages(productType: ProductType, hasMount?: boolean): string[] {
  const basePath = '/prodigi-assets-extracted';
  
  // Note: Next.js Image component handles URL encoding automatically
  // We keep paths as-is with spaces, and Next.js will encode them properly
  const lifestyleMap: Record<ProductType, string[]> = {
    'framed-print': [
      `${basePath}/prodigi-classic-frames-photo-assets/Classic black framed print flat.jpg`, // Has mount
      `${basePath}/prodigi-classic-frames-photo-assets/Classic framed print far corner.jpg`, // Has mount
      `${basePath}/prodigi-classic-frames-photo-assets/Classic black framed print near corner.jpg`, // Has mount
      `${basePath}/prodigi-classic-frames-photo-assets/Classic black framed print corner no mount.jpg`, // No mount
      `${basePath}/prodigi-classic-frames-photo-assets/Classic white framed print flat no mount.jpg`, // No mount
    ],
    'framed-canvas': [
      `${basePath}/prodigi-framed-canvas-photo-assets/Canvas framed black wall.jpg`,
      `${basePath}/prodigi-framed-canvas-photo-assets/Canvas framed white wall.jpg`,
      `${basePath}/prodigi-framed-canvas-photo-assets/White framed canvas.jpg`,
    ],
    'canvas': [
      `${basePath}/prodigi-stretched-canvas-photo-assets/Stretched 38mm canvas.jpg`,
      `${basePath}/prodigi-stretched-canvas-photo-assets/Stretched 38mm canvas corner.jpg`,
    ],
    'acrylic': [
      `${basePath}/prodigi-acrylic-panels-photo-assets/Acrylic panel face on.jpg`,
      `${basePath}/prodigi-acrylic-panels-photo-assets/Acrylic panel corner.jpg`,
    ],
    'dibond': [
      `${basePath}/prodigi-dibond-photo-assets/Dibond on wall dog.jpg`,
      `${basePath}/prodigi-dibond-photo-assets/Dibond on wall exploring.jpg`,
    ],
    'mounted': [
      `${basePath}/prodigi-mounted-prints-photo-assets/Mounted print on wall.jpg`,
      `${basePath}/prodigi-mounted-prints-photo-assets/Mounted print face on.jpg`,
    ],
    'rolled-canvas': [
      `${basePath}/prodigi-rolled-canvas-photo-assets/Rolled canvas face on.jpg`,
      `${basePath}/prodigi-rolled-canvas-photo-assets/Rolled canvas corner.jpg`,
    ],
    'eco-canvas': [
      `${basePath}/prodigi-eco-canvas-photo-assets/Prodigi-environmentally-friendly-eco-canvas-001.jpg`,
      `${basePath}/prodigi-eco-canvas-photo-assets/Prodigi-environmentally-friendly-eco-canvas-002.jpg`,
    ],
    'photo-tiles': [
      `${basePath}/prodigi-framed-photo-tiles-photo-assets/Prodigi-Framed-Photo-Tiles-01.jpg`,
      `${basePath}/prodigi-framed-photo-tiles-photo-assets/Prodigi-Framed-Photo-Tiles-02.jpg`,
    ],
    'instagram': [
      `${basePath}/prodigi-instagram-framed-prints-photo-assets/Instagram print on wall.jpg`,
      `${basePath}/prodigi-instagram-framed-prints-photo-assets/Instagram black frame on wall.jpg`,
    ],
    'cork': [
      `${basePath}/prodigi-framed-cork-pin-board-blank-asset/Prodigi-cork-board-blank.jpg`,
    ],
  };
  
  let images = lifestyleMap[productType] || [];
  
  // Filter by mount if specified
  if (hasMount !== undefined) {
    images = images.filter(path => {
      const pathLower = path.toLowerCase();
      const hasNoMountInPath = pathLower.includes('no mount') || pathLower.includes('no-mount');
      return hasMount ? !hasNoMountInPath : hasNoMountInPath;
    });
    
    // If filtering resulted in no images, return all images (fallback)
    if (images.length === 0) {
      images = lifestyleMap[productType] || [];
    }
  }
  
  return images;
}

/**
 * Gets chevron images for a frame type and color
 */
export function getChevronImage(frameType: string, color: string): string | null {
  const basePath = '/prodigi-assets-extracted';
  const normalizedColor = color.toLowerCase();
  
  const chevronMap: Record<string, Record<string, string>> = {
    classic: {
      black: `${basePath}/prodigi-classic-frames-photo-assets/Classic black frame chevron.jpg`,
      white: `${basePath}/prodigi-classic-frames-photo-assets/Classic white frame chevron.jpg`,
      brown: `${basePath}/prodigi-classic-frames-photo-assets/classic-brown-chevron.jpg`,
      natural: `${basePath}/prodigi-classic-frames-photo-assets/Classic natural frame chevron.jpg`,
      'antique gold': `${basePath}/prodigi-classic-frames-photo-assets/Classic antique gold frame chevron.jpg`,
      'antique silver': `${basePath}/prodigi-classic-frames-photo-assets/Classic antique silver frame chevron.jpg`,
      'dark grey': `${basePath}/prodigi-classic-frames-photo-assets/classic-dark-grey-chevron.jpg`,
      'light grey': `${basePath}/prodigi-classic-frames-photo-assets/classic-light-grey-chevron.jpg`,
    },
    box: {
      black: `${basePath}/prodigi-box-frames-photo-assets/Box black framed print chevron.jpg`,
      brown: `${basePath}/prodigi-box-frames-photo-assets/Box brown framed print chevron.jpg`,
      natural: `${basePath}/prodigi-box-frames-photo-assets/Box natural framed print chevron.jpg`,
      white: `${basePath}/prodigi-box-frames-photo-assets/Box white framed print chevron.jpg`,
    },
    spacer: {
      black: `${basePath}/prodigi-spacer-frames-photo-assets/Spacer black framed print chevron.jpg`,
      brown: `${basePath}/prodigi-spacer-frames-photo-assets/Spacer brown framed print chevron.jpg`,
      natural: `${basePath}/prodigi-spacer-frames-photo-assets/Spacer natural framed print chevron.jpg`,
      white: `${basePath}/prodigi-spacer-frames-photo-assets/Spacer white framed print chevron.jpg`,
    },
    float: {
      black: `${basePath}/prodigi-framed-canvas-photo-assets/Float frame black chevron.jpg`,
      brown: `${basePath}/prodigi-framed-canvas-photo-assets/Float frame brown chevron.jpg`,
      white: `${basePath}/prodigi-framed-canvas-photo-assets/Float frame white chevron.jpg`,
    },
  };
  
  return chevronMap[frameType]?.[normalizedColor] || null;
}

/**
 * Gets corner detail images
 */
export function getCornerImages(frameType: string, color: string): string[] {
  const basePath = '/prodigi-assets-extracted';
  const normalizedColor = color.toLowerCase();
  
  const cornerMap: Record<string, Record<string, string[]>> = {
    classic: {
      black: [
        `${basePath}/prodigi-classic-frames-photo-assets/Classic black framed print near corner.jpg`,
        `${basePath}/prodigi-classic-frames-photo-assets/Classic black framed print corner no mount.jpg`,
      ],
    },
    box: {
      black: [
        `${basePath}/prodigi-box-frames-photo-assets/Box black framed print near corner.jpg`,
      ],
      brown: [
        `${basePath}/prodigi-box-frames-photo-assets/Box brown framed print near corner no mount.jpg`,
      ],
    },
    canvas: {
      black: [
        `${basePath}/prodigi-framed-canvas-photo-assets/Black framed canvas near corner.jpg`,
      ],
      brown: [
        `${basePath}/prodigi-framed-canvas-photo-assets/Brown framed canvas near corner.jpg`,
        `${basePath}/prodigi-framed-canvas-photo-assets/Brown framed canvas far corner.jpg`,
      ],
      white: [
        `${basePath}/prodigi-framed-canvas-photo-assets/White framed canvas far corner.jpg`,
      ],
    },
  };
  
  return cornerMap[frameType]?.[normalizedColor] || [];
}

/**
 * Gets cross-section images
 */
export function getCrossSectionImage(frameType: string): string | null {
  const basePath = '/prodigi-assets-extracted';
  
  const crossSectionMap: Record<string, string> = {
    box: `${basePath}/prodigi-box-frames-photo-assets/Box frame cross-section.png`,
    canvas: `${basePath}/prodigi-framed-canvas-photo-assets/Framed canvas cross-section.png`,
    spacer: `${basePath}/prodigi-spacer-frames-photo-assets/Spacer frame cross-section.png`,
    instagram: `${basePath}/prodigi-instagram-framed-prints-photo-assets/Instagram frame cross-section.png`,
  };
  
  return crossSectionMap[frameType] || null;
}

/**
 * Gets mount sample images
 */
export function getMountSampleImage(color: string): string {
  const basePath = '/prodigi-assets-extracted';
  const normalizedColor = color.toLowerCase();
  
  const mountMap: Record<string, string> = {
    black: `${basePath}/prodigi-classic-frames-photo-assets/Black mount.jpg`,
    'off-white': `${basePath}/prodigi-classic-frames-photo-assets/Off-white mount.jpg`,
    'offwhite': `${basePath}/prodigi-classic-frames-photo-assets/Off-white mount.jpg`,
    'snow white': `${basePath}/prodigi-classic-frames-photo-assets/Snow white mount.jpg`,
    'snowwhite': `${basePath}/prodigi-classic-frames-photo-assets/Snow white mount.jpg`,
  };
  
  return mountMap[normalizedColor] || mountMap['off-white'];
}



