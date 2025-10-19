import { NextRequest } from 'next/server';
import { POST } from '../route';

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
  createServiceClient: jest.fn(),
}));

// Mock shipping service
jest.mock('@/lib/shipping', () => ({
  defaultShippingService: {
    calculateShippingGuaranteed: jest.fn(),
  },
}));

// Mock Prodigi client
jest.mock('@/lib/prodigi', () => ({
  ProdigiClient: jest.fn().mockImplementation(() => ({
    generateFrameSku: jest.fn(),
    extractBaseProdigiSku: jest.fn(),
  })),
}));

describe('/api/cart/shipping', () => {
  const mockCreateClient = require('@/lib/supabase/server').createClient;
  const mockCreateServiceClient = require('@/lib/supabase/server').createServiceClient;
  const mockDefaultShippingService = require('@/lib/shipping').defaultShippingService;
  const mockProdigiClient = require('@/lib/prodigi').ProdigiClient;

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console methods to avoid noise in tests
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    
    // Set up environment variables
    process.env.PRODIGI_API_KEY = 'test-prodigi-api-key';
    process.env.PRODIGI_ENVIRONMENT = 'sandbox';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('POST /api/cart/shipping', () => {
    it('should calculate shipping cost successfully', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockCartItems = [
        {
          id: 'cart-item-1',
          user_id: 'user-123',
          quantity: 2,
          products: {
            sku: 'GLOBAL-FRA-CAN-8x10-BLACK',
            price: 29.99,
            frame_size: '8x10',
            frame_style: 'black',
            frame_material: 'wood',
            image_id: 'img-123',
          }
        }
      ];

      const mockShippingCalculation = {
        recommended: {
          cost: 15.99,
          estimatedDays: 5,
          service: 'Standard Shipping',
          carrier: 'UPS',
          currency: 'USD',
        },
        freeShippingAvailable: true,
        freeShippingThreshold: 100,
        quotes: [],
        isEstimated: false,
        provider: 'prodigi',
        addressValidated: true,
      };

      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null })
        }
      };

      const mockServiceSupabase = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: mockCartItems, error: null })
          })
        })
      };

      const mockProdigiInstance = {
        generateFrameSku: jest.fn().mockResolvedValue('GLOBAL-FRA-CAN-8x10-BLACK-img123'),
        extractBaseProdigiSku: jest.fn().mockReturnValue('GLOBAL-FRA-CAN-8x10-BLACK')
      };

      mockCreateClient.mockResolvedValue(mockSupabase);
      mockCreateServiceClient.mockReturnValue(mockServiceSupabase);
      mockProdigiClient.mockImplementation(() => mockProdigiInstance);
      mockDefaultShippingService.calculateShippingGuaranteed.mockResolvedValue(mockShippingCalculation);

      const request = new NextRequest('http://localhost:3000/api/cart/shipping', {
        method: 'POST',
        body: JSON.stringify({
          countryCode: 'US',
          stateOrCounty: 'CA',
          postalCode: '90210',
          city: 'Beverly Hills',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Mock request.json to return the request body
      request.json = jest.fn().mockResolvedValue({
        countryCode: 'US',
        stateOrCounty: 'CA',
        postalCode: '90210',
        city: 'Beverly Hills',
      });

      const response = await POST(request);
      const responseData = JSON.parse(response.body as unknown as string);

      console.log('Response status:', response.status);
      console.log('Response data:', responseData);
      expect(response.status).toBe(200);
      expect(responseData.shippingCost).toBe(15.99);
      expect(responseData.estimatedDays).toBe(5);
      expect(responseData.serviceName).toBe('Standard Shipping');
      expect(responseData.carrier).toBe('UPS');
      expect(responseData.currency).toBe('USD');
    });

    it('should handle empty cart', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null })
        }
      };

      const mockServiceSupabase = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: [], error: null })
          })
        })
      };

      mockCreateClient.mockResolvedValue(mockSupabase);
      mockCreateServiceClient.mockReturnValue(mockServiceSupabase);

      const request = new NextRequest('http://localhost:3000/api/cart/shipping', {
        method: 'POST',
        body: JSON.stringify({
          countryCode: 'US',
          stateOrCounty: 'CA',
          postalCode: '90210',
          city: 'Beverly Hills',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Mock request.json to return the request body
      request.json = jest.fn().mockResolvedValue({
        countryCode: 'US',
        stateOrCounty: 'CA',
        postalCode: '90210',
        city: 'Beverly Hills',
      });

      const response = await POST(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(200);
      expect(responseData.shippingCost).toBe(0);
      expect(responseData.estimatedDays).toBe(0);
      expect(responseData.serviceName).toBe('No items in cart');
    });

    it('should handle authentication failure', async () => {
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null })
        }
      };

      mockCreateClient.mockResolvedValue(mockSupabase);

      const request = new NextRequest('http://localhost:3000/api/cart/shipping', {
        method: 'POST',
        body: JSON.stringify({
          countryCode: 'US',
          stateOrCounty: 'CA',
          postalCode: '90210',
          city: 'Beverly Hills',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Mock request.json to return the request body
      request.json = jest.fn().mockResolvedValue({
        countryCode: 'US',
        stateOrCounty: 'CA',
        postalCode: '90210',
        city: 'Beverly Hills',
      });

      const response = await POST(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(401);
      expect(responseData.error).toBe('Unauthorized');
    });

    it('should handle invalid address data', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null })
        }
      };

      mockCreateClient.mockResolvedValue(mockSupabase);

      const request = new NextRequest('http://localhost:3000/api/cart/shipping', {
        method: 'POST',
        body: JSON.stringify({
          countryCode: 'INVALID', // Invalid country code
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Mock request.json to return the request body
      request.json = jest.fn().mockResolvedValue({
        countryCode: 'INVALID', // Invalid country code
      });

      const response = await POST(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Invalid address data');
    });

    it('should handle cart fetch errors', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null })
        }
      };

      const mockServiceSupabase = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } })
          })
        })
      };

      mockCreateClient.mockResolvedValue(mockSupabase);
      mockCreateServiceClient.mockReturnValue(mockServiceSupabase);

      const request = new NextRequest('http://localhost:3000/api/cart/shipping', {
        method: 'POST',
        body: JSON.stringify({
          countryCode: 'US',
          stateOrCounty: 'CA',
          postalCode: '90210',
          city: 'Beverly Hills',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Mock request.json to return the request body
      request.json = jest.fn().mockResolvedValue({
        countryCode: 'US',
        stateOrCounty: 'CA',
        postalCode: '90210',
        city: 'Beverly Hills',
      });

      const response = await POST(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(500);
      expect(responseData.error).toBe('Failed to fetch cart items');
    });

    it('should handle shipping calculation errors', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockCartItems = [
        {
          id: 'cart-item-1',
          user_id: 'user-123',
          quantity: 2,
          products: {
            sku: 'GLOBAL-FRA-CAN-8x10-BLACK',
            price: 29.99,
            frame_size: '8x10',
            frame_style: 'black',
            frame_material: 'wood',
            image_id: 'img-123',
          }
        }
      ];

      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null })
        }
      };

      const mockServiceSupabase = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: mockCartItems, error: null })
          })
        })
      };

      const mockProdigiInstance = {
        generateFrameSku: jest.fn().mockResolvedValue('GLOBAL-FRA-CAN-8x10-BLACK-img123'),
        extractBaseProdigiSku: jest.fn().mockReturnValue('GLOBAL-FRA-CAN-8x10-BLACK')
      };

      mockCreateClient.mockResolvedValue(mockSupabase);
      mockCreateServiceClient.mockReturnValue(mockServiceSupabase);
      mockProdigiClient.mockImplementation(() => mockProdigiInstance);
      mockDefaultShippingService.calculateShippingGuaranteed.mockRejectedValue(new Error('Shipping calculation failed'));

      const request = new NextRequest('http://localhost:3000/api/cart/shipping', {
        method: 'POST',
        body: JSON.stringify({
          countryCode: 'US',
          stateOrCounty: 'CA',
          postalCode: '90210',
          city: 'Beverly Hills',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Mock request.json to return the request body
      request.json = jest.fn().mockResolvedValue({
        countryCode: 'US',
        stateOrCounty: 'CA',
        postalCode: '90210',
        city: 'Beverly Hills',
      });

      const response = await POST(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(500);
      expect(responseData.error).toBe('Failed to calculate shipping cost');
    });

    it('should handle missing Prodigi API key', async () => {
      // Clear the Prodigi API key
      delete process.env.PRODIGI_API_KEY;
      
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockCartItems = [
        {
          id: 'cart-item-1',
          user_id: 'user-123',
          quantity: 2,
          products: {
            sku: 'GLOBAL-FRA-CAN-8x10-BLACK',
            price: 29.99,
            frame_size: '8x10',
            frame_style: 'black',
            frame_material: 'wood',
            image_id: 'img-123',
          }
        }
      ];

      const mockShippingCalculation = {
        recommended: {
          cost: 15.99,
          estimatedDays: 5,
          service: 'Standard Shipping',
          carrier: 'UPS',
          currency: 'USD',
        },
        freeShippingAvailable: true,
        freeShippingThreshold: 100,
        quotes: [],
        isEstimated: false,
        provider: 'prodigi',
        addressValidated: true,
      };

      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null })
        }
      };

      const mockServiceSupabase = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: mockCartItems, error: null })
          })
        })
      };

      mockCreateClient.mockResolvedValue(mockSupabase);
      mockCreateServiceClient.mockReturnValue(mockServiceSupabase);
      mockDefaultShippingService.calculateShippingGuaranteed.mockResolvedValue(mockShippingCalculation);

      const request = new NextRequest('http://localhost:3000/api/cart/shipping', {
        method: 'POST',
        body: JSON.stringify({
          countryCode: 'US',
          stateOrCounty: 'CA',
          postalCode: '90210',
          city: 'Beverly Hills',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Mock request.json to return the request body
      request.json = jest.fn().mockResolvedValue({
        countryCode: 'US',
        stateOrCounty: 'CA',
        postalCode: '90210',
        city: 'Beverly Hills',
      });

      const response = await POST(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(200);
      expect(responseData.shippingCost).toBe(15.99);
      expect(console.warn).toHaveBeenCalledWith('⚠️ Prodigi API key not configured, using stored SKUs');
    });

    it('should handle SKU regeneration failure', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockCartItems = [
        {
          id: 'cart-item-1',
          user_id: 'user-123',
          quantity: 2,
          products: {
            sku: 'GLOBAL-FRA-CAN-8x10-BLACK',
            price: 29.99,
            frame_size: '8x10',
            frame_style: 'black',
            frame_material: 'wood',
            image_id: 'img-123',
          }
        }
      ];

      const mockShippingCalculation = {
        recommended: {
          cost: 15.99,
          estimatedDays: 5,
          service: 'Standard Shipping',
          carrier: 'UPS',
          currency: 'USD',
        },
        freeShippingAvailable: true,
        freeShippingThreshold: 100,
        quotes: [],
        isEstimated: false,
        provider: 'prodigi',
        addressValidated: true,
      };

      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null })
        }
      };

      const mockServiceSupabase = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: mockCartItems, error: null })
          })
        })
      };

      const mockProdigiInstance = {
        generateFrameSku: jest.fn().mockRejectedValue(new Error('SKU generation failed')),
        extractBaseProdigiSku: jest.fn().mockReturnValue('GLOBAL-FRA-CAN-8x10-BLACK')
      };

      mockCreateClient.mockResolvedValue(mockSupabase);
      mockCreateServiceClient.mockReturnValue(mockServiceSupabase);
      mockProdigiClient.mockImplementation(() => mockProdigiInstance);
      mockDefaultShippingService.calculateShippingGuaranteed.mockResolvedValue(mockShippingCalculation);

      const request = new NextRequest('http://localhost:3000/api/cart/shipping', {
        method: 'POST',
        body: JSON.stringify({
          countryCode: 'US',
          stateOrCounty: 'CA',
          postalCode: '90210',
          city: 'Beverly Hills',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Mock request.json to return the request body
      request.json = jest.fn().mockResolvedValue({
        countryCode: 'US',
        stateOrCounty: 'CA',
        postalCode: '90210',
        city: 'Beverly Hills',
      });

      const response = await POST(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(200);
      expect(responseData.shippingCost).toBe(15.99);
      expect(console.warn).toHaveBeenCalledWith('⚠️ Failed to regenerate SKU for GLOBAL-FRA-CAN-8x10-BLACK, using stored SKU:', expect.any(Error));
    });

    it('should log API calls and responses', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockCartItems = [
        {
          id: 'cart-item-1',
          user_id: 'user-123',
          quantity: 2,
          products: {
            sku: 'GLOBAL-FRA-CAN-8x10-BLACK',
            price: 29.99,
            frame_size: '8x10',
            frame_style: 'black',
            frame_material: 'wood',
            image_id: 'img-123',
          }
        }
      ];

      const mockShippingCalculation = {
        recommended: {
          cost: 15.99,
          estimatedDays: 5,
          service: 'Standard Shipping',
          carrier: 'UPS',
          currency: 'USD',
        },
        freeShippingAvailable: true,
        freeShippingThreshold: 100,
        quotes: [],
        isEstimated: false,
        provider: 'prodigi',
        addressValidated: true,
      };

      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null })
        }
      };

      const mockServiceSupabase = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: mockCartItems, error: null })
          })
        })
      };

      const mockProdigiInstance = {
        generateFrameSku: jest.fn().mockResolvedValue('GLOBAL-FRA-CAN-8x10-BLACK-img123'),
        extractBaseProdigiSku: jest.fn().mockReturnValue('GLOBAL-FRA-CAN-8x10-BLACK')
      };

      mockCreateClient.mockResolvedValue(mockSupabase);
      mockCreateServiceClient.mockReturnValue(mockServiceSupabase);
      mockProdigiClient.mockImplementation(() => mockProdigiInstance);
      mockDefaultShippingService.calculateShippingGuaranteed.mockResolvedValue(mockShippingCalculation);

      const request = new NextRequest('http://localhost:3000/api/cart/shipping', {
        method: 'POST',
        body: JSON.stringify({
          countryCode: 'US',
          stateOrCounty: 'CA',
          postalCode: '90210',
          city: 'Beverly Hills',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Mock request.json to return the request body
      request.json = jest.fn().mockResolvedValue({
        countryCode: 'US',
        stateOrCounty: 'CA',
        postalCode: '90210',
        city: 'Beverly Hills',
      });

      await POST(request);

      expect(console.log).toHaveBeenCalledWith('Cart Shipping API: Starting request');
      expect(console.log).toHaveBeenCalledWith('Cart Shipping API: Request headers', expect.any(Object));
      expect(console.log).toHaveBeenCalledWith('Cart Shipping API: Authenticated via server client');
      expect(console.log).toHaveBeenCalledWith('Cart Shipping API: Authenticated user', {
        userId: 'user-123',
        userEmail: 'test@example.com'
      });
    });

    it('should log errors when shipping calculation fails', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockCartItems = [
        {
          id: 'cart-item-1',
          user_id: 'user-123',
          quantity: 2,
          products: {
            sku: 'GLOBAL-FRA-CAN-8x10-BLACK',
            price: 29.99,
            frame_size: '8x10',
            frame_style: 'black',
            frame_material: 'wood',
            image_id: 'img-123',
          }
        }
      ];

      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null })
        }
      };

      const mockServiceSupabase = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: mockCartItems, error: null })
          })
        })
      };

      const mockProdigiInstance = {
        generateFrameSku: jest.fn().mockResolvedValue('GLOBAL-FRA-CAN-8x10-BLACK-img123'),
        extractBaseProdigiSku: jest.fn().mockReturnValue('GLOBAL-FRA-CAN-8x10-BLACK')
      };

      mockCreateClient.mockResolvedValue(mockSupabase);
      mockCreateServiceClient.mockReturnValue(mockServiceSupabase);
      mockProdigiClient.mockImplementation(() => mockProdigiInstance);
      mockDefaultShippingService.calculateShippingGuaranteed.mockRejectedValue(new Error('Shipping calculation failed'));

      const request = new NextRequest('http://localhost:3000/api/cart/shipping', {
        method: 'POST',
        body: JSON.stringify({
          countryCode: 'US',
          stateOrCounty: 'CA',
          postalCode: '90210',
          city: 'Beverly Hills',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Mock request.json to return the request body
      request.json = jest.fn().mockResolvedValue({
        countryCode: 'US',
        stateOrCounty: 'CA',
        postalCode: '90210',
        city: 'Beverly Hills',
      });

      await POST(request);

      expect(console.error).toHaveBeenCalledWith('Error calculating shipping cost:', expect.any(Error));
    });
  });
});
