/**
 * Pricing Service for V2 Checkout
 * 
 * Handles all pricing calculations including:
 * - Real-time Prodigi quotes
 * - Currency conversion
 * - Tax calculation
 * - Price validation
 */

import { ProdigiClient } from '@/lib/prodigi-v2/client';
import { QuotesAPI } from '@/lib/prodigi-v2/quotes';
import { ProductsAPI } from '@/lib/prodigi-v2/products';
import { CurrencyService } from '@/lib/currency';
import { PricingError } from '../types/errors';
import { buildProdigiAttributes, buildProdigiAttributesHeuristic } from '../utils/attribute-builder';
import { generateQuoteKey } from '../utils/attribute-normalizer';
import type {
  CartItem,
  CartTotals,
  PriceValidationResult,
} from '../types/cart.types';
import type { ShippingMethod } from '../types/order.types';
import type { Quote, QuoteItem } from '@/lib/prodigi-v2/types';

export interface PricingResult {
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  currency: string;
  originalCurrency?: string;
  originalTotal?: number;
  exchangeRate?: number;
  estimatedDays?: number;
  // Per-item prices: maps cart item index to unit price
  itemPrices?: Map<number, number>;
}

export interface ShippingOption {
  method: ShippingMethod;
  cost: number;
  currency: string;
  estimatedDays: number;
  serviceName?: string;
  carrier?: string;
}

export class PricingService {
  private quotesAPI: QuotesAPI;
  private productsAPI: ProductsAPI;

  constructor(
    private prodigiClient: ProdigiClient,
    private currencyService: CurrencyService
  ) {
    this.quotesAPI = new QuotesAPI(prodigiClient);
    this.productsAPI = new ProductsAPI(prodigiClient);
  }

  /**
   * Extract base Prodigi SKU from a unique SKU (removes image ID suffix)
   * SKUs with image IDs have format: base-sku-abc12345 (8 hex/digit chars)
   * Examples:
   *   - fra-box-gitd-610x610-f7acd7d2 -> fra-box-gitd-610x610
   *   - fra-box-gitd-610x610-27434680 -> fra-box-gitd-610x610
   */
  private extractBaseSku(sku: string): string {
    if (!sku || typeof sku !== 'string') {
      return sku;
    }
    
    // If the SKU has a dash followed by 8 hex/digit characters (image ID), remove it
    // Pattern: base-sku-XXXXXXXX where X is hex (0-9, a-f) and exactly 8 chars
    const match = sku.match(/^(.+)-[a-f0-9]{8}$/i);
    if (match && match[1]) {
      return match[1];
    }
    
    // If no match, return original SKU (might already be base SKU)
    return sku;
  }

