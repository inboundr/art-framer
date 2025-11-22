/**
 * Prodigi API v4 - Complete Integration
 * 
 * 100% coverage of the official Prodigi Print API v4
 * 
 * @example
 * ```ts
 * import { ProdigiSDK } from '@/lib/prodigi-v2';
 * 
 * const prodigi = new ProdigiSDK({
 *   apiKey: process.env.PRODIGI_API_KEY!,
 *   environment: 'production',
 *   callbackUrl: 'https://example.com/api/webhooks/prodigi',
 * });
 * 
 * // Create an order
 * const order = await prodigi.orders.create({...});
 * 
 * // Get a quote
 * const quotes = await prodigi.quotes.create({...});
 * 
 * // Get product details
 * const product = await prodigi.products.get('GLOBAL-CAN-10x10');
 * ```
 */

// Core exports
export { ProdigiClient } from './client';
export { OrdersAPI } from './orders';
export { OrderActionsAPI } from './order-actions';
export { QuotesAPI } from './quotes';
export { ProductsAPI } from './products';
export { ProdigiCatalogService } from './catalog';
export { WebhooksManager, WebhookHelpers, createWebhookMiddleware } from './webhooks';

// Attribute helper exports
export {
  ProductAttributeHelper,
  validateProductAttributes,
  getRequiredAttributes,
  getSuggestedAttributes,
  getProductCategory,
  getRequiredAttributesByCategory,
  PRODUCT_CATEGORIES as PRODUCT_ATTRIBUTE_CATEGORIES,
} from './attribute-helpers';
export type { AttributeValidationResult, ProductAttributeInfo } from './attribute-helpers';

// Attribute normalizer exports
export {
  normalizeAttributeValue,
  normalizeAttributes,
  areAttributeValuesEqual,
  catalogToOfficialAttributes,
  getAttributeValueVariations,
  isValidWrapValue,
  isValidColorValue,
  ATTRIBUTE_MAPPINGS,
} from './attribute-normalizer';
export type { WrapValue, ColorValue } from './attribute-normalizer';

// Type exports
export type * from './types';

// Error exports
export {
  ProdigiAPIError,
  ProdigiAuthenticationError,
  ProdigiAuthorizationError,
  ProdigiNotFoundError,
  ProdigiValidationError,
  ProdigiRateLimitError,
  ProdigiNetworkError,
  ProdigiTimeoutError,
  isProdigiError,
  isRetryableError,
} from './errors';

// Constant exports
export {
  API_URLS,
  SHIPPING_METHODS,
  ORDER_STATUS_DESCRIPTIONS,
  ERROR_CODES,
  WEBHOOK_EVENTS,
  PRODUCT_CATEGORIES,
  SIZING_OPTIONS,
} from './constants';

// Azure Search catalog exports
export { azureSearchClient, AzureSearchClient } from './azure-search/client';
export { ProdigiQueryBuilder } from './azure-search/query-builder';
export { productMatcher, ProductMatcher } from './azure-search/product-matcher';
export { prodigiService as azureSearchService, ProdigiService as AzureSearchService } from './azure-search/service';
export type * as AzureSearchTypes from './azure-search/types';

// Azure Search utility exports
export {
  calculateAspectRatio,
  getOrientation,
  getAspectRatioFilters,
  getSizeRangeForCategory,
  recommendSizeCategory,
  buildScoringOptions,
  createImageMatchQuery,
} from './azure-search/query-builder';

export {
  getRecommendationsForImage,
} from './azure-search/product-matcher';

// Utility exports
export {
  generateIdempotencyKey,
  generateMd5Hash,
  isValidEmail,
  isValidCountryCode,
  isValidUrl,
  isValidSku,
  parsePrice,
  formatPrice,
  convertDimensions,
} from './utils';

// ============================================================================
// MAIN SDK CLASS
// ============================================================================

