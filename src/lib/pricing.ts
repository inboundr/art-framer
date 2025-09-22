/**
 * Pricing utilities and calculations for the Art Framer application
 * Provides robust pricing calculations with validation, error handling, and testing support
 */

import { z } from 'zod';

// Validation schemas
export const PricingItemSchema = z.object({
  id: z.string().uuid(),
  sku: z.string().min(1),
  price: z.number().min(0),
  quantity: z.number().int().min(1),
  name: z.string().optional(),
  category: z.string().optional(),
});

export const ShippingAddressSchema = z.object({
  countryCode: z.string().min(2).max(2),
  stateOrCounty: z.string().optional(),
  postalCode: z.string().optional(),
  city: z.string().optional(),
});

export const TaxConfigSchema = z.object({
  rate: z.number().min(0).max(1), // 0 to 100% (as decimal)
  region: z.string().optional(),
  exemptions: z.array(z.string()).optional(),
});

// Types
export type PricingItem = z.infer<typeof PricingItemSchema>;
export type ShippingAddress = z.infer<typeof ShippingAddressSchema>;
export type TaxConfig = z.infer<typeof TaxConfigSchema>;

export interface PricingResult {
  subtotal: number;
  taxAmount: number;
  shippingAmount: number;
  discountAmount: number;
  total: number;
  itemCount: number;
  currency: string;
  breakdown: {
    items: Array<{
      id: string;
      name: string;
      price: number;
      quantity: number;
      lineTotal: number;
    }>;
    taxes: Array<{
      type: string;
      rate: number;
      amount: number;
      description: string;
    }>;
    shipping: {
      cost: number;
      method: string;
      estimatedDays: number;
      carrier: string;
    } | null;
    discounts: Array<{
      code: string;
      amount: number;
      type: 'percentage' | 'fixed';
      description: string;
    }>;
  };
}

export interface ShippingResult {
  cost: number;
  currency: string;
  estimatedDays: number;
  serviceName: string;
  carrier: string;
  trackingAvailable: boolean;
}

// Constants
export const DEFAULT_TAX_RATE = 0.08; // 8%
export const DEFAULT_CURRENCY = 'USD';
export const MAX_SHIPPING_COST = 999.99;
export const MIN_FREE_SHIPPING_THRESHOLD = 100.00;

// Error classes
export class PricingError extends Error {
  constructor(message: string, public code: string, public details?: any) {
    super(message);
    this.name = 'PricingError';
  }
}

export class ShippingCalculationError extends PricingError {
  constructor(message: string, details?: any) {
    super(message, 'SHIPPING_CALCULATION_ERROR', details);
    this.name = 'ShippingCalculationError';
  }
}

export class TaxCalculationError extends PricingError {
  constructor(message: string, details?: any) {
    super(message, 'TAX_CALCULATION_ERROR', details);
    this.name = 'TaxCalculationError';
  }
}

/**
 * Core pricing calculation class with robust error handling and validation
 */
export class PricingCalculator {
  private taxConfig: TaxConfig;
  private currency: string;

  constructor(taxConfig: TaxConfig = { rate: DEFAULT_TAX_RATE }, currency: string = DEFAULT_CURRENCY) {
    this.taxConfig = TaxConfigSchema.parse(taxConfig);
    this.currency = currency;
  }

  /**
   * Calculate subtotal from items with validation
   */
  calculateSubtotal(items: PricingItem[]): number {
    try {
      if (!items || items.length === 0) {
        return 0;
      }

      // Validate all items
      const validatedItems = items.map(item => PricingItemSchema.parse(item));

      const subtotal = validatedItems.reduce((sum, item) => {
        const lineTotal = item.price * item.quantity;
        
        // Validate line total is reasonable
        if (lineTotal < 0 || lineTotal > 999999.99) {
          throw new PricingError(
            `Invalid line total for item ${item.id}: ${lineTotal}`,
            'INVALID_LINE_TOTAL',
            { item, lineTotal }
          );
        }
        
        return sum + lineTotal;
      }, 0);

      // Round to 2 decimal places to avoid floating point issues
      return Math.round(subtotal * 100) / 100;
    } catch (error) {
      if (error instanceof PricingError) {
        throw error;
      }
      throw new PricingError(
        'Failed to calculate subtotal',
        'SUBTOTAL_CALCULATION_ERROR',
        { error: error instanceof Error ? error.message : error, items }
      );
    }
  }

  /**
   * Calculate tax amount with robust validation
   */
  calculateTax(subtotal: number, shippingAmount: number = 0): number {
    try {
      if (subtotal < 0) {
        throw new TaxCalculationError('Subtotal cannot be negative', { subtotal });
      }

      if (shippingAmount < 0) {
        throw new TaxCalculationError('Shipping amount cannot be negative', { shippingAmount });
      }

      // Some regions tax shipping, others don't - configurable
      const taxableAmount = subtotal; // For now, don't tax shipping
      const taxAmount = taxableAmount * this.taxConfig.rate;

      // Round to 2 decimal places
      return Math.round(taxAmount * 100) / 100;
    } catch (error) {
      if (error instanceof TaxCalculationError) {
        throw error;
      }
      throw new TaxCalculationError(
        'Failed to calculate tax',
        { error: error instanceof Error ? error.message : error, subtotal, shippingAmount }
      );
    }
  }

