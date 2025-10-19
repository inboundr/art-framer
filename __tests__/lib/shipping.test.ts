import { ShippingService } from '@/lib/shipping';

describe('ShippingService', () => {
  let shippingService: ShippingService;

  beforeEach(() => {
    shippingService = new ShippingService();
  });

  describe('constructor', () => {
    it('should create ShippingService instance with default parameters', () => {
      const service = new ShippingService();
      expect(service).toBeInstanceOf(ShippingService);
    });

    it('should create ShippingService instance with custom parameters', () => {
      const service = new ShippingService(3, 1000, 30000);
      expect(service).toBeInstanceOf(ShippingService);
    });
  });

  describe('validateShippingAddress', () => {
    it('should validate correct address format', async () => {
      const address = {
        countryCode: 'US',
        state: 'CA',
        city: 'San Francisco',
        postalCode: '94102',
        address1: '123 Main St',
      };

      const result = await shippingService.validateShippingAddress(address);
      expect(result).toBe(true);
    });

    it('should reject addresses with missing required fields', async () => {
      const invalidAddress = {
        countryCode: '', // Invalid: empty country
        state: 'CA',
        city: 'San Francisco',
        postalCode: '94102',
        address1: '123 Main St',
      };

      await expect(shippingService.validateShippingAddress(invalidAddress))
        .rejects.toThrow('Country code must be 2 characters');
    });

    it('should handle addresses with special characters', async () => {
      const address = {
        countryCode: 'US',
        state: 'CA',
        city: 'San José',
        postalCode: '95110',
        address1: '123 Main St. #456',
      };

      const result = await shippingService.validateShippingAddress(address);
      expect(result).toBe(true);
    });
  });

  describe('calculateShippingGuaranteed', () => {
    it('should handle empty items array gracefully', async () => {
      const items: any[] = [];
      const address = {
        countryCode: 'US',
        state: 'CA',
        city: 'San Francisco',
        postalCode: '94102',
        address1: '123 Main St',
      };

      // The service uses fallback logic, so it should return a result
      const result = await shippingService.calculateShippingGuaranteed(items, address);
      expect(result).toBeDefined();
      expect(result.provider).toBe('intelligent_fallback');
    });

    it('should handle invalid address gracefully', async () => {
      const items = [
        {
          sku: 'TEST-SKU-1',
          quantity: 1,
          price: 29.99,
        },
      ];

      const invalidAddress = {
        countryCode: '', // Invalid: empty country
        state: 'CA',
        city: 'San Francisco',
        postalCode: '94102',
        address1: '123 Main St',
      };

      // The service uses fallback logic, so it should return a result
      const result = await shippingService.calculateShippingGuaranteed(items, invalidAddress);
      expect(result).toBeDefined();
      expect(result.provider).toBe('intelligent_fallback');
    });
  });
});