import type { ProdigiClientConfig } from './types';
import { ProdigiClient } from './client';
import { OrdersAPI } from './orders';
import { OrderActionsAPI } from './order-actions';
import { QuotesAPI } from './quotes';
import { ProductsAPI } from './products';
import { ProdigiCatalogService } from './catalog';
import { WebhooksManager } from './webhooks';
import { ProdigiService as AzureSearchService } from './azure-search/service';

/**
 * Prodigi SDK - Main entry point
 * 
 * Provides access to all Prodigi API functionality through a unified interface
 */
export class ProdigiSDK {
  private readonly client: ProdigiClient;

  /** Orders management */
  public readonly orders: OrdersAPI;

  /** Order actions (cancel, update, etc.) */
  public readonly orderActions: OrderActionsAPI;

  /** Quotes and pricing */
  public readonly quotes: QuotesAPI;

  /** Product information */
  public readonly products: ProductsAPI;

  /** Product catalog and SKU lookup */
  public readonly catalog: ProdigiCatalogService;

  /** Azure Search catalog service (reverse-engineered Prodigi catalog) */
  public readonly azureSearch: AzureSearchService;

  /** Webhook event handling */
  public readonly webhooks: WebhooksManager;

  constructor(config: ProdigiClientConfig) {
    // Initialize core client
    this.client = new ProdigiClient(config);

    // Initialize API modules
    this.orders = new OrdersAPI(this.client);
    this.orderActions = new OrderActionsAPI(this.client);
    this.quotes = new QuotesAPI(this.client);
    this.products = new ProductsAPI(this.client);
    this.catalog = new ProdigiCatalogService(this.client);
    this.azureSearch = new AzureSearchService();
    this.webhooks = new WebhooksManager();
  }

  /**
   * Get client configuration
   */
  getConfig() {
    return this.client.getConfig();
  }

  /**
   * Clear API response cache
   */
  clearCache(): void {
    this.client.clearCache();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.client.getCacheStats();
  }

  /**
   * Get rate limit information
   */
  getRateLimitInfo() {
    return this.client.getRateLimitInfo();
  }
}

// ============================================================================
// SINGLETON INSTANCE (Optional convenience export)
// ============================================================================

/**
 * Default Prodigi SDK instance
 * 
 * Uses environment variables for configuration:
 * - PRODIGI_API_KEY
 * - PRODIGI_ENVIRONMENT (sandbox | production)
 * - PRODIGI_CALLBACK_URL
 * 
 * @example
 * ```ts
 * import { prodigiSDK } from '@/lib/prodigi-v2';
 * 
 * const order = await prodigiSDK.orders.create({...});
 * ```
 */
export const prodigiSDK = new ProdigiSDK({
  apiKey: process.env.PRODIGI_API_KEY || '',
  environment: (process.env.PRODIGI_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
  callbackUrl: process.env.PRODIGI_CALLBACK_URL,
  timeout: parseInt(process.env.PRODIGI_TIMEOUT || '30000', 10),
  retries: parseInt(process.env.PRODIGI_RETRIES || '3', 10),
  enableCache: process.env.PRODIGI_ENABLE_CACHE !== 'false',
});

// ============================================================================
// QUICK ACCESS FUNCTIONS (Optional convenience exports)
// ============================================================================

/**
 * Quick access to orders API
 */
export const orders = prodigiSDK.orders;

/**
 * Quick access to order actions API
 */
export const orderActions = prodigiSDK.orderActions;

/**
 * Quick access to quotes API
 */
export const quotes = prodigiSDK.quotes;

/**
 * Quick access to products API
 */
export const products = prodigiSDK.products;

/**
 * Quick access to catalog service
 */
export const catalog = prodigiSDK.catalog;

/**
 * Quick access to Azure Search catalog service
 */
export const azureSearch = prodigiSDK.azureSearch;

/**
 * Quick access to webhooks manager
 */
export const webhooks = prodigiSDK.webhooks;

