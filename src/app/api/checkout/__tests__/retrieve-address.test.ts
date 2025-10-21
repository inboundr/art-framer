import { NextRequest } from 'next/server';
import { GET } from '../retrieve-address/route';

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
  createServiceClient: jest.fn(),
}));

describe('Retrieve Address API', () => {
  let mockSupabase: any;
  let mockServiceSupabase: any;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  };

  const mockAddressData = {
    shipping_address: {
      firstName: 'John',
      lastName: 'Doe',
      address1: '123 Main St',
      address2: 'Apt 1',
      city: 'New York',
      state: 'NY',
      zip: '10001',
      country: 'US',
      phone: '555-1234',
    },
    created_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Supabase client
    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };

    // Mock service Supabase client
    mockServiceSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };

    // Mock createClient and createServiceClient
    const { createClient, createServiceClient } = jest.requireMock('@/lib/supabase/server');
    createClient.mockResolvedValue(mockSupabase);
    createServiceClient.mockReturnValue(mockServiceSupabase);
  });

  describe('GET /api/checkout/retrieve-address', () => {
    it('should retrieve address for authenticated user', async () => {
      const sessionId = 'cs_test_12345678901234567890';
      
      // Mock authentication
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock address retrieval
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockAddressData,
                error: null,
              })
            })
          })
        })
      });

      const request = new NextRequest(`http://localhost:3000/api/checkout/retrieve-address?sessionId=${sessionId}`, {
        method: 'GET',
        headers: {
          'user-agent': 'Mozilla/5.0 (compatible; Test Browser)',
          'referer': 'https://example.com',
        },
      });

      const response = await GET(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(200);
      expect(responseData.shippingAddress).toEqual(mockAddressData.shipping_address);
      expect(responseData.createdAt).toBe(mockAddressData.created_at);
    });

    it('should retrieve address for unauthenticated user using service client', async () => {
      const sessionId = 'cs_test_12345678901234567890';
      
      // Mock authentication failure
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'No user' },
      });

      // Mock service client address retrieval
      mockServiceSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockAddressData,
              error: null,
            })
          })
        })
      });

      const request = new NextRequest(`http://localhost:3000/api/checkout/retrieve-address?sessionId=${sessionId}`, {
        method: 'GET',
        headers: {
          'user-agent': 'Mozilla/5.0 (compatible; Test Browser)',
          'referer': 'https://example.com',
        },
      });

      const response = await GET(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(200);
      expect(responseData.shippingAddress).toEqual(mockAddressData.shipping_address);
    });

    it('should handle missing session ID', async () => {
      const request = new NextRequest('http://localhost:3000/api/checkout/retrieve-address', {
        method: 'GET',
        headers: {
          'user-agent': 'Mozilla/5.0 (compatible; Test Browser)',
        },
      });

      const response = await GET(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Session ID is required');
    });

    it('should handle invalid session ID format', async () => {
      const sessionId = 'invalid_session_id';
      
      const request = new NextRequest(`http://localhost:3000/api/checkout/retrieve-address?sessionId=${sessionId}`, {
        method: 'GET',
        headers: {
          'user-agent': 'Mozilla/5.0 (compatible; Test Browser)',
        },
      });

      const response = await GET(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Invalid session ID format');
    });

    it('should handle missing user agent', async () => {
      const sessionId = 'cs_test_12345678901234567890';
      
      const request = new NextRequest(`http://localhost:3000/api/checkout/retrieve-address?sessionId=${sessionId}`, {
        method: 'GET',
        headers: {},
      });

      const response = await GET(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Invalid request');
    });

    it('should handle address not found', async () => {
      const sessionId = 'cs_test_12345678901234567890';
      
      // Mock authentication
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock address not found
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116', message: 'No rows found' },
              })
            })
          })
        })
      });

      const request = new NextRequest(`http://localhost:3000/api/checkout/retrieve-address?sessionId=${sessionId}`, {
        method: 'GET',
        headers: {
          'user-agent': 'Mozilla/5.0 (compatible; Test Browser)',
        },
      });

      const response = await GET(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(404);
      expect(responseData.error).toBe('Address not found for this session');
    });

    it('should handle database error', async () => {
      const sessionId = 'cs_test_12345678901234567890';
      
      // Mock authentication
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock database error
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Database connection failed' },
              })
            })
          })
        })
      });

      const request = new NextRequest(`http://localhost:3000/api/checkout/retrieve-address?sessionId=${sessionId}`, {
        method: 'GET',
        headers: {
          'user-agent': 'Mozilla/5.0 (compatible; Test Browser)',
        },
      });

      const response = await GET(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(404);
      expect(responseData.error).toBe('Address not found');
    });

    it('should handle service client fallback error', async () => {
      const sessionId = 'cs_test_12345678901234567890';
      
      // Mock authentication failure
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'No user' },
      });

      // Mock service client error
      mockServiceSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Service client error' },
            })
          })
        })
      });

      const request = new NextRequest(`http://localhost:3000/api/checkout/retrieve-address?sessionId=${sessionId}`, {
        method: 'GET',
        headers: {
          'user-agent': 'Mozilla/5.0 (compatible; Test Browser)',
        },
      });

      const response = await GET(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(404);
      expect(responseData.error).toBe('Address not found');
    });

    it('should handle Zod validation error', async () => {
      const sessionId = ''; // Empty session ID should fail Zod validation
      
      const request = new NextRequest(`http://localhost:3000/api/checkout/retrieve-address?sessionId=${sessionId}`, {
        method: 'GET',
        headers: {
          'user-agent': 'Mozilla/5.0 (compatible; Test Browser)',
        },
      });

      const response = await GET(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Session ID is required');
    });

    it('should handle general server error', async () => {
      const sessionId = 'cs_test_12345678901234567890';
      
      // Mock authentication to throw error
      mockSupabase.auth.getUser.mockRejectedValue(new Error('Unexpected error'));

      const request = new NextRequest(`http://localhost:3000/api/checkout/retrieve-address?sessionId=${sessionId}`, {
        method: 'GET',
        headers: {
          'user-agent': 'Mozilla/5.0 (compatible; Test Browser)',
        },
      });

      const response = await GET(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(500);
      expect(responseData.error).toBe('Internal server error');
    });
  });
});
