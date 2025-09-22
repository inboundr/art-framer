/**
 * Comprehensive tests for pricing calculations
 * Tests edge cases, error handling, and validation
 */

import {
  PricingCalculator,
  PricingItem,
  ShippingAddress,
  ShippingResult,
  PricingError,
  ShippingCalculationError,
  TaxCalculationError,
  defaultPricingCalculator,
  createPricingCalculator,
  isValidPricingItem,
  isValidShippingAddress,
  DEFAULT_TAX_RATE,
  MIN_FREE_SHIPPING_THRESHOLD,
} from '../pricing';

describe('PricingCalculator', () => {
  let calculator: PricingCalculator;

  beforeEach(() => {
    calculator = new PricingCalculator();
  });

  describe('calculateSubtotal', () => {
    it('should calculate subtotal correctly for single item', () => {
      const items: PricingItem[] = [{
        id: '123e4567-e89b-12d3-a456-426614174000',
        sku: 'FRAME-001',
        price: 29.99,
        quantity: 1,
      }];

      const subtotal = calculator.calculateSubtotal(items);
      expect(subtotal).toBe(29.99);
    });

    it('should calculate subtotal correctly for multiple items', () => {
      const items: PricingItem[] = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          sku: 'FRAME-001',
          price: 29.99,
          quantity: 2,
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174001',
          sku: 'FRAME-002',
          price: 39.99,
          quantity: 1,
        },
      ];

      const subtotal = calculator.calculateSubtotal(items);
      expect(subtotal).toBe(99.97); // (29.99 * 2) + 39.99
    });

    it('should return 0 for empty items array', () => {
      const subtotal = calculator.calculateSubtotal([]);
      expect(subtotal).toBe(0);
    });

    it('should handle floating point precision correctly', () => {
      const items: PricingItem[] = [{
        id: '123e4567-e89b-12d3-a456-426614174000',
        sku: 'FRAME-001',
        price: 0.1,
        quantity: 3,
      }];

      const subtotal = calculator.calculateSubtotal(items);
      expect(subtotal).toBe(0.3);
    });

    it('should throw error for invalid item data', () => {
      const invalidItems = [{
        id: 'invalid-id',
        sku: 'FRAME-001',
        price: 29.99,
        quantity: 1,
      }] as PricingItem[];

      expect(() => calculator.calculateSubtotal(invalidItems)).toThrow(PricingError);
    });

    it('should throw error for negative prices', () => {
      const items: PricingItem[] = [{
        id: '123e4567-e89b-12d3-a456-426614174000',
        sku: 'FRAME-001',
        price: -10,
        quantity: 1,
      }];

      expect(() => calculator.calculateSubtotal(items)).toThrow(PricingError);
    });

    it('should throw error for zero quantity', () => {
      const items: PricingItem[] = [{
        id: '123e4567-e89b-12d3-a456-426614174000',
        sku: 'FRAME-001',
        price: 29.99,
        quantity: 0,
      }];

      expect(() => calculator.calculateSubtotal(items)).toThrow(PricingError);
    });

    it('should throw error for extremely high line totals', () => {
      const items: PricingItem[] = [{
        id: '123e4567-e89b-12d3-a456-426614174000',
        sku: 'FRAME-001',
        price: 999999.99,
        quantity: 2,
      }];

      expect(() => calculator.calculateSubtotal(items)).toThrow(PricingError);
    });
  });

  describe('calculateTax', () => {
    it('should calculate tax correctly with default rate', () => {
      const taxAmount = calculator.calculateTax(100);
      expect(taxAmount).toBe(8); // 8% of 100
    });

    it('should calculate tax correctly with custom rate', () => {
      const customCalculator = new PricingCalculator({ rate: 0.1 }); // 10%
      const taxAmount = customCalculator.calculateTax(100);
      expect(taxAmount).toBe(10);
    });

    it('should handle zero subtotal', () => {
      const taxAmount = calculator.calculateTax(0);
      expect(taxAmount).toBe(0);
    });

    it('should round tax amount correctly', () => {
      const taxAmount = calculator.calculateTax(33.33);
      expect(taxAmount).toBe(2.67); // Rounded to 2 decimal places
    });

    it('should throw error for negative subtotal', () => {
      expect(() => calculator.calculateTax(-10)).toThrow(TaxCalculationError);
    });

    it('should throw error for negative shipping amount', () => {
      expect(() => calculator.calculateTax(100, -5)).toThrow(TaxCalculationError);
    });
  });

  describe('validateShippingAddress', () => {
    it('should validate correct US address', () => {
      const address: ShippingAddress = {
        countryCode: 'US',
        stateOrCounty: 'CA',
        postalCode: '90210',
        city: 'Beverly Hills',
      };

      expect(calculator.validateShippingAddress(address)).toBe(true);
    });

    it('should validate international address without postal code', () => {
      const address: ShippingAddress = {
        countryCode: 'GB',
        stateOrCounty: 'London',
        city: 'London',
      };

      expect(calculator.validateShippingAddress(address)).toBe(true);
    });

    it('should throw error for US address without postal code', () => {
      const address: ShippingAddress = {
        countryCode: 'US',
        stateOrCounty: 'CA',
        city: 'Los Angeles',
      };

      expect(() => calculator.validateShippingAddress(address)).toThrow(ShippingCalculationError);
    });

    it('should throw error for invalid country code format', () => {
      const address: ShippingAddress = {
        countryCode: 'USA', // Should be 2 characters
        postalCode: '90210',
      };

      expect(() => calculator.validateShippingAddress(address)).toThrow(ShippingCalculationError);
    });

    it('should throw error for lowercase country code', () => {
      const address: ShippingAddress = {
        countryCode: 'us',
        postalCode: '90210',
      };

      expect(() => calculator.validateShippingAddress(address)).toThrow(ShippingCalculationError);
    });
  });

  describe('calculateTotal', () => {
    const sampleItems: PricingItem[] = [
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        sku: 'FRAME-001',
        price: 29.99,
        quantity: 1,
        name: 'Black Frame',
      },
      {
        id: '123e4567-e89b-12d3-a456-426614174001',
        sku: 'FRAME-002',
        price: 39.99,
        quantity: 2,
        name: 'White Frame',
      },
    ];

    const sampleShipping: ShippingResult = {
      cost: 9.99,
      currency: 'USD',
      estimatedDays: 5,
      serviceName: 'Standard Shipping',
      carrier: 'FedEx',
      trackingAvailable: true,
    };

    it('should calculate complete pricing correctly', () => {
      const result = calculator.calculateTotal(sampleItems, sampleShipping);

      expect(result.subtotal).toBe(109.97); // 29.99 + (39.99 * 2)
      expect(result.taxAmount).toBe(8.8); // 8% of 109.97, rounded
      expect(result.shippingAmount).toBe(9.99);
      expect(result.discountAmount).toBe(0);
      expect(result.total).toBe(128.76); // 109.97 + 8.8 + 9.99
      expect(result.itemCount).toBe(3); // 1 + 2
      expect(result.currency).toBe('USD');
    });

    it('should calculate pricing without shipping', () => {
      const result = calculator.calculateTotal(sampleItems, null);

      expect(result.subtotal).toBe(109.97);
      expect(result.taxAmount).toBe(8.8);
      expect(result.shippingAmount).toBe(0);
      expect(result.total).toBe(118.77); // 109.97 + 8.8
      expect(result.breakdown.shipping).toBeNull();
    });

    it('should apply discount correctly', () => {
      const result = calculator.calculateTotal(sampleItems, sampleShipping, 10);

      expect(result.subtotal).toBe(109.97);
      expect(result.discountAmount).toBe(10);
      expect(result.taxAmount).toBe(8.8); // Tax on original subtotal
      expect(result.total).toBe(118.76); // 109.97 - 10 + 8.8 + 9.99
    });

    it('should cap discount at subtotal amount', () => {
      const result = calculator.calculateTotal(sampleItems, sampleShipping, 200);

      expect(result.discountAmount).toBe(109.97); // Capped at subtotal
      expect(result.total).toBe(18.79); // 0 + 8.8 + 9.99
    });

    it('should include detailed breakdown', () => {
      const result = calculator.calculateTotal(sampleItems, sampleShipping, 5);

      expect(result.breakdown.items).toHaveLength(2);
      expect(result.breakdown.items[0]).toEqual({
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Black Frame',
        price: 29.99,
        quantity: 1,
        lineTotal: 29.99,
      });

      expect(result.breakdown.taxes).toHaveLength(1);
      expect(result.breakdown.taxes[0].rate).toBe(0.08);

      expect(result.breakdown.shipping).toEqual({
        cost: 9.99,
        method: 'Standard Shipping',
        estimatedDays: 5,
        carrier: 'FedEx',
      });

      expect(result.breakdown.discounts).toHaveLength(1);
      expect(result.breakdown.discounts[0].amount).toBe(5);
    });

    it('should throw error for invalid items input', () => {
      expect(() => calculator.calculateTotal('invalid' as any)).toThrow(PricingError);
    });

    it('should throw error for negative discount', () => {
      expect(() => calculator.calculateTotal(sampleItems, null, -10)).toThrow(PricingError);
    });

    it('should throw error for excessive shipping cost', () => {
      const expensiveShipping: ShippingResult = {
        ...sampleShipping,
        cost: 9999.99,
      };

      expect(() => calculator.calculateTotal(sampleItems, expensiveShipping)).toThrow(ShippingCalculationError);
    });
  });

  describe('qualifiesForFreeShipping', () => {
    it('should return true when subtotal meets threshold', () => {
      expect(calculator.qualifiesForFreeShipping(100)).toBe(true);
    });

    it('should return false when subtotal is below threshold', () => {
      expect(calculator.qualifiesForFreeShipping(99.99)).toBe(false);
    });

    it('should work with custom threshold', () => {
      expect(calculator.qualifiesForFreeShipping(50, 25)).toBe(true);
      expect(calculator.qualifiesForFreeShipping(20, 25)).toBe(false);
    });
  });

  describe('formatPrice', () => {
    it('should format price correctly in USD', () => {
      expect(calculator.formatPrice(29.99)).toBe('$29.99');
    });

    it('should format price correctly with different currency', () => {
      expect(calculator.formatPrice(29.99, 'EUR')).toBe('€29.99');
    });

    it('should handle zero price', () => {
      expect(calculator.formatPrice(0)).toBe('$0.00');
    });

    it('should handle large prices', () => {
      expect(calculator.formatPrice(1234.56)).toBe('$1,234.56');
    });

    it('should fallback gracefully for invalid currency', () => {
      expect(calculator.formatPrice(29.99, 'INVALID')).toBe('$29.99');
    });
  });

  describe('validatePricingResult', () => {
    it('should validate correct pricing result', () => {
      const result = calculator.calculateTotal([
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          sku: 'FRAME-001',
          price: 100,
          quantity: 1,
        },
      ]);

      expect(calculator.validatePricingResult(result)).toBe(true);
    });

    it('should throw error for negative amounts', () => {
      const invalidResult = {
        subtotal: -10,
        taxAmount: 0,
        shippingAmount: 0,
        discountAmount: 0,
        total: -10,
        itemCount: 1,
        currency: 'USD',
        breakdown: {
          items: [],
          taxes: [],
          shipping: null,
          discounts: [],
        },
      };

      expect(() => calculator.validatePricingResult(invalidResult)).toThrow(PricingError);
    });

    it('should throw error for calculation mismatch', () => {
      const invalidResult = {
        subtotal: 100,
        taxAmount: 8,
        shippingAmount: 10,
        discountAmount: 0,
        total: 200, // Should be 118
        itemCount: 1,
        currency: 'USD',
        breakdown: {
          items: [],
          taxes: [],
          shipping: null,
          discounts: [],
        },
      };

      expect(() => calculator.validatePricingResult(invalidResult)).toThrow(PricingError);
    });
  });
});

