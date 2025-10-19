import { NextRequest } from 'next/server';
import { GET } from '../route';

// Mock the ProdigiProductService
jest.mock('@/lib/prodigi-product-service', () => ({
  ProdigiProductService: jest.fn().mockImplementation(() => ({
    searchProducts: jest.fn(),
    getAllProducts: jest.fn(),
    getFallbackResponse: jest.fn(),
  })),
}));

describe('/api/prodigi/products', () => {
  const mockProdigiProductService = require('@/lib/prodigi-product-service').ProdigiProductService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console methods to avoid noise in tests
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /api/prodigi/products', () => {
    it('should return all products when no filters are provided', async () => {
      const mockProducts = {
        count: 2,
        products: [
          {
            id: 'product-1',
            name: '8x10 Black Frame',
            category: 'frames',
            size: '8x10',
            material: 'wood',
            finish: 'black',
            price: 29.99,
          },
          {
            id: 'product-2',
            name: '11x14 White Frame',
            category: 'frames',
            size: '11x14',
            material: 'wood',
            finish: 'white',
            price: 39.99,
          },
        ],
        fallback: false,
      };

      const mockProductService = {
        getAllProducts: jest.fn().mockResolvedValue(mockProducts),
      };
      mockProdigiProductService.mockImplementation(() => mockProductService);

      const request = new NextRequest('http://localhost:3000/api/prodigi/products');
      const response = await GET(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(200);
      expect(responseData).toEqual(mockProducts);
      expect(mockProductService.getAllProducts).toHaveBeenCalled();
    });

    it('should search products with filters', async () => {
      const mockSearchResults = {
        count: 1,
        products: [
          {
            id: 'product-1',
            name: '8x10 Black Frame',
            category: 'frames',
            size: '8x10',
            material: 'wood',
            finish: 'black',
            price: 29.99,
          },
        ],
        fallback: false,
      };

      const mockProductService = {
        searchProducts: jest.fn().mockResolvedValue(mockSearchResults),
      };
      mockProdigiProductService.mockImplementation(() => mockProductService);

      const request = new NextRequest('http://localhost:3000/api/prodigi/products?category=frames&size=8x10&material=wood&finish=black');
      const response = await GET(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(200);
      expect(responseData).toEqual(mockSearchResults);
      expect(mockProductService.searchProducts).toHaveBeenCalledWith({
        category: 'frames',
        size: '8x10',
        material: 'wood',
        finish: 'black',
      });
    });

    it('should handle partial filters', async () => {
      const mockSearchResults = {
        count: 1,
        products: [
          {
            id: 'product-1',
            name: '8x10 Black Frame',
            category: 'frames',
            size: '8x10',
            material: 'wood',
            finish: 'black',
            price: 29.99,
          },
        ],
        fallback: false,
      };

      const mockProductService = {
        searchProducts: jest.fn().mockResolvedValue(mockSearchResults),
      };
      mockProdigiProductService.mockImplementation(() => mockProductService);

      const request = new NextRequest('http://localhost:3000/api/prodigi/products?category=frames&size=8x10');
      const response = await GET(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(200);
      expect(responseData).toEqual(mockSearchResults);
      expect(mockProductService.searchProducts).toHaveBeenCalledWith({
        category: 'frames',
        size: '8x10',
        material: undefined,
        finish: undefined,
      });
    });

    it('should handle service errors and return fallback data', async () => {
      const mockFallbackResponse = {
        count: 0,
        products: [],
        fallback: true,
      };

      const mockProductService = {
        getAllProducts: jest.fn().mockRejectedValue(new Error('API error')),
        getFallbackResponse: jest.fn().mockReturnValue(mockFallbackResponse),
      };
      mockProdigiProductService.mockImplementation(() => mockProductService);

      const request = new NextRequest('http://localhost:3000/api/prodigi/products');
      const response = await GET(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(200);
      expect(responseData).toEqual({
        ...mockFallbackResponse,
        error: 'API error',
        message: 'Using fallback data due to API error',
      });
    });

    it('should handle unknown errors', async () => {
      const mockFallbackResponse = {
        count: 0,
        products: [],
        fallback: true,
      };

      const mockProductService = {
        getAllProducts: jest.fn().mockRejectedValue('Unknown error'),
        getFallbackResponse: jest.fn().mockReturnValue(mockFallbackResponse),
      };
      mockProdigiProductService.mockImplementation(() => mockProductService);

      const request = new NextRequest('http://localhost:3000/api/prodigi/products');
      const response = await GET(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(200);
      expect(responseData).toEqual({
        ...mockFallbackResponse,
        error: 'Unknown error',
        message: 'Using fallback data due to API error',
      });
    });

    it('should log successful responses', async () => {
      const mockProducts = {
        count: 2,
        products: [],
        fallback: false,
      };

      const mockProductService = {
        getAllProducts: jest.fn().mockResolvedValue(mockProducts),
      };
      mockProdigiProductService.mockImplementation(() => mockProductService);

      const request = new NextRequest('http://localhost:3000/api/prodigi/products');
      await GET(request);

      expect(console.log).toHaveBeenCalledWith('✅ Successfully fetched 2 products');
    });

    it('should log fallback responses', async () => {
      const mockProducts = {
        count: 2,
        products: [],
        fallback: true,
      };

      const mockProductService = {
        getAllProducts: jest.fn().mockResolvedValue(mockProducts),
      };
      mockProdigiProductService.mockImplementation(() => mockProductService);

      const request = new NextRequest('http://localhost:3000/api/prodigi/products');
      await GET(request);

      expect(console.log).toHaveBeenCalledWith('✅ Successfully fetched 2 products (fallback mode)');
    });

    it('should log errors when service fails', async () => {
      const mockFallbackResponse = {
        count: 0,
        products: [],
        fallback: true,
      };

      const mockProductService = {
        getAllProducts: jest.fn().mockRejectedValue(new Error('API error')),
        getFallbackResponse: jest.fn().mockReturnValue(mockFallbackResponse),
      };
      mockProdigiProductService.mockImplementation(() => mockProductService);

      const request = new NextRequest('http://localhost:3000/api/prodigi/products');
      await GET(request);

      expect(console.error).toHaveBeenCalledWith('❌ Error fetching Prodigi products:', expect.any(Error));
    });
  });
});
