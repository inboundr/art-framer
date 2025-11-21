/**
 * Prodigi Attribute Value Normalizer
 * 
 * Handles case-insensitive attribute values between Catalog API and Official API
 * 
 * FINDINGS:
 * - Official v4 API returns: "Black", "ImageWrap", "MirrorWrap", "White"
 * - Catalog API returns: "black", "imagewrap", "mirrorwrap", "white"
 * - BOTH formats are accepted when creating orders!
 * - API is case-insensitive for attribute values
 */

export type WrapValue = 'Black' | 'White' | 'ImageWrap' | 'MirrorWrap';
export type ColorValue = 'black' | 'white' | 'brown' | 'dark grey' | 'light grey' | 'natural' | 'gold' | 'silver';

/**
 * Attribute value mappings between catalog and official API
 */
export const ATTRIBUTE_MAPPINGS = {
  wrap: {
    // Catalog -> Official (capitalized)
    black: 'Black',
    white: 'White',
    imagewrap: 'ImageWrap',
    mirrorwrap: 'MirrorWrap',
    // Official values (already correct)
    Black: 'Black',
    White: 'White',
    ImageWrap: 'ImageWrap',
    MirrorWrap: 'MirrorWrap',
  } as Record<string, WrapValue>,
  
  color: {
    // Colors are already lowercase in official API
    black: 'black',
    white: 'white',
    brown: 'brown',
    'dark grey': 'dark grey',
    'light grey': 'light grey',
    natural: 'natural',
    gold: 'gold',
    silver: 'silver',
  } as Record<string, ColorValue>,
} as const;

/**
 * Normalize attribute values to match official API format
 * 
 * @param attributeName - The attribute name (e.g., 'wrap', 'color')
 * @param value - The value to normalize (case-insensitive)
 * @returns Normalized value matching official API format
 * 
 * @example
 * ```ts
 * normalizeAttributeValue('wrap', 'black') // Returns: 'Black'
 * normalizeAttributeValue('wrap', 'imagewrap') // Returns: 'ImageWrap'
 * normalizeAttributeValue('color', 'BLACK') // Returns: 'black'
 * ```
 */
export function normalizeAttributeValue(
  attributeName: string,
  value: string
): string {
  const lowerValue = value.toLowerCase();
  
  if (attributeName === 'wrap') {
    return ATTRIBUTE_MAPPINGS.wrap[lowerValue] || value;
  }
  
  if (attributeName === 'color') {
    return ATTRIBUTE_MAPPINGS.color[lowerValue] || lowerValue;
  }
  
  // For other attributes, return lowercase (standard for most attributes)
  return lowerValue;
}

/**
 * Normalize all attributes in an object
 * 
 * @param attributes - Object containing attribute key-value pairs
 * @returns Object with normalized attribute values
 * 
 * @example
 * ```ts
 * normalizeAttributes({ wrap: 'black', color: 'BLACK' })
 * // Returns: { wrap: 'Black', color: 'black' }
 * ```
 */
export function normalizeAttributes(
  attributes: Record<string, string | undefined>
): Record<string, string | undefined> {
  const normalized: Record<string, string | undefined> = {};
  
  for (const [key, value] of Object.entries(attributes)) {
    if (value !== undefined) {
      normalized[key] = normalizeAttributeValue(key, value);
    }
  }
  
  return normalized;
}

/**
 * Check if two attribute values are equivalent (case-insensitive)
 * 
 * @param attributeName - The attribute name
 * @param value1 - First value
 * @param value2 - Second value
 * @returns True if values are equivalent
 * 
 * @example
 * ```ts
 * areAttributeValuesEqual('wrap', 'Black', 'black') // true
 * areAttributeValuesEqual('wrap', 'ImageWrap', 'imagewrap') // true
 * areAttributeValuesEqual('color', 'Black', 'White') // false
 * ```
 */
export function areAttributeValuesEqual(
  attributeName: string,
  value1: string,
  value2: string
): boolean {
  const normalized1 = normalizeAttributeValue(attributeName, value1);
  const normalized2 = normalizeAttributeValue(attributeName, value2);
  return normalized1 === normalized2;
}

/**
 * Convert catalog API attributes to official API format
 * 
 * Catalog API uses different field names:
 * - frameColour -> color
 * - lowercase wrap values -> Capitalized
 * 
 * @param catalogAttributes - Attributes from catalog API
 * @returns Attributes in official API format
 */
export function catalogToOfficialAttributes(
  catalogAttributes: Record<string, string[] | string | undefined>
): Record<string, string | undefined> {
  const official: Record<string, string | undefined> = {};
  
  for (const [key, value] of Object.entries(catalogAttributes)) {
    if (value === undefined) continue;
    
    // Handle array values (take first value)
    const stringValue = Array.isArray(value) ? value[0] : value;
    if (!stringValue) continue;
    
    // Map catalog field names to official names
    let officialKey = key;
    if (key === 'frameColour') {
      officialKey = 'color';
    }
    
    // Normalize the value
    official[officialKey] = normalizeAttributeValue(officialKey, stringValue);
  }
  
  return official;
}

/**
 * Get all valid variations of an attribute value
 * 
 * Useful for fuzzy matching or user input
 * 
 * @param attributeName - The attribute name
 * @param value - The value
 * @returns Array of all valid variations
 * 
 * @example
 * ```ts
 * getAttributeValueVariations('wrap', 'Black')
 * // Returns: ['Black', 'black']
 * 
 * getAttributeValueVariations('wrap', 'ImageWrap')
 * // Returns: ['ImageWrap', 'imagewrap']
 * ```
 */
export function getAttributeValueVariations(
  attributeName: string,
  value: string
): string[] {
  const normalized = normalizeAttributeValue(attributeName, value);
  const variations = [normalized];
  
  if (attributeName === 'wrap') {
    // Add lowercase variation
    variations.push(normalized.toLowerCase());
  }
  
  return [...new Set(variations)];
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Check if a value is a valid wrap option
 */
export function isValidWrapValue(value: string): value is WrapValue {
  const normalized = normalizeAttributeValue('wrap', value);
  return ['Black', 'White', 'ImageWrap', 'MirrorWrap'].includes(normalized);
}

/**
 * Check if a value is a valid color option
 */
export function isValidColorValue(value: string): value is ColorValue {
  const normalized = normalizeAttributeValue('color', value);
  return ['black', 'white', 'brown', 'dark grey', 'light grey', 'natural', 'gold', 'silver'].includes(normalized);
}

