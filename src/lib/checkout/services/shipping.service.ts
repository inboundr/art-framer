/**
 * Shipping Service for V2 Checkout
 * 
 * Handles shipping calculations and address validation
 */

import { ProdigiClient } from '@/lib/prodigi-v2/client';
import { QuotesAPI } from '@/lib/prodigi-v2/quotes';
import { ShippingError } from '../types/errors';
import { buildProdigiAttributesHeuristic } from '../utils/attribute-builder';
import type { ShippingAddress, ShippingMethod } from '../types/order.types';
import type { CartItem } from '../types/cart.types';
import type { ShippingOption } from './pricing.service';
import type { QuoteItem } from '@/lib/prodigi-v2/types';

export interface AddressValidationResult {
  valid: boolean;
  address?: ShippingAddress;
  errors: string[];
  suggestions?: ShippingAddress[];
}

export class ShippingService {
  private quotesAPI: QuotesAPI;

  constructor(private prodigiClient: ProdigiClient) {
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
   * Calculate shipping for all methods
   */
  async calculateShipping(
    items: CartItem[],
    address: ShippingAddress
  ): Promise<ShippingOption[]>;

  /**
   * Calculate shipping for a specific method
   */
  async calculateShipping(
    items: CartItem[],
    address: ShippingAddress,
    shippingMethod: string
  ): Promise<ShippingOption>;

  async calculateShipping(
    items: CartItem[],
    address: ShippingAddress,
    shippingMethod?: string
  ): Promise<ShippingOption[] | ShippingOption> {
    try {
      const quoteItems: QuoteItem[] = items.map((item) => {
        // Extract base SKU (remove image ID suffix if present)
        // Prodigi API only accepts base SKUs, not SKUs with image ID suffixes
        const baseSku = this.extractBaseSku(item.sku);
        
        // For quotes, assets only need printArea (not url - that's only for orders)
        return {
          sku: baseSku,
          copies: item.quantity,
          attributes: this.buildAttributes(item.frameConfig, baseSku),
          assets: [{
            printArea: 'default',
          }],
        };
      });

      // Get quotes for all shipping methods
      let quotes;
      try {
        quotes = await this.quotesAPI.compareShippingMethods(
          address.country,
          quoteItems
        );
        console.log(`[Shipping] Got ${quotes?.length || 0} quotes from compareShippingMethods`);
      } catch (error: any) {
        console.log(`[Shipping] compareShippingMethods failed, trying direct create:`, error.message);
        // If compareShippingMethods fails, try getting quotes directly
        quotes = await this.quotesAPI.create({
          destinationCountryCode: address.country,
          items: quoteItems,
          shippingMethod: 'Standard',
        });
        console.log(`[Shipping] Got ${quotes?.length || 0} quotes from direct create`);
      }

      if (!quotes || quotes.length === 0) {
        console.error(`[Shipping] No quotes returned. Items:`, JSON.stringify(quoteItems, null, 2));
        throw new ShippingError('No shipping quotes available from Prodigi');
      }

      // If specific method requested, return single option
      if (shippingMethod) {
        const requestedQuote = quotes.find(
          (q) => q.shipmentMethod?.toLowerCase() === shippingMethod.toLowerCase()
        ) || quotes.find(
          (q) => q.shipmentMethod === 'Standard'
        ) || quotes[0];

        if (!requestedQuote) {
          throw new ShippingError('No shipping quotes available');
        }

        return {
          method: (requestedQuote.shipmentMethod || 'Standard') as ShippingOption['method'],
          cost: parseFloat(requestedQuote.costSummary?.shipping?.amount || '0'),
          currency: requestedQuote.costSummary?.shipping?.currency || 'USD',
          estimatedDays: this.estimateDeliveryDays(requestedQuote.shipmentMethod || 'Standard'),
          serviceName: requestedQuote.shipmentMethod || 'Standard',
        };
      }

      // Return all options
      return quotes.map((quote) => ({
        method: (quote.shipmentMethod || 'Standard') as ShippingOption['method'],
        cost: parseFloat(quote.costSummary?.shipping?.amount || '0'),
        currency: quote.costSummary?.shipping?.currency || 'USD',
        estimatedDays: this.estimateDeliveryDays(quote.shipmentMethod || 'Standard'),
        serviceName: quote.shipmentMethod || 'Standard',
      }));
    } catch (error) {
      throw new ShippingError('Failed to calculate shipping', {
        originalError: error,
      });
    }
  }

  /**
   * Get recommended shipping method
   */
  getRecommendedMethod(options: ShippingOption[]): ShippingOption['method'] {
    if (options.length === 0) {
      return 'Standard';
    }

    // Prefer Standard if available
    const standard = options.find((o) => o.method === 'Standard');
    if (standard) {
      return 'Standard';
    }

    // Otherwise choose cheapest
    return options.reduce((cheapest, current) =>
      current.cost < cheapest.cost ? current : cheapest
    ).method;
  }

  /**
   * Validate address for shipping
   */
  async validateAddress(address: ShippingAddress): Promise<AddressValidationResult> {
    const errors: string[] = [];

    // Basic validation
    if (!address.address1 || address.address1.trim().length < 3) {
      errors.push('Street address is required');
    }

    if (!address.city || address.city.trim().length < 2) {
      errors.push('City is required');
    }

    if (!address.country || address.country.length !== 2) {
      errors.push('Country code is required (2 characters)');
    }

    // ZIP code validation for countries that require it
    const countriesRequiringZip = [
      'US',
      'CA',
      'GB',
      'AU',
      'DE',
      'FR',
      'IT',
      'ES',
      'NL',
      'BE',
      'AT',
      'PT',
    ];
    if (countriesRequiringZip.includes(address.country.toUpperCase())) {
      if (!address.zip || address.zip.trim().length < 3) {
        errors.push('ZIP/Postal code is required for this country');
      }
    }

    // State validation for countries that require it
    const countriesRequiringState = ['US', 'CA', 'AU'];
    if (countriesRequiringState.includes(address.country.toUpperCase())) {
      if (!address.state || address.state.trim().length < 2) {
        errors.push('State/Province is required for this country');
      }
    }

    return {
      valid: errors.length === 0,
      address: errors.length === 0 ? address : undefined,
      errors,
    };
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
   * Build Prodigi attributes from frame config
   * Uses heuristic approach since we don't have product API access here
   */
  private buildAttributes(frameConfig: CartItem['frameConfig'], sku?: string): Record<string, string> {
    // Handle undefined frameConfig
    if (!frameConfig) {
      console.warn('[Shipping] buildAttributes: frameConfig is undefined, returning empty attributes');
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
}

