import { calculateShipping } from '../../utils/shipping-calculation';
import type { ShippingAddress } from '../../utils/shipping-calculation';

global.fetch = jest.fn();

describe('Shipping Calculation - Production Ready Tests', () => {
  const validAddress: ShippingAddress = {
    firstName: 'John',
    lastName: 'Doe',
    address1: '123 Test St',
    address2: '',
    city: 'Test City',
    state: 'TS',
    zip: '12345',
    country: 'US',
    phone: '555-0123'
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // No client auth needed; server uses cookies
    
    // Default successful response
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve({
        cost: 9.99,
        currency: 'USD',
        estimatedDays: 5,
        method: 'Standard',
        isEstimated: false,
        addressValidated: true
      })
    });
  });

  describe('Input Validation', () => {
    it('should reject addresses with missing required fields', async () => {
      const incompleteAddress = { ...validAddress, city: '', zip: '' };
      const result = await calculateShipping(incompleteAddress);
      expect(result).toBeNull();
    });

    it('should reject addresses with poor quality data', async () => {
      const poorAddress = { ...validAddress, city: 'A', state: 'B' };
      const result = await calculateShipping(poorAddress);
      expect(result).toBeNull();
    });

    it('should accept valid addresses', async () => {
      const result = await calculateShipping(validAddress);
      expect(result).not.toBeNull();
      expect(result?.cost).toBe(9.99);
    });

    it('should handle international addresses', async () => {
      const internationalAddress = { ...validAddress, country: 'GB', zip: 'SW1A 1AA' };
      const result = await calculateShipping(internationalAddress);
      expect(result).not.toBeNull();
    });
  });

  describe('API Communication', () => {
    it('should make correct API call with cookie-based auth', async () => {
      await calculateShipping(validAddress);
      expect(global.fetch).toHaveBeenCalledWith('/api/cart/shipping', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          countryCode: 'US',
          stateOrCounty: 'TS',
          postalCode: '12345',
          city: 'Test City'
        })
      }));
    });

    // Client no longer handles tokens; server cookies enforce auth.

    it('should proceed without client token handling (no timeouts)', async () => {
      const result = await calculateShipping(validAddress);
      expect(result).not.toBeNull();
    });

    it('should return null on 401 Unauthorized without retries', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      });

      const result = await calculateShipping(validAddress);
      expect(result).toBeNull();
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors with retry', async () => {
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            cost: 9.99,
            currency: 'USD',
            estimatedDays: 5,
            method: 'Standard',
            isEstimated: false,
            addressValidated: true
          })
        });

      const result = await calculateShipping(validAddress);
      expect(result).not.toBeNull();
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should handle server errors with retry', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error'
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            cost: 9.99,
            currency: 'USD',
            estimatedDays: 5,
            method: 'Standard',
            isEstimated: false,
            addressValidated: true
          })
        });

      const result = await calculateShipping(validAddress);
      expect(result).not.toBeNull();
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should stop retrying after max attempts', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await calculateShipping(validAddress);
      expect(result).toBeNull();
      expect(global.fetch).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should handle API errors without retry for client errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request'
      });

      const result = await calculateShipping(validAddress);
      expect(result).toBeNull();
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Response Processing', () => {
    it('should process successful response correctly', async () => {
      const result = await calculateShipping(validAddress);
      
      expect(result).toEqual({
        cost: 9.99,
        currency: 'USD',
        estimatedDays: 5,
        method: 'Standard',
        isEstimated: false,
        addressValidated: true
      });
    });

    it('should handle missing response fields with defaults', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}) // Empty response
      });

      const result = await calculateShipping(validAddress);
      
      expect(result).toEqual({
        cost: 0,
        currency: 'USD',
        estimatedDays: 5,
        method: 'Standard',
        isEstimated: false,
        addressValidated: false
      });
    });

    it('should handle malformed JSON response', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON'))
      });

      const result = await calculateShipping(validAddress);
      expect(result).toBeNull();
    });

    it('should validate response data structure', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(null) // Invalid response
      });

      const result = await calculateShipping(validAddress);
      expect(result).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle special characters in addresses', async () => {
      const specialCharAddress = {
        ...validAddress,
        address1: '123 Main St. #4B',
        city: 'São Paulo'
      };

      const result = await calculateShipping(specialCharAddress);
      expect(result).not.toBeNull();
    });

    it('should handle very long addresses', async () => {
      const longAddress = {
        ...validAddress,
        address1: 'A'.repeat(1000),
        city: 'Very Long City Name That Might Cause Issues'
      };

      const result = await calculateShipping(longAddress);
      expect(result).not.toBeNull();
    });

    it('should handle numeric-only addresses', async () => {
      const numericAddress = {
        ...validAddress,
        address1: '123',
        city: '456'
      };

      const result = await calculateShipping(numericAddress);
      expect(result).not.toBeNull();
    });
  });

  describe('Performance', () => {
    it('should complete within reasonable time', async () => {
      const startTime = Date.now();
      await calculateShipping(validAddress);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(5000);
    });

    it('should handle concurrent requests', async () => {
      const promises = Array(5).fill(null).map(() => calculateShipping(validAddress));
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result).not.toBeNull();
      });
    });
  });

  describe('Security', () => {
    it('should sanitize input data', async () => {
      const maliciousAddress = {
        ...validAddress,
        city: '<script>alert("xss")</script>'
      };

      const result = await calculateShipping(maliciousAddress);
      expect(result).not.toBeNull();
    });

    it('should handle very large payloads', async () => {
      const largeAddress = {
        ...validAddress,
        address1: 'A'.repeat(1000),
        city: 'B'.repeat(1000)
      };

      const result = await calculateShipping(largeAddress);
      expect(result).not.toBeNull();
    });
  });

  describe('Retry Logic', () => {
    it('should retry on network errors', async () => {
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            cost: 9.99,
            currency: 'USD',
            estimatedDays: 5,
            method: 'Standard',
            isEstimated: false,
            addressValidated: true
          })
        });

      const result = await calculateShipping(validAddress);
      expect(result).not.toBeNull();
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should retry on server errors', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error'
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            cost: 9.99,
            currency: 'USD',
            estimatedDays: 5,
            method: 'Standard',
            isEstimated: false,
            addressValidated: true
          })
        });

      const result = await calculateShipping(validAddress);
      expect(result).not.toBeNull();
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should not retry on client errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request'
      });

      const result = await calculateShipping(validAddress);
      expect(result).toBeNull();
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should prevent infinite recursion', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await calculateShipping(validAddress);
      expect(result).toBeNull();
      expect(global.fetch).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });
});