  /**
   * Validate shipping address with comprehensive checks
   */
  validateShippingAddress(address: ShippingAddress): boolean {
    try {
      ShippingAddressSchema.parse(address);
      
      // Additional business logic validation
      if (address.countryCode === 'US' && !address.postalCode) {
        throw new ShippingCalculationError('Postal code required for US addresses', { address });
      }

      // Validate country code format
      if (!/^[A-Z]{2}$/.test(address.countryCode)) {
        throw new ShippingCalculationError('Invalid country code format', { address });
      }

      return true;
    } catch (error) {
      if (error instanceof ShippingCalculationError) {
        throw error;
      }
      throw new ShippingCalculationError(
        'Invalid shipping address',
        { error: error instanceof Error ? error.message : error, address }
      );
    }
  }

  /**
   * Calculate comprehensive pricing with full breakdown
   */
  calculateTotal(
    items: PricingItem[],
    shippingResult: ShippingResult | null = null,
    discountAmount: number = 0
  ): PricingResult {
    try {
      // Validate inputs
      if (!Array.isArray(items)) {
        throw new PricingError('Items must be an array', 'INVALID_ITEMS');
      }

      if (discountAmount < 0) {
        throw new PricingError('Discount amount cannot be negative', 'INVALID_DISCOUNT');
      }

      // Calculate subtotal
      const subtotal = this.calculateSubtotal(items);
      
      // Calculate shipping
      const shippingAmount = shippingResult?.cost || 0;
      
      // Validate shipping cost
      if (shippingAmount < 0 || shippingAmount > MAX_SHIPPING_COST) {
        throw new ShippingCalculationError(
          `Invalid shipping cost: ${shippingAmount}`,
          { shippingAmount, maxAllowed: MAX_SHIPPING_COST }
        );
      }

      // Calculate tax
      const taxAmount = this.calculateTax(subtotal, shippingAmount);

      // Apply discount (validate it doesn't exceed subtotal)
      const validDiscountAmount = Math.min(discountAmount, subtotal);

      // Calculate final total
      const total = Math.max(0, subtotal - validDiscountAmount + taxAmount + shippingAmount);

      // Calculate item count
      const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

      // Build detailed breakdown
      const breakdown = {
        items: items.map(item => ({
          id: item.id,
          name: item.name || `Item ${item.sku}`,
          price: item.price,
          quantity: item.quantity,
          lineTotal: Math.round(item.price * item.quantity * 100) / 100,
        })),
        taxes: [{
          type: 'sales_tax',
          rate: this.taxConfig.rate,
          amount: taxAmount,
          description: `Sales Tax (${(this.taxConfig.rate * 100).toFixed(1)}%)`,
        }],
        shipping: shippingResult ? {
          cost: shippingResult.cost,
          method: shippingResult.serviceName,
          estimatedDays: shippingResult.estimatedDays,
          carrier: shippingResult.carrier,
        } : null,
        discounts: validDiscountAmount > 0 ? [{
          code: 'APPLIED_DISCOUNT',
          amount: validDiscountAmount,
          type: 'fixed' as const,
          description: 'Applied Discount',
        }] : [],
      };

      return {
        subtotal: Math.round(subtotal * 100) / 100,
        taxAmount: Math.round(taxAmount * 100) / 100,
        shippingAmount: Math.round(shippingAmount * 100) / 100,
        discountAmount: Math.round(validDiscountAmount * 100) / 100,
        total: Math.round(total * 100) / 100,
        itemCount,
        currency: this.currency,
        breakdown,
      };
    } catch (error) {
      if (error instanceof PricingError) {
        throw error;
      }
      throw new PricingError(
        'Failed to calculate total pricing',
        'TOTAL_CALCULATION_ERROR',
        { error: error instanceof Error ? error.message : error, items, shippingResult, discountAmount }
      );
    }
  }

  /**
   * Check if order qualifies for free shipping
   */
  qualifiesForFreeShipping(subtotal: number, threshold: number = MIN_FREE_SHIPPING_THRESHOLD): boolean {
    return subtotal >= threshold;
  }

  /**
   * Format price for display
   */
  formatPrice(amount: number, currency: string = this.currency): string {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch (error) {
      // Fallback formatting
      return `$${amount.toFixed(2)}`;
    }
  }

  /**
   * Validate pricing result for reasonableness
   */
  validatePricingResult(result: PricingResult): boolean {
    const { subtotal, taxAmount, shippingAmount, discountAmount, total } = result;

    // Basic validation
    if (subtotal < 0 || taxAmount < 0 || shippingAmount < 0 || discountAmount < 0 || total < 0) {
      throw new PricingError('Pricing amounts cannot be negative', 'NEGATIVE_AMOUNTS');
    }

    // Logical validation
    const calculatedTotal = subtotal - discountAmount + taxAmount + shippingAmount;
    const totalDifference = Math.abs(total - calculatedTotal);
    
    if (totalDifference > 0.01) { // Allow for small rounding differences
      throw new PricingError(
        'Total calculation mismatch',
        'CALCULATION_MISMATCH',
        { expected: calculatedTotal, actual: total, difference: totalDifference }
      );
    }

    return true;
  }
}

// Default singleton instance
export const defaultPricingCalculator = new PricingCalculator();

// Utility functions
export function createPricingCalculator(taxRate: number = DEFAULT_TAX_RATE, currency: string = DEFAULT_CURRENCY): PricingCalculator {
  return new PricingCalculator({ rate: taxRate }, currency);
}

export function isValidPricingItem(item: any): item is PricingItem {
  try {
    PricingItemSchema.parse(item);
    return true;
  } catch {
    return false;
  }
}

export function isValidShippingAddress(address: any): address is ShippingAddress {
  try {
    ShippingAddressSchema.parse(address);
    return true;
  } catch {
    return false;
  }
}
