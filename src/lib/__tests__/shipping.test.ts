/**
 * Comprehensive tests for shipping service
 * Tests error handling, retry logic, validation, and edge cases
 */

import {
  ShippingService,
  ShippingItem,
  ShippingOptions,
  ShippingQuote,
  ShippingServiceError,
  ShippingTimeoutError,
  ShippingValidationError,
  defaultShippingService,
  createShippingService,
  isValidShippingItem,
  isValidShippingOptions,
  FREE_SHIPPING_THRESHOLD,
} from '../shipping';
import { ShippingAddress } from '../pricing';

// Mock the prodigi client
jest.mock('../prodigi', () => ({
  prodigiClient: {
    calculateShippingCost: jest.fn(),
  },
}));

import { prodigiClient } from '../prodigi';

describe('ShippingService', () => {
  let shippingService: ShippingService;
  const mockProdigiClient = prodigiClient as jest.Mocked<typeof prodigiClient>;

  const sampleItems: ShippingItem[] = [
    {
      sku: 'FRAME-001',
      quantity: 1,
    },
    {
      sku: 'FRAME-002',
      quantity: 2,
    },
  ];

  const sampleAddress: ShippingAddress = {
    countryCode: 'US',
    stateOrCounty: 'CA',
    postalCode: '90210',
    city: 'Beverly Hills',
  };

  const sampleOptions: ShippingOptions = {
    expedited: false,
    insurance: false,
    signature: false,
    trackingRequired: true,
  };

  beforeEach(() => {
    shippingService = new ShippingService();
    jest.clearAllMocks();
  });

  describe('calculateShipping', () => {
    it('should calculate shipping successfully', async () => {
      mockProdigiClient.calculateShippingCost.mockResolvedValue({
        cost: 9.99,
        currency: 'USD',
        estimatedDays: 5,
        serviceName: 'Standard Shipping',
        carrier: 'Prodigi',
        trackingAvailable: true,
      });

      const result = await shippingService.calculateShipping(sampleItems, sampleAddress);

      expect(result.quotes).toHaveLength(1);
      expect(result.quotes[0].cost).toBe(9.99);
      expect(result.quotes[0].carrier).toBe('Prodigi');
      expect(result.recommended).toBe(result.quotes[0]);
      expect(result.freeShippingAvailable).toBe(false); // Assuming subtotal < threshold
      expect(result.calculatedAt).toBeInstanceOf(Date);
    });

    it('should handle free shipping eligibility', async () => {
      // Mock high-value items to trigger free shipping
      const highValueItems: ShippingItem[] = [
        {
          sku: 'EXPENSIVE-FRAME',
          quantity: 10, // Will exceed free shipping threshold
        },
      ];

      mockProdigiClient.calculateShippingCost.mockResolvedValue({
        cost: 9.99,
        currency: 'USD',
        estimatedDays: 5,
        serviceName: 'Standard Shipping',
        carrier: 'Prodigi',
        trackingAvailable: true,
      });

      const result = await shippingService.calculateShipping(highValueItems, sampleAddress);

      expect(result.freeShippingAvailable).toBe(true);
      expect(result.freeShippingThreshold).toBeUndefined();
    });

    it('should include shipping options in quote', async () => {
      const optionsWithExtras: ShippingOptions = {
        expedited: true,
        insurance: true,
        signature: true,
        trackingRequired: true,
      };

      mockProdigiClient.calculateShippingCost.mockResolvedValue({
        cost: 15.99,
        currency: 'USD',
        estimatedDays: 2,
        serviceName: 'Express Shipping',
        carrier: 'Prodigi',
        trackingAvailable: true,
      });

      const result = await shippingService.calculateShipping(sampleItems, sampleAddress, optionsWithExtras);

      expect(result.quotes[0].insuranceIncluded).toBe(true);
      expect(result.quotes[0].signatureRequired).toBe(true);
    });

    it('should throw error for empty items array', async () => {
      await expect(
        shippingService.calculateShipping([], sampleAddress)
      ).rejects.toThrow(ShippingValidationError);
    });

    it('should throw error for missing address', async () => {
      await expect(
        shippingService.calculateShipping(sampleItems, null as any)
      ).rejects.toThrow(ShippingValidationError);
    });

    it('should throw error for US address without postal code', async () => {
      const invalidAddress = {
        countryCode: 'US',
        stateOrCounty: 'CA',
        city: 'Los Angeles',
      };

      await expect(
        shippingService.calculateShipping(sampleItems, invalidAddress)
      ).rejects.toThrow(ShippingValidationError);
    });

    it('should throw error when all providers fail', async () => {
      mockProdigiClient.calculateShippingCost.mockRejectedValue(new Error('API Error'));

      await expect(
        shippingService.calculateShipping(sampleItems, sampleAddress)
      ).rejects.toThrow(ShippingServiceError);
    });
  });

  describe('retry logic', () => {
    it('should retry on failure and eventually succeed', async () => {
      mockProdigiClient.calculateShippingCost
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockRejectedValueOnce(new Error('Another failure'))
        .mockResolvedValue({
          cost: 9.99,
          currency: 'USD',
          estimatedDays: 5,
          serviceName: 'Standard Shipping',
          carrier: 'Prodigi',
          trackingAvailable: true,
        });

      const result = await shippingService.calculateShipping(sampleItems, sampleAddress);

      expect(mockProdigiClient.calculateShippingCost).toHaveBeenCalledTimes(3);
      expect(result.quotes).toHaveLength(1);
    });

    it('should fail after max retry attempts', async () => {
      const serviceWithLimitedRetries = new ShippingService(2, 10); // 2 retries, 10ms delay
      
      mockProdigiClient.calculateShippingCost.mockRejectedValue(new Error('Persistent failure'));

      await expect(
        serviceWithLimitedRetries.calculateShipping(sampleItems, sampleAddress)
      ).rejects.toThrow(ShippingServiceError);

      expect(mockProdigiClient.calculateShippingCost).toHaveBeenCalledTimes(2);
    });
  });

  describe('timeout handling', () => {
    it('should timeout long-running requests', async () => {
      const serviceWithShortTimeout = new ShippingService(1, 100, 50); // 50ms timeout
      
      mockProdigiClient.calculateShippingCost.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100)) // 100ms delay
      );

      await expect(
        serviceWithShortTimeout.calculateShipping(sampleItems, sampleAddress)
      ).rejects.toThrow(ShippingTimeoutError);
    }, 10000);
  });

  describe('quote selection', () => {
    it('should select cheapest quote when costs differ significantly', async () => {
      // Mock multiple quotes (this would require multiple providers)
      const quotes: ShippingQuote[] = [
        {
          carrier: 'ExpensiveCarrier',
          service: 'Premium',
          cost: 25.99,
          currency: 'USD',
          estimatedDays: 1,
          trackingAvailable: true,
          insuranceIncluded: true,
          signatureRequired: false,
        },
        {
          carrier: 'CheapCarrier',
          service: 'Standard',
          cost: 9.99,
          currency: 'USD',
          estimatedDays: 5,
          trackingAvailable: true,
          insuranceIncluded: false,
          signatureRequired: false,
        },
      ];

      // Test the quote selection logic directly
      const service = new ShippingService();
      const recommended = (service as any).selectRecommendedQuote(quotes);
      
      // Should prefer the cheaper option for reasonable delivery time
      expect(recommended.cost).toBe(9.99);
    });
  });

  describe('validation methods', () => {
    describe('validateShippingAddress', () => {
      it('should validate correct address', async () => {
        const isValid = await shippingService.validateShippingAddress(sampleAddress);
        expect(isValid).toBe(true);
      });

      it('should reject invalid address', async () => {
        const invalidAddress = {
          countryCode: 'USA', // Should be 2 characters
          postalCode: '90210',
        };

        await expect(
          shippingService.validateShippingAddress(invalidAddress)
        ).rejects.toThrow(ShippingValidationError);
      });
    });

    describe('isShippingAvailable', () => {
      it('should return true for supported countries', () => {
        expect(shippingService.isShippingAvailable('US')).toBe(true);
        expect(shippingService.isShippingAvailable('CA')).toBe(true);
        expect(shippingService.isShippingAvailable('GB')).toBe(true);
      });

      it('should return false for unsupported countries', () => {
        expect(shippingService.isShippingAvailable('XX')).toBe(false);
        expect(shippingService.isShippingAvailable('ZZ')).toBe(false);
      });

      it('should handle lowercase country codes', () => {
        expect(shippingService.isShippingAvailable('us')).toBe(true);
      });
    });

    describe('getSupportedCountries', () => {
      it('should return array of country codes', () => {
        const countries = shippingService.getSupportedCountries();
        expect(Array.isArray(countries)).toBe(true);
        expect(countries.length).toBeGreaterThan(0);
        expect(countries).toContain('US');
        expect(countries).toContain('GB');
      });
    });
  });

  describe('utility methods', () => {
    describe('getEstimatedDeliveryDate', () => {
      it('should calculate delivery date correctly', () => {
        const quote: ShippingQuote = {
          carrier: 'Test',
          service: 'Standard',
          cost: 9.99,
          currency: 'USD',
          estimatedDays: 5,
          trackingAvailable: true,
          insuranceIncluded: false,
          signatureRequired: false,
        };

        const orderDate = new Date('2023-01-01'); // Sunday
        const deliveryDate = shippingService.getEstimatedDeliveryDate(quote, orderDate);

        expect(deliveryDate.getTime()).toBeGreaterThan(orderDate.getTime());
        
        // Should skip weekends
        expect(deliveryDate.getDay()).not.toBe(0); // Not Sunday
        expect(deliveryDate.getDay()).not.toBe(6); // Not Saturday
      });
    });

    describe('formatShippingCost', () => {
      it('should format cost correctly', () => {
        const quote: ShippingQuote = {
          carrier: 'Test',
          service: 'Standard',
          cost: 9.99,
          currency: 'USD',
          estimatedDays: 5,
          trackingAvailable: true,
          insuranceIncluded: false,
          signatureRequired: false,
        };

        expect(shippingService.formatShippingCost(quote)).toBe('$9.99');
      });

      it('should show FREE for zero cost', () => {
        const freeQuote: ShippingQuote = {
          carrier: 'Test',
          service: 'Free',
          cost: 0,
          currency: 'USD',
          estimatedDays: 7,
          trackingAvailable: true,
          insuranceIncluded: false,
          signatureRequired: false,
        };

        expect(shippingService.formatShippingCost(freeQuote)).toBe('FREE');
      });
    });
  });
});

