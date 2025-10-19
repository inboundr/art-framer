import { NextRequest } from 'next/server';
import { GET } from '../route';

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

describe('/api/test-db', () => {
  const mockCreateClient = require('@/lib/supabase/server').createClient;

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console methods to avoid noise in tests
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /api/test-db', () => {
    it('should test database connection successfully', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockOrders = [
        {
          id: 'order-1',
          status: 'pending',
          created_at: '2024-01-01T00:00:00Z',
        },
      ];
      const mockProfile = {
        id: 'user-123',
        email: 'test@example.com',
      };

      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null })
        },
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: mockOrders, error: null }),
        single: jest.fn().mockResolvedValue({ data: mockProfile, error: null })
      };

      mockCreateClient.mockResolvedValue(mockSupabase);

      const request = new NextRequest('http://localhost:3000/api/test-db');
      const response = await GET(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.message).toBe('Database connection successful');
      expect(responseData.data.user).toEqual({
        id: 'user-123',
        email: 'test@example.com'
      });
      expect(responseData.data.orders.count).toBe(1);
      expect(responseData.data.profile).toEqual(mockProfile);
    });

    it('should handle authentication failure', async () => {
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null })
        }
      };

      mockCreateClient.mockResolvedValue(mockSupabase);

      const request = new NextRequest('http://localhost:3000/api/test-db');
      const response = await GET(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Authentication failed');
    });

    it('should handle authentication error', async () => {
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({ 
            data: { user: null }, 
            error: { message: 'Auth error' } 
          })
        }
      };

      mockCreateClient.mockResolvedValue(mockSupabase);

      const request = new NextRequest('http://localhost:3000/api/test-db');
      const response = await GET(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Authentication failed');
      expect(responseData.details).toBe('Auth error');
    });

    it('should handle database errors', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null })
        },
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ 
          data: null, 
          error: { message: 'Database connection failed', code: 'DB_ERROR' } 
        })
      };

      mockCreateClient.mockResolvedValue(mockSupabase);

      const request = new NextRequest('http://localhost:3000/api/test-db');
      const response = await GET(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Database error');
      expect(responseData.details).toBe('Database connection failed');
      expect(responseData.code).toBe('DB_ERROR');
    });

    it('should handle profile errors gracefully', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockOrders = [];
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null })
        },
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: mockOrders, error: null }),
        single: jest.fn().mockResolvedValue({ 
          data: null, 
          error: { message: 'Profile not found' } 
        })
      };

      mockCreateClient.mockResolvedValue(mockSupabase);

      const request = new NextRequest('http://localhost:3000/api/test-db');
      const response = await GET(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.profile).toBe(null);
      expect(responseData.data.profileError).toBe('Profile not found');
    });

    it('should handle unexpected errors', async () => {
      mockCreateClient.mockRejectedValue(new Error('Unexpected error'));

      const request = new NextRequest('http://localhost:3000/api/test-db');
      const response = await GET(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Unexpected error');
      expect(responseData.details).toBe('Unexpected error');
    });

    it('should handle unknown errors', async () => {
      mockCreateClient.mockRejectedValue('Unknown error');

      const request = new NextRequest('http://localhost:3000/api/test-db');
      const response = await GET(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Unexpected error');
      expect(responseData.details).toBe('Unknown error');
    });

    it('should log database test progress', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockOrders = [];
      const mockProfile = { id: 'user-123', email: 'test@example.com' };

      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null })
        },
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: mockOrders, error: null }),
        single: jest.fn().mockResolvedValue({ data: mockProfile, error: null })
      };

      mockCreateClient.mockResolvedValue(mockSupabase);

      const request = new NextRequest('http://localhost:3000/api/test-db');
      await GET(request);

      expect(console.log).toHaveBeenCalledWith('🔍 Test DB: Starting database test');
      expect(console.log).toHaveBeenCalledWith('🔍 Test DB: Auth check', {
        hasUser: true,
        userId: 'user-123',
        authError: undefined
      });
    });

    it('should log errors when database fails', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null })
        },
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ 
          data: null, 
          error: { message: 'Database connection failed', code: 'DB_ERROR' } 
        })
      };

      mockCreateClient.mockResolvedValue(mockSupabase);

      const request = new NextRequest('http://localhost:3000/api/test-db');
      await GET(request);

      expect(console.error).toHaveBeenCalledWith('❌ Test DB: Orders table error:', expect.any(Object));
    });

    it('should log unexpected errors', async () => {
      mockCreateClient.mockRejectedValue(new Error('Unexpected error'));

      const request = new NextRequest('http://localhost:3000/api/test-db');
      await GET(request);

      expect(console.error).toHaveBeenCalledWith('❌ Test DB: Unexpected error:', expect.any(Error));
    });
  });
});
