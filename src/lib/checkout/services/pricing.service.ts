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
import { CurrencyService } from '@/lib/currency';
import { PricingError } from '../types/errors';
import { buildProdigiAttributesHeuristic } from '../utils/attribute-builder';
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

  constructor(
    private prodigiClient: ProdigiClient,
    private currencyService: CurrencyService
  ) {
    this.quotesAPI = new QuotesAPI(prodigiClient);
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
      const quoteItemsMap = new Map<string, QuoteItem>();
      
      items.forEach((item) => {
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
        
        const attributes = this.buildAttributes(item.frameConfig, baseSku);
        
        // Log what we're processing for debugging
        console.log('[Pricing] Quote item:', {
          sku: baseSku,
          copies: item.quantity,
          attributes,
          frameConfig: item.frameConfig,
        });
        
        // For quotes, assets only need printArea (not url - that's only for orders)
        // Prodigi expects lowercase 'default' for printArea
        // Also filter out undefined values from attributes
        const cleanAttributes: Record<string, string> = {};
        Object.entries(attributes).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            cleanAttributes[key] = String(value).trim();
          }
        });
        
        // Create a unique key for this SKU + attributes combination
        // Items with the same base SKU and attributes should be combined
        const attributesKey = JSON.stringify(cleanAttributes);
        const uniqueKey = `${baseSku}:${attributesKey}`;
        
        // Combine items with the same SKU and attributes
        if (quoteItemsMap.has(uniqueKey)) {
          const existing = quoteItemsMap.get(uniqueKey)!;
          existing.copies += item.quantity;
          console.log(`[Pricing] Combined item with existing: ${uniqueKey}, total copies: ${existing.copies}`);
        } else {
          // Build the quote item
          const quoteItem: QuoteItem = {
            sku: baseSku,
            copies: item.quantity,
            assets: [{
              printArea: 'default', // Use lowercase 'default' as per Prodigi API
            }],
          };
          
          // Only include attributes if we have any (Prodigi may reject empty attributes object)
          if (Object.keys(cleanAttributes).length > 0) {
            quoteItem.attributes = cleanAttributes;
          }
          
          quoteItemsMap.set(uniqueKey, quoteItem);
        }
      });
      
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
          throw createError;
        }
      }

      if (!allQuotes || allQuotes.length === 0) {
        throw new PricingError(
          `No quotes available for destination: ${destinationCountry}`
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
      const quoteItems: QuoteItem[] = items.map((item) => {
        // Extract base SKU (remove image ID suffix if present)
        const baseSku = this.extractBaseSku(item.sku);
        
        // For quotes, assets only need printArea (not url - that's only for orders)
        return {
          sku: baseSku,
          copies: item.quantity,
          attributes: this.buildAttributes(item.frameConfig),
          assets: [{
            printArea: 'Default',
          }],
        };
      });

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
        const quoteItems: QuoteItem[] = [
          {
            sku: this.extractBaseSku(item.sku),
            copies: item.quantity,
            attributes: this.buildAttributes(item.frameConfig),
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
  private buildAttributes(frameConfig: CartItem['frameConfig'], sku?: string): Record<string, string> {
    // Handle undefined frameConfig
    if (!frameConfig) {
      console.warn('[Pricing] buildAttributes: frameConfig is undefined, returning empty attributes');
      return {};
    }

    // Use unified attribute builder with heuristic approach
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

