import { PricingCalculator, defaultPricingCalculator, PricingItem, ShippingAddress, isValidPricingItem } from '@/lib/pricing';

describe('Pricing Library', () => {
  let calculator: PricingCalculator;

  beforeEach(() => {
    calculator = new PricingCalculator();
  });

  describe('PricingCalculator', () => {
    it('should calculate total for empty cart', () => {
      const items: PricingItem[] = [];
      const result = calculator.calculateTotal(items);
      
      expect(result.subtotal).toBe(0);
      expect(result.taxAmount).toBe(0);
      expect(result.shippingAmount).toBe(0);
      expect(result.total).toBe(0);
    });

    it('should calculate total for single item', () => {
      const items: PricingItem[] = [
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          sku: 'TEST-SKU-1',
          price: 29.99,
          quantity: 2,
          name: 'Test Product',
        },
      ];

      const result = calculator.calculateTotal(items);
      expect(result.subtotal).toBe(59.98);
      expect(result.taxAmount).toBe(4.8); // 8% tax
      expect(result.shippingAmount).toBe(0); // Free shipping over threshold
      expect(result.total).toBe(64.78);
    });

    it('should calculate total for multiple items', () => {
      const items: PricingItem[] = [
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          sku: 'TEST-SKU-1',
          price: 29.99,
          quantity: 2,
          name: 'Test Product 1',
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          sku: 'TEST-SKU-2',
          price: 49.99,
          quantity: 1,
          name: 'Test Product 2',
        },
      ];

      const result = calculator.calculateTotal(items);
      expect(result.subtotal).toBe(109.97);
      expect(result.taxAmount).toBe(8.8); // 8% tax
      expect(result.shippingAmount).toBe(0); // Free shipping over threshold
      expect(result.total).toBe(118.77);
    });

    it('should handle zero quantity items', () => {
      const items: PricingItem[] = [
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          sku: 'TEST-SKU-1',
          price: 29.99,
          quantity: 0,
          name: 'Test Product',
        },
      ];

      expect(() => calculator.calculateTotal(items)).toThrow();
    });

    it('should handle negative quantity items', () => {
      const items: PricingItem[] = [
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          sku: 'TEST-SKU-1',
          price: 29.99,
          quantity: -1,
          name: 'Test Product',
        },
      ];

      expect(() => calculator.calculateTotal(items)).toThrow();
    });
  });

  describe('Shipping calculations', () => {
    it('should handle free shipping when no shipping result provided', () => {
      const items: PricingItem[] = [
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          sku: 'TEST-SKU-1',
          price: 100,
          quantity: 1,
          name: 'Test Product',
        },
      ];

      const result = calculator.calculateTotal(items);
      expect(result.shippingAmount).toBe(0); // No shipping result provided
    });

    it('should handle shipping cost when shipping result provided', () => {
      const items: PricingItem[] = [
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          sku: 'TEST-SKU-1',
          price: 50,
          quantity: 1,
          name: 'Test Product',
        },
      ];

      const shippingResult = {
        cost: 9.99,
        currency: 'USD',
        estimatedDays: 5,
        method: 'Standard',
        isEstimated: false,
        addressValidated: true,
      };

      const result = calculator.calculateTotal(items, shippingResult);
      expect(result.shippingAmount).toBe(9.99);
    });
  });

  describe('Tax calculations', () => {
    it('should calculate tax correctly', () => {
      const items: PricingItem[] = [
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          sku: 'TEST-SKU-1',
          price: 100,
          quantity: 1,
          name: 'Test Product',
        },
      ];

      const result = calculator.calculateTotal(items);
      expect(result.taxAmount).toBe(8); // 8% tax rate
    });

    it('should handle zero tax for zero subtotal', () => {
      const items: PricingItem[] = [];
      const result = calculator.calculateTotal(items);
      expect(result.taxAmount).toBe(0);
    });
  });

  describe('Validation', () => {
    it('should validate pricing items', () => {
      const validItem = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        sku: 'TEST-SKU-1',
        price: 29.99,
        quantity: 1,
        name: 'Test Product',
      };

      expect(isValidPricingItem(validItem)).toBe(true);
    });

    it('should reject invalid pricing items', () => {
      const invalidItem = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        sku: '', // Invalid: empty sku
        price: -10, // Invalid: negative price
        quantity: 0, // Invalid: zero quantity
      };

      expect(isValidPricingItem(invalidItem)).toBe(false);
    });
  });

  describe('Default calculator', () => {
    it('should use default calculator instance', () => {
      const items: PricingItem[] = [
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          sku: 'TEST-SKU-1',
          price: 50,
          quantity: 1,
          name: 'Test Product',
        },
      ];

      const result = defaultPricingCalculator.calculateTotal(items);
      expect(result.subtotal).toBe(50);
      expect(result.total).toBeGreaterThan(50);
    });
  });
});
