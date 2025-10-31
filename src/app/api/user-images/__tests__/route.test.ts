import { NextRequest } from 'next/server';
import { GET } from '../route';

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

describe('/api/user-images', () => {
  let mockSupabase: any;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  };

  const mockSession = {
    user: mockUser,
    access_token: 'mock-token',
    expires_at: Math.floor(Date.now() / 1000) + 3600,
  };

  const mockImages = [
    {
      id: 'image-1',
      user_id: 'user-123',
      prompt: 'A beautiful sunset',
      image_url: 'https://example.com/image1.jpg',
      created_at: '2024-01-01T00:00:00Z',
      width: 1024,
      height: 1024,
      aspect_ratio: 'square',
      likes: 0,
    },
    {
      id: 'image-2',
      user_id: 'user-123',
      prompt: 'A serene lake',
      image_url: 'https://example.com/image2.jpg',
      created_at: '2024-01-02T00:00:00Z',
      width: 1024,
      height: 1024,
      aspect_ratio: 'square',
      likes: 5,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Supabase client
    mockSupabase = {
      auth: {
        getSession: jest.fn(),
      },
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn(),
    };

    // Mock createClient
    const { createClient } = jest.requireMock('@/lib/supabase/server');
    createClient.mockResolvedValue(mockSupabase);

    // Mock console methods to avoid noise in tests
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /api/user-images', () => {
    it('should fetch user images successfully', async () => {
      // Mock authentication
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      // Mock images query
      mockSupabase.range.mockResolvedValue({
        data: mockImages,
        error: null,
        count: 2,
      });

      const request = new NextRequest('http://localhost:3000/api/user-images?page=1&limit=20');
      const response = await GET(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(200);
      expect(responseData.images).toHaveLength(2);
      expect(responseData.images[0].id).toBe('image-1');
      expect(responseData.pagination).toEqual({
        page: 1,
        total_pages: 1,
        total: 2,
        has_more: false,
      });
    });

    it('should handle pagination correctly', async () => {
      const manyImages = Array.from({ length: 25 }, (_, i) => ({
        id: `image-${i + 1}`,
        user_id: 'user-123',
        prompt: `Image ${i + 1}`,
        image_url: `https://example.com/image${i + 1}.jpg`,
        created_at: `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
        width: 1024,
        height: 1024,
        aspect_ratio: 'square',
        likes: 0,
      }));

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      // First page
      mockSupabase.range.mockResolvedValueOnce({
        data: manyImages.slice(0, 20),
        error: null,
        count: 25,
      });

      const request = new NextRequest('http://localhost:3000/api/user-images?page=1&limit=20');
      const response = await GET(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(200);
      expect(responseData.images).toHaveLength(20);
      expect(responseData.pagination).toEqual({
        page: 1,
        total_pages: 2,
        total: 25,
        has_more: true,
      });
    });

    it('should use default pagination values when not provided', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      mockSupabase.range.mockResolvedValue({
        data: mockImages,
        error: null,
        count: 2,
      });

      const request = new NextRequest('http://localhost:3000/api/user-images');
      const response = await GET(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(200);
      // Should use default page=1, limit=20
      expect(mockSupabase.range).toHaveBeenCalledWith(0, 19);
    });

    it('should return 401 when user is not authenticated', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/user-images');
      const response = await GET(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(401);
      expect(responseData.error).toBe('Unauthorized');
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('should return 401 when session error occurs', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Session expired' },
      });

      const request = new NextRequest('http://localhost:3000/api/user-images');
      const response = await GET(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(401);
      expect(responseData.error).toBe('Unauthorized');
    });

    it('should handle database query errors', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      mockSupabase.range.mockResolvedValue({
        data: null,
        error: {
          message: 'Database connection failed',
          code: 'PGRST301',
        },
        count: null,
      });

      const request = new NextRequest('http://localhost:3000/api/user-images');
      const response = await GET(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(500);
      expect(responseData.error).toBe('Failed to fetch images');
      expect(responseData.details).toBe('Database connection failed');
    });

    it('should handle empty results', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      mockSupabase.range.mockResolvedValue({
        data: [],
        error: null,
        count: 0,
      });

      const request = new NextRequest('http://localhost:3000/api/user-images');
      const response = await GET(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(200);
      expect(responseData.images).toHaveLength(0);
      expect(responseData.pagination).toEqual({
        page: 1,
        total_pages: 0,
        total: 0,
        has_more: false,
      });
    });

    it('should query correct user_id', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      mockSupabase.range.mockResolvedValue({
        data: mockImages,
        error: null,
        count: 2,
      });

      const request = new NextRequest('http://localhost:3000/api/user-images');
      await GET(request);

      // Verify the query chain
      expect(mockSupabase.from).toHaveBeenCalledWith('images');
      expect(mockSupabase.select).toHaveBeenCalledWith('*', { count: 'exact' });
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(mockSupabase.order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(mockSupabase.range).toHaveBeenCalledWith(0, 19);
    });

    it('should handle page 2 correctly', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      mockSupabase.range.mockResolvedValue({
        data: mockImages.slice(1),
        error: null,
        count: 25,
      });

      const request = new NextRequest('http://localhost:3000/api/user-images?page=2&limit=20');
      const response = await GET(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(200);
      // Page 2 should start at offset 20
      expect(mockSupabase.range).toHaveBeenCalledWith(20, 39);
    });

    it('should handle invalid page number by defaulting to 1', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      mockSupabase.range.mockResolvedValue({
        data: mockImages,
        error: null,
        count: 2,
      });

      const request = new NextRequest('http://localhost:3000/api/user-images?page=abc&limit=20');
      const response = await GET(request);
      const responseData = JSON.parse(response.body as unknown as string);

      // Should default to page 1 when page is NaN
      expect(response.status).toBe(200);
      expect(responseData.pagination.page).toBe(1);
      expect(mockSupabase.range).toHaveBeenCalledWith(0, 19);
    });

    it('should handle invalid limit number by defaulting to 20', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      mockSupabase.range.mockResolvedValue({
        data: mockImages,
        error: null,
        count: 2,
      });

      const request = new NextRequest('http://localhost:3000/api/user-images?page=1&limit=abc');
      const response = await GET(request);
      const responseData = JSON.parse(response.body as unknown as string);

      // Should default to limit 20 when limit is NaN
      expect(response.status).toBe(200);
      expect(responseData.pagination.page).toBe(1);
      expect(mockSupabase.range).toHaveBeenCalledWith(0, 19);
    });

    it('should handle general errors', async () => {
      const { createClient } = jest.requireMock('@/lib/supabase/server');
      createClient.mockRejectedValue(new Error('Unexpected error'));

      const request = new NextRequest('http://localhost:3000/api/user-images');
      const response = await GET(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(500);
      expect(responseData.error).toBe('Failed to fetch user images');
    });
  });
});