  /**
   * Calculate pricing for cart items
   */
  async calculatePricing(
    items: CartItem[],
    destinationCountry: string,
    shippingMethod: ShippingMethod = 'Standard',
    currency?: string
  ): Promise<PricingResult> {
    try {
      // First, map items to quote items with base SKU extraction
      // Track which cart items map to which quote items for per-item pricing
      const quoteItemsMap = new Map<string, QuoteItem>();
      const cartItemToQuoteKey = new Map<number, string>(); // cart index -> quote key
      
      for (let cartIndex = 0; cartIndex < items.length; cartIndex++) {
        const item = items[cartIndex];
        
        // Extract base SKU (remove image ID suffix if present)
        // Prodigi API only accepts base SKUs, not SKUs with image ID suffixes
        const baseSku = this.extractBaseSku(item.sku);
        
        // Validate SKU is not empty
        if (!baseSku || baseSku.trim().length === 0) {
          throw new Error(`Invalid SKU: "${item.sku}" -> "${baseSku}"`);
        }
        
        // Debug logging to verify SKU extraction
        if (item.sku !== baseSku) {
          console.log(`🔧 Extracted base SKU: ${item.sku} -> ${baseSku}`);
        }
        
        const attributes = await this.buildAttributes(item.frameConfig, baseSku);
        
        // Log what we're processing for debugging
        console.log('[Pricing] Quote item:', {
          sku: baseSku,
          copies: item.quantity,
          attributes,
          frameConfig: item.frameConfig,
        });
        
        // Generate quote key for matching (generateQuoteKey normalizes internally)
        const uniqueKey = generateQuoteKey(baseSku, attributes);
        
        // Track which cart item maps to which quote key
        cartItemToQuoteKey.set(cartIndex, uniqueKey);
        
        // Combine items with the same SKU and attributes
        if (quoteItemsMap.has(uniqueKey)) {
          const existing = quoteItemsMap.get(uniqueKey)!;
          existing.copies += item.quantity;
          console.log(`[Pricing] Combined item with existing: ${uniqueKey}, total copies: ${existing.copies}`);
        } else {
          // Build the quote item
          // IMPORTANT: Prodigi API expects camelCase attribute keys (mountColor, paperType, etc.)
          // but lowercase values for some attributes (like wrap: 'black' not 'Black')
          // We normalize for matching, but need to send original camelCase keys to Prodigi
          const quoteItem: QuoteItem = {
            sku: baseSku,
            copies: item.quantity,
            assets: [{
              printArea: 'default', // Use lowercase 'default' as per Prodigi API
            }],
          };
          
          // Only include attributes if we have any (Prodigi may reject empty attributes object)
          // Send original attributes (camelCase keys) to Prodigi, not normalized (lowercase keys)
          // The normalization is only for matching quote responses back to cart items
          if (Object.keys(attributes).length > 0) {
            quoteItem.attributes = attributes;
          }
          
          quoteItemsMap.set(uniqueKey, quoteItem);
        }
      }
      
      // Convert map to array
      const quoteItems: QuoteItem[] = Array.from(quoteItemsMap.values());
      
      console.log(`[Pricing] Combined ${items.length} cart items into ${quoteItems.length} unique quote items`);

      // Get quotes for all shipping methods, then find the one we want
      // This is more reliable than requesting a specific method
      let allQuotes;
      try {
        console.log('[Pricing] Requesting quotes with:', {
          destinationCountry,
          quoteItemsCount: quoteItems.length,
          quoteItems: JSON.stringify(quoteItems, null, 2),
        });
        allQuotes = await this.quotesAPI.compareShippingMethods(
          destinationCountry,
          quoteItems
        );
        console.log('[Pricing] Got quotes from compareShippingMethods:', allQuotes?.length || 0);
        // Some Prodigi routes return 200 with an empty array; treat as failure and retry with direct create
        if (!allQuotes || allQuotes.length === 0) {
          console.warn('[Pricing] compareShippingMethods returned no quotes, retrying with direct create');
          allQuotes = await this.quotesAPI.create({
            destinationCountryCode: destinationCountry,
            items: quoteItems,
            shippingMethod: shippingMethod,
          });
          console.log('[Pricing] Got quotes from direct create (fallback):', allQuotes?.length || 0);
        }
      } catch (error: any) {
        console.error('[Pricing] compareShippingMethods failed:', error);
        console.log('[Pricing] Trying direct create with:', {
          destinationCountryCode: destinationCountry,
          items: JSON.stringify(quoteItems, null, 2),
          shippingMethod,
        });
        // If compareShippingMethods fails, try getting quotes directly
        try {
          allQuotes = await this.quotesAPI.create({
            destinationCountryCode: destinationCountry,
            items: quoteItems,
            shippingMethod: shippingMethod,
          });
          console.log('[Pricing] Got quotes from direct create:', allQuotes?.length || 0);
        } catch (createError: any) {
          console.error('[Pricing] Direct create also failed:', createError);
          // Last resort: try getting quotes for each item individually
          // Sometimes Prodigi fails on combined quotes but succeeds on individual items
          console.warn('[Pricing] Attempting individual item quotes as last resort');
          try {
            const individualQuotes: any[] = [];
            for (const item of quoteItems) {
              try {
                const itemQuotes = await this.quotesAPI.create({
                  destinationCountryCode: destinationCountry,
                  items: [item],
                  shippingMethod: shippingMethod,
                });
                if (itemQuotes && itemQuotes.length > 0) {
                  individualQuotes.push(...itemQuotes);
                  console.log(`[Pricing] Successfully got quote for item ${item.sku}`);
                }
              } catch (itemError: any) {
                console.warn(`[Pricing] Failed to get quote for item ${item.sku}:`, itemError.message);
                // Continue with other items
              }
            }
            if (individualQuotes.length > 0) {
              console.log(`[Pricing] Got ${individualQuotes.length} quote(s) from individual item requests`);
              // Combine individual quotes into a single combined quote
              // Group by shipping method and sum costs
              const quotesByMethod = new Map<string, any[]>();
              individualQuotes.forEach(quote => {
                const method = quote.shipmentMethod || 'Standard';
                if (!quotesByMethod.has(method)) {
                  quotesByMethod.set(method, []);
                }
                quotesByMethod.get(method)!.push(quote);
              });
              
              // Create combined quotes for each shipping method
              const combinedQuotes: any[] = [];
              quotesByMethod.forEach((quotes, method) => {
                // Sum item costs and shipping costs
                let totalItemsCost = 0;
                let totalShippingCost = 0;
                const allItems: any[] = [];
                let currency = 'USD';
                
                quotes.forEach(quote => {
                  const itemsCost = parseFloat(quote.costSummary?.items?.amount || '0');
                  const shippingCost = parseFloat(quote.costSummary?.shipping?.amount || '0');
                  totalItemsCost += itemsCost;
                  totalShippingCost += shippingCost; // Sum shipping (Prodigi may charge per item)
                  currency = quote.costSummary?.items?.currency || currency;
                  if (quote.items && quote.items.length > 0) {
                    allItems.push(...quote.items);
                  }
                });
                
                // Create combined quote structure
                const combinedQuote = {
                  shipmentMethod: method,
                  costSummary: {
                    items: {
                      amount: totalItemsCost.toFixed(2),
                      currency: currency,
                    },
                    shipping: {
                      amount: totalShippingCost.toFixed(2),
                      currency: currency,
                    },
                    totalCost: {
                      amount: (totalItemsCost + totalShippingCost).toFixed(2),
                      currency: currency,
                    },
                  },
                  items: allItems,
                  shipments: quotes[0]?.shipments || [],
                };
                
                combinedQuotes.push(combinedQuote);
                console.log(`[Pricing] Combined ${quotes.length} individual quotes for ${method}: items=$${totalItemsCost.toFixed(2)}, shipping=$${totalShippingCost.toFixed(2)}`);
              });
              
              allQuotes = combinedQuotes;
            } else {
              throw createError; // Re-throw original error if individual quotes also fail
            }
          } catch (individualError: any) {
            console.error('[Pricing] Individual item quotes also failed:', individualError);
            throw createError; // Re-throw original error
          }
        }
      }

      if (!allQuotes || allQuotes.length === 0) {
        throw new PricingError(
          `No quotes available for destination: ${destinationCountry}. This may be due to invalid SKUs, incompatible attributes, or Prodigi service issues.`
        );
      }

      // Find quote matching the requested shipping method (case-insensitive)
      const quote = allQuotes.find(
        (q) => q.shipmentMethod?.toLowerCase() === shippingMethod.toLowerCase()
      ) || allQuotes.find(
        (q) => q.shipmentMethod === 'Standard'
      ) || allQuotes[0]; // Fallback to first available

      if (!quote) {
        throw new PricingError(
          `No quote available for destination: ${destinationCountry}`
        );
      }

      // Extract costs from Prodigi quote
      const itemsCost = parseFloat(quote.costSummary.items?.amount || '0');
      const shippingCost = parseFloat(
        quote.costSummary.shipping?.amount || '0'
      );
      const quoteCurrency = quote.costSummary.items?.currency || 'USD';

      // Build per-item price map from quote.items[].unitCost
      const itemPrices = new Map<number, number>();
      if (quote.items && quote.items.length > 0) {
        // Create a map: quote key -> unit cost
        // Match by SKU and normalized attributes
        const quoteKeyToUnitCost = new Map<string, number>();
        quote.items.forEach((quoteItem: {
          id: string;
          sku: string;
          copies: number;
          unitCost?: { amount: string; currency: string };
          attributes?: Record<string, string>;
          assets: Array<{ printArea: string }>;
        }) => {
          // Normalize attributes for matching (same normalization function as when building quote items)
          const quoteKey = generateQuoteKey(quoteItem.sku, quoteItem.attributes);
          const unitCost = parseFloat(quoteItem.unitCost?.amount || '0');
          quoteKeyToUnitCost.set(quoteKey, unitCost);
          console.log(`[Pricing] Mapped quote item to unit cost: ${quoteKey} = ${unitCost}`);
        });

        // Map cart items to their unit costs
        items.forEach((item, cartIndex) => {
          const quoteKey = cartItemToQuoteKey.get(cartIndex);
          if (quoteKey && quoteKeyToUnitCost.has(quoteKey)) {
            const unitCost = quoteKeyToUnitCost.get(quoteKey)!;
            itemPrices.set(cartIndex, unitCost);
            console.log(`[Pricing] Mapped cart item ${cartIndex} to unit cost: ${unitCost} (quoteKey: ${quoteKey})`);
          } else {
            // Fallback: if we can't find exact match, try to find by SKU only (for items with no attributes)
            // This handles cases where Prodigi returns items without attributes even though we sent some
            const baseSku = this.extractBaseSku(item.sku).toLowerCase();
            let foundMatch = false;
            
            // Try to find a match by SKU only (if no attributes in quote response)
            for (const [key, cost] of quoteKeyToUnitCost.entries()) {
              if (key.startsWith(`${baseSku}:{}`) || key.startsWith(`${baseSku}:`)) {
                // Check if this is a match (either no attributes or attributes match)
                const keyAttrs = key.substring(baseSku.length + 1);
                if (keyAttrs === '{}' || keyAttrs === quoteKey?.substring(baseSku.length + 1)) {
                  itemPrices.set(cartIndex, cost);
                  console.warn(`[Pricing] Mapped cart item ${cartIndex} to unit cost using fallback match: ${cost} (quoteKey: ${key})`);
                  foundMatch = true;
                  break;
                }
              }
            }
            
            if (!foundMatch) {
              // Last resort: calculate average price per item from quote
              // This should rarely happen if matching logic is correct
              const totalItemCost = Array.from(quoteKeyToUnitCost.values()).reduce((sum: number, cost: number) => sum + cost, 0);
              const totalCopies = quote.items.reduce((sum: number, item: { copies: number }) => sum + item.copies, 0);
              const avgPrice = totalCopies > 0 ? totalItemCost / totalCopies : 0;
              
              // Only use average if we have valid quotes, otherwise throw error
              if (avgPrice > 0) {
                itemPrices.set(cartIndex, avgPrice);
                console.error(`[Pricing] Could not find exact match for cart item ${cartIndex} (quoteKey: ${quoteKey}), using average: ${avgPrice}. This may indicate an attribute mismatch.`);
              } else {
                // This is a critical error - we should not proceed with $0 price
                throw new PricingError(
                  `Failed to match cart item ${cartIndex} to quote response. QuoteKey: ${quoteKey}, Available keys: ${Array.from(quoteKeyToUnitCost.keys()).join(', ')}`,
                  { cartIndex, quoteKey, availableKeys: Array.from(quoteKeyToUnitCost.keys()) }
                );
              }
            }
          }
        });
      }

      // Calculate tax (simplified - in production, use proper tax service)
      const taxRate = this.getTaxRate(destinationCountry);
      const taxAmount = itemsCost * taxRate;

      const originalTotal = itemsCost + shippingCost + taxAmount;

      // Convert to target currency if needed
      const targetCurrency = currency || quoteCurrency.toLowerCase();
      let subtotal = itemsCost;
      let shipping = shippingCost;
      let tax = taxAmount;
      let total = originalTotal;
      let exchangeRate: number | undefined;

      if (targetCurrency !== quoteCurrency.toLowerCase()) {
        // Convert from quote currency (usually USD) to target currency
        if (quoteCurrency.toUpperCase() === 'USD') {
          subtotal = await this.currencyService.convertFromUSD(
            itemsCost,
            targetCurrency
          );
          shipping = await this.currencyService.convertFromUSD(
            shippingCost,
            targetCurrency
          );
          tax = await this.currencyService.convertFromUSD(
            taxAmount,
            targetCurrency
          );
        } else {
          // Convert between non-USD currencies
          subtotal = await this.currencyService.convert(
            itemsCost,
            quoteCurrency,
            targetCurrency.toUpperCase()
          );
          shipping = await this.currencyService.convert(
            shippingCost,
            quoteCurrency,
            targetCurrency.toUpperCase()
          );
          tax = await this.currencyService.convert(
            taxAmount,
            quoteCurrency,
            targetCurrency.toUpperCase()
          );
        }
        total = subtotal + shipping + tax;
        // Calculate exchange rate for display
        exchangeRate = total / originalTotal;
      }

      // Convert per-item prices if currency conversion happened
      const convertedItemPrices = new Map<number, number>();
      if (itemPrices.size > 0 && targetCurrency !== quoteCurrency.toLowerCase()) {
        for (const [cartIndex, unitCost] of itemPrices.entries()) {
          let convertedPrice = unitCost;
          if (quoteCurrency.toUpperCase() === 'USD') {
            convertedPrice = await this.currencyService.convertFromUSD(
              unitCost,
              targetCurrency
            );
          } else {
            convertedPrice = await this.currencyService.convert(
              unitCost,
              quoteCurrency,
              targetCurrency.toUpperCase()
            );
          }
          convertedItemPrices.set(cartIndex, Math.round(convertedPrice * 100) / 100);
        }
      } else {
        // No conversion needed, just round the prices
        for (const [cartIndex, unitCost] of itemPrices.entries()) {
          convertedItemPrices.set(cartIndex, Math.round(unitCost * 100) / 100);
        }
      }

      return {
        subtotal: Math.round(subtotal * 100) / 100,
        shipping: Math.round(shipping * 100) / 100,
        tax: Math.round(tax * 100) / 100,
        total: Math.round(total * 100) / 100,
        currency: targetCurrency,
        originalCurrency: quoteCurrency,
        originalTotal: Math.round(originalTotal * 100) / 100,
        exchangeRate,
        estimatedDays: this.estimateDeliveryDays(quote.shipmentMethod),
        itemPrices: convertedItemPrices.size > 0 ? convertedItemPrices : undefined,
      };
    } catch (error) {
      if (error instanceof PricingError) {
        throw error;
      }
      throw new PricingError(
        'Failed to calculate pricing',
        { originalError: error }
      );
    }
  }

