/**
 * SKU Lookup Service
 * Automatically finds the right Prodigi SKU based on configuration
 */

import type { FrameConfiguration } from '@/store/studio';

/**
 * Get the appropriate Prodigi SKU based on configuration
 */
export async function lookupSKU(config: Partial<FrameConfiguration>): Promise<string | null> {
  try {
    const { productType, size } = config;
    
    if (!productType || !size) {
      return null;
    }

    // Parse size (e.g., "16x20" -> width: 16, height: 20)
    const [widthStr, heightStr] = size.split('x');
    const width = parseInt(widthStr);
    const height = parseInt(heightStr);

    if (!width || !height) {
      return null;
    }

    // Build search query based on product type
    const productTypeMap: Record<string, string> = {
      'framed-print': 'Framed Print',
      'canvas': 'Canvas',
      'framed-canvas': 'Framed Canvas',
      'acrylic': 'Acrylic Print',
      'metal': 'Metal Print',
      'poster': 'Poster',
    };

    const searchTerm = productTypeMap[productType];
    if (!searchTerm) {
      return null;
    }

    // Search Prodigi catalog
    const response = await fetch(`/api/prodigi/catalog/search?q=${encodeURIComponent(searchTerm)}&limit=50`);
    
    if (!response.ok) {
      console.error('Failed to search Prodigi catalog');
      return null;
    }

    const data = await response.json();
    const products = data.products || [];

    // Find matching product by size
    // Convert size to inches for matching
    const widthInches = width;
    const heightInches = height;

    for (const product of products) {
      // Check if product has variants with matching dimensions
      if (product.variants && Array.isArray(product.variants)) {
        for (const variant of product.variants) {
          const attributes = variant.attributes || {};
          
          // Try to match dimensions
          // Prodigi may use different attribute names
          const variantWidth = parseFloat(attributes.width || attributes.printWidth || '0');
          const variantHeight = parseFloat(attributes.height || attributes.printHeight || '0');

          // Match with some tolerance (±0.5 inches)
          if (
            Math.abs(variantWidth - widthInches) <= 0.5 &&
            Math.abs(variantHeight - heightInches) <= 0.5
          ) {
            return variant.sku;
          }

          // Also try reversed dimensions (portrait vs landscape)
          if (
            Math.abs(variantWidth - heightInches) <= 0.5 &&
            Math.abs(variantHeight - widthInches) <= 0.5
          ) {
            return variant.sku;
          }
        }
      }
    }

    // If no exact match, return the first variant of the first product
    if (products.length > 0 && products[0].variants && products[0].variants.length > 0) {
      console.warn(`No exact size match found for ${size}, using first available variant`);
      return products[0].variants[0].sku;
    }

    return null;
  } catch (error) {
    console.error('Error looking up SKU:', error);
    return null;
  }
}

/**
 * Get SKU for specific product type and size combination
 */
export function getDefaultSKU(productType: string, size: string): string | null {
  // Fallback SKU mappings for common configurations
  // These are example SKUs - replace with actual Prodigi SKUs
  const defaultSKUs: Record<string, Record<string, string>> = {
    'framed-print': {
      '8x10': 'GLOBAL-FPRI-8X10',
      '11x14': 'GLOBAL-FPRI-11X14',
      '16x20': 'GLOBAL-FPRI-16X20',
      '18x24': 'GLOBAL-FPRI-18X24',
      '24x36': 'GLOBAL-FPRI-24X36',
    },
    'canvas': {
      '8x10': 'GLOBAL-CAN-8X10',
      '12x16': 'GLOBAL-CAN-12X16',
      '16x20': 'GLOBAL-CAN-16X20',
      '18x24': 'GLOBAL-CAN-18X24',
      '24x36': 'GLOBAL-CAN-24X36',
    },
    'framed-canvas': {
      '12x16': 'GLOBAL-FCAN-12X16',
      '16x20': 'GLOBAL-FCAN-16X20',
      '20x24': 'GLOBAL-FCAN-20X24',
      '24x36': 'GLOBAL-FCAN-24X36',
    },
    'acrylic': {
      '8x10': 'GLOBAL-ACR-8X10',
      '12x16': 'GLOBAL-ACR-12X16',
      '16x20': 'GLOBAL-ACR-16X20',
      '20x30': 'GLOBAL-ACR-20X30',
    },
    'metal': {
      '8x12': 'GLOBAL-MET-8X12',
      '12x18': 'GLOBAL-MET-12X18',
      '16x24': 'GLOBAL-MET-16X24',
      '24x36': 'GLOBAL-MET-24X36',
    },
    'poster': {
      '12x18': 'GLOBAL-POST-12X18',
      '18x24': 'GLOBAL-POST-18X24',
      '24x36': 'GLOBAL-POST-24X36',
    },
  };

  return defaultSKUs[productType]?.[size] || null;
}