describe('Utility Functions', () => {
  describe('createShippingService', () => {
    it('should create service with custom parameters', () => {
      const service = createShippingService(5, 2000, 60000);
      expect(service).toBeInstanceOf(ShippingService);
    });

    it('should create service with default parameters', () => {
      const service = createShippingService();
      expect(service).toBeInstanceOf(ShippingService);
    });
  });

  describe('isValidShippingItem', () => {
    it('should return true for valid item', () => {
      const item = {
        sku: 'FRAME-001',
        quantity: 1,
      };

      expect(isValidShippingItem(item)).toBe(true);
    });

    it('should return false for invalid item', () => {
      const item = {
        sku: '',
        quantity: 0,
      };

      expect(isValidShippingItem(item)).toBe(false);
    });

    it('should validate optional properties', () => {
      const itemWithOptionals = {
        sku: 'FRAME-001',
        quantity: 1,
        weight: 0.5,
        dimensions: {
          length: 10,
          width: 8,
          height: 1,
        },
      };

      expect(isValidShippingItem(itemWithOptionals)).toBe(true);
    });
  });

  describe('isValidShippingOptions', () => {
    it('should return true for valid options', () => {
      const options = {
        expedited: true,
        insurance: false,
        signature: true,
        trackingRequired: true,
      };

      expect(isValidShippingOptions(options)).toBe(true);
    });

    it('should return true for empty options (defaults)', () => {
      expect(isValidShippingOptions({})).toBe(true);
    });

    it('should return false for invalid options', () => {
      const options = {
        expedited: 'yes', // Should be boolean
        insurance: false,
      };

      expect(isValidShippingOptions(options)).toBe(false);
    });
  });
});