  /**
   * Get all available shipping options with costs
   */
  async getShippingOptions(
    items: CartItem[],
    destinationCountry: string
  ): Promise<ShippingOption[]> {
    try {
      const quoteItems: QuoteItem[] = await Promise.all(
        items.map(async (item) => {
          // Extract base SKU (remove image ID suffix if present)
          const baseSku = this.extractBaseSku(item.sku);
          
          // For quotes, assets only need printArea (not url - that's only for orders)
          return {
            sku: baseSku,
            copies: item.quantity,
            attributes: await this.buildAttributes(item.frameConfig, baseSku),
            assets: [{
              printArea: 'Default',
            }],
          };
        })
      );

      // Get quotes for all shipping methods (use Standard as default, API returns all methods)
      const quotes = await this.quotesAPI.create({
        destinationCountryCode: destinationCountry,
        items: quoteItems,
        shippingMethod: 'Standard', // API returns all methods regardless
      });

      return quotes.map((quote) => ({
        method: quote.shipmentMethod as ShippingMethod,
        cost: parseFloat(quote.costSummary.shipping?.amount || '0'),
        currency: quote.costSummary.shipping?.currency || 'USD',
        estimatedDays: this.estimateDeliveryDays(quote.shipmentMethod),
        serviceName: quote.shipmentMethod,
      }));
    } catch (error) {
      throw new PricingError('Failed to get shipping options', {
        originalError: error,
      });
    }
  }