describe('Utility Functions', () => {
  describe('createPricingCalculator', () => {
    it('should create calculator with custom tax rate', () => {
      const calculator = createPricingCalculator(0.1);
      const taxAmount = calculator.calculateTax(100);
      expect(taxAmount).toBe(10);
    });

    it('should create calculator with custom currency', () => {
      const calculator = createPricingCalculator(0.08, 'EUR');
      const formatted = calculator.formatPrice(29.99);
      expect(formatted).toBe('€29.99');
    });
  });

  describe('isValidPricingItem', () => {
    it('should return true for valid item', () => {
      const item = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        sku: 'FRAME-001',
        price: 29.99,
        quantity: 1,
      };

      expect(isValidPricingItem(item)).toBe(true);
    });

    it('should return false for invalid item', () => {
      const item = {
        id: 'invalid-id',
        sku: 'FRAME-001',
        price: 29.99,
        quantity: 1,
      };

      expect(isValidPricingItem(item)).toBe(false);
    });
  });

  describe('isValidShippingAddress', () => {
    it('should return true for valid address', () => {
      const address = {
        countryCode: 'US',
        postalCode: '90210',
      };

      expect(isValidShippingAddress(address)).toBe(true);
    });

    it('should return false for invalid address', () => {
      const address = {
        countryCode: 'USA', // Should be 2 characters
        postalCode: '90210',
      };

      expect(isValidShippingAddress(address)).toBe(false);
    });
  });
});

