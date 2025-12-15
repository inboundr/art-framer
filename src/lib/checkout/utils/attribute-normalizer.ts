/**
 * Unified Attribute Normalization for Quote Matching
 * 
 * Ensures consistent attribute normalization across pricing and shipping services
 * for accurate quote request/response matching.
 */

/**
 * Normalize attributes for quote key generation and matching
 * - Lowercase all keys and values
 * - Sort keys for consistent JSON.stringify output
 * - Remove empty/null/undefined values
 */
export function normalizeAttributesForMatching(
  attributes: Record<string, string> | undefined | null
): Record<string, string> {
  if (!attributes) {
    return {};
  }

  const normalized: Record<string, string> = {};
  
  // Normalize all keys and values to lowercase
  Object.entries(attributes).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      normalized[key.toLowerCase()] = String(value).toLowerCase().trim();
    }
  });

  // Sort keys for consistent JSON.stringify output
  const sortedKeys = Object.keys(normalized).sort();
  const sorted: Record<string, string> = {};
  sortedKeys.forEach(key => {
    sorted[key] = normalized[key];
  });

  return sorted;
}

/**
 * Generate a unique quote key from SKU and attributes
 * Format: "sku:{sorted-json-attributes}"
 */
export function generateQuoteKey(
  sku: string,
  attributes: Record<string, string> | undefined | null
): string {
  const normalizedSku = sku.toLowerCase();
  const normalizedAttrs = normalizeAttributesForMatching(attributes);
  const attrsKey = JSON.stringify(normalizedAttrs);
  return `${normalizedSku}:${attrsKey}`;
}

