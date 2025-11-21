/**
 * Prodigi API v4 - Orders Module
 * 
 * Complete implementation of order management endpoints
 */

import type {
  CreateOrderRequest,
  CreateOrderResponse,
  GetOrderResponse,
  GetOrdersResponse,
  GetOrdersParams,
  Order,
} from './types';
import { ProdigiClient } from './client';
import {
  isValidMerchantReference,
  isValidEmail,
  isValidCountryCode,
  isValidUrl,
  isValidSku,
  isValidMetadata,
  generateIdempotencyKey,
} from './utils';
import { ProdigiValidationError } from './errors';
import { VALIDATION, PAGINATION } from './constants';

/**
 * Orders API Module
 * 
 * Handles all order-related operations:
 * - Creating orders
 * - Retrieving orders
 * - Listing orders with pagination
 */
export class OrdersAPI {
  constructor(private readonly client: ProdigiClient) {}

  /**
   * Create a new order
   * 
   * @param orderData - Order details
   * @param useIdempotency - Whether to auto-generate idempotency key
   * @returns Created order
   * 
   * @example
   * ```ts
   * const order = await ordersAPI.create({
   *   merchantReference: 'ORDER-001',
   *   shippingMethod: 'Standard',
   *   recipient: {
   *     name: 'John Doe',
   *     email: 'john@example.com',
   *     address: {
   *       line1: '123 Main St',
   *       postalOrZipCode: '12345',
   *       countryCode: 'US',
   *       townOrCity: 'New York',
   *     },
   *   },
   *   items: [{
   *     sku: 'GLOBAL-CAN-10x10',
   *     copies: 1,
   *     sizing: 'fillPrintArea',
   *     assets: [{
   *       printArea: 'default',
   *       url: 'https://example.com/image.jpg',
   *     }],
   *   }],
   * });
   * ```
   */
  async create(
    orderData: CreateOrderRequest,
    useIdempotency: boolean = true
  ): Promise<Order> {
    // Validate order data
    this.validateOrderData(orderData);

    // Generate idempotency key if requested and not provided
    const requestData = {
      ...orderData,
      idempotencyKey: orderData.idempotencyKey || (useIdempotency 
        ? generateIdempotencyKey(orderData.merchantReference)
        : undefined),
      callbackUrl: orderData.callbackUrl || this.client.getCallbackUrl(),
    };

    const response = await this.client.request<CreateOrderResponse>({
      method: 'POST',
      endpoint: '/Orders',
      body: requestData,
      idempotencyKey: requestData.idempotencyKey,
    });

    return response.order;
  }

  /**
   * Get order by ID
   * 
   * @param orderId - Prodigi order ID (format: ord_XXXXXX)
   * @returns Order details
   * 
   * @example
   * ```ts
   * const order = await ordersAPI.get('ord_840796');
   * console.log(order.status.stage); // 'InProgress', 'Complete', etc.
   * ```
   */
  async get(orderId: string): Promise<Order> {
    if (!orderId || !orderId.startsWith('ord_')) {
      throw new ProdigiValidationError('Invalid order ID format. Expected: ord_XXXXXX', []);
    }

    const response = await this.client.request<GetOrderResponse>({
      method: 'GET',
      endpoint: `/Orders/${orderId}`,
    });

    return response.order;
  }

  /**
   * List orders with pagination and filtering
   * 
   * @param params - Query parameters for filtering and pagination
   * @returns Paginated list of orders
   * 
   * @example
   * ```ts
   * // Get first page
   * const result = await ordersAPI.list({ top: 10, status: 'Complete' });
   * console.log(`Found ${result.orders.length} orders`);
   * 
   * // Get next page if available
   * if (result.hasMore) {
   *   const nextPage = await ordersAPI.list({ top: 10, skip: 10 });
   * }
   * ```
   */
  async list(params: GetOrdersParams = {}): Promise<GetOrdersResponse> {
    // Validate pagination parameters
    const top = params.top ?? PAGINATION.DEFAULT_PAGE_SIZE;
    const skip = params.skip ?? 0;

    if (top > PAGINATION.MAX_PAGE_SIZE) {
      throw new ProdigiValidationError(
        `Top parameter cannot exceed ${PAGINATION.MAX_PAGE_SIZE}`,
        []
      );
    }

    if (skip < 0 || top < 1) {
      throw new ProdigiValidationError('Invalid pagination parameters', []);
    }

    return this.client.request<GetOrdersResponse>({
      method: 'GET',
      endpoint: '/Orders',
      params: {
        Top: top,
        Skip: skip,
        Status: params.status,
        MerchantReference: params.merchantReference,
      },
    });
  }