describe('Error Handling', () => {
  describe('PricingError', () => {
    it('should create error with code and details', () => {
      const error = new PricingError('Test error', 'TEST_CODE', { test: true });
      
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.details).toEqual({ test: true });
      expect(error.name).toBe('PricingError');
    });
  });

  describe('ShippingCalculationError', () => {
    it('should inherit from PricingError', () => {
      const error = new ShippingCalculationError('Shipping error');
      
      expect(error).toBeInstanceOf(PricingError);
      expect(error.code).toBe('SHIPPING_CALCULATION_ERROR');
      expect(error.name).toBe('ShippingCalculationError');
    });
  });

  describe('TaxCalculationError', () => {
    it('should inherit from PricingError', () => {
      const error = new TaxCalculationError('Tax error');
      
      expect(error).toBeInstanceOf(PricingError);
      expect(error.code).toBe('TAX_CALCULATION_ERROR');
      expect(error.name).toBe('TaxCalculationError');
    });
  });
});

describe('Edge Cases and Stress Tests', () => {
  let calculator: PricingCalculator;

  beforeEach(() => {
    calculator = new PricingCalculator();
  });

  it('should handle very large quantities', () => {
    const items: PricingItem[] = [{
      id: '123e4567-e89b-12d3-a456-426614174000',
      sku: 'FRAME-001',
      price: 0.01,
      quantity: 10000,
    }];

    const result = calculator.calculateTotal(items);
    expect(result.subtotal).toBe(100);
    expect(result.total).toBeGreaterThan(100);
  });

  it('should handle very small prices', () => {
    const items: PricingItem[] = [{
      id: '123e4567-e89b-12d3-a456-426614174000',
      sku: 'FRAME-001',
      price: 0.001,
      quantity: 1,
    }];

    const result = calculator.calculateTotal(items);
    expect(result.subtotal).toBe(0);
    expect(result.taxAmount).toBe(0);
  });

  it('should handle maximum realistic order size', () => {
    const items: PricingItem[] = Array.from({ length: 100 }, (_, i) => ({
      id: `123e4567-e89b-12d3-a456-42661417400${i.toString().padStart(1, '0')}`,
      sku: `FRAME-${i.toString().padStart(3, '0')}`,
      price: 29.99,
      quantity: 1,
    }));

    const result = calculator.calculateTotal(items);
    expect(result.subtotal).toBe(2999);
    expect(result.itemCount).toBe(100);
    expect(result.total).toBeGreaterThan(3000);
  });
});
