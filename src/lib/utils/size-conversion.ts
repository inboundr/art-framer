/**
 * Size Conversion Utilities
 * Convert between inches and centimeters for international users
 */

/**
 * Convert inches to centimeters
 * 1 inch = 2.54 cm
 */
export function inchesToCm(inches: number): number {
  return Math.round(inches * 2.54 * 10) / 10; // Round to 1 decimal place
}

/**
 * Format a size string like "16x20" to include cm
 * @param sizeStr - Size string in format "16x20" (inches)
 * @returns Formatted string like "16×20" (40.6×50.8 cm)"
 */
export function formatSizeWithCm(sizeStr: string): string {
  const [widthInches, heightInches] = sizeStr.split('x').map(Number);
  
  if (!widthInches || !heightInches) {
    return sizeStr;
  }
  
  const widthCm = inchesToCm(widthInches);
  const heightCm = inchesToCm(heightInches);
  
  return `${widthInches}×${heightInches}" (${widthCm}×${heightCm} cm)`;
}

/**
 * Format a size string with option for compact display
 * @param sizeStr - Size string in format "16x20" (inches)
 * @param compact - If true, shows shorter format
 * @returns Formatted string
 */
export function formatSize(sizeStr: string, compact: boolean = false): string {
  const [widthInches, heightInches] = sizeStr.split('x').map(Number);
  
  if (!widthInches || !heightInches) {
    return sizeStr;
  }
  
  const widthCm = inchesToCm(widthInches);
  const heightCm = inchesToCm(heightInches);
  
  if (compact) {
    return `${widthInches}×${heightInches}" / ${widthCm}×${heightCm}cm`;
  }
  
  return `${widthInches}×${heightInches}" (${widthCm}×${heightCm} cm)`;
}

/**
 * Get just the cm dimensions
 */
export function getSizeInCm(sizeStr: string): string {
  const [widthInches, heightInches] = sizeStr.split('x').map(Number);
  
  if (!widthInches || !heightInches) {
    return '';
  }
  
  const widthCm = inchesToCm(widthInches);
  const heightCm = inchesToCm(heightInches);
  
  return `${widthCm}×${heightCm} cm`;
}

/**
 * All available frame sizes with their cm equivalents
 */
export const FRAME_SIZES = [
  { inches: '8x10', cm: '20.3×25.4', label: '8×10" (20×25 cm)' },
  { inches: '11x14', cm: '27.9×35.6', label: '11×14" (28×36 cm)' },
  { inches: '12x16', cm: '30.5×40.6', label: '12×16" (31×41 cm)' },
  { inches: '12x30', cm: '30.5×76.2', label: '12×30" (31×76 cm)' },
  { inches: '16x20', cm: '40.6×50.8', label: '16×20" (41×51 cm)' },
  { inches: '18x24', cm: '45.7×61.0', label: '18×24" (46×61 cm)' },
  { inches: '20x24', cm: '50.8×61.0', label: '20×24" (51×61 cm)' },
  { inches: '20x30', cm: '50.8×76.2', label: '20×30" (51×76 cm)' },
  { inches: '24x30', cm: '61.0×76.2', label: '24×30" (61×76 cm)' },
  { inches: '24x36', cm: '61.0×91.4', label: '24×36" (61×91 cm)' },
  { inches: '30x40', cm: '76.2×101.6', label: '30×40" (76×102 cm)' },
  { inches: '36x48', cm: '91.4×121.9', label: '36×48" (91×122 cm)' },
] as const;

/**
 * Extract size from a Prodigi SKU
 * Examples:
 *   - "can-19mm-fra-mc-12x30-var" -> "12x30"
 *   - "fra-box-gitd-610x610" -> "610x610" (in mm, needs conversion)
 */
export function extractSizeFromSku(sku: string): string | null {
  if (!sku) return null;
  
  // Try to find size pattern like "12x30" or "610x610"
  const sizePattern = /(\d+)x(\d+)/i;
  const match = sku.match(sizePattern);
  
  if (!match) return null;
  
  const width = parseInt(match[1]);
  const height = parseInt(match[2]);
  
  // If dimensions are large (likely in mm), convert to inches
  if (width > 100 || height > 100) {
    const widthInches = Math.round(width / 25.4);
    const heightInches = Math.round(height / 25.4);
    return `${widthInches}x${heightInches}`;
  }
  
  // Already in inches format
  return `${width}x${height}`;
}

/**
 * Find the closest matching size in FRAME_SIZES
 * Returns the exact match if found, or the closest size
 */
export function findClosestSize(sizeStr: string): string {
  if (!sizeStr) return FRAME_SIZES[0].inches;
  
  // Check for exact match
  const exactMatch = FRAME_SIZES.find(s => s.inches === sizeStr);
  if (exactMatch) return exactMatch.inches;
  
  // Parse the size
  const [widthStr, heightStr] = sizeStr.split('x');
  const width = parseInt(widthStr);
  const height = parseInt(heightStr);
  
  if (!width || !height) return FRAME_SIZES[0].inches;
  
  // Find closest match by area
  let closest: typeof FRAME_SIZES[number] = FRAME_SIZES[0];
  let minDiff = Infinity;
  
  for (const size of FRAME_SIZES) {
    const [sizeWidth, sizeHeight] = size.inches.split('x').map(Number);
    const areaDiff = Math.abs((width * height) - (sizeWidth * sizeHeight));
    
    if (areaDiff < minDiff) {
      minDiff = areaDiff;
      closest = size;
    }
  }
  
  return closest.inches;
}

/**
 * Get or create a size entry for a given size string
 * If the size doesn't exist in FRAME_SIZES, creates a dynamic entry
 */
export function getSizeEntry(sizeStr: string): { inches: string; cm: string; label: string } {
  // Check if it exists
  const existing = FRAME_SIZES.find(s => s.inches === sizeStr);
  if (existing) return existing;
  
  // Create dynamic entry
  const [widthStr, heightStr] = sizeStr.split('x');
  const width = parseInt(widthStr);
  const height = parseInt(heightStr);
  
  if (!width || !height) {
    return FRAME_SIZES[0]; // Fallback
  }
  
  const widthCm = inchesToCm(width);
  const heightCm = inchesToCm(height);
  
  return {
    inches: sizeStr,
    cm: `${widthCm}×${heightCm}`,
    label: `${width}×${height}" (${widthCm}×${heightCm} cm)`,
  };
}

