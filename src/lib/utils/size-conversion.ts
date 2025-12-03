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
  { inches: '16x20', cm: '40.6×50.8', label: '16×20" (41×51 cm)' },
  { inches: '18x24', cm: '45.7×61.0', label: '18×24" (46×61 cm)' },
  { inches: '20x24', cm: '50.8×61.0', label: '20×24" (51×61 cm)' },
  { inches: '20x30', cm: '50.8×76.2', label: '20×30" (51×76 cm)' },
  { inches: '24x30', cm: '61.0×76.2', label: '24×30" (61×76 cm)' },
  { inches: '24x36', cm: '61.0×91.4', label: '24×36" (61×91 cm)' },
  { inches: '30x40', cm: '76.2×101.6', label: '30×40" (76×102 cm)' },
  { inches: '36x48', cm: '91.4×121.9', label: '36×48" (91×122 cm)' },
] as const;

