import { NextRequest } from 'next/server';
import { GET } from '../route';

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
  },
}));

describe('/api/test-simple-gallery', () => {
  const mockSupabase = require('@/lib/supabase/client').supabase;

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console methods to avoid noise in tests
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /api/test-simple-gallery', () => {
    it('should test simple gallery successfully', async () => {
      const mockImages = [
        {
          id: 'image-1',
          prompt: 'A beautiful sunset',
          image_url: 'https://example.com/image1.jpg',
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'image-2',
          prompt: 'A mountain landscape',
          image_url: 'https://example.com/image2.jpg',
          created_at: '2024-01-02T00:00:00Z',
        },
      ];

      // Mock the chained calls
      const mockFrom = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockLimit = jest.fn().mockReturnThis();

      mockSupabase.from.mockReturnValue({
        select: mockSelect.mockReturnValue({
          eq: mockEq.mockReturnValue({
            limit: mockLimit.mockResolvedValue({ data: mockImages, error: null })
          })
        })
      });

      // Mock count query
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ count: 2, error: null })
        })
      });

      const request = new NextRequest('http://localhost:3000/api/test-simple-gallery');
      const response = await GET(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.message).toBe('Simple gallery test successful');
      expect(responseData.data.totalImages).toBe(2);
      expect(responseData.data.imageCount).toBe(2);
      expect(responseData.data.sampleImages).toHaveLength(2);
    });

    it('should handle count query errors', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ 
            count: null, 
            error: { message: 'Count query failed' } 
          })
        })
      });

      const request = new NextRequest('http://localhost:3000/api/test-simple-gallery');
      const response = await GET(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Count query failed');
      expect(responseData.details).toBe('Count query failed');
    });

    it('should handle data query errors', async () => {
      // Mock successful count query
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ count: 2, error: null })
        })
      });

      // Mock failed data query
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({ 
              data: null, 
              error: { message: 'Data query failed' } 
            })
          })
        })
      });

      const request = new NextRequest('http://localhost:3000/api/test-simple-gallery');
      const response = await GET(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Data query failed');
      expect(responseData.details).toBe('Data query failed');
    });

    it('should handle empty gallery', async () => {
      // Mock successful count query
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ count: 0, error: null })
        })
      });

      // Mock successful data query with empty results
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({ data: [], error: null })
          })
        })
      });

      const request = new NextRequest('http://localhost:3000/api/test-simple-gallery');
      const response = await GET(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.totalImages).toBe(0);
      expect(responseData.data.imageCount).toBe(0);
      expect(responseData.data.sampleImages).toHaveLength(0);
    });

    it('should handle unexpected errors', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const request = new NextRequest('http://localhost:3000/api/test-simple-gallery');
      const response = await GET(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Simple gallery test failed');
      expect(responseData.details).toBe('Unexpected error');
    });

    it('should handle unknown errors', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw 'Unknown error';
      });

      const request = new NextRequest('http://localhost:3000/api/test-simple-gallery');
      const response = await GET(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Simple gallery test failed');
      expect(responseData.details).toBe('Unknown error');
    });

    it('should log test progress', async () => {
      const mockImages = [
        {
          id: 'image-1',
          prompt: 'A beautiful sunset',
          image_url: 'https://example.com/image1.jpg',
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      // Mock successful count query
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ count: 1, error: null })
        })
      });

      // Mock successful data query
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({ data: mockImages, error: null })
          })
        })
      });

      const request = new NextRequest('http://localhost:3000/api/test-simple-gallery');
      await GET(request);

      expect(console.log).toHaveBeenCalledWith('🔍 Test Simple Gallery: Starting simple gallery test');
      expect(console.log).toHaveBeenCalledWith('🔍 Test 1: Simple count query');
      expect(console.log).toHaveBeenCalledWith('✅ Count query success:', { count: 1 });
      expect(console.log).toHaveBeenCalledWith('🔍 Test 2: Simple data query');
      expect(console.log).toHaveBeenCalledWith('✅ Data query success:', { imageCount: 1 });
    });

    it('should log count query errors', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ 
            count: null, 
            error: { message: 'Count query failed' } 
          })
        })
      });

      const request = new NextRequest('http://localhost:3000/api/test-simple-gallery');
      await GET(request);

      expect(console.error).toHaveBeenCalledWith('❌ Count query error:', expect.any(Object));
    });

    it('should log data query errors', async () => {
      // Mock successful count query
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ count: 1, error: null })
        })
      });

      // Mock failed data query
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({ 
              data: null, 
              error: { message: 'Data query failed' } 
            })
          })
        })
      });

      const request = new NextRequest('http://localhost:3000/api/test-simple-gallery');
      await GET(request);

      expect(console.error).toHaveBeenCalledWith('❌ Data query error:', expect.any(Object));
    });

    it('should log unexpected errors', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const request = new NextRequest('http://localhost:3000/api/test-simple-gallery');
      await GET(request);

      expect(console.error).toHaveBeenCalledWith('❌ Test Simple Gallery: Error:', expect.any(Error));
    });
  });
});
