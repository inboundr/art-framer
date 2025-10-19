import { ProdigiClient } from '@/lib/prodigi';

// Mock global fetch
global.fetch = jest.fn();

describe('ProdigiClient Status Mapping', () => {
  let prodigiClient: ProdigiClient;

  beforeEach(() => {
    prodigiClient = new ProdigiClient('test-api-key', 'sandbox');
    (global.fetch as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getOrderStatus', () => {
    it('should map Prodigi statuses to internal statuses correctly', async () => {
      const statusMappings = [
        { prodigiStatus: 'InProgress', expectedStatus: 'processing' },
        { prodigiStatus: 'Complete', expectedStatus: 'shipped' },
        { prodigiStatus: 'Cancelled', expectedStatus: 'cancelled' },
        { prodigiStatus: 'OnHold', expectedStatus: 'pending' },
        { prodigiStatus: 'Error', expectedStatus: 'failed' },
        { prodigiStatus: 'Paused', expectedStatus: 'paused' },
        { prodigiStatus: 'Unknown', expectedStatus: 'unknown' },
      ];

      for (const mapping of statusMappings) {
        const mockOrder = {
          id: 'order-123',
          status: mapping.prodigiStatus,
          trackingNumber: 'TRACK123',
          trackingUrl: 'https://tracking.example.com/TRACK123',
          estimatedDelivery: '2024-01-20T00:00:00Z',
          items: [],
          editWindow: mapping.prodigiStatus === 'Paused' ? {
            duration: '2 hours',
            expiresAt: '2024-01-14T16:00:00Z',
            canEdit: true,
            canCancel: true,
            expired: false,
          } : undefined,
          modifications: mapping.prodigiStatus === 'Paused' ? [] : undefined,
        };

        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => mockOrder,
        });

        const result = await prodigiClient.getOrderStatus('order-123');

        expect(result.status).toBe(mapping.expectedStatus);
        expect(result.trackingNumber).toBe('TRACK123');
        expect(result.trackingUrl).toBe('https://tracking.example.com/TRACK123');
        expect(result.estimatedDelivery).toBe('2024-01-20T00:00:00Z');

        if (mapping.prodigiStatus === 'Paused') {
          expect(result.editWindow).toEqual({
            duration: '2 hours',
            expiresAt: '2024-01-14T16:00:00Z',
            canEdit: true,
            canCancel: true,
            expired: false,
          });
          expect(result.modifications).toEqual([]);
        }
      }
    });

    it('should handle paused status with edit window data', async () => {
      const mockOrder = {
        id: 'order-123',
        status: 'Paused',
        trackingNumber: undefined,
        trackingUrl: undefined,
        estimatedDelivery: undefined,
        items: [],
        editWindow: {
          duration: '24 hours',
          expiresAt: '2024-01-15T12:00:00Z',
          canEdit: true,
          canCancel: true,
          expired: false,
        },
        modifications: [
          {
            type: 'quantity_change',
            field: 'quantity',
            oldValue: 1,
            newValue: 2,
            timestamp: '2024-01-14T12:15:00Z',
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockOrder,
      });

      const result = await prodigiClient.getOrderStatus('order-123');

      expect(result.status).toBe('paused');
      expect(result.editWindow).toEqual({
        duration: '24 hours',
        expiresAt: '2024-01-15T12:00:00Z',
        canEdit: true,
        canCancel: true,
        expired: false,
      });
      expect(result.modifications).toEqual([
        {
          type: 'quantity_change',
          field: 'quantity',
          oldValue: 1,
          newValue: 2,
          timestamp: '2024-01-14T12:15:00Z',
        },
      ]);
    });

    it('should handle API errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API error'));

      await expect(prodigiClient.getOrderStatus('order-123')).rejects.toThrow('API error');
    });

    it('should handle malformed edit window data', async () => {
      const mockOrder = {
        id: 'order-123',
        status: 'Paused',
        items: [],
        editWindow: {
          duration: '2 hours',
          expiresAt: '2024-01-14T16:00:00Z',
          canEdit: 'not-boolean', // Malformed data
          canCancel: undefined,
          expired: 'not-boolean',
        },
        modifications: [],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockOrder,
      });

      const result = await prodigiClient.getOrderStatus('order-123');

      expect(result.status).toBe('paused');
      expect(result.editWindow).toEqual({
        duration: '2 hours',
        expiresAt: '2024-01-14T16:00:00Z',
        expired: 'not-boolean', // Original malformed data is preserved
        canEdit: 'not-boolean', // Original malformed data is preserved
        canCancel: undefined, // Original malformed data is preserved
      });
    });
  });

  describe('canEditOrder', () => {
    it('should return edit capabilities for paused orders', async () => {
      const mockOrderStatus = {
        status: 'paused',
        editWindow: {
          duration: '2 hours',
          expiresAt: '2024-01-14T16:00:00Z',
          canEdit: true,
          canCancel: true,
          expired: false,
        },
        modifications: [],
      };

      jest.spyOn(prodigiClient, 'getOrderStatus').mockResolvedValue(mockOrderStatus);

      const result = await prodigiClient.canEditOrder('order-123');

      expect(result.canEdit).toBe(true);
      expect(result.canCancel).toBe(true);
      expect(result.editWindow).toEqual({
        duration: '2 hours',
        expiresAt: '2024-01-14T16:00:00Z',
        expired: false,
      });
    });

    it('should handle malformed edit window data gracefully', async () => {
      const mockOrderStatus = {
        status: 'paused',
        editWindow: {
          duration: '2 hours',
          expiresAt: '2024-01-14T16:00:00Z',
          canEdit: 'not-boolean', // Malformed data
          canCancel: undefined,
          expired: 'not-boolean',
        },
        modifications: [],
      };

      jest.spyOn(prodigiClient, 'getOrderStatus').mockResolvedValue(mockOrderStatus);

      const result = await prodigiClient.canEditOrder('order-123');

      expect(result.canEdit).toBe(false); // Should default to false for malformed data
      expect(result.canCancel).toBe(false);
      expect(result.editWindow).toEqual({
        duration: '2 hours',
        expiresAt: '2024-01-14T16:00:00Z',
        expired: false,
      });
    });

    it('should return false for non-paused orders', async () => {
      const mockOrderStatus = {
        status: 'processing',
        editWindow: undefined,
        modifications: undefined,
      };

      jest.spyOn(prodigiClient, 'getOrderStatus').mockResolvedValue(mockOrderStatus);

      const result = await prodigiClient.canEditOrder('order-123');

      expect(result.canEdit).toBe(false);
      expect(result.canCancel).toBe(false);
      expect(result.editWindow).toBeUndefined();
    });
  });
});
