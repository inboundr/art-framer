import { NextRequest } from 'next/server';
import { GET } from '../featured/route';

// Mock the curated images API
jest.mock('@/lib/curated-images', () => ({
  curatedImageAPI: {
    getFeaturedImages: jest.fn(),
  },
}));

describe('/api/curated-images/featured', () => {
  const mockCuratedImageAPI = jest.requireMock('@/lib/curated-images').curatedImageAPI;

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console methods to avoid noise in tests
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /api/curated-images/featured', () => {
    it('should return featured images successfully', async () => {
      const mockImages = [
        {
          id: '1',
          title: 'Featured Image 1',
          image_url: 'https://example.com/image1.jpg',
          thumbnail_url: 'https://example.com/thumb1.jpg',
          prompt: 'A beautiful landscape',
          style: 'photographic',
          featured: true,
        },
        {
          id: '2',
          title: 'Featured Image 2',
          image_url: 'https://example.com/image2.jpg',
          thumbnail_url: 'https://example.com/thumb2.jpg',
          prompt: 'An abstract painting',
          style: 'artistic',
          featured: true,
        },
      ];

      mockCuratedImageAPI.getFeaturedImages.mockResolvedValue(mockImages);

      const request = new NextRequest('http://localhost:3000/api/curated-images/featured');
      const response = await GET(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(200);
      expect(responseData.images).toEqual(mockImages);
      expect(mockCuratedImageAPI.getFeaturedImages).toHaveBeenCalledWith(12);
    });

    it('should use custom limit parameter', async () => {
      const mockImages = [
        {
          id: '1',
          title: 'Featured Image 1',
          image_url: 'https://example.com/image1.jpg',
          thumbnail_url: 'https://example.com/thumb1.jpg',
          prompt: 'A beautiful landscape',
          style: 'photographic',
          featured: true,
        },
      ];

      mockCuratedImageAPI.getFeaturedImages.mockResolvedValue(mockImages);

      const request = new NextRequest('http://localhost:3000/api/curated-images/featured?limit=5');
      const response = await GET(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(200);
      expect(responseData.images).toEqual(mockImages);
      expect(mockCuratedImageAPI.getFeaturedImages).toHaveBeenCalledWith(5);
    });

    it('should handle invalid limit parameter gracefully', async () => {
      const mockImages: any[] = [];

      mockCuratedImageAPI.getFeaturedImages.mockResolvedValue(mockImages);

      const request = new NextRequest('http://localhost:3000/api/curated-images/featured?limit=invalid');
      const response = await GET(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(200);
      expect(responseData.images).toEqual(mockImages);
      expect(mockCuratedImageAPI.getFeaturedImages).toHaveBeenCalledWith(NaN);
    });

    it('should handle API errors gracefully', async () => {
      const errorMessage = 'Database connection failed';
      mockCuratedImageAPI.getFeaturedImages.mockRejectedValue(new Error(errorMessage));

      const request = new NextRequest('http://localhost:3000/api/curated-images/featured');
      const response = await GET(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(500);
      expect(responseData.error).toBe('Failed to fetch featured images');
      expect(responseData.details).toBe(errorMessage);
    });

    it('should handle unknown errors gracefully', async () => {
      mockCuratedImageAPI.getFeaturedImages.mockRejectedValue('Unknown error');

      const request = new NextRequest('http://localhost:3000/api/curated-images/featured');
      const response = await GET(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(500);
      expect(responseData.error).toBe('Failed to fetch featured images');
      expect(responseData.details).toBe('Unknown error');
    });

    it('should log API calls and responses', async () => {
      const mockImages = [
        {
          id: '1',
          title: 'Featured Image 1',
          image_url: 'https://example.com/image1.jpg',
          thumbnail_url: 'https://example.com/thumb1.jpg',
          prompt: 'A beautiful landscape',
          style: 'photographic',
          featured: true,
        },
      ];

      mockCuratedImageAPI.getFeaturedImages.mockResolvedValue(mockImages);

      const request = new NextRequest('http://localhost:3000/api/curated-images/featured?limit=5');
      await GET(request);

      expect(console.log).toHaveBeenCalledWith('🔍 Featured curated images API called with limit:', 5);
      expect(console.log).toHaveBeenCalledWith('✅ Featured curated images API response:', { 
        imageCount: 1
      });
    });

    it('should log errors when API fails', async () => {
      const errorMessage = 'Database connection failed';
      mockCuratedImageAPI.getFeaturedImages.mockRejectedValue(new Error(errorMessage));

      const request = new NextRequest('http://localhost:3000/api/curated-images/featured');
      await GET(request);

      expect(console.error).toHaveBeenCalledWith('❌ Featured curated images API error:', expect.any(Error));
    });
  });
});
