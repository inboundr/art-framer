/**
 * Prodigi API v4 - Quotes Module
 * 
 * Complete implementation of quote/pricing endpoints
 */

import type {
  CreateQuoteRequest,
  CreateQuoteResponse,
  Quote,
  QuoteItem,
  ShippingMethod,
} from './types';
import { ProdigiClient } from './client';
import { isValidSku, isValidCountryCode, parsePrice, formatPrice, MemoryCache, generateCacheKey } from './utils';
import { ProdigiValidationError } from './errors';
import { CACHE_KEYS } from './constants';

/**
 * Quotes API Module
 * 
 * Handles all quote/pricing operations:
 * - Generating quotes
 * - Calculating total costs
 * - Comparing shipping methods
 * - Quote caching for performance
 */
export class QuotesAPI {
  private quoteCache: MemoryCache<Quote[]>;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private cacheHits = 0;
  private cacheMisses = 0;

  constructor(private readonly client: ProdigiClient) {
    this.quoteCache = new MemoryCache<Quote[]>();
  }

  /**
   * Generate cache key for quote request
   */
  private getCacheKey(quoteRequest: CreateQuoteRequest): string {
    // Create a stable key from request parameters
    const keyData = {
      destination: quoteRequest.destinationCountryCode,
      shippingMethod: quoteRequest.shippingMethod,
      items: quoteRequest.items.map(item => ({
        sku: item.sku,
        copies: item.copies,
        attributes: item.attributes ? JSON.stringify(item.attributes) : undefined,
      })),
    };
    
    const hash = generateCacheKey(keyData);
    return CACHE_KEYS.QUOTE(hash);
  }

