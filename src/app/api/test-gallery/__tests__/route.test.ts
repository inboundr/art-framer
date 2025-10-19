import { NextRequest } from 'next/server';
import { GET } from '../route';

// Mock the Supabase images API
jest.mock('@/lib/supabase/images', () => ({
  supabaseImageAPI: {
    getGallery: jest.fn(),
  },
}));

describe('/api/test-gallery', () => {
  const mockSupabaseImageAPI = require('@/lib/supabase/images').supabaseImageAPI;

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console methods to avoid noise in tests
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    
    // Mock Date.now to control timing
    jest.spyOn(Date, 'now')
      .mockReturnValueOnce(1000) // startTime
      .mockReturnValueOnce(1500); // endTime
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /api/test-gallery', () => {
    it('should test gallery successfully', async () => {
      const mockGalleryResponse = {
        images: [
          {
            id: 'image-1',
            prompt: 'A beautiful sunset',
            image_url: 'https://example.com/image1.jpg',
            status: 'completed',
            is_public: true,
          },
          {
            id: 'image-2',
            prompt: 'A mountain landscape',
            image_url: 'https://example.com/image2.jpg',
            status: 'completed',
            is_public: true,
          },
          {
            id: 'image-3',
            prompt: 'A city skyline',
            image_url: null,
            status: 'processing',
            is_public: false,
          },
        ],
        pagination: {
          total: 3,
          has_more: false,
        },
      };

      mockSupabaseImageAPI.getGallery.mockResolvedValue(mockGalleryResponse);

      const request = new NextRequest('http://localhost:3000/api/test-gallery');
      const response = await GET(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.message).toBe('Gallery test successful');
      expect(responseData.data.duration).toBe(500);
      expect(responseData.data.imageCount).toBe(3);
      expect(responseData.data.totalImages).toBe(3);
      expect(responseData.data.hasMore).toBe(false);
      expect(responseData.data.sampleImages).toHaveLength(2);
      expect(responseData.data.sampleImages[0]).toEqual({
        id: 'image-1',
        prompt: 'A beautiful sunset',
        image_url: 'present',
        status: 'completed',
        is_public: true,
      });
    });

    it('should handle gallery API errors', async () => {
      mockSupabaseImageAPI.getGallery.mockRejectedValue(new Error('Gallery API error'));

      const request = new NextRequest('http://localhost:3000/api/test-gallery');
      const response = await GET(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Gallery test failed');
      expect(responseData.details).toBe('Gallery API error');
    });

    it('should handle unknown errors', async () => {
      mockSupabaseImageAPI.getGallery.mockRejectedValue('Unknown error');

      const request = new NextRequest('http://localhost:3000/api/test-gallery');
      const response = await GET(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Gallery test failed');
      expect(responseData.details).toBe('Unknown error');
    });

    it('should log successful gallery test', async () => {
      const mockGalleryResponse = {
        images: [
          {
            id: 'image-1',
            prompt: 'A beautiful sunset',
            image_url: 'https://example.com/image1.jpg',
            status: 'completed',
            is_public: true,
          },
        ],
        pagination: {
          total: 1,
          has_more: false,
        },
      };

      mockSupabaseImageAPI.getGallery.mockResolvedValue(mockGalleryResponse);

      const request = new NextRequest('http://localhost:3000/api/test-gallery');
      await GET(request);

      expect(console.log).toHaveBeenCalledWith('🔍 Test Gallery: Starting gallery test');
      expect(console.log).toHaveBeenCalledWith('✅ Test Gallery: Success', {
        duration: 500,
        imageCount: 1,
        totalImages: 1,
      });
    });

    it('should log errors when gallery test fails', async () => {
      mockSupabaseImageAPI.getGallery.mockRejectedValue(new Error('Gallery API error'));

      const request = new NextRequest('http://localhost:3000/api/test-gallery');
      await GET(request);

      expect(console.error).toHaveBeenCalledWith('❌ Test Gallery: Error:', expect.any(Error));
    });

    it('should handle empty gallery response', async () => {
      const mockGalleryResponse = {
        images: [],
        pagination: {
          total: 0,
          has_more: false,
        },
      };

      mockSupabaseImageAPI.getGallery.mockResolvedValue(mockGalleryResponse);

      const request = new NextRequest('http://localhost:3000/api/test-gallery');
      const response = await GET(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.imageCount).toBe(0);
      expect(responseData.data.totalImages).toBe(0);
      expect(responseData.data.sampleImages).toHaveLength(0);
    });

    it('should handle gallery with missing image URLs', async () => {
      const mockGalleryResponse = {
        images: [
          {
            id: 'image-1',
            prompt: 'A beautiful sunset',
            image_url: null,
            status: 'processing',
            is_public: false,
          },
        ],
        pagination: {
          total: 1,
          has_more: false,
        },
      };

      mockSupabaseImageAPI.getGallery.mockResolvedValue(mockGalleryResponse);

      const request = new NextRequest('http://localhost:3000/api/test-gallery');
      const response = await GET(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.sampleImages[0].image_url).toBe('missing');
    });
  });
});
