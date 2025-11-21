/**
 * Prodigi Product Attribute Helpers
 * 
 * Provides utilities for validating and working with product-specific attributes
 */

import { ProductsAPI } from './products';
import { ProductAttributes, Product } from './types';

export interface AttributeValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ProductAttributeInfo {
  sku: string;
  requiredAttributes: string[];
  availableAttributes: Record<string, string[]>;
  variants: number;
}

export class ProductAttributeHelper {
  constructor(private productsAPI: ProductsAPI) {}

  /**
   * Get all available attributes and their valid values for a product
   */
  async getProductAttributeInfo(sku: string): Promise<ProductAttributeInfo> {
    const product: Product = await this.productsAPI.get(sku);

    if (!product) {
      throw new Error(`Product ${sku} not found`);
    }

    const requiredAttributes = Object.keys(product.attributes || {}).filter(
      (key) => {
        const values = product.attributes?.[key];
        return Array.isArray(values) && values.length > 0;
      }
    );

    return {
      sku,
      requiredAttributes,
      availableAttributes: product.attributes || {},
      variants: product.variants?.length || 1,
    };
  }

  /**
   * Validate that provided attributes match product requirements
   */
  async validateAttributes(
    sku: string,
    attributes: Record<string, string | undefined>
  ): Promise<AttributeValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const productInfo = await this.getProductAttributeInfo(sku);

      // Check for missing required attributes
      for (const requiredKey of productInfo.requiredAttributes) {
        if (!attributes[requiredKey]) {
          const validValues = productInfo.availableAttributes[requiredKey];
          errors.push(
            `Missing required attribute '${requiredKey}'. Valid values: ${validValues.join(', ')}`
          );
        }
      }

      // Check for invalid attribute values
      for (const [key, value] of Object.entries(attributes)) {
        if (!value) continue; // Skip undefined/empty values

        const validValues = productInfo.availableAttributes[key];

        if (!validValues) {
          warnings.push(
            `Attribute '${key}' is not recognized for product ${sku}. It may be ignored.`
          );
          continue;
        }

        if (!validValues.includes(value)) {
          errors.push(
            `Invalid value '${value}' for attribute '${key}'. Valid values: ${validValues.join(', ')}`
          );
        }
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      return {
        valid: false,
        errors: [`Failed to validate attributes: ${(error as Error).message}`],
        warnings: [],
      };
    }
  }

  /**
   * Get suggested attributes based on product category
   */
  static getSuggestedAttributes(sku: string): Partial<ProductAttributes> {
    // Canvas products
    if (sku.includes('CAN')) {
      return {
        wrap: 'Black', // Default to black wrap
      };
    }

    // Framed prints
    if (sku.includes('CFPM') || sku.includes('FRA')) {
      return {
        color: 'black', // Default to black frame
      };
    }

    // Large framed canvas - needs both
    if (sku.includes('FRA-CAN')) {
      return {
        color: 'black',
        wrap: 'ImageWrap',
      };
    }

    return {};
  }

  /**
   * Get all variants for a product with their attributes
   */
  async getProductVariants(
    sku: string
  ): Promise<Array<{ id: string; attributes: Record<string, string> }>> {
    const product: Product = await this.productsAPI.get(sku);

    if (!product?.variants) {
      return [];
    }

    return product.variants.map((variant: any) => ({
      id: variant.id,
      attributes: variant.attributes || {},
    }));
  }

  /**
   * Check if a product requires specific attributes
   */
  async requiresAttributes(sku: string, ...attributeKeys: string[]): Promise<boolean> {
    const info = await this.getProductAttributeInfo(sku);
    return attributeKeys.every((key) => info.requiredAttributes.includes(key));
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Quick validation without instantiating the helper class
 */
export async function validateProductAttributes(
  productsAPI: ProductsAPI,
  sku: string,
  attributes: Record<string, string | undefined>
): Promise<AttributeValidationResult> {
  const helper = new ProductAttributeHelper(productsAPI);
  return helper.validateAttributes(sku, attributes);
}

/**
 * Get required attributes for a product
 */
export async function getRequiredAttributes(
  productsAPI: ProductsAPI,
  sku: string
): Promise<string[]> {
  const helper = new ProductAttributeHelper(productsAPI);
  const info = await helper.getProductAttributeInfo(sku);
  return info.requiredAttributes;
}

/**
 * Get default/suggested attributes for a product
 */
export function getSuggestedAttributes(sku: string): Partial<ProductAttributes> {
  return ProductAttributeHelper.getSuggestedAttributes(sku);
}

// ============================================================================
// PRODUCT CATEGORY CONSTANTS
// ============================================================================

export const PRODUCT_CATEGORIES = {
  CANVAS: {
    name: 'Canvas',
    requiredAttributes: ['wrap'],
    examples: ['GLOBAL-CAN-10x10', 'GLOBAL-CAN-16x20'],
  },
  FRAMED_PRINT: {
    name: 'Framed Print',
    requiredAttributes: ['color'],
    examples: ['GLOBAL-CFPM-16X20', 'GLOBAL-CFPM-20X30'],
  },
  LARGE_FRAMED_CANVAS: {
    name: 'Large Framed Canvas',
    requiredAttributes: ['color', 'wrap'],
    examples: ['GLOBAL-FRA-CAN-30X40', 'GLOBAL-FRA-CAN-40X60'],
  },
  FINE_ART: {
    name: 'Fine Art Print',
    requiredAttributes: [],
    examples: ['GLOBAL-FAP-16X24', 'GLOBAL-FAP-20X30'],
  },
  PHOTOBOOK: {
    name: 'Photobook',
    requiredAttributes: [],
    examples: ['BOOK-A4-P-HARD-M', 'BOOK-A5-L-SOFT-M'],
  },
} as const;

/**
 * Determine product category from SKU
 */
export function getProductCategory(sku: string): keyof typeof PRODUCT_CATEGORIES | null {
  if (sku.includes('FRA-CAN')) return 'LARGE_FRAMED_CANVAS';
  if (sku.includes('CAN')) return 'CANVAS';
  if (sku.includes('CFPM')) return 'FRAMED_PRINT';
  if (sku.includes('FAP')) return 'FINE_ART';
  if (sku.includes('BOOK')) return 'PHOTOBOOK';
  return null;
}

/**
 * Get required attributes based on product category
 */
export function getRequiredAttributesByCategory(sku: string): string[] {
  const category = getProductCategory(sku);
  if (!category) return [];
  return PRODUCT_CATEGORIES[category].requiredAttributes;
}

