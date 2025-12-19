/**
 * Product Type Label Utilities
 * 
 * Provides consistent labeling for product types across the application
 */

export type ProductType = 
  | 'framed-print'
  | 'canvas'
  | 'framed-canvas'
  | 'poster'
  | 'acrylic'
  | 'metal'
  | string;

/**
 * Maps product types to user-friendly display names
 */
const PRODUCT_TYPE_LABELS: Record<string, string> = {
  'framed-print': 'Framed Print',
  'canvas': 'Canvas',
  'framed-canvas': 'Framed Canvas',
  'poster': 'Poster',
  'acrylic': 'Acrylic Print',
  'metal': 'Metal Print',
};

/**
 * Get display label for a product type
 */
export function getProductTypeLabel(productType: string | null | undefined): string {
  if (!productType) {
    return 'Framed Print'; // Default fallback
  }
  
  const normalized = productType.toLowerCase();
  return PRODUCT_TYPE_LABELS[normalized] || 'Framed Print';
}

/**
 * Infer product type from SKU pattern
 * Same logic as cart.service.ts for consistency
 */
export function inferProductTypeFromSku(sku: string | null | undefined): string {
  if (!sku) return 'framed-print';
  
  const skuLower = sku.toLowerCase();
  
  if (skuLower.includes('can-rol') || skuLower.includes('rol-')) {
    return 'poster';
  } else if (skuLower.includes('fra-can') || skuLower.includes('framed-canvas')) {
    return 'framed-canvas';
  } else if (skuLower.includes('can-') && !skuLower.includes('fra-') && !skuLower.includes('rol-')) {
    return 'canvas';
  } else if (skuLower.includes('acry') || skuLower.includes('acrylic')) {
    return 'acrylic';
  } else if (skuLower.includes('metal') || skuLower.includes('dibond')) {
    return 'metal';
  } else if (skuLower.includes('cfpm') || skuLower.includes('fra-')) {
    return 'framed-print';
  }
  
  return 'framed-print'; // Default fallback
}

/**
 * Get product type label from product data or SKU
 * This is a convenience function that handles both stored product_type and SKU inference
 */
export function getProductTypeLabelFromProduct(
  productType: string | null | undefined,
  sku: string | null | undefined
): string {
  // First try to use the stored product_type
  if (productType) {
    return getProductTypeLabel(productType);
  }
  
  // Fall back to inferring from SKU
  const inferredType = inferProductTypeFromSku(sku);
  return getProductTypeLabel(inferredType);
}

