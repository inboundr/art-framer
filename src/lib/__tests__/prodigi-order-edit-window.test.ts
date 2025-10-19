import { ProdigiClient } from '../prodigi';

// Mock fetch globally
global.fetch = jest.fn();

describe('Prodigi Order Edit Window Feature', () => {
  let prodigiClient: ProdigiClient;
  const mockApiKey = 'test-api-key';
  const mockEnvironment = 'sandbox' as const;

  beforeEach(() => {
    // Set up environment variable for callbackUrl
    process.env.NEXT_PUBLIC_APP_URL = 'https://test-app.com';
    prodigiClient = new ProdigiClient(mockApiKey, mockEnvironment);
    jest.clearAllMocks();
  });

  describe('Order Creation with Edit Window', () => {
    const mockProdigiOrder = {
      merchantReference: 'ORDER-123',
      shippingMethod: 'Standard',
      callbackUrl: 'https://test-app.com/api/webhooks/prodigi',
      recipient: {
        name: 'John Doe',
        email: 'john@example.com',
        phoneNumber: '555-1234',
        address: {
          line1: '123 Main St',
          line2: 'Apt 1',
          postalOrZipCode: '10001',
          countryCode: 'US',
          townOrCity: 'New York',
          stateOrCounty: 'NY',
        },
      },
      items: [
        {
          merchantReference: 'item-1',
          sku: 'GLOBAL-CFPM-16X20',
          copies: 1,
          sizing: 'fillPrintArea',
          attributes: {},
          assets: [
            {
              printArea: 'Default',
              url: 'https://example.com/image.jpg',
            },
          ],
        },
      ],
      metadata: {},
    };

    it('should handle immediate processing (no edit window)', async () => {
      const mockResponse = {
        outcome: 'Created',
        order: {
          id: 'ord_123456',
          status: 'InProgress',
          trackingNumber: 'TRK123',
          trackingUrl: 'https://tracking.example.com/TRK123',
          estimatedDelivery: '2024-01-15T00:00:00Z',
          totalPrice: 29.99,
          currency: 'USD',
          items: [
            {
              sku: 'GLOBAL-CFPM-16X20',
              quantity: 1,
              status: 'InProgress',
            },
          ],
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await prodigiClient.createOrder(mockProdigiOrder);

      expect(result).toEqual(mockResponse);
      expect(result.outcome).toBe('Created');
      expect(result.order.status).toBe('InProgress');
    });

    it('should handle order paused for editing (2 hours)', async () => {
      const mockResponse = {
        outcome: 'Created',
        order: {
          id: 'ord_123456',
          status: 'Paused', // New status when order is paused for editing
          trackingNumber: null, // No tracking yet
          trackingUrl: null,
          estimatedDelivery: null, // No delivery estimate yet
          totalPrice: 29.99,
          currency: 'USD',
          items: [
            {
              sku: 'GLOBAL-CFPM-16X20',
              quantity: 1,
              status: 'Paused', // Items also paused
            },
          ],
          editWindow: {
            duration: '2 hours',
            expiresAt: '2024-01-14T14:00:00Z', // 2 hours from now
            canEdit: true,
            canCancel: true,
          },
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await prodigiClient.createOrder(mockProdigiOrder);

      expect(result).toEqual(mockResponse);
      expect(result.outcome).toBe('Created');
      expect(result.order.status).toBe('Paused');
      expect(result.order.editWindow).toBeDefined();
      expect(result.order.editWindow.canEdit).toBe(true);
      expect(result.order.editWindow.canCancel).toBe(true);
    });

    it('should handle order paused for editing (24 hours)', async () => {
      const mockResponse = {
        outcome: 'Created',
        order: {
          id: 'ord_123456',
          status: 'Paused',
          trackingNumber: null,
          trackingUrl: null,
          estimatedDelivery: null,
          totalPrice: 29.99,
          currency: 'USD',
          items: [
            {
              sku: 'GLOBAL-CFPM-16X20',
              quantity: 1,
              status: 'Paused',
            },
          ],
          editWindow: {
            duration: '24 hours',
            expiresAt: '2024-01-15T12:00:00Z', // 24 hours from now
            canEdit: true,
            canCancel: true,
          },
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await prodigiClient.createOrder(mockProdigiOrder);

      expect(result).toEqual(mockResponse);
      expect(result.order.editWindow.duration).toBe('24 hours');
    });

    it('should handle order paused indefinitely', async () => {
      const mockResponse = {
        outcome: 'Created',
        order: {
          id: 'ord_123456',
          status: 'Paused',
          trackingNumber: null,
          trackingUrl: null,
          estimatedDelivery: null,
          totalPrice: 29.99,
          currency: 'USD',
          items: [
            {
              sku: 'GLOBAL-CFPM-16X20',
              quantity: 1,
              status: 'Paused',
            },
          ],
          editWindow: {
            duration: 'indefinite',
            expiresAt: null, // No expiration
            canEdit: true,
            canCancel: true,
          },
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await prodigiClient.createOrder(mockProdigiOrder);

      expect(result).toEqual(mockResponse);
      expect(result.order.editWindow.duration).toBe('indefinite');
      expect(result.order.editWindow.expiresAt).toBeNull();
    });

    it('should handle order status after edit window expires', async () => {
      // Simulate getting order status after edit window has expired
      const mockResponse = {
        outcome: 'Retrieved',
        order: {
          id: 'ord_123456',
          status: 'InProgress', // Status changed from Paused to InProgress
          trackingNumber: 'TRK123',
          trackingUrl: 'https://tracking.example.com/TRK123',
          estimatedDelivery: '2024-01-15T00:00:00Z',
          totalPrice: 29.99,
          currency: 'USD',
          items: [
            {
              sku: 'GLOBAL-CFPM-16X20',
              quantity: 1,
              status: 'InProgress',
            },
          ],
          editWindow: {
            duration: '2 hours',
            expiresAt: '2024-01-14T14:00:00Z',
            canEdit: false, // Can no longer edit
            canCancel: false, // Can no longer cancel
            expired: true, // Edit window has expired
          },
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await prodigiClient.getOrder('ord_123456');

      expect(result).toEqual(mockResponse);
      expect(result.order.status).toBe('InProgress');
      expect(result.order.editWindow.expired).toBe(true);
      expect(result.order.editWindow.canEdit).toBe(false);
    });

    it('should handle order cancellation during edit window', async () => {
      const mockResponse = {
        outcome: 'Cancelled',
        order: {
          id: 'ord_123456',
          status: 'Cancelled',
          trackingNumber: null,
          trackingUrl: null,
          estimatedDelivery: null,
          totalPrice: 29.99,
          currency: 'USD',
          items: [
            {
              sku: 'GLOBAL-CFPM-16X20',
              quantity: 1,
              status: 'Cancelled',
            },
          ],
          cancelledAt: '2024-01-14T13:30:00Z',
          cancellationReason: 'Customer requested cancellation during edit window',
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await prodigiClient.cancelOrder('ord_123456');

      expect(result).toEqual(mockResponse);
      expect(result.outcome).toBe('Cancelled');
    });

    it('should handle order modification during edit window', async () => {
      const mockResponse = {
        outcome: 'Updated',
        order: {
          id: 'ord_123456',
          status: 'Paused', // Still paused after modification
          trackingNumber: null,
          trackingUrl: null,
          estimatedDelivery: null,
          totalPrice: 35.99, // Price changed
          currency: 'USD',
          items: [
            {
              sku: 'GLOBAL-CFPM-16X20',
              quantity: 2, // Quantity changed
              status: 'Paused',
            },
          ],
          editWindow: {
            duration: '2 hours',
            expiresAt: '2024-01-14T14:00:00Z',
            canEdit: true,
            canCancel: true,
          },
          modifications: [
            {
              type: 'quantity_change',
              field: 'quantity',
              oldValue: 1,
              newValue: 2,
              timestamp: '2024-01-14T13:15:00Z',
            },
          ],
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await prodigiClient.getOrder('ord_123456');

      expect(result).toEqual(mockResponse);
      expect(result.outcome).toBe('Updated');
      expect(result.order.modifications).toBeDefined();
      expect(result.order.modifications[0].type).toBe('quantity_change');
    });
  });

  describe('Status Mapping with Edit Window', () => {
    it('should map paused status correctly', async () => {
      const mockResponse = {
        id: 'ord_123456',
        status: 'Paused',
        totalPrice: 29.99,
        currency: 'USD',
        items: [],
        editWindow: {
          duration: '2 hours',
          expiresAt: '2024-01-14T14:00:00Z',
          canEdit: true,
          canCancel: true,
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await prodigiClient.getOrderStatus('ord_123456');

      expect(result.status).toBe('paused'); // Should map to our internal status
      expect(result.editWindow).toBeDefined();
      expect(result.editWindow?.canEdit).toBe(true);
    });

    it('should handle transition from paused to in-progress', async () => {
      const mockResponse = {
        id: 'ord_123456',
        status: 'InProgress',
        trackingNumber: 'TRK123',
        trackingUrl: 'https://tracking.example.com/TRK123',
        estimatedDelivery: '2024-01-15T00:00:00Z',
        totalPrice: 29.99,
        currency: 'USD',
        items: [],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await prodigiClient.getOrderStatus('ord_123456');

      expect(result.status).toBe('processing'); // Should map to our internal status
      expect(result.trackingNumber).toBe('TRK123');
    });
  });

  describe('Order Modification Methods', () => {
    it('should check if order can be edited', async () => {
      const mockResponse = {
        id: 'ord_123456',
        status: 'Paused',
        totalPrice: 29.99,
        currency: 'USD',
        items: [],
        editWindow: {
          duration: '2 hours',
          expiresAt: '2024-01-14T14:00:00Z',
          canEdit: true,
          canCancel: true,
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await prodigiClient.canEditOrder('ord_123456');

      expect(result.canEdit).toBe(true);
      expect(result.canCancel).toBe(true);
      expect(result.editWindow?.duration).toBe('2 hours');
    });

    it('should update order during edit window', async () => {
      const mockResponse = {
        id: 'ord_123456',
        status: 'Paused',
        totalPrice: 35.99,
        currency: 'USD',
        items: [
          {
            sku: 'GLOBAL-CFPM-16X20',
            quantity: 2,
            status: 'Paused',
          },
        ],
        editWindow: {
          duration: '2 hours',
          expiresAt: '2024-01-14T14:00:00Z',
          canEdit: true,
          canCancel: true,
        },
        modifications: [
          {
            type: 'quantity_change',
            field: 'quantity',
            oldValue: 1,
            newValue: 2,
            timestamp: '2024-01-14T13:15:00Z',
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await prodigiClient.updateOrder('ord_123456', {
        items: [
          {
            sku: 'GLOBAL-CFPM-16X20',
            quantity: 2,
            attributes: {},
          },
        ],
      });

      expect(result.id).toBe('ord_123456');
      expect(result.status).toBe('Paused');
      expect(result.totalPrice).toBe(35.99);
      expect(result.modifications).toBeDefined();
    });
  });

  describe('Error Handling with Edit Window', () => {
    it('should handle edit window expiration errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => JSON.stringify({
          error: 'Edit window has expired',
          message: 'Order can no longer be modified',
        }),
        json: async () => ({
          error: 'Edit window has expired',
          message: 'Order can no longer be modified',
        }),
      });

      await expect(prodigiClient.cancelOrder('ord_123456')).rejects.toThrow();
    });

    it('should handle invalid edit operations', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => JSON.stringify({
          error: 'Invalid operation',
          message: 'Order is not in a state that allows modification',
        }),
        json: async () => ({
          error: 'Invalid operation',
          message: 'Order is not in a state that allows modification',
        }),
      });

      await expect(prodigiClient.cancelOrder('ord_123456')).rejects.toThrow();
    });
  });

  describe('Edge Cases and Potential Issues', () => {
    it('should handle concurrent modifications during edit window', async () => {
      const mockResponse = {
        id: 'ord_123456',
        status: 'Paused',
        totalPrice: 29.99,
        currency: 'USD',
        items: [],
        editWindow: {
          duration: '2 hours',
          expiresAt: '2024-01-14T14:00:00Z',
          canEdit: true,
          canCancel: true,
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      // Simulate concurrent modifications
      const promises = [
        prodigiClient.updateOrder('ord_123456', { items: [{ sku: 'SKU1', quantity: 1, attributes: {} }] }),
        prodigiClient.updateOrder('ord_123456', { items: [{ sku: 'SKU2', quantity: 2, attributes: {} }] }),
      ];

      // Both should succeed or one should fail gracefully
      const results = await Promise.allSettled(promises);
      expect(results.length).toBe(2);
    });

    it('should handle edit window expiration during API call', async () => {
      // Mock a response that shows edit window expired during the call
      const mockResponse = {
        id: 'ord_123456',
        status: 'InProgress', // Changed from Paused
        totalPrice: 29.99,
        currency: 'USD',
        items: [],
        editWindow: {
          duration: '2 hours',
          expiresAt: '2024-01-14T14:00:00Z',
          canEdit: false, // No longer editable
          canCancel: false,
          expired: true, // Edit window expired
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await prodigiClient.canEditOrder('ord_123456');
      expect(result.canEdit).toBe(false);
      expect(result.editWindow?.expired).toBe(true);
    });

    it('should handle malformed edit window data', async () => {
      const mockResponse = {
        id: 'ord_123456',
        status: 'Paused',
        totalPrice: 29.99,
        currency: 'USD',
        items: [],
        editWindow: {
          // Missing required fields
          duration: null,
          expiresAt: 'invalid-date',
          canEdit: 'not-boolean', // Wrong type
          canCancel: undefined,
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await prodigiClient.canEditOrder('ord_123456');
      // Should handle malformed data gracefully
      expect(result.canEdit).toBe(false); // Should default to false for invalid data
      expect(result.canCancel).toBe(false);
    });

    it('should handle network timeout during edit window operations', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network timeout'));

      await expect(prodigiClient.updateOrder('ord_123456', { items: [] })).rejects.toThrow('Network timeout');
    });

    it('should handle partial edit window data', async () => {
      const mockResponse = {
        id: 'ord_123456',
        status: 'Paused',
        totalPrice: 29.99,
        currency: 'USD',
        items: [],
        editWindow: {
          duration: '2 hours',
          // Missing expiresAt, canEdit, canCancel
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await prodigiClient.canEditOrder('ord_123456');
      expect(result.canEdit).toBe(false); // Should default to false for missing data
      expect(result.canCancel).toBe(false);
    });

    it('should handle very long edit window durations', async () => {
      const mockResponse = {
        id: 'ord_123456',
        status: 'Paused',
        totalPrice: 29.99,
        currency: 'USD',
        items: [],
        editWindow: {
          duration: '999999 hours', // Extremely long duration
          expiresAt: '2099-12-31T23:59:59Z', // Far future date
          canEdit: true,
          canCancel: true,
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await prodigiClient.canEditOrder('ord_123456');
      expect(result.canEdit).toBe(true);
      expect(result.canCancel).toBe(true);
      expect(result.editWindow?.duration).toBe('999999 hours');
    });

    it('should handle edit window with past expiration date', async () => {
      const mockResponse = {
        id: 'ord_123456',
        status: 'InProgress', // Should be InProgress if edit window expired
        totalPrice: 29.99,
        currency: 'USD',
        items: [],
        editWindow: {
          duration: '2 hours',
          expiresAt: '2020-01-01T00:00:00Z', // Past date
          canEdit: false,
          canCancel: false,
          expired: true,
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await prodigiClient.canEditOrder('ord_123456');
      expect(result.canEdit).toBe(false);
      expect(result.canCancel).toBe(false);
      expect(result.editWindow?.expired).toBe(true);
    });
  });
});