  /**
   * Get recommended shipping method
   */
  getRecommendedMethod(options: ShippingOption[]): ShippingMethod {
    if (options.length === 0) {
      return 'Standard';
    }

    // Prefer Standard if available, otherwise choose cheapest
    const standard = options.find((o) => o.method === 'Standard');
    if (standard) {
      return 'Standard';
    }

    // Return cheapest option
    return options.reduce((cheapest, current) =>
      current.cost < cheapest.cost ? current : cheapest
    ).method;
  }

  /**
   * Validate prices with Prodigi
   */
  async validatePrices(
    items: CartItem[],
    destinationCountry: string
  ): Promise<PriceValidationResult> {
    const mismatches: PriceValidationResult['mismatches'] = [];

    try {
      for (const item of items) {
        const baseSku = this.extractBaseSku(item.sku);
        const quoteItems: QuoteItem[] = [
          {
            sku: baseSku,
            copies: item.quantity,
            attributes: await this.buildAttributes(item.frameConfig, baseSku),
            assets: [{ printArea: 'default' }],
          },
        ];

        const quotes = await this.quotesAPI.create({
          destinationCountryCode: destinationCountry,
          items: quoteItems,
          shippingMethod: 'Standard', // API returns all methods regardless
        });

        if (quotes.length > 0) {
          const quote = quotes[0];
          const quotedPrice = parseFloat(
            quote.costSummary.items?.amount || '0'
          );
          const perItemQuotedPrice = quotedPrice / item.quantity;
          const catalogPrice = item.originalPrice;

          const difference = Math.abs(perItemQuotedPrice - catalogPrice);
          const percentDifference =
            (difference / catalogPrice) * 100;

          if (percentDifference > 5) {
            mismatches.push({
              itemId: item.id,
              sku: item.sku,
              catalogPrice,
              quotedPrice: perItemQuotedPrice,
              difference,
              percentDifference,
            });
          }
        }
      }

      return {
        isValid: mismatches.length === 0,
        mismatches,
      };
    } catch (error) {
      throw new PricingError('Failed to validate prices', {
        originalError: error,
      });
    }
  }

