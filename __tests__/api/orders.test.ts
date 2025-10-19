import { NextRequest } from 'next/server';
import { GET } from '@/app/api/orders/route';
import { createClient, createServiceClient } from '@/lib/supabase/server';

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
  createServiceClient: jest.fn(),
}));

describe('/api/orders', () => {
  let mockSupabase: any;
  let mockServiceSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase = {
      auth: {
        getUser: jest.fn(),
        getSession: jest.fn(),
        refreshSession: jest.fn(),
      },
      from: jest.fn(),
    };

    mockServiceSupabase = {
      from: jest.fn(),
    };

    (createClient as jest.Mock).mockReturnValue(mockSupabase);
    (createServiceClient as jest.Mock).mockReturnValue(mockServiceSupabase);
  });

  describe('GET /api/orders', () => {
    it('should return orders for authenticated user', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
      };

      const mockOrders = [
        {
          id: 'order-1',
          user_id: 'user-1',
          status: 'paid',
          total: 99.99,
          created_at: '2023-01-01T00:00:00Z',
        },
        {
          id: 'order-2',
          user_id: 'user-1',
          status: 'shipped',
          total: 149.99,
          created_at: '2023-01-02T00:00:00Z',
        },
      ];

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
      
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: mockUser } },
        error: null,
      });

      const mockRange = jest.fn().mockResolvedValue({
        data: mockOrders,
        error: null,
        count: mockOrders.length
      });
      
      const mockOrder = jest.fn().mockReturnValue({
        range: mockRange
      });
      
      const mockEq = jest.fn().mockReturnValue({
        order: mockOrder
      });
      
      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq
      });
      
      const mockFrom = jest.fn().mockReturnValue({
        select: mockSelect
      });

      mockSupabase.from = mockFrom;

      const request = new NextRequest('http://localhost:3000/api/orders');
      const response = await GET(request);
      const data = JSON.parse(response.body);

      console.log('Response status:', response.status);
      console.log('Response data:', data);

      expect(response.status).toBe(200);
      expect(data.orders).toEqual(mockOrders);
    });

    it('should return 401 for unauthenticated user', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/orders');
      const response = await GET(request);
      const data = JSON.parse(response.body);

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should handle database errors', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockRange = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });
      
      const mockOrder = jest.fn().mockReturnValue({
        range: mockRange
      });
      
      const mockEq = jest.fn().mockReturnValue({
        order: mockOrder
      });
      
      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq
      });
      
      const mockFrom = jest.fn().mockReturnValue({
        select: mockSelect
      });

      mockSupabase.from = mockFrom;

      const request = new NextRequest('http://localhost:3000/api/orders');
      const response = await GET(request);
      const data = JSON.parse(response.body);

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch orders');
    });

    it('should handle pagination parameters', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockRange = jest.fn().mockResolvedValue({
        data: [],
        error: null,
        count: 0
      });
      
      const mockOrder = jest.fn().mockReturnValue({
        range: mockRange
      });
      
      const mockEq = jest.fn().mockReturnValue({
        order: mockOrder
      });
      
      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq
      });
      
      const mockFrom = jest.fn().mockReturnValue({
        select: mockSelect
      });

      mockSupabase.from = mockFrom;

      const request = new NextRequest('http://localhost:3000/api/orders?limit=10&offset=20');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockFrom).toHaveBeenCalledWith('orders');
    });
  });
});