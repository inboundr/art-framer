/**
 * Prodigi API v4 - Products Module
 * 
 * Complete implementation of product information endpoints
 */

import type {
  GetProductDetailsResponse,
  PhotobookSpineRequest,
  PhotobookSpineResponse,
  Product,
  ProductVariant,
} from './types';
import { ProdigiClient } from './client';
import { isValidSku, isValidCountryCode } from './utils';
import { ProdigiValidationError, ProdigiNotFoundError } from './errors';

/**
 * Products API Module
 * 
 * Handles all product information operations:
 * - Getting product details
 * - Getting photobook spine details
 * - Product availability checks
 */
export class ProductsAPI {
  constructor(private readonly client: ProdigiClient) {}

  /**
   * Get product details by SKU
   * 
   * Returns comprehensive information about a product including:
   * - Product dimensions
   * - Available attributes (colors, finishes, etc.)
   * - Print area sizes
   * - Supported countries
   * - Variants
   * 
   * @param sku - Product SKU
   * @returns Product details
   * 
   * @example
   * ```ts
   * const product = await productsAPI.get('GLOBAL-CAN-10x10');
   * 
   * console.log('Product:', product.description);
   * console.log('Dimensions:', product.productDimensions);
   * console.log('Available colors:', product.attributes.color);
   * console.log('Ships to:', product.variants[0].shipsTo.length, 'countries');
   * ```
   */
  async get(sku: string): Promise<Product> {
    if (!isValidSku(sku)) {
      throw new ProdigiValidationError('Invalid SKU format', []);
    }

    try {
      const response = await this.client.request<GetProductDetailsResponse>({
        method: 'GET',
        endpoint: `/products/${sku}`,
      });

      return response.product;
    } catch (error) {
      if (error instanceof ProdigiNotFoundError) {
        throw new ProdigiNotFoundError(`Product with SKU ${sku} not found`, {}, undefined);
      }
      throw error;
    }
  }

  /**
   * Get photobook spine details
   * 
   * Calculates the spine width for a photobook based on page count.
   * Required for creating spine assets for photobooks.
   * 
   * @param request - Spine calculation request
   * @returns Spine width information
   * 
   * @example
   * ```ts
   * const spine = await productsAPI.getPhotobookSpine({
   *   sku: 'BOOK-A4-P-HARD-M',
   *   pageCount: 50,
   *   destinationCountryCode: 'US',
   * });
   * 
   * console.log(`Spine width: ${spine.spineWidth.value} ${spine.spineWidth.units}`);
   * ```
   */
  async getPhotobookSpine(request: PhotobookSpineRequest): Promise<PhotobookSpineResponse> {
    this.validatePhotobookSpineRequest(request);

    return this.client.request<PhotobookSpineResponse>({
      method: 'POST',
      endpoint: '/products/spine',
      body: request,
    });
  }

