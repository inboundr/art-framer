/**
 * Product Type Colors - Discovered from Prodigi API
 * 
 * These colors are the actual available colors for each product type
 * as discovered by testing the Prodigi API.
 * 
 * Note: Colors are case-sensitive in Prodigi API (lowercase)
 */

export const PRODUCT_TYPE_COLORS: Record<string, string[]> = {
  'framed-print': [
    'black',
    'brown',
    'dark grey',
    'gold',
    'light grey',
    'natural',
    'silver',
    'white',
  ],
  'framed-canvas': [
    'black',
    'brown',
    'gold',
    'natural',
    'silver',
    'white',
  ],
  'canvas': [], // Canvas products don't have color attribute, they use wrap instead
  'acrylic': [], // Acrylic products don't have color attribute
  'metal': [], // Metal products don't have color attribute
  'poster': [], // Poster products don't have color attribute
};

/**
 * Get available colors for a product type
 */
export function getColorsForProductType(productType: string): string[] {
  return PRODUCT_TYPE_COLORS[productType.toLowerCase()] || [];
}

/**
 * Check if a product type supports colors
 */
export function hasColorAttribute(productType: string): boolean {
  const colors = getColorsForProductType(productType);
  return colors.length > 0;
}

/**
 * Get display name for a color (capitalize each word)
 * Handles multi-word colors like "dark grey" -> "Dark Grey"
 */
export function getColorDisplayName(color: string): string {
  if (!color) return '';
  // Capitalize each word (handles "dark grey" -> "Dark Grey")
  return color
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Normalize color name (lowercase, trim, handle variations)
 * Handles both "dark grey" and "dark-grey" formats by normalizing to spaces
 */
export function normalizeColorName(color: string): string {
  const normalized = color.toLowerCase().trim();
  // Normalize space/hyphen variations to spaces
  return normalized.replace(/-/g, ' ').replace(/\s+/g, ' ');
}

/**
 * Check if a color is valid for a product type
 * Handles variations like "dark grey" vs "dark-grey"
 */
export function isValidColorForProductType(color: string, productType: string): boolean {
  const validColors = getColorsForProductType(productType);
  if (validColors.length === 0) return false;
  
  const normalizedColor = normalizeColorName(color);
  return validColors.some(c => normalizeColorName(c) === normalizedColor);
}

/**
 * Get the canonical color name (from our constants) for a given color value
 * Handles variations and returns the standard format
 */
export function getCanonicalColorName(color: string, productType: string): string | null {
  const validColors = getColorsForProductType(productType);
  if (validColors.length === 0) return null;
  
  const normalizedColor = normalizeColorName(color);
  const match = validColors.find(c => normalizeColorName(c) === normalizedColor);
  return match || null;
}

