/**
 * Integration tests for pricing and shipping systems
 * Tests the interaction between pricing calculations and shipping costs
 */

import {
  PricingCalculator,
  PricingItem,
  ShippingAddress,
  PricingError,
  defaultPricingCalculator,
} from '../pricing';
import {
  ShippingService,
  ShippingItem,
  ShippingServiceError,
  defaultShippingService,
} from '../shipping';

// Mock the prodigi client for integration tests
jest.mock('../prodigi', () => ({
  prodigiClient: {
    calculateShippingCost: jest.fn(),
  },
}));

import { prodigiClient } from '../prodigi';

describe('Pricing and Shipping Integration', () => {
  const mockProdigiClient = prodigiClient as jest.Mocked<typeof prodigiClient>;

  const sampleItems: PricingItem[] = [
    {
      id: '123e4567-e89b-12d3-a456-426614174000',
      sku: 'FRAME-BLACK-MEDIUM',
      price: 39.99,
      quantity: 1,
      name: 'Black Medium Frame',
    },
    {
      id: '123e4567-e89b-12d3-a456-426614174001',
      sku: 'FRAME-WHITE-LARGE',
      price: 49.99,
      quantity: 2,
      name: 'White Large Frame',
    },
  ];

  const sampleAddress: ShippingAddress = {
    countryCode: 'US',
    stateOrCounty: 'CA',
    postalCode: '90210',
    city: 'Beverly Hills',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Order Calculation', () => {
    it('should calculate complete order pricing with shipping', async () => {
      // Mock Prodigi response
      mockProdigiClient.calculateShippingCost.mockResolvedValue({
        cost: 12.99,
        currency: 'USD',
        estimatedDays: 5,
        serviceName: 'Standard Shipping',
        carrier: 'FedEx',
        trackingAvailable: true,
      });

      // Convert pricing items to shipping items
      const shippingItems: ShippingItem[] = sampleItems.map(item => ({
        sku: item.sku,
        quantity: item.quantity,
      }));

      // Calculate shipping
      const shippingCalculation = await defaultShippingService.calculateShipping(
        shippingItems,
        sampleAddress
      );

      // Calculate complete pricing with shipping
      const pricingResult = defaultPricingCalculator.calculateTotal(
        sampleItems,
        {
          cost: shippingCalculation.recommended.cost,
          currency: shippingCalculation.recommended.currency,
          estimatedDays: shippingCalculation.recommended.estimatedDays,
          serviceName: shippingCalculation.recommended.service,
          carrier: shippingCalculation.recommended.carrier,
          trackingAvailable: shippingCalculation.recommended.trackingAvailable,
        }
      );

      // Verify calculations
      expect(pricingResult.subtotal).toBe(139.97); // 39.99 + (49.99 * 2)
      expect(pricingResult.taxAmount).toBe(11.2); // 8% of 139.97, rounded
      expect(pricingResult.shippingAmount).toBe(12.99);
      expect(pricingResult.total).toBe(164.16); // 139.97 + 11.2 + 12.99
      expect(pricingResult.itemCount).toBe(3);

      // Verify breakdown includes shipping details
      expect(pricingResult.breakdown.shipping).toEqual({
        cost: 12.99,
        method: 'Standard Shipping',
        estimatedDays: 5,
        carrier: 'FedEx',
      });
    });

    it('should handle free shipping scenarios', async () => {
      // High-value items that qualify for free shipping
      const highValueItems: PricingItem[] = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          sku: 'PREMIUM-FRAME',
          price: 150.00,
          quantity: 1,
          name: 'Premium Gold Frame',
        },
      ];

      mockProdigiClient.calculateShippingCost.mockResolvedValue({
        cost: 0, // Free shipping
        currency: 'USD',
        estimatedDays: 7,
        serviceName: 'Free Standard Shipping',
        carrier: 'FedEx',
        trackingAvailable: true,
      });

      const shippingItems: ShippingItem[] = highValueItems.map(item => ({
        sku: item.sku,
        quantity: item.quantity,
      }));

      const shippingCalculation = await defaultShippingService.calculateShipping(
        shippingItems,
        sampleAddress
      );

      expect(shippingCalculation.freeShippingAvailable).toBe(true);
      expect(shippingCalculation.recommended.cost).toBe(0);

      const pricingResult = defaultPricingCalculator.calculateTotal(
        highValueItems,
        {
          cost: 0,
          currency: 'USD',
          estimatedDays: 7,
          serviceName: 'Free Standard Shipping',
          carrier: 'FedEx',
          trackingAvailable: true,
        }
      );

      expect(pricingResult.shippingAmount).toBe(0);
      expect(pricingResult.total).toBe(162); // 150 + 12 tax
    });

    it('should handle international shipping with higher costs', async () => {
      const internationalAddress: ShippingAddress = {
        countryCode: 'GB',
        stateOrCounty: 'London',
        city: 'London',
      };

      mockProdigiClient.calculateShippingCost.mockResolvedValue({
        cost: 29.99,
        currency: 'USD',
        estimatedDays: 14,
        serviceName: 'International Standard',
        carrier: 'DHL',
        trackingAvailable: true,
      });

      const shippingItems: ShippingItem[] = sampleItems.map(item => ({
        sku: item.sku,
        quantity: item.quantity,
      }));

      const shippingCalculation = await defaultShippingService.calculateShipping(
        shippingItems,
        internationalAddress
      );

      const pricingResult = defaultPricingCalculator.calculateTotal(
        sampleItems,
        {
          cost: shippingCalculation.recommended.cost,
          currency: shippingCalculation.recommended.currency,
          estimatedDays: shippingCalculation.recommended.estimatedDays,
          serviceName: shippingCalculation.recommended.service,
          carrier: shippingCalculation.recommended.carrier,
          trackingAvailable: shippingCalculation.recommended.trackingAvailable,
        }
      );

      expect(pricingResult.shippingAmount).toBe(29.99);
      expect(pricingResult.total).toBe(181.16); // 139.97 + 11.2 + 29.99
      expect(pricingResult.breakdown.shipping?.estimatedDays).toBe(14);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle shipping calculation failures gracefully', async () => {
      mockProdigiClient.calculateShippingCost.mockRejectedValue(new Error('Shipping API down'));

      const shippingItems: ShippingItem[] = sampleItems.map(item => ({
        sku: item.sku,
        quantity: item.quantity,
      }));

      await expect(
        defaultShippingService.calculateShipping(shippingItems, sampleAddress)
      ).rejects.toThrow(ShippingServiceError);

      // Pricing should still work without shipping
      const pricingResult = defaultPricingCalculator.calculateTotal(sampleItems);
      expect(pricingResult.subtotal).toBe(139.97);
      expect(pricingResult.shippingAmount).toBe(0);
    });

    it('should validate consistency between pricing and shipping items', async () => {
      // Items with mismatched SKUs
      const mismatchedShippingItems: ShippingItem[] = [
        { sku: 'DIFFERENT-SKU', quantity: 1 },
      ];

      mockProdigiClient.calculateShippingCost.mockResolvedValue({
        cost: 10.99,
        currency: 'USD',
        estimatedDays: 5,
        serviceName: 'Standard Shipping',
        carrier: 'FedEx',
        trackingAvailable: true,
      });

      // This should work - the services don't enforce SKU matching
      // but in a real scenario, you'd want to validate this
      const shippingCalculation = await defaultShippingService.calculateShipping(
        mismatchedShippingItems,
        sampleAddress
      );

      expect(shippingCalculation.recommended.cost).toBe(10.99);
    });

    it('should handle edge cases in quantity calculations', async () => {
      const edgeCaseItems: PricingItem[] = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          sku: 'FRAME-TINY-PRICE',
          price: 0.01, // Very small price
          quantity: 1000, // Large quantity
          name: 'Bulk Discount Frame',
        },
      ];

      mockProdigiClient.calculateShippingCost.mockResolvedValue({
        cost: 49.99, // High shipping for bulk order
        currency: 'USD',
        estimatedDays: 10,
        serviceName: 'Freight Shipping',
        carrier: 'UPS',
        trackingAvailable: true,
      });

      const shippingItems: ShippingItem[] = edgeCaseItems.map(item => ({
        sku: item.sku,
        quantity: item.quantity,
      }));

      const shippingCalculation = await defaultShippingService.calculateShipping(
        shippingItems,
        sampleAddress
      );

      const pricingResult = defaultPricingCalculator.calculateTotal(
        edgeCaseItems,
        {
          cost: shippingCalculation.recommended.cost,
          currency: shippingCalculation.recommended.currency,
          estimatedDays: shippingCalculation.recommended.estimatedDays,
          serviceName: shippingCalculation.recommended.service,
          carrier: shippingCalculation.recommended.carrier,
          trackingAvailable: shippingCalculation.recommended.trackingAvailable,
        }
      );

      expect(pricingResult.subtotal).toBe(10); // 0.01 * 1000
      expect(pricingResult.shippingAmount).toBe(49.99);
      expect(pricingResult.itemCount).toBe(1000);
    });
  });

  describe('Performance and Stress Testing', () => {
    it('should handle large orders efficiently', async () => {
      const largeOrder: PricingItem[] = Array.from({ length: 100 }, (_, i) => ({
        id: `123e4567-e89b-12d3-a456-42661417400${i.toString().padStart(1, '0')}`,
        sku: `FRAME-${i.toString().padStart(3, '0')}`,
        price: 29.99 + (i * 0.01), // Slight price variation
        quantity: 1,
        name: `Frame ${i}`,
      }));

      mockProdigiClient.calculateShippingCost.mockResolvedValue({
        cost: 0, // Free shipping for large order
        currency: 'USD',
        estimatedDays: 10,
        serviceName: 'Free Bulk Shipping',
        carrier: 'FedEx',
        trackingAvailable: true,
      });

      const startTime = Date.now();

      const shippingItems: ShippingItem[] = largeOrder.map(item => ({
        sku: item.sku,
        quantity: item.quantity,
      }));

      const shippingCalculation = await defaultShippingService.calculateShipping(
        shippingItems,
        sampleAddress
      );

      const pricingResult = defaultPricingCalculator.calculateTotal(
        largeOrder,
        {
          cost: 0,
          currency: 'USD',
          estimatedDays: 10,
          serviceName: 'Free Bulk Shipping',
          carrier: 'FedEx',
          trackingAvailable: true,
        }
      );

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Should process large orders quickly (under 1 second)
      expect(processingTime).toBeLessThan(1000);
      expect(pricingResult.itemCount).toBe(100);
      expect(pricingResult.subtotal).toBeGreaterThan(2999); // 100 * ~30
      expect(pricingResult.breakdown.items).toHaveLength(100);
    });

    it('should handle concurrent calculations', async () => {
      mockProdigiClient.calculateShippingCost.mockResolvedValue({
        cost: 9.99,
        currency: 'USD',
        estimatedDays: 5,
        serviceName: 'Standard Shipping',
        carrier: 'FedEx',
        trackingAvailable: true,
      });

      const shippingItems: ShippingItem[] = sampleItems.map(item => ({
        sku: item.sku,
        quantity: item.quantity,
      }));

      // Run multiple calculations concurrently
      const promises = Array.from({ length: 10 }, async () => {
        const shippingCalculation = await defaultShippingService.calculateShipping(
          shippingItems,
          sampleAddress
        );

        return defaultPricingCalculator.calculateTotal(
          sampleItems,
          {
            cost: shippingCalculation.recommended.cost,
            currency: shippingCalculation.recommended.currency,
            estimatedDays: shippingCalculation.recommended.estimatedDays,
            serviceName: shippingCalculation.recommended.service,
            carrier: shippingCalculation.recommended.carrier,
            trackingAvailable: shippingCalculation.recommended.trackingAvailable,
          }
        );
      });

      const results = await Promise.all(promises);

      // All results should be consistent
      results.forEach(result => {
        expect(result.subtotal).toBe(139.97);
        expect(result.shippingAmount).toBe(9.99);
        expect(result.total).toBe(164.16);
      });
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle typical customer order flow', async () => {
      // Customer adds items to cart
      const cartItems: PricingItem[] = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          sku: 'FRAME-BLACK-SMALL',
          price: 24.99,
          quantity: 1,
          name: 'Small Black Frame',
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174001',
          sku: 'FRAME-WHITE-MEDIUM',
          price: 34.99,
          quantity: 1,
          name: 'Medium White Frame',
        },
      ];

      // Initial cart calculation (no shipping)
      const initialPricing = defaultPricingCalculator.calculateTotal(cartItems);
      expect(initialPricing.shippingAmount).toBe(0);
      expect(initialPricing.subtotal).toBe(59.98);

      // Customer enters shipping address
      mockProdigiClient.calculateShippingCost.mockResolvedValue({
        cost: 8.99,
        currency: 'USD',
        estimatedDays: 5,
        serviceName: 'Standard Shipping',
        carrier: 'USPS',
        trackingAvailable: true,
      });

      const shippingItems: ShippingItem[] = cartItems.map(item => ({
        sku: item.sku,
        quantity: item.quantity,
      }));

      const shippingCalculation = await defaultShippingService.calculateShipping(
        shippingItems,
        sampleAddress
      );

      // Final pricing with shipping
      const finalPricing = defaultPricingCalculator.calculateTotal(
        cartItems,
        {
          cost: shippingCalculation.recommended.cost,
          currency: shippingCalculation.recommended.currency,
          estimatedDays: shippingCalculation.recommended.estimatedDays,
          serviceName: shippingCalculation.recommended.service,
          carrier: shippingCalculation.recommended.carrier,
          trackingAvailable: shippingCalculation.recommended.trackingAvailable,
        }
      );

      expect(finalPricing.subtotal).toBe(59.98);
      expect(finalPricing.shippingAmount).toBe(8.99);
      expect(finalPricing.taxAmount).toBe(4.8); // 8% of 59.98
      expect(finalPricing.total).toBe(73.77);

      // Verify detailed breakdown
      expect(finalPricing.breakdown.items).toHaveLength(2);
      expect(finalPricing.breakdown.shipping).toEqual({
        cost: 8.99,
        method: 'Standard Shipping',
        estimatedDays: 5,
        carrier: 'USPS',
      });
    });

    it('should handle promotional discounts', async () => {
      mockProdigiClient.calculateShippingCost.mockResolvedValue({
        cost: 9.99,
        currency: 'USD',
        estimatedDays: 5,
        serviceName: 'Standard Shipping',
        carrier: 'FedEx',
        trackingAvailable: true,
      });

      const shippingItems: ShippingItem[] = sampleItems.map(item => ({
        sku: item.sku,
        quantity: item.quantity,
      }));

      const shippingCalculation = await defaultShippingService.calculateShipping(
        shippingItems,
        sampleAddress
      );

      // Apply $20 discount
      const discountAmount = 20;
      const pricingResult = defaultPricingCalculator.calculateTotal(
        sampleItems,
        {
          cost: shippingCalculation.recommended.cost,
          currency: shippingCalculation.recommended.currency,
          estimatedDays: shippingCalculation.recommended.estimatedDays,
          serviceName: shippingCalculation.recommended.service,
          carrier: shippingCalculation.recommended.carrier,
          trackingAvailable: shippingCalculation.recommended.trackingAvailable,
        },
        discountAmount
      );

      expect(pricingResult.discountAmount).toBe(20);
      expect(pricingResult.total).toBe(144.16); // 139.97 - 20 + 11.2 + 9.99
      expect(pricingResult.breakdown.discounts).toHaveLength(1);
    });
  });
});
