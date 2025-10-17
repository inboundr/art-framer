/**
 * SKU Validation Utilities
 * 
 * This module provides utilities to validate and ensure SKUs are valid
 * before they are stored in the database.
 */

import { simpleProdigiClient } from './prodigi-simple';

/**
 * Validate if a SKU is valid with the Prodigi API
 */
export async function validateSkuWithProdigi(sku: string): Promise<boolean> {
  try {
    return await simpleProdigiClient.validateSku(sku);
  } catch (error) {
    console.warn(`SKU validation failed for ${sku}:`, error);
    return false;
  }
}

/**
 * Get a valid SKU for a given frame specification
 */
export function getValidSkuForFrame(
  frameSize: string, 
  frameStyle: string, 
  frameMaterial: string
): string {
  return simpleProdigiClient.getBestSkuForFrame(frameSize, frameStyle, frameMaterial);
}

/**
 * Validate and fix a SKU if it's invalid
 */
export async function validateAndFixSku(
  sku: string,
  frameSize?: string,
  frameStyle?: string,
  frameMaterial?: string
): Promise<string> {
  // If it's already a known working SKU, return it
  const knownSkus = simpleProdigiClient.getKnownWorkingSkus();
  if (knownSkus.includes(sku)) {
    return sku;
  }

  // If it's a generated SKU (PRODIGI-* pattern), validate it
  if (sku.startsWith('PRODIGI-')) {
    const isValid = await validateSkuWithProdigi(sku);
    if (isValid) {
      return sku;
    }
    
    // If invalid and we have frame specifications, generate a valid one
    if (frameSize && frameStyle && frameMaterial) {
      console.warn(`Invalid generated SKU ${sku}, replacing with valid SKU`);
      return getValidSkuForFrame(frameSize, frameStyle, frameMaterial);
    }
  }

  // If we have frame specifications, generate a valid SKU
  if (frameSize && frameStyle && frameMaterial) {
    return getValidSkuForFrame(frameSize, frameStyle, frameMaterial);
  }

  // Fallback to a known working SKU
  return 'GLOBAL-FAP-11X14';
}

/**
 * Middleware to validate SKUs before database operations
 */
export function createSkuValidationMiddleware() {
  return {
    /**
     * Validate SKU before creating a product
     */
    async validateProductSku(productData: {
      sku: string;
      frame_size?: string;
      frame_style?: string;
      frame_material?: string;
    }) {
      const validSku = await validateAndFixSku(
        productData.sku,
        productData.frame_size,
        productData.frame_style,
        productData.frame_material
      );

      if (validSku !== productData.sku) {
        console.log(`🔄 SKU validation: ${productData.sku} → ${validSku}`);
        return {
          ...productData,
          sku: validSku
        };
      }

      return productData;
    },

    /**
     * Validate SKU before updating a product
     */
    async validateUpdateSku(updateData: {
      sku?: string;
      frame_size?: string;
      frame_style?: string;
      frame_material?: string;
    }) {
      if (updateData.sku) {
        const validSku = await validateAndFixSku(
          updateData.sku,
          updateData.frame_size,
          updateData.frame_style,
          updateData.frame_material
        );

        if (validSku !== updateData.sku) {
          console.log(`🔄 SKU validation: ${updateData.sku} → ${validSku}`);
          return {
            ...updateData,
            sku: validSku
          };
        }
      }

      return updateData;
    }
  };
}

/**
 * Batch validate multiple SKUs
 */
export async function batchValidateSkus(skus: string[]): Promise<{
  valid: string[];
  invalid: string[];
}> {
  const results = await Promise.allSettled(
    skus.map(async (sku) => ({
      sku,
      isValid: await validateSkuWithProdigi(sku)
    }))
  );

  const valid: string[] = [];
  const invalid: string[] = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value.isValid) {
      valid.push(skus[index]);
    } else {
      invalid.push(skus[index]);
    }
  });

  return { valid, invalid };
}