  /**
   * Create a quote for items
   * 
   * Gets pricing information without creating an order.
   * Returns quotes for all available shipping methods.
   * 
   * @param quoteRequest - Quote request details
   * @returns Array of quotes for different shipping methods
   * 
   * @example
   * ```ts
   * const quotes = await quotesAPI.create({
   *   destinationCountryCode: 'US',
   *   shippingMethod: 'Standard',
   *   items: [{
   *     sku: 'GLOBAL-CAN-10x10',
   *     copies: 2,
   *     attributes: { wrap: 'black' },
   *     assets: [{ printArea: 'default' }],
   *   }],
   * });
   * 
   * quotes.forEach(quote => {
   *   console.log(`${quote.shipmentMethod}: ${quote.costSummary.totalCost?.amount} ${quote.costSummary.totalCost?.currency}`);
   * });
   * ```
   */
  async create(quoteRequest: CreateQuoteRequest): Promise<Quote[]> {
    this.validateQuoteRequest(quoteRequest);

    // Check cache first
    const cacheKey = this.getCacheKey(quoteRequest);
    const cachedQuotes = this.quoteCache.get(cacheKey);
    
    if (cachedQuotes) {
      this.cacheHits++;
      console.log(`[QuotesAPI] Cache HIT for quote: ${cacheKey.substring(0, 16)}...`);
      return cachedQuotes;
    }

    this.cacheMisses++;
    console.log(`[QuotesAPI] Cache MISS for quote: ${cacheKey.substring(0, 16)}...`);

    // Log the request being sent to Prodigi for debugging
    console.error('[QuotesAPI] Creating quote request:', JSON.stringify(quoteRequest, null, 2));

    const response = await this.client.request<CreateQuoteResponse>({
      method: 'POST',
      endpoint: '/quotes',
      body: quoteRequest,
    });

    // Cache successful quotes
    if (response.quotes && response.quotes.length > 0) {
      this.quoteCache.set(cacheKey, response.quotes, this.CACHE_TTL);
      console.log(`[QuotesAPI] Cached quote: ${cacheKey.substring(0, 16)}... (TTL: ${this.CACHE_TTL/1000}s)`);
    }

    return response.quotes;
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      hitRate: this.cacheHits + this.cacheMisses > 0 
        ? (this.cacheHits / (this.cacheHits + this.cacheMisses) * 100).toFixed(2) + '%'
        : '0%',
      size: this.quoteCache.size(),
    };
  }

  /**
   * Clear quote cache
   */
  clearCache(): void {
    this.quoteCache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
    console.log('[QuotesAPI] Cache cleared');
  }

  /**
   * Get quote for specific shipping method
   * 
   * @param destinationCountryCode - Destination country (ISO 3166-1 alpha-2)
   * @param items - Items to quote
   * @param shippingMethod - Desired shipping method
   * @returns Quote for the specified shipping method
   * 
   * @example
   * ```ts
   * const quote = await quotesAPI.getForShippingMethod(
   *   'US',
   *   [{ sku: 'GLOBAL-CAN-10x10', copies: 1, assets: [{ printArea: 'default' }] }],
   *   'Express'
   * );
   * ```
   */
  async getForShippingMethod(
    destinationCountryCode: string,
    items: QuoteItem[],
    shippingMethod: ShippingMethod
  ): Promise<Quote | null> {
    const quotes = await this.create({
      destinationCountryCode,
      items,
      shippingMethod,
    });

    return quotes.find(q => q.shipmentMethod === shippingMethod) || null;
  }

  /**
   * Compare all shipping methods
   * 
   * Gets quotes for all shipping methods and returns them sorted by price
   * 
   * @param destinationCountryCode - Destination country (ISO 3166-1 alpha-2)
   * @param items - Items to quote
   * @returns Sorted array of quotes (cheapest first)
   * 
   * @example
   * ```ts
   * const quotes = await quotesAPI.compareShippingMethods('US', items);
   * const cheapest = quotes[0];
   * const fastest = quotes[quotes.length - 1];
   * ```
   */
  async compareShippingMethods(
    destinationCountryCode: string,
    items: QuoteItem[]
  ): Promise<Quote[]> {
    const quotes = await this.create({
      destinationCountryCode,
      items,
      shippingMethod: 'Standard', // API returns all methods regardless
    });

    // Sort by total cost (ascending)
    return quotes.sort((a, b) => {
      const costA = parsePrice(a.costSummary.totalCost?.amount || '0');
      const costB = parsePrice(b.costSummary.totalCost?.amount || '0');
      return costA - costB;
    });
  }

  /**
   * Calculate shipping cost only
   * 
   * @param destinationCountryCode - Destination country (ISO 3166-1 alpha-2)
   * @param items - Items to quote
   * @param shippingMethod - Desired shipping method
   * @returns Shipping cost amount and currency
   * 
   * @example
   * ```ts
   * const { amount, currency } = await quotesAPI.getShippingCost('US', items, 'Standard');
   * console.log(`Shipping: ${amount} ${currency}`);
   * ```
   */
  async getShippingCost(
    destinationCountryCode: string,
    items: QuoteItem[],
    shippingMethod: ShippingMethod
  ): Promise<{ amount: number; currency: string }> {
    const quote = await this.getForShippingMethod(
      destinationCountryCode,
      items,
      shippingMethod
    );

    if (!quote) {
      throw new Error(`No quote available for shipping method: ${shippingMethod}`);
    }

    return {
      amount: parsePrice(quote.costSummary.shipping.amount),
      currency: quote.costSummary.shipping.currency,
    };
  }

  /**
   * Calculate total order cost (items + shipping)
   * 
   * @param destinationCountryCode - Destination country (ISO 3166-1 alpha-2)
   * @param items - Items to quote
   * @param shippingMethod - Desired shipping method
   * @returns Total cost breakdown
   * 
   * @example
   * ```ts
   * const cost = await quotesAPI.getTotalCost('US', items, 'Standard');
   * console.log(`Items: ${cost.items.formatted}`);
   * console.log(`Shipping: ${cost.shipping.formatted}`);
   * console.log(`Total: ${cost.total.formatted}`);
   * ```
   */
  async getTotalCost(
    destinationCountryCode: string,
    items: QuoteItem[],
    shippingMethod: ShippingMethod
  ): Promise<{
    items: { amount: number; formatted: string; currency: string };
    shipping: { amount: number; formatted: string; currency: string };
    total: { amount: number; formatted: string; currency: string };
  }> {
    const quote = await this.getForShippingMethod(
      destinationCountryCode,
      items,
      shippingMethod
    );

    if (!quote) {
      throw new Error(`No quote available for shipping method: ${shippingMethod}`);
    }

    const itemsAmount = parsePrice(quote.costSummary.items.amount);
    const shippingAmount = parsePrice(quote.costSummary.shipping.amount);
    const totalAmount = parsePrice(quote.costSummary.totalCost?.amount || '0');
    const currency = quote.costSummary.items.currency;

    return {
      items: {
        amount: itemsAmount,
        formatted: formatPrice(itemsAmount, currency),
        currency,
      },
      shipping: {
        amount: shippingAmount,
        formatted: formatPrice(shippingAmount, currency),
        currency,
      },
      total: {
        amount: totalAmount || (itemsAmount + shippingAmount),
        formatted: formatPrice(totalAmount || (itemsAmount + shippingAmount), currency),
        currency,
      },
    };
  }

  /**
   * Estimate delivery time for shipping method
   * 
   * Returns estimated delivery days based on shipping method.
   * Note: Actual delivery times may vary.
   * 
   * @param shippingMethod - Shipping method
   * @returns Estimated delivery range in days
   * 
   * @example
   * ```ts
   * const days = quotesAPI.estimateDeliveryTime('Express');
   * console.log(`Estimated delivery: ${days.min}-${days.max} days`);
   * ```
   */
  estimateDeliveryTime(shippingMethod: ShippingMethod): { min: number; max: number } {
    const estimates: Record<ShippingMethod, { min: number; max: number }> = {
      Budget: { min: 10, max: 14 },
      Standard: { min: 5, max: 7 },
      Express: { min: 2, max: 3 },
      Overnight: { min: 1, max: 1 },
    };

    return estimates[shippingMethod];
  }

  /**
   * Get cheapest shipping option
   * 
   * @param destinationCountryCode - Destination country (ISO 3166-1 alpha-2)
   * @param items - Items to quote
   * @returns Cheapest quote
   * 
   * @example
   * ```ts
   * const cheapest = await quotesAPI.getCheapestOption('US', items);
   * console.log(`Cheapest: ${cheapest.shipmentMethod} - ${cheapest.costSummary.shipping.amount}`);
   * ```
   */
  async getCheapestOption(
    destinationCountryCode: string,
    items: QuoteItem[]
  ): Promise<Quote> {
    const sorted = await this.compareShippingMethods(destinationCountryCode, items);
    return sorted[0];
  }

  /**
   * Get fastest shipping option
   * 
   * @param destinationCountryCode - Destination country (ISO 3166-1 alpha-2)
   * @param items - Items to quote
   * @returns Fastest quote (Overnight or Express)
   * 
   * @example
   * ```ts
   * const fastest = await quotesAPI.getFastestOption('US', items);
   * console.log(`Fastest: ${fastest.shipmentMethod}`);
   * ```
   */
  async getFastestOption(
    destinationCountryCode: string,
    items: QuoteItem[]
  ): Promise<Quote> {
    const quotes = await this.create({
      destinationCountryCode,
      items,
      shippingMethod: 'Standard',
    });

    // Prefer Overnight, then Express, then Standard
    const priority: ShippingMethod[] = ['Overnight', 'Express', 'Standard', 'Budget'];
    
    for (const method of priority) {
      const quote = quotes.find(q => q.shipmentMethod === method);
      if (quote) return quote;
    }

    return quotes[0];
  }

  // ============================================================================
  // PRIVATE VALIDATION METHODS
  // ============================================================================

  /**
   * Validate quote request
   */
  private validateQuoteRequest(request: CreateQuoteRequest): void {
    const errors: string[] = [];

    if (!request.destinationCountryCode || !isValidCountryCode(request.destinationCountryCode)) {
      errors.push('Valid destination country code is required (ISO 3166-1 alpha-2)');
    }

    if (!request.items || request.items.length === 0) {
      errors.push('At least one item is required');
    } else {
      request.items.forEach((item, index) => {
        if (!item.sku || !isValidSku(item.sku)) {
          errors.push(`Item ${index + 1}: Invalid SKU`);
        }
        if (item.copies < 1 || item.copies > 100) {
          errors.push(`Item ${index + 1}: Copies must be between 1 and 100`);
        }
        if (!item.assets || item.assets.length === 0) {
          errors.push(`Item ${index + 1}: At least one asset required`);
        } else {
          item.assets.forEach((asset, assetIndex) => {
            if (!asset.printArea || asset.printArea.trim().length === 0) {
              errors.push(`Item ${index + 1}, Asset ${assetIndex + 1}: Print area is required`);
            }
          });
        }
      });
    }

    if (errors.length > 0) {
      throw new ProdigiValidationError(
        'Quote request validation failed',
        errors.map(msg => ({ message: msg }))
      );
    }
  }
}

