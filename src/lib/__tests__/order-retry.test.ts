import { OrderRetryManager } from '../orderRetry';

// Mock the Supabase server module
jest.mock('@/lib/supabase/server', () => ({
  createServiceClient: jest.fn(),
}));

// Mock the Prodigi client
jest.mock('@/lib/prodigi', () => ({
  prodigiClient: {
    extractBaseProdigiSku: jest.fn((sku: string) => sku.replace(/-\w{8}$/, '')),
    convertToProdigiOrder: jest.fn(),
    createOrder: jest.fn(),
  },
}));

describe('OrderRetryManager', () => {
  let orderRetryManager: OrderRetryManager;
  let mockSupabase: any;
  let mockProdigiClient: any;

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock Supabase client with proper chaining
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
    };

    // Mock createServiceClient
    const { createServiceClient } = await import('@/lib/supabase/server');
    createServiceClient.mockResolvedValue(mockSupabase);

    // Mock Prodigi client
    const prodigiModule = await import('@/lib/prodigi');
    mockProdigiClient = prodigiModule.prodigiClient;

    // Initialize OrderRetryManager
    orderRetryManager = new OrderRetryManager({
      maxRetries: 3,
      baseDelay: 1000,
      backoffMultiplier: 2,
    });
  });

  describe('Constructor', () => {
    it('should initialize with default configuration', () => {
      const manager = new OrderRetryManager();
      expect(manager).toBeInstanceOf(OrderRetryManager);
    });

    it('should initialize with custom configuration', () => {
      const manager = new OrderRetryManager({
        maxRetries: 5,
        baseDelay: 2000,
        backoffMultiplier: 3,
      });
      expect(manager).toBeInstanceOf(OrderRetryManager);
    });
  });

  describe('scheduleOperation', () => {
    it('should schedule a retry operation', async () => {
      const type = 'prodigi_order_creation';
      const orderId = 'order-123';
      const payload = { orderId: 'order-123' };

      // Mock the chained Supabase calls
      const mockInsertResult = {
        data: { id: 'retry-123' },
        error: null,
      };

      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      // Mock the insert chain to return a promise
      mockSupabase.insert.mockReturnValue({
        values: jest.fn().mockResolvedValue(mockInsertResult)
      });

      const result = await orderRetryManager.scheduleOperation(type, orderId, payload);

      expect(result).toMatch(/^retry_prodigi_order_creation_order-123_\d+$/);
      expect(mockSupabase.from).toHaveBeenCalledWith('retry_operations');
    });

    it('should handle database errors when scheduling', async () => {
      const type = 'prodigi_order_creation';
      const orderId = 'order-123';
      const payload = { orderId: 'order-123' };

      // Mock the insert to return an error
      mockSupabase.insert.mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      await expect(orderRetryManager.scheduleOperation(type, orderId, payload)).rejects.toThrow();
    });
  });

  describe('processOperation', () => {
    it('should process a retry operation successfully', async () => {
      const operationId = 'retry-operation-123';
      const mockOrder = {
        id: 'order-123',
        prodigi_order_id: null,
        status: 'pending',
        order_items: [
          {
            id: 'item-1',
            product_sku: 'FRAME-8x10-001',
            quantity: 1,
            unit_price: 25.99,
          },
        ],
      };

      const mockProdigiOrder = {
        recipient: {
          name: 'Test User',
          email: 'test@example.com',
        },
        items: [
          {
            sku: 'FRAME-8x10',
            copies: 1,
            sizing: 'fillPrintArea',
            assets: [
              {
                printArea: 'default',
                url: 'https://example.com/image.jpg',
              },
            ],
          },
        ],
      };

      const mockProdigiResponse = {
        id: 'prodigi-order-123',
        status: 'InProgress',
      };

      // Mock the operation lookup
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'retry-123',
          operation_id: operationId,
          type: 'prodigi_order_creation',
          order_id: 'order-123',
          payload: { orderId: 'order-123' },
          status: 'pending',
          attempts: 0,
        },
        error: null,
      });

      // Mock the order lookup
      mockSupabase.single.mockResolvedValueOnce({
        data: mockOrder,
        error: null,
      });

      // Mock Prodigi client methods
      mockProdigiClient.extractBaseProdigiSku.mockReturnValue('FRAME-8x10');
      mockProdigiClient.convertToProdigiOrder.mockReturnValue(mockProdigiOrder);
      mockProdigiClient.createOrder.mockResolvedValue(mockProdigiResponse);

      // Mock the order update with chained eq calls
      mockSupabase.update.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: { id: 'order-123' },
            error: null,
          }),
        }),
      });

      const result = await orderRetryManager.processOperation(operationId);

      expect(result).toBe(true);
      expect(mockProdigiClient.convertToProdigiOrder).toHaveBeenCalled();
      expect(mockProdigiClient.createOrder).toHaveBeenCalledWith(mockProdigiOrder);
    });

    it('should handle operation not found', async () => {
      const operationId = 'non-existent-operation';

      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Operation not found' },
      });

      const result = await orderRetryManager.processOperation(operationId);

      expect(result).toBe(false);
    });

    it('should handle order not found', async () => {
      const operationId = 'retry-operation-123';

      mockSupabase.single
        .mockResolvedValueOnce({
          data: {
            id: 'retry-123',
            operation_id: operationId,
            type: 'prodigi_order_creation',
            order_id: 'order-123',
            payload: { orderId: 'order-123' },
            status: 'pending',
            attempts: 0,
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'Order not found' },
        });

      const result = await orderRetryManager.processOperation(operationId);

      expect(result).toBe(false);
    });

    it('should handle Prodigi API errors', async () => {
      const operationId = 'retry-operation-123';
      const mockOrder = {
        id: 'order-123',
        prodigi_order_id: null,
        status: 'pending',
        order_items: [
          {
            id: 'item-1',
            product_sku: 'FRAME-8x10-001',
            quantity: 1,
            unit_price: 25.99,
          },
        ],
      };

      // Mock the operation lookup
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'retry-123',
          operation_id: operationId,
          type: 'prodigi_order_creation',
          order_id: 'order-123',
          payload: { orderId: 'order-123' },
          status: 'pending',
          attempts: 0,
        },
        error: null,
      });

      // Mock the order lookup
      mockSupabase.single.mockResolvedValueOnce({
        data: mockOrder,
        error: null,
      });

      // Mock Prodigi client to throw an error
      mockProdigiClient.extractBaseProdigiSku.mockReturnValue('FRAME-8x10');
      mockProdigiClient.convertToProdigiOrder.mockReturnValue({});
      mockProdigiClient.createOrder.mockRejectedValue(new Error('Prodigi API error'));

      const result = await orderRetryManager.processOperation(operationId);

      expect(result).toBe(false);
    });

    it('should handle invalid SKU', async () => {
      const operationId = 'retry-operation-123';
      const mockOrder = {
        id: 'order-123',
        prodigi_order_id: null,
        status: 'pending',
        order_items: [
          {
            id: 'item-1',
            product_sku: 'INVALID-SKU',
            quantity: 1,
            unit_price: 25.99,
          },
        ],
      };

      // Mock the operation lookup
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'retry-123',
          operation_id: operationId,
          type: 'prodigi_order_creation',
          order_id: 'order-123',
          payload: { orderId: 'order-123' },
          status: 'pending',
          attempts: 0,
        },
        error: null,
      });

      // Mock the order lookup
      mockSupabase.single.mockResolvedValueOnce({
        data: mockOrder,
        error: null,
      });

      // Mock Prodigi client to return null for invalid SKU
      mockProdigiClient.extractBaseProdigiSku.mockReturnValue(null);

      const result = await orderRetryManager.processOperation(operationId);

      expect(result).toBe(false);
    });
  });

  describe('getPendingOperations', () => {
    it('should retrieve pending operations', async () => {
      const mockOperations = [
        {
          id: 'retry-1',
          operation_id: 'op-1',
          type: 'prodigi_order_creation',
          status: 'pending',
          next_retry_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'retry-2',
          operation_id: 'op-2',
          type: 'prodigi_order_creation',
          status: 'pending',
          next_retry_at: '2024-01-01T01:00:00Z',
        },
      ];

      // Mock the chained query to return the operations
      mockSupabase.order.mockResolvedValueOnce({
        data: mockOperations,
        error: null,
      });

      const result = await orderRetryManager.getPendingOperations();

      expect(result).toEqual(mockOperations);
      expect(mockSupabase.from).toHaveBeenCalledWith('retry_operations');
    });

    it('should handle database errors when retrieving operations', async () => {
      mockSupabase.order.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      const result = await orderRetryManager.getPendingOperations();

      expect(result).toEqual([]);
    });
  });

  describe('markOperationComplete', () => {
    it('should mark operation as complete', async () => {
      const operationId = 'retry-operation-123';

      mockSupabase.update.mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: { id: 'retry-123' },
          error: null,
        }),
      });

      const result = await orderRetryManager.markOperationComplete(operationId);

      expect(result).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('retry_operations');
    });

    it('should handle database errors when marking complete', async () => {
      const operationId = 'retry-operation-123';

      mockSupabase.update.mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      });

      const result = await orderRetryManager.markOperationComplete(operationId);

      expect(result).toBe(false);
    });
  });

  describe('markOperationFailed', () => {
    it('should mark operation as failed', async () => {
      const operationId = 'retry-operation-123';
      const error = 'Prodigi API error';

      mockSupabase.update.mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: { id: 'retry-123' },
          error: null,
        }),
      });

      const result = await orderRetryManager.markOperationFailed(operationId, error);

      expect(result).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('retry_operations');
    });

    it('should handle database errors when marking failed', async () => {
      const operationId = 'retry-operation-123';
      const error = 'Prodigi API error';

      mockSupabase.update.mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      });

      const result = await orderRetryManager.markOperationFailed(operationId, error);

      expect(result).toBe(false);
    });
  });
});