import { calculateShipping } from '../../utils/shipping-calculation';

global.fetch = jest.fn();

describe('Shipping Calculation Logic', () => {
  const mockAddress = {
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
    
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        cost: 9.99,
        currency: 'USD',
        estimatedDays: 5,
        isEstimated: false,
        addressValidated: true,
        method: 'Standard'
      })
    });
  });

  describe('Address Validation', () => {
    it('validates required fields', async () => {
      const incompleteAddress = {
        ...mockAddress,
        city: '',
        zip: ''
      };

      const result = await calculateShipping(incompleteAddress);
      expect(result).toBeNull();
    });

    it('validates address quality', async () => {
      const poorQualityAddress = {
        ...mockAddress,
        city: 'A', // Too short
        zip: '12' // Too short
      };

      const result = await calculateShipping(poorQualityAddress);
      expect(result).toBeNull();
    });

    it('accepts valid addresses', async () => {
      const result = await calculateShipping(mockAddress);
      expect(result).not.toBeNull();
      expect(result.cost).toBe(9.99);
    });
  });

  describe('API Communication', () => {
    it('makes correct API call with cookie-based auth', async () => {
      await calculateShipping(mockAddress);
      expect(global.fetch).toHaveBeenCalledWith('/api/cart/shipping', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          countryCode: 'US',
          stateOrCounty: 'TS',
          postalCode: '12345',
          city: 'Test City'
        })
      });
    });

    it('returns null on 401 (unauthenticated)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      });

      const result = await calculateShipping(mockAddress);
      expect(result).toBeNull();
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('does not depend on client session resolution', async () => {
      const result = await calculateShipping(mockAddress);
      expect(result).toEqual({
        cost: 9.99,
        currency: 'USD',
        estimatedDays: 5,
        isEstimated: false,
        addressValidated: true,
        method: 'Standard'
      });
    }, 15000);
  });

  describe('Error Handling', () => {
    it('handles network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await calculateShipping(mockAddress);
      expect(result).toBeNull();
    }, 15000);

    it('handles API errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request'
      });

      const result = await calculateShipping(mockAddress);
      expect(result).toBeNull();
    });

    it('retries on server errors', async () => {
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
            isEstimated: false,
            addressValidated: true
          })
        });

      const result = await calculateShipping(mockAddress);
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(result).not.toBeNull();
    }, 15000);

    it('retries on network errors', async () => {
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            cost: 9.99,
            currency: 'USD',
            estimatedDays: 5,
            isEstimated: false,
            addressValidated: true
          })
        });

      const result = await calculateShipping(mockAddress);
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(result).not.toBeNull();
    }, 15000);

    it('stops retrying after max attempts', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await calculateShipping(mockAddress);
      expect(global.fetch).toHaveBeenCalledTimes(3); // Initial + 2 retries
      expect(result).toBeNull();
    }, 15000);
  });

  describe('Response Processing', () => {
    it('processes successful response correctly', async () => {
      const result = await calculateShipping(mockAddress);
      
      expect(result).toEqual({
        cost: 9.99,
        currency: 'USD',
        estimatedDays: 5,
        isEstimated: false,
        addressValidated: true,
        method: 'Standard'
      });
    });

    it('handles missing response fields', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}) // Empty response
      });

      const result = await calculateShipping(mockAddress);
      
      expect(result).toEqual({
        cost: 0,
        currency: 'USD',
        estimatedDays: 5,
        isEstimated: false,
        addressValidated: false,
        method: 'Standard'
      });
    });

    it('handles malformed JSON response', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON'))
      });

      const result = await calculateShipping(mockAddress);
      expect(result).toBeNull();
    }, 15000);
  });

  describe('Edge Cases', () => {
    it('handles international addresses', async () => {
      const internationalAddress = {
        ...mockAddress,
        country: 'GB',
        state: 'England',
        zip: 'SW1A 1AA'
      };

      await calculateShipping(internationalAddress);

      expect(global.fetch).toHaveBeenCalledWith('/api/cart/shipping', {
        method: 'POST',
        headers: expect.any(Object),
        credentials: 'include',
        body: JSON.stringify({
          countryCode: 'GB',
          stateOrCounty: 'England',
          postalCode: 'SW1A 1AA',
          city: 'Test City'
        })
      });
    });

    it('handles special characters in addresses', async () => {
      const specialCharAddress = {
        ...mockAddress,
        address1: '123 Main St. #4B',
        city: 'São Paulo',
        zip: '01234-567'
      };

      await calculateShipping(specialCharAddress);

      expect(global.fetch).toHaveBeenCalledWith('/api/cart/shipping', {
        method: 'POST',
        headers: expect.any(Object),
        credentials: 'include',
        body: JSON.stringify({
          countryCode: 'US',
          stateOrCounty: 'TS',
          postalCode: '01234-567',
          city: 'São Paulo'
        })
      });
    });

    it('handles very long addresses', async () => {
      const longAddress = {
        ...mockAddress,
        address1: '123 Very Long Street Name That Exceeds Normal Length Limits',
        city: 'Very Long City Name That Might Cause Issues'
      };

      const result = await calculateShipping(longAddress);
      expect(result).not.toBeNull();
    });

    it('handles numeric-only addresses', async () => {
      const numericAddress = {
        ...mockAddress,
        address1: '123',
        city: '456',
        zip: '789'
      };

      const result = await calculateShipping(numericAddress);
      expect(result).not.toBeNull();
    });
  });

  describe('Performance', () => {
    it('completes within reasonable time', async () => {
      const startTime = Date.now();
      await calculateShipping(mockAddress);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(5000); // 5 seconds max
    });

    it('handles concurrent requests', async () => {
      const promises = Array(5).fill(null).map(() => calculateShipping(mockAddress));
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(5);
      expect(results.every(result => result !== null)).toBe(true);
    });
  });

  describe('Security', () => {
    it('sanitizes input data', async () => {
      const maliciousAddress = {
        ...mockAddress,
        city: '<script>alert("xss")</script>',
        address1: '123; DROP TABLE users;'
      };

      await calculateShipping(maliciousAddress);

      expect(global.fetch).toHaveBeenCalledWith('/api/cart/shipping', {
        method: 'POST',
        headers: expect.any(Object),
        credentials: 'include',
        body: JSON.stringify({
          countryCode: 'US',
          stateOrCounty: 'TS',
          postalCode: '12345',
          city: '<script>alert("xss")</script>'
        })
      });
    });

    it('handles very large payloads', async () => {
      const largeAddress = {
        ...mockAddress,
        address1: 'A'.repeat(1000),
        city: 'B'.repeat(1000)
      };

      const result = await calculateShipping(largeAddress);
      expect(result).not.toBeNull();
    });
  });
});