  /**
   * Get all orders (handles pagination automatically)
   * 
   * @param params - Query parameters for filtering
   * @param maxOrders - Maximum number of orders to fetch (default: 1000)
   * @returns Array of all matching orders
   * 
   * @example
   * ```ts
   * const allOrders = await ordersAPI.getAll({ status: 'Complete' });
   * console.log(`Total orders: ${allOrders.length}`);
   * ```
   */
  async getAll(
    params: Omit<GetOrdersParams, 'top' | 'skip'> = {},
    maxOrders: number = 1000
  ): Promise<Order[]> {
    const allOrders: Order[] = [];
    let skip = 0;
    const pageSize = PAGINATION.DEFAULT_PAGE_SIZE;

    while (allOrders.length < maxOrders) {
      const response = await this.list({
        ...params,
        top: pageSize,
        skip,
      });

      allOrders.push(...response.orders);

      if (!response.hasMore || response.orders.length === 0) {
        break;
      }

      skip += pageSize;
    }

    return allOrders.slice(0, maxOrders);
  }

  /**
   * Get order by merchant reference
   * 
   * @param merchantReference - Your custom order reference
   * @returns Order matching the merchant reference (or null if not found)
   * 
   * @example
   * ```ts
   * const order = await ordersAPI.getByMerchantReference('ORDER-001');
   * if (order) {
   *   console.log('Found order:', order.id);
   * }
   * ```
   */
  async getByMerchantReference(merchantReference: string): Promise<Order | null> {
    const response = await this.list({
      merchantReference,
      top: 1,
    });

    return response.orders[0] || null;
  }

  // ============================================================================
  // PRIVATE VALIDATION METHODS
  // ============================================================================

  /**
   * Validate order data before submission
   */
  private validateOrderData(orderData: CreateOrderRequest): void {
    const errors: string[] = [];

    // Validate merchant reference
    if (!isValidMerchantReference(orderData.merchantReference)) {
      errors.push(`Invalid merchant reference. Must be 1-${VALIDATION.MAX_MERCHANT_REFERENCE_LENGTH} characters.`);
    }

    // Validate recipient
    if (!orderData.recipient) {
      errors.push('Recipient is required');
    } else {
      if (!orderData.recipient.name || orderData.recipient.name.trim().length === 0) {
        errors.push('Recipient name is required');
      }

      if (orderData.recipient.email && !isValidEmail(orderData.recipient.email)) {
        errors.push('Invalid recipient email address');
      }

      // Validate address
      const addr = orderData.recipient.address;
      if (!addr) {
        errors.push('Recipient address is required');
      } else {
        if (!addr.line1 || addr.line1.trim().length === 0) {
          errors.push('Address line 1 is required');
        }
        if (!addr.postalOrZipCode || addr.postalOrZipCode.trim().length === 0) {
          errors.push('Postal/Zip code is required');
        }
        if (!addr.countryCode || !isValidCountryCode(addr.countryCode)) {
          errors.push('Valid country code is required (ISO 3166-1 alpha-2)');
        }
        if (!addr.townOrCity || addr.townOrCity.trim().length === 0) {
          errors.push('Town/City is required');
        }
      }
    }

    // Validate items
    if (!orderData.items || orderData.items.length === 0) {
      errors.push('At least one item is required');
    } else {
      orderData.items.forEach((item, index) => {
        if (!item.sku || !isValidSku(item.sku)) {
          errors.push(`Item ${index + 1}: Invalid SKU`);
        }
        if (item.copies < 1 || item.copies > 100) {
          errors.push(`Item ${index + 1}: Copies must be between 1 and 100`);
        }
        if (!item.sizing) {
          errors.push(`Item ${index + 1}: Sizing option is required`);
        }
        if (!item.assets || item.assets.length === 0) {
          errors.push(`Item ${index + 1}: At least one asset is required`);
        } else {
          item.assets.forEach((asset, assetIndex) => {
            if (!asset.printArea || asset.printArea.trim().length === 0) {
              errors.push(`Item ${index + 1}, Asset ${assetIndex + 1}: Print area is required`);
            }
            if (!asset.url || !isValidUrl(asset.url)) {
              errors.push(`Item ${index + 1}, Asset ${assetIndex + 1}: Valid asset URL is required`);
            }
            if (asset.url && asset.url.length > VALIDATION.MAX_ASSET_URL_LENGTH) {
              errors.push(`Item ${index + 1}, Asset ${assetIndex + 1}: Asset URL too long`);
            }
          });
        }
      });
    }

    // Validate callback URL if provided
    if (orderData.callbackUrl && !isValidUrl(orderData.callbackUrl)) {
      errors.push('Invalid callback URL');
    }

    // Validate metadata if provided
    if (orderData.metadata && !isValidMetadata(orderData.metadata)) {
      errors.push(`Metadata too large. Maximum ${VALIDATION.MAX_METADATA_SIZE} characters.`);
    }

    // Validate branding URLs if provided
    if (orderData.branding) {
      const brandingFields = Object.entries(orderData.branding);
      for (const [field, value] of brandingFields) {
        if (value && typeof value === 'object' && 'url' in value) {
          if (!isValidUrl(value.url)) {
            errors.push(`Invalid branding URL for ${field}`);
          }
        }
      }
    }

    if (errors.length > 0) {
      throw new ProdigiValidationError(
        'Order validation failed',
        errors.map(msg => ({ message: msg }))
      );
    }
  }
}

