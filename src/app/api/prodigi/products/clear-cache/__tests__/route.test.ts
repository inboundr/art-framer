import { NextRequest } from 'next/server';
import { POST } from '../route';

// Mock the ProdigiProductService
jest.mock('@/lib/prodigi-product-service', () => ({
  ProdigiProductService: jest.fn().mockImplementation(() => ({
    clearCache: jest.fn(),
  })),
}));

describe('/api/prodigi/products/clear-cache', () => {
  const mockProdigiProductService = jest.requireMock('@/lib/prodigi-product-service').ProdigiProductService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console methods to avoid noise in tests
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('POST /api/prodigi/products/clear-cache', () => {
    it('should clear cache successfully', async () => {
      const mockProductService = {
        clearCache: jest.fn(),
      };
      mockProdigiProductService.mockImplementation(() => mockProductService);

      const request = new NextRequest('http://localhost:3000/api/prodigi/products/clear-cache', {
        method: 'POST',
      });

      const response = await POST(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.message).toBe('Cache cleared successfully');
      expect(mockProductService.clearCache).toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      const mockProductService = {
        clearCache: jest.fn().mockImplementation(() => {
          throw new Error('Cache clear failed');
        }),
      };
      mockProdigiProductService.mockImplementation(() => mockProductService);

      const request = new NextRequest('http://localhost:3000/api/prodigi/products/clear-cache', {
        method: 'POST',
      });

      const response = await POST(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Cache clear failed');
    });

    it('should handle unknown errors', async () => {
      const mockProductService = {
        clearCache: jest.fn().mockImplementation(() => {
          throw 'Unknown error';
        }),
      };
      mockProdigiProductService.mockImplementation(() => mockProductService);

      const request = new NextRequest('http://localhost:3000/api/prodigi/products/clear-cache', {
        method: 'POST',
      });

      const response = await POST(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Unknown error');
    });

    it('should log successful cache clear', async () => {
      const mockProductService = {
        clearCache: jest.fn(),
      };
      mockProdigiProductService.mockImplementation(() => mockProductService);

      const request = new NextRequest('http://localhost:3000/api/prodigi/products/clear-cache', {
        method: 'POST',
      });

      await POST(request);

      expect(console.log).toHaveBeenCalledWith('🗑️ Prodigi product cache cleared');
    });

    it('should log errors when cache clear fails', async () => {
      const mockProductService = {
        clearCache: jest.fn().mockImplementation(() => {
          throw new Error('Cache clear failed');
        }),
      };
      mockProdigiProductService.mockImplementation(() => mockProductService);

      const request = new NextRequest('http://localhost:3000/api/prodigi/products/clear-cache', {
        method: 'POST',
      });

      await POST(request);

      expect(console.error).toHaveBeenCalledWith('Error clearing cache:', expect.any(Error));
    });
  });
});
