export type AspectCategory = 'Portrait' | 'Landscape' | 'Square';

/**
 * Parse a size string like "20x30", "20 x 30 cm", '8×10"' into numeric inches/cm.
 * Strips non-numeric characters except dots.
 */
export function parseSizeToDimensions(size: string): { width: number; height: number } | null {
  if (!size) return null;
  const parts = size
    .toLowerCase()
    .replace(/×/g, 'x')
    .split('x')
    .map(part => parseFloat(part.replace(/[^0-9.]/g, '')));

  if (parts.length !== 2) return null;
  const [width, height] = parts;
  if (!width || !height || Number.isNaN(width) || Number.isNaN(height)) return null;
  return { width, height };
}

/**
 * Categorize a size string into Portrait / Landscape / Square.
 * Falls back to Landscape if parsing fails.
 */
export function getAspectRatioCategory(size: string): AspectCategory {
  const dims = parseSizeToDimensions(size);
  if (!dims) return 'Landscape';

  const ratio = dims.width / dims.height;
  if (ratio < 0.9) return 'Portrait';
  if (ratio > 1.1) return 'Landscape';
  return 'Square';
}

