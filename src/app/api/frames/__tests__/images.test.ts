import { NextRequest } from 'next/server';
import { GET } from '../images/route';

// Mock the Prodigi client
jest.mock('@/lib/prodigi', () => ({
  prodigiClient: {
    generateFrameSku: jest.fn(),
    getProductDetails: jest.fn(),
  },
}));

describe('/api/frames/images', () => {
  const mockProdigiClient = jest.requireMock('@/lib/prodigi').prodigiClient;

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console methods to avoid noise in tests
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    
    // Set up environment variables
    process.env.PRODIGI_API_KEY = 'test-prodigi-api-key';
    process.env.PRODIGI_ENVIRONMENT = 'test';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /api/frames/images', () => {
    it('should return frame details from Prodigi successfully', async () => {
      const mockSku = 'FRAME-SMALL-BLACK-WOOD';
      const mockProductDetails = {
        sku: mockSku,
        name: 'Small Black Wood Frame',
        description: 'A beautiful wooden frame in black finish',
        price: 29.99,
        dimensions: { width: 20, height: 25, depth: 2 },
        images: [
          {
            url: 'https://example.com/frame.jpg',
            type: 'preview',
            width: 400,
            height: 500,
          }
        ]
      };

      mockProdigiClient.generateFrameSku.mockResolvedValue(mockSku);
      mockProdigiClient.getProductDetails.mockResolvedValue(mockProductDetails);

      const request = new NextRequest('http://localhost:3000/api/frames/images?frameSize=small&frameStyle=black&frameMaterial=wood');
      const response = await GET(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.frame).toEqual(mockProductDetails);
      expect(mockProdigiClient.generateFrameSku).toHaveBeenCalledWith('small', 'black', 'wood');
      expect(mockProdigiClient.getProductDetails).toHaveBeenCalledWith(mockSku);
    });

    it('should return fallback data when Prodigi API is not configured', async () => {
      process.env.PRODIGI_API_KEY = 'your_prodigi_api_key_here';
      
      const mockSku = 'FRAME-SMALL-BLACK-WOOD';
      mockProdigiClient.generateFrameSku.mockResolvedValue(mockSku);

      const request = new NextRequest('http://localhost:3000/api/frames/images?frameSize=small&frameStyle=black&frameMaterial=wood');
      const response = await GET(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.fallback).toBe(true);
      expect(responseData.frame.sku).toBe(mockSku);
      expect(responseData.frame.name).toBe('small black wood frame');
      expect(responseData.frame.price).toBe(29.99);
      expect(responseData.frame.dimensions).toEqual({ width: 20, height: 25, depth: 2 });
    });

    it('should return fallback data when Prodigi API fails', async () => {
      const mockSku = 'FRAME-SMALL-BLACK-WOOD';
      mockProdigiClient.generateFrameSku.mockResolvedValue(mockSku);
      mockProdigiClient.getProductDetails.mockRejectedValue(new Error('Prodigi API error'));

      const request = new NextRequest('http://localhost:3000/api/frames/images?frameSize=small&frameStyle=black&frameMaterial=wood');
      const response = await GET(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.fallback).toBe(true);
      expect(responseData.frame.sku).toBe(mockSku);
      expect(responseData.frame.name).toBe('small black wood frame');
      expect(responseData.frame.price).toBe(29.99);
      expect(responseData.error).toBe('Prodigi API error');
    });

    it('should handle invalid frame parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/frames/images?frameSize=invalid&frameStyle=black&frameMaterial=wood');
      const response = await GET(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Invalid frame parameters');
    });

    it('should handle missing required parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/frames/images');
      const response = await GET(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Invalid frame parameters');
    });

    it('should calculate correct mock prices for different frame combinations', async () => {
      process.env.PRODIGI_API_KEY = 'your_prodigi_api_key_here';
      
      const mockSku = 'FRAME-LARGE-GOLD-METAL';
      mockProdigiClient.generateFrameSku.mockResolvedValue(mockSku);

      const request = new NextRequest('http://localhost:3000/api/frames/images?frameSize=large&frameStyle=gold&frameMaterial=metal');
      const response = await GET(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.frame.price).toBe(93.58); // 59.99 * 1.3 * 1.2
    });

    it('should return correct dimensions for different frame sizes', async () => {
      process.env.PRODIGI_API_KEY = 'your_prodigi_api_key_here';
      
      const mockSku = 'FRAME-EXTRA_LARGE-WHITE-PLASTIC';
      mockProdigiClient.generateFrameSku.mockResolvedValue(mockSku);

      const request = new NextRequest('http://localhost:3000/api/frames/images?frameSize=extra_large&frameStyle=white&frameMaterial=plastic');
      const response = await GET(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.frame.dimensions).toEqual({ width: 50, height: 70, depth: 3 });
    });

    it('should generate correct mock frame image URLs', async () => {
      process.env.PRODIGI_API_KEY = 'your_prodigi_api_key_here';
      
      const mockSku = 'FRAME-MEDIUM-NATURAL-BAMBOO';
      mockProdigiClient.generateFrameSku.mockResolvedValue(mockSku);

      const request = new NextRequest('http://localhost:3000/api/frames/images?frameSize=medium&frameStyle=natural&frameMaterial=bamboo');
      const response = await GET(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.frame.images[0].url).toContain('8B4513');
      expect(responseData.frame.images[0].url).toContain('bamboo%20frame');
    });

    it('should log API calls and responses', async () => {
      const mockSku = 'FRAME-SMALL-BLACK-WOOD';
      const mockProductDetails = {
        sku: mockSku,
        name: 'Small Black Wood Frame',
        description: 'A beautiful wooden frame in black finish',
        price: 29.99,
        dimensions: { width: 20, height: 25, depth: 2 },
        images: []
      };

      mockProdigiClient.generateFrameSku.mockResolvedValue(mockSku);
      mockProdigiClient.getProductDetails.mockResolvedValue(mockProductDetails);

      const request = new NextRequest('http://localhost:3000/api/frames/images?frameSize=small&frameStyle=black&frameMaterial=wood');
      await GET(request);

      expect(console.log).toHaveBeenCalledWith('🔍 Fetching Prodigi product details for SKU: FRAME-SMALL-BLACK-WOOD');
      expect(console.log).toHaveBeenCalledWith('✅ Successfully fetched Prodigi product details:', {
        sku: mockProductDetails.sku,
        name: mockProductDetails.name,
        price: mockProductDetails.price
      });
    });

    it('should log errors when Prodigi API fails', async () => {
      const mockSku = 'FRAME-SMALL-BLACK-WOOD';
      mockProdigiClient.generateFrameSku.mockResolvedValue(mockSku);
      mockProdigiClient.getProductDetails.mockRejectedValue(new Error('Prodigi API error'));

      const request = new NextRequest('http://localhost:3000/api/frames/images?frameSize=small&frameStyle=black&frameMaterial=wood');
      await GET(request);

      expect(console.error).toHaveBeenCalledWith('❌ Error fetching frame details from Prodigi:', expect.any(Error));
      expect(console.log).toHaveBeenCalledWith('🔄 Using fallback mock data for frame details');
    });
  });
});