  /**
   * Check if product is available for a country
   * 
   * @param sku - Product SKU
   * @param countryCode - Country code (ISO 3166-1 alpha-2)
   * @returns true if product ships to the country
   * 
   * @example
   * ```ts
   * const available = await productsAPI.isAvailableForCountry('GLOBAL-CAN-10x10', 'US');
   * if (available) {
   *   console.log('Product ships to the US');
   * }
   * ```
   */
  async isAvailableForCountry(sku: string, countryCode: string): Promise<boolean> {
    if (!isValidCountryCode(countryCode)) {
      throw new ProdigiValidationError('Invalid country code', []);
    }

    try {
      const product = await this.get(sku);
      
      // Check if any variant ships to this country
      return product.variants.some(variant =>
        variant.shipsTo.includes(countryCode)
      );
    } catch (error) {
      if (error instanceof ProdigiNotFoundError) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get available attributes for a product
   * 
   * @param sku - Product SKU
   * @returns Map of attribute keys to available values
   * 
   * @example
   * ```ts
   * const attributes = await productsAPI.getAvailableAttributes('GLOBAL-CAN-10x10');
   * console.log('Available wraps:', attributes.wrap);
   * // Output: ['Black', 'ImageWrap', 'MirrorWrap', 'White']
   * ```
   */
  async getAvailableAttributes(sku: string): Promise<Record<string, string[]>> {
    const product = await this.get(sku);
    return product.attributes;
  }

  /**
   * Get variant by attributes
   * 
   * Finds a product variant that matches the specified attributes
   * 
   * @param sku - Product SKU
   * @param attributes - Desired attributes
   * @returns Matching variant or null
   * 
   * @example
   * ```ts
   * const variant = await productsAPI.getVariantByAttributes(
   *   'GLOBAL-CAN-10x10',
   *   { wrap: 'Black' }
   * );
   * 
   * if (variant) {
   *   console.log('Variant ships to:', variant.shipsTo.length, 'countries');
   * }
   * ```
   */
  async getVariantByAttributes(
    sku: string,
    attributes: Record<string, string>
  ): Promise<ProductVariant | null> {
    const product = await this.get(sku);

    // Find variant that matches all specified attributes
    return product.variants.find(variant => {
      return Object.entries(attributes).every(([key, value]) =>
        variant.attributes[key] === value
      );
    }) || null;
  }

  /**
   * Get print area dimensions for a product
   * 
   * @param sku - Product SKU
   * @param printArea - Print area name (default: 'default')
   * @param attributes - Product attributes to match variant
   * @returns Print area dimensions in pixels
   * 
   * @example
   * ```ts
   * const dimensions = await productsAPI.getPrintAreaDimensions(
   *   'GLOBAL-CAN-10x10',
   *   'default',
   *   { wrap: 'Black' }
   * );
   * 
   * console.log(`Required image size: ${dimensions.width}x${dimensions.height}px`);
   * ```
   */
  async getPrintAreaDimensions(
    sku: string,
    printArea: string = 'default',
    attributes: Record<string, string> = {}
  ): Promise<{ width: number; height: number } | null> {
    const variant = await this.getVariantByAttributes(sku, attributes);
    
    if (!variant || !variant.printAreaSizes[printArea]) {
      return null;
    }

    const sizes = variant.printAreaSizes[printArea];
    return {
      width: sizes.horizontalResolution,
      height: sizes.verticalResolution,
    };
  }

  /**
   * Get countries a product ships to
   * 
   * @param sku - Product SKU
   * @param attributes - Product attributes to match variant (optional)
   * @returns Array of country codes
   * 
   * @example
   * ```ts
   * const countries = await productsAPI.getShippingCountries('GLOBAL-CAN-10x10');
   * console.log(`Ships to ${countries.length} countries`);
   * ```
   */
  async getShippingCountries(
    sku: string,
    attributes?: Record<string, string>
  ): Promise<string[]> {
    const product = await this.get(sku);

    if (attributes) {
      const variant = product.variants.find(v => {
        return Object.entries(attributes).every(([key, value]) =>
          v.attributes[key] === value
        );
      });
      return variant ? variant.shipsTo : [];
    }

    // Return union of all variants' shipping countries
    const allCountries = new Set<string>();
    product.variants.forEach(variant => {
      variant.shipsTo.forEach(country => allCountries.add(country));
    });

    return Array.from(allCountries).sort();
  }

  /**
   * Check if product has required attributes
   * 
   * @param sku - Product SKU
   * @returns true if product requires attributes to be specified
   * 
   * @example
   * ```ts
   * if (await productsAPI.hasRequiredAttributes('GLOBAL-CAN-10x10')) {
   *   console.log('Must specify attributes like color, wrap, etc.');
   * }
   * ```
   */
  async hasRequiredAttributes(sku: string): Promise<boolean> {
    const product = await this.get(sku);
    return Object.keys(product.attributes).length > 0;
  }

  // ============================================================================
  // PRIVATE VALIDATION METHODS
  // ============================================================================

  /**
   * Validate photobook spine request
   */
  private validatePhotobookSpineRequest(request: PhotobookSpineRequest): void {
    const errors: string[] = [];

    if (!request.sku || !isValidSku(request.sku)) {
      errors.push('Valid SKU is required');
    }

    if (!request.pageCount || request.pageCount < 1 || request.pageCount > 500) {
      errors.push('Page count must be between 1 and 500');
    }

    if (!request.destinationCountryCode || !isValidCountryCode(request.destinationCountryCode)) {
      errors.push('Valid destination country code is required');
    }

    if (errors.length > 0) {
      throw new ProdigiValidationError(
        'Photobook spine request validation failed',
        errors.map(msg => ({ message: msg }))
      );
    }
  }
}