  /**
   * Build Prodigi attributes from frame config
   * Uses heuristic approach since we don't have product API access here
   */
  private async buildAttributes(frameConfig: CartItem['frameConfig'], sku?: string): Promise<Record<string, string>> {
    // Handle undefined frameConfig
    if (!frameConfig) {
      console.warn('[Pricing] buildAttributes: frameConfig is undefined, returning empty attributes');
      return {};
    }

    // Try to fetch product details to get valid attributes
    if (sku) {
      try {
        const product = await this.productsAPI.get(sku);
        if (product && product.attributes) {
          console.log(`[Pricing] Fetched product details for ${sku}, using valid attributes`);
          // Use product's valid attributes to build correct attributes
          return buildProdigiAttributes(
            {
              frameColor: frameConfig.color,
              wrap: frameConfig.wrap,
              glaze: frameConfig.glaze,
              mount: frameConfig.mount,
              mountColor: frameConfig.mountColor,
              paperType: frameConfig.paperType,
              finish: frameConfig.finish,
              edge: frameConfig.edge,
              frameStyle: frameConfig.style,
            },
            {
              validAttributes: product.attributes,
              sku,
            }
          );
        }
      } catch (error: any) {
        console.warn(`[Pricing] Failed to fetch product details for ${sku}, using heuristic:`, error.message);
      }
    }

    // Fallback to heuristic approach if product fetch fails or no SKU
    return buildProdigiAttributesHeuristic(
      {
        frameColor: frameConfig.color,
        wrap: frameConfig.wrap,
        glaze: frameConfig.glaze,
        mount: frameConfig.mount,
        mountColor: frameConfig.mountColor,
        paperType: frameConfig.paperType,
        finish: frameConfig.finish,
        edge: frameConfig.edge,
        frameStyle: frameConfig.style,
      },
      sku
    );
  }

  /**
   * Estimate delivery days based on shipping method
   */
  private estimateDeliveryDays(shippingMethod: ShippingMethod): number {
    const estimates: Record<ShippingMethod, number> = {
      Budget: 12,
      Standard: 6,
      Express: 3,
      Overnight: 1,
    };
    return estimates[shippingMethod] || 7;
  }

  /**
   * Get tax rate for country (simplified)
   * In production, use a proper tax service
   */
  private getTaxRate(country: string): number {
    // Simplified tax rates - in production, use proper tax calculation
    const taxRates: Record<string, number> = {
      US: 0.08, // Average US sales tax
      CA: 0.13, // Average Canadian tax
      GB: 0.20, // UK VAT
      AU: 0.10, // Australian GST
      DE: 0.19, // German VAT
      FR: 0.20, // French VAT
      IT: 0.22, // Italian VAT
      ES: 0.21, // Spanish VAT
    };

    return taxRates[country.toUpperCase()] || 0.0;
  }
}