describe('Error Handling', () => {
  describe('ShippingServiceError', () => {
    it('should create error with provider and details', () => {
      const error = new ShippingServiceError('Test error', 'prodigi', { test: true });
      
      expect(error.message).toBe('Test error');
      expect(error.provider).toBe('prodigi');
      expect(error.details).toEqual({ test: true });
      expect(error.name).toBe('ShippingServiceError');
    });
  });

  describe('ShippingTimeoutError', () => {
    it('should inherit from ShippingServiceError', () => {
      const error = new ShippingTimeoutError('prodigi', 5000);
      
      expect(error).toBeInstanceOf(ShippingServiceError);
      expect(error.provider).toBe('prodigi');
      expect(error.details.timeoutMs).toBe(5000);
      expect(error.name).toBe('ShippingTimeoutError');
    });
  });

  describe('ShippingValidationError', () => {
    it('should inherit from ShippingServiceError', () => {
      const error = new ShippingValidationError('Validation error');
      
      expect(error).toBeInstanceOf(ShippingServiceError);
      expect(error.provider).toBe('validation');
      expect(error.name).toBe('ShippingValidationError');
    });
  });
});

describe('Edge Cases and Stress Tests', () => {
  let shippingService: ShippingService;
  const mockProdigiClient = prodigiClient as jest.Mocked<typeof prodigiClient>;

  beforeEach(() => {
    shippingService = new ShippingService();
    jest.clearAllMocks();
  });

  it('should handle very large quantities', async () => {
    const largeQuantityItems: ShippingItem[] = [{
      sku: 'FRAME-001',
      quantity: 1000,
    }];

    mockProdigiClient.calculateShippingCost.mockResolvedValue({
      cost: 99.99,
      currency: 'USD',
      estimatedDays: 10,
      serviceName: 'Freight Shipping',
      carrier: 'Prodigi',
      trackingAvailable: true,
    });

    const result = await shippingService.calculateShipping(largeQuantityItems, sampleAddress);
    expect(result.quotes[0].cost).toBe(99.99);
  });

  it('should handle international addresses', async () => {
    const internationalAddress: ShippingAddress = {
      countryCode: 'GB',
      stateOrCounty: 'London',
      city: 'London',
    };

    mockProdigiClient.calculateShippingCost.mockResolvedValue({
      cost: 19.99,
      currency: 'USD',
      estimatedDays: 14,
      serviceName: 'International Standard',
      carrier: 'Prodigi',
      trackingAvailable: true,
    });

    const result = await shippingService.calculateShipping(sampleItems, internationalAddress);
    expect(result.quotes[0].estimatedDays).toBe(14);
  });

  it('should handle maximum realistic order size', async () => {
    const maxItems: ShippingItem[] = Array.from({ length: 100 }, (_, i) => ({
      sku: `FRAME-${i.toString().padStart(3, '0')}`,
      quantity: 1,
    }));

    mockProdigiClient.calculateShippingCost.mockResolvedValue({
      cost: 49.99,
      currency: 'USD',
      estimatedDays: 7,
      serviceName: 'Bulk Shipping',
      carrier: 'Prodigi',
      trackingAvailable: true,
    });

    const result = await shippingService.calculateShipping(maxItems, sampleAddress);
    expect(result.quotes).toHaveLength(1);
    expect(result.freeShippingAvailable).toBe(true); // Large order should qualify
  });

  it('should handle network failures gracefully', async () => {
    mockProdigiClient.calculateShippingCost.mockRejectedValue(new Error('Network error'));

    await expect(
      shippingService.calculateShipping(sampleItems, sampleAddress)
    ).rejects.toThrow(ShippingServiceError);
  });

  it('should handle malformed API responses', async () => {
    mockProdigiClient.calculateShippingCost.mockResolvedValue({
      cost: NaN,
      currency: '',
      estimatedDays: -1,
      serviceName: null as any,
      carrier: 'Prodigi',
      trackingAvailable: true,
    });

    // The service should handle this gracefully or throw appropriate error
    await expect(
      shippingService.calculateShipping(sampleItems, sampleAddress)
    ).rejects.toThrow();
  });
});
