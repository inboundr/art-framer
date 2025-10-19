import { NextRequest } from 'next/server';
import { GET } from '@/app/api/curated-images/route';
import { curatedImageAPI } from '@/lib/curated-images';

// Mock the curated images API
jest.mock('@/lib/curated-images', () => ({
  curatedImageAPI: {
    getGallery: jest.fn(),
  },
}));

describe('/api/curated-images', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/curated-images', () => {
    it('should return curated images successfully', async () => {
      const mockImages = [
        {
          id: 'curated-1',
          image_url: 'https://example.com/image1.jpg',
          prompt: 'Beautiful sunset',
          category: 'nature',
          is_featured: true,
        },
        {
          id: 'curated-2',
          image_url: 'https://example.com/image2.jpg',
          prompt: 'Abstract art',
          category: 'art',
          is_featured: false,
        },
      ];

      (curatedImageAPI.getGallery as jest.Mock).mockResolvedValue({
        images: mockImages,
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          hasMore: true,
        },
      });

      const request = new NextRequest('http://localhost:3000/api/curated-images');
      const response = await GET(request);
      const data = JSON.parse(response.body);

      expect(response.status).toBe(200);
      expect(data.images).toEqual(mockImages);
      expect(data.pagination.hasMore).toBe(true);
    });

    it('should handle pagination parameters', async () => {
      const mockImages = [
        {
          id: 'curated-1',
          image_url: 'https://example.com/image1.jpg',
          prompt: 'Beautiful sunset',
          category: 'nature',
          is_featured: true,
        },
      ];

      (curatedImageAPI.getGallery as jest.Mock).mockResolvedValue({
        images: mockImages,
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          hasMore: true,
        },
      });

      const request = new NextRequest('http://localhost:3000/api/curated-images?page=2&limit=10');
      const response = await GET(request);
      const data = JSON.parse(response.body);

      expect(response.status).toBe(200);
      expect(data.images).toEqual(mockImages);
      expect(curatedImageAPI.getGallery).toHaveBeenCalledWith(2, 10, expect.objectContaining({}));
    });

    it('should handle category filtering', async () => {
      const mockImages = [
        {
          id: 'curated-1',
          image_url: 'https://example.com/image1.jpg',
          prompt: 'Beautiful sunset',
          category: 'nature',
          is_featured: true,
        },
      ];

      (curatedImageAPI.getGallery as jest.Mock).mockResolvedValue({
        images: mockImages,
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          hasMore: true,
        },
      });

      const request = new NextRequest('http://localhost:3000/api/curated-images?category=nature');
      const response = await GET(request);
      const data = JSON.parse(response.body);

      expect(response.status).toBe(200);
      expect(data.images).toEqual(mockImages);
      expect(curatedImageAPI.getGallery).toHaveBeenCalledWith(1, 20, expect.objectContaining({
        category: 'nature',
      }));
    });

    it('should handle featured images filtering', async () => {
      const mockImages = [
        {
          id: 'curated-1',
          image_url: 'https://example.com/image1.jpg',
          prompt: 'Beautiful sunset',
          category: 'nature',
          is_featured: true,
        },
      ];

      (curatedImageAPI.getGallery as jest.Mock).mockResolvedValue({
        images: mockImages,
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          hasMore: true,
        },
      });

      const request = new NextRequest('http://localhost:3000/api/curated-images?featured_only=true');
      const response = await GET(request);
      const data = JSON.parse(response.body);

      expect(response.status).toBe(200);
      expect(data.images).toEqual(mockImages);
      expect(curatedImageAPI.getGallery).toHaveBeenCalledWith(1, 20, expect.objectContaining({
        featured_only: true,
      }));
    });

    it('should handle API errors', async () => {
      (curatedImageAPI.getGallery as jest.Mock).mockRejectedValue(new Error('API error'));

      const request = new NextRequest('http://localhost:3000/api/curated-images');
      const response = await GET(request);
      const data = JSON.parse(response.body);

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch curated images');
    });

    it('should return empty array when no images found', async () => {
      (curatedImageAPI.getGallery as jest.Mock).mockResolvedValue({
        images: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          hasMore: false,
        },
      });

      const request = new NextRequest('http://localhost:3000/api/curated-images');
      const response = await GET(request);
      const data = JSON.parse(response.body);

      expect(response.status).toBe(200);
      expect(data.images).toEqual([]);
      expect(data.pagination.hasMore).toBe(false);
    });

    it('should handle search query', async () => {
      const mockImages = [
        {
          id: 'curated-1',
          image_url: 'https://example.com/image1.jpg',
          prompt: 'Beautiful sunset',
          category: 'nature',
          is_featured: true,
        },
      ];

      (curatedImageAPI.getGallery as jest.Mock).mockResolvedValue({
        images: mockImages,
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          hasMore: true,
        },
      });

      const request = new NextRequest('http://localhost:3000/api/curated-images?search=sunset');
      const response = await GET(request);
      const data = JSON.parse(response.body);

      expect(response.status).toBe(200);
      expect(data.images).toEqual(mockImages);
      expect(curatedImageAPI.getGallery).toHaveBeenCalledWith(1, 20, expect.objectContaining({}));
    });

    it('should handle multiple query parameters', async () => {
      const mockImages = [
        {
          id: 'curated-1',
          image_url: 'https://example.com/image1.jpg',
          prompt: 'Beautiful sunset',
          category: 'nature',
          is_featured: true,
        },
      ];

      (curatedImageAPI.getGallery as jest.Mock).mockResolvedValue({
        images: mockImages,
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          hasMore: true,
        },
      });

      const request = new NextRequest('http://localhost:3000/api/curated-images?category=nature&featured_only=true&page=1&limit=20');
      const response = await GET(request);
      const data = JSON.parse(response.body);

      expect(response.status).toBe(200);
      expect(data.images).toEqual(mockImages);
      expect(curatedImageAPI.getGallery).toHaveBeenCalledWith(1, 20, expect.objectContaining({
        category: 'nature',
        featured_only: true,
      }));
    });
  });
});