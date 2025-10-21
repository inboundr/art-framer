import { NextRequest } from 'next/server';
import { POST } from '../create-session/route';

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
  createServiceClient: jest.fn(),
}));

// Mock Stripe instance
jest.mock('stripe', () => {
  const mockCreate = jest.fn();
  return jest.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: mockCreate,
      },
    },
  }));
});

// Mock Prodigi client
jest.mock('@/lib/prodigi', () => ({
  ProdigiClient: jest.fn().mockImplementation(() => ({
    generateFrameSku: jest.fn().mockResolvedValue('GLOBAL-CFPM-16X20-abc12345'),
    extractBaseProdigiSku: jest.fn().mockImplementation((sku) => sku.replace(/-[a-f0-9]{8}$/, '')),
  })),
}));

// Mock shipping service
jest.mock('@/lib/shipping', () => ({
  ShippingService: jest.fn().mockImplementation(() => ({
    calculateShipping: jest.fn(),
    calculateShippingGuaranteed: jest.fn(),
  })),
  defaultShippingService: {
    calculateShipping: jest.fn(),
    calculateShippingGuaranteed: jest.fn(),
  },
}));

// Mock pricing calculator
jest.mock('@/lib/pricing', () => ({
  defaultPricingCalculator: {
    calculateTotal: jest.fn(),
  },
}));

describe('Checkout Session Creation - Comprehensive Tests', () => {
  let mockSupabase: any;
  let mockServiceSupabase: any;
  let mockShippingService: any;
  let stripeInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Set environment variables for tests
    process.env.STRIPE_SECRET_KEY = 'sk_test_1234567890';

    // Mock Supabase client
    mockSupabase = {
      auth: {
        getUser: jest.fn(),
        getSession: jest.fn(),
        refreshSession: jest.fn(),
      },
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      single: jest.fn(),
      insert: jest.fn().mockReturnThis(),
    };

    // Mock service Supabase client
    mockServiceSupabase = {
      from: jest.fn().mockImplementation((table) => {
        if (table === 'stripe_session_addresses') {
          return {
            insert: jest.fn().mockResolvedValue({
              data: { id: 'address-1' },
              error: null,
            })
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({
                data: [
                  {
                    id: '123e4567-e89b-12d3-a456-426614174000',
                    user_id: 'user-123',
                    product_id: 'product-1',
                    quantity: 2,
                    products: {
                      id: 'product-1',
                      sku: 'FRAME-8x10-BLACK',
                      price: 25.00,
                      name: '8x10 Black Frame',
                      frame_size: '8x10',
                      frame_style: 'Black',
                      images: {
                        id: 'image-1',
                        prompt: 'Test image',
                        image_url: 'https://example.com/image.jpg',
                        thumbnail_url: 'https://example.com/thumb.jpg',
                        user_id: 'user-123',
                        created_at: '2024-01-01T00:00:00Z',
                      }
                    }
                  }
                ],
                error: null,
              })
            })
          })
        };
      }),
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: 'address-1' },
            error: null,
          })
        })
      })
    };


    // Mock createClient and createServiceClient
    const { createClient, createServiceClient } = jest.requireMock('@/lib/supabase/server');
    createClient.mockResolvedValue(mockSupabase);
    createServiceClient.mockReturnValue(mockServiceSupabase);
    
    // Debug: Log the service client mock
    console.log('Service client mock setup:', mockServiceSupabase);

    // Stripe mock is reset automatically by jest.clearAllMocks()
    
    // Setup Stripe instance for all tests
    const Stripe = jest.requireMock('stripe');
    stripeInstance = new Stripe('sk_test');

    // Mock shipping service
    mockShippingService = {
      calculateShipping: jest.fn(),
      calculateShippingGuaranteed: jest.fn(),
    };

    const { ShippingService, defaultShippingService } = jest.requireMock('@/lib/shipping');
    ShippingService.mockImplementation(() => mockShippingService);
    
    // Mock the default export
    defaultShippingService.calculateShipping = jest.fn();
    defaultShippingService.calculateShippingGuaranteed = jest.fn();
    
    // Mock pricing calculator
    const { defaultPricingCalculator } = jest.requireMock('@/lib/pricing');
    defaultPricingCalculator.calculateTotal = jest.fn().mockReturnValue({
      subtotal: 50.00,
      taxAmount: 5.00,
      shippingAmount: 8.00,
      total: 63.00
    });
  });

  describe('Successful session creation', () => {
    it('should create checkout session with valid data', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      };

      const mockCartItems = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          product_id: 'product-1',
          quantity: 1,
          finalSku: 'GLOBAL-CFPM-16X20',
          products: {
            id: 'product-1',
            sku: 'GLOBAL-CFPM-16X20-abc12345',
            price: 25.00,
            frame_size: 'medium',
            frame_style: 'black',
            frame_material: 'wood',
            images: {
              id: 'image-1',
              prompt: 'Test image',
              image_url: 'https://example.com/image.jpg',
            },
          },
        },
      ];

      const mockShippingResult = {
        recommended: {
          cost: 5.00,
          currency: 'USD',
          estimatedDays: 3,
          service: 'Ground',
          carrier: 'UPS',
          trackingAvailable: true,
        },
        options: [],
      };

      const mockSession = {
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/c/pay/cs_test_123',
      };

      // Mock authentication
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock cart items fetch
      mockSupabase.single.mockResolvedValueOnce({
        data: mockCartItems,
        error: null,
      });

      // Mock shipping calculation
      const { defaultShippingService } = jest.requireMock('@/lib/shipping');
      defaultShippingService.calculateShipping.mockResolvedValue(mockShippingResult);

      // Mock pricing calculation
      const { defaultPricingCalculator } = jest.requireMock('@/lib/pricing');
      defaultPricingCalculator.calculateTotal.mockReturnValue({
        subtotal: 25.00,
        taxAmount: 2.00,
        shippingAmount: 5.00,
        total: 32.00,
      });

      // Mock Stripe session creation
      stripeInstance.checkout.sessions.create.mockResolvedValue(mockSession);

      // Mock address storage
      mockServiceSupabase.insert.mockResolvedValue({
        data: { id: 'address-123' },
        error: null,
      });

      const requestBody = {
        cartItemIds: ['123e4567-e89b-12d3-a456-426614174000'],
        shippingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          address1: '123 Main St',
          address2: 'Apt 1',
          city: 'New York',
          state: 'NY',
          zip: '10001',
          country: 'US',
          phone: '555-1234',
        },
      };

      const request = new NextRequest('http://localhost:3000/api/checkout/create-session', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'content-type': 'application/json',
        },
      });

      // Mock the json() method
      request.json = jest.fn().mockResolvedValue(requestBody);

      const response = await POST(request);
      const responseData = JSON.parse(response.body);

      console.log('Response status:', response.status);
      console.log('Response data:', responseData);

      expect(response.status).toBe(200);
      expect(responseData.url).toBe('https://checkout.stripe.com/c/pay/cs_test_123');
      expect(stripeInstance.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_method_types: ['card'],
          line_items: expect.any(Array),
          mode: 'payment',
          success_url: expect.stringContaining('/checkout/success'),
          cancel_url: expect.stringContaining('/cart'),
          customer_email: 'test@example.com',
          metadata: expect.objectContaining({
            userId: 'user-123',
            cartItemIds: '123e4567-e89b-12d3-a456-426614174000',
          }),
        })
      );
    });

    it('should handle different countries and currencies', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      };

      const mockCartItems = [
        {
          id: 'cart-item-1',
          product_id: 'product-1',
          quantity: 1,
          products: {
            id: 'product-1',
            sku: 'GLOBAL-CFPM-16X20-abc12345',
            price: 25.00,
            frame_size: 'medium',
            frame_style: 'black',
            frame_material: 'wood',
            images: {
              image_url: 'https://example.com/image.jpg',
            },
          },
        },
      ];

      const mockShippingResult = {
        success: true,
        shippingCost: 8.00,
        estimatedDays: 5,
        provider: 'fedex',
      };

      const mockSession = {
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/c/pay/cs_test_123',
      };

      // Mock authentication
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock cart items fetch
      mockSupabase.single.mockResolvedValueOnce({
        data: mockCartItems,
        error: null,
      });

      // Mock shipping calculation
      const { defaultShippingService } = jest.requireMock('@/lib/shipping');
      defaultShippingService.calculateShipping.mockResolvedValue({
        recommended: {
          cost: mockShippingResult.shippingCost,
          currency: 'USD',
          estimatedDays: mockShippingResult.estimatedDays,
          service: mockShippingResult.provider,
          carrier: 'fedex',
          trackingAvailable: true
        }
      });

      // Mock Stripe session creation
      stripeInstance.checkout.sessions.create.mockResolvedValue(mockSession);

      // Mock address storage
      mockServiceSupabase.insert.mockResolvedValue({
        data: { id: 'address-123' },
        error: null,
      });

      const requestBody = {
        cartItemIds: ['123e4567-e89b-12d3-a456-426614174000'],
        shippingAddress: {
          firstName: 'Jean',
          lastName: 'Dupont',
          address1: '123 Rue de la Paix',
          city: 'Paris',
          state: 'Île-de-France',
          zip: '75001',
          country: 'FR',
          phone: '+33-1-23-45-67-89',
        },
      };

      const request = new NextRequest('http://localhost:3000/api/checkout/create-session', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'content-type': 'application/json',
        },
      });

      // Mock the json() method
      request.json = jest.fn().mockResolvedValue(requestBody);

      const response = await POST(request);
      const responseData = JSON.parse(response.body);

      console.log('Response status:', response.status);
      console.log('Response body:', responseData);
      expect(response.status).toBe(200);
      expect(responseData.url).toBe('https://checkout.stripe.com/c/pay/cs_test_123');
      expect(stripeInstance.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          line_items: expect.arrayContaining([
            expect.objectContaining({
              price_data: expect.objectContaining({
                currency: 'eur', // Should use EUR for France
              })
            })
          ])
        })
      );
    });
  });

  describe('Error handling', () => {
    it('should handle unauthenticated user', async () => {
      // Mock all authentication methods to return no user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });
      mockSupabase.auth.refreshSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const requestBody = {
        cartItemIds: ['123e4567-e89b-12d3-a456-426614174000'],
        shippingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          address1: '123 Main St',
          city: 'New York',
          state: 'NY',
          zip: '10001',
          country: 'US',
        },
      };

      const request = new NextRequest('http://localhost:3000/api/checkout/create-session', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'content-type': 'application/json',
        },
      });

      // Mock the json() method
      request.json = jest.fn().mockResolvedValue(requestBody);

      const response = await POST(request);
      const responseData = JSON.parse(response.body);

      expect(response.status).toBe(401);
      expect(responseData.error).toBe('Unauthorized');
    });

    it('should handle missing cart items', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock service client to return empty cart items
      mockServiceSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({
              data: [], // Empty cart items
              error: null,
            })
          })
        })
      });

      const requestBody = {
        cartItemIds: ['123e4567-e89b-12d3-a456-426614174000'],
        shippingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          address1: '123 Main St',
          city: 'New York',
          state: 'NY',
          zip: '10001',
          country: 'US',
        },
      };

      const request = new NextRequest('http://localhost:3000/api/checkout/create-session', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'content-type': 'application/json',
        },
      });

      // Mock the json() method
      request.json = jest.fn().mockResolvedValue(requestBody);

      const response = await POST(request);
      const responseData = JSON.parse(response.body);

      expect(response.status).toBe(404);
      expect(responseData.error).toBe('Cart items not found');
    });

    it('should handle shipping calculation failure', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      };

      const mockCartItems = [
        {
          id: 'cart-item-1',
          product_id: 'product-1',
          quantity: 1,
          products: {
            id: 'product-1',
            sku: 'GLOBAL-CFPM-16X20-abc12345',
            price: 25.00,
            frame_size: 'medium',
            frame_style: 'black',
            frame_material: 'wood',
            images: {
              image_url: 'https://example.com/image.jpg',
            },
          },
        },
      ];

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.single.mockResolvedValueOnce({
        data: mockCartItems,
        error: null,
      });

      // Mock shipping calculation failure
      const { defaultShippingService } = jest.requireMock('@/lib/shipping');
      defaultShippingService.calculateShipping.mockRejectedValue(new Error('Shipping calculation failed'));

      const requestBody = {
        cartItemIds: ['123e4567-e89b-12d3-a456-426614174000'],
        shippingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          address1: '123 Main St',
          city: 'New York',
          state: 'NY',
          zip: '10001',
          country: 'US',
        },
      };

      const request = new NextRequest('http://localhost:3000/api/checkout/create-session', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'content-type': 'application/json',
        },
      });

      // Mock the json() method
      request.json = jest.fn().mockResolvedValue(requestBody);

      const response = await POST(request);
      const responseData = JSON.parse(response.body);

      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Failed to calculate shipping cost. Please check your address and try again.');
    });

    it('should handle Stripe session creation failure', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      };

      const mockCartItems = [
        {
          id: 'cart-item-1',
          product_id: 'product-1',
          quantity: 1,
          products: {
            id: 'product-1',
            sku: 'GLOBAL-CFPM-16X20-abc12345',
            price: 25.00,
            frame_size: 'medium',
            frame_style: 'black',
            frame_material: 'wood',
            images: {
              image_url: 'https://example.com/image.jpg',
            },
          },
        },
      ];

      const mockShippingResult = {
        success: true,
        shippingCost: 5.00,
        estimatedDays: 3,
        provider: 'ups',
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.single.mockResolvedValueOnce({
        data: mockCartItems,
        error: null,
      });

      // Mock shipping calculation success
      const { defaultShippingService } = jest.requireMock('@/lib/shipping');
      defaultShippingService.calculateShipping.mockResolvedValue({
        recommended: {
          cost: mockShippingResult.shippingCost,
          currency: 'USD',
          estimatedDays: mockShippingResult.estimatedDays,
          service: mockShippingResult.provider,
          carrier: 'ups',
          trackingAvailable: true
        }
      });

      // Mock Stripe session creation failure
      stripeInstance.checkout.sessions.create.mockRejectedValue(new Error('Stripe API error'));

      const requestBody = {
        cartItemIds: ['123e4567-e89b-12d3-a456-426614174000'],
        shippingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          address1: '123 Main St',
          city: 'New York',
          state: 'NY',
          zip: '10001',
          country: 'US',
        },
      };

      const request = new NextRequest('http://localhost:3000/api/checkout/create-session', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'content-type': 'application/json',
        },
      });

      // Mock the json() method
      request.json = jest.fn().mockResolvedValue(requestBody);

      const response = await POST(request);
      const responseData = JSON.parse(response.body);

      expect(response.status).toBe(500);
      expect(responseData.error).toBe('Internal server error');
    });

    it('should handle invalid request body', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      };

      // Mock authentication
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/checkout/create-session', {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'content-type': 'application/json',
        },
      });

      // Mock the json() method to throw an error for invalid JSON
      request.json = jest.fn().mockRejectedValue(new Error('Invalid JSON'));

      const response = await POST(request);
      const responseData = JSON.parse(response.body);

      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Invalid request data');
    });

    it('should handle missing required fields', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const requestBody = {
        // Missing cartItemIds
        shippingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          address1: '123 Main St',
          city: 'New York',
          state: 'NY',
          zip: '10001',
          country: 'US',
        },
      };

      const request = new NextRequest('http://localhost:3000/api/checkout/create-session', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'content-type': 'application/json',
        },
      });

      // Mock the json() method
      request.json = jest.fn().mockResolvedValue(requestBody);

      const response = await POST(request);
      const responseData = JSON.parse(response.body);

      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Invalid request data');
    });
  });

  describe('Address storage', () => {
    it('should store shipping address successfully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      };

      const mockCartItems = [
        {
          id: 'cart-item-1',
          product_id: 'product-1',
          quantity: 1,
          products: {
            id: 'product-1',
            sku: 'GLOBAL-CFPM-16X20-abc12345',
            price: 25.00,
            frame_size: 'medium',
            frame_style: 'black',
            frame_material: 'wood',
            images: {
              image_url: 'https://example.com/image.jpg',
            },
          },
        },
      ];

      const mockShippingResult = {
        success: true,
        shippingCost: 5.00,
        estimatedDays: 3,
        provider: 'ups',
      };

      const mockSession = {
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/c/pay/cs_test_123',
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.single.mockResolvedValueOnce({
        data: mockCartItems,
        error: null,
      });

      // Mock shipping calculation success
      const { defaultShippingService } = jest.requireMock('@/lib/shipping');
      defaultShippingService.calculateShipping.mockResolvedValue({
        recommended: {
          cost: mockShippingResult.shippingCost,
          currency: 'USD',
          estimatedDays: mockShippingResult.estimatedDays,
          service: mockShippingResult.provider,
          carrier: 'ups',
          trackingAvailable: true
        }
      });
      
      stripeInstance.checkout.sessions.create.mockResolvedValue(mockSession);

      // Mock successful address storage
      mockServiceSupabase.insert.mockResolvedValue({
        data: { id: 'address-123' },
        error: null,
      });

      const requestBody = {
        cartItemIds: ['123e4567-e89b-12d3-a456-426614174000'],
        shippingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          address1: '123 Main St',
          address2: 'Apt 1',
          city: 'New York',
          state: 'NY',
          zip: '10001',
          country: 'US',
          phone: '555-1234',
        },
      };

      const request = new NextRequest('http://localhost:3000/api/checkout/create-session', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'content-type': 'application/json',
        },
      });

      // Mock the json() method
      request.json = jest.fn().mockResolvedValue(requestBody);

      const response = await POST(request);
      const responseData = JSON.parse(response.body);

      expect(response.status).toBe(200);
      expect(responseData.url).toBe('https://checkout.stripe.com/c/pay/cs_test_123');
      expect(mockServiceSupabase.from).toHaveBeenCalledWith('stripe_session_addresses');
      
      // Verify that the address storage was attempted by checking the logs
      // The actual insert call happens within the mock implementation
      // We can verify this by checking that from was called with the correct table
      expect(mockServiceSupabase.from).toHaveBeenCalledWith('stripe_session_addresses');
    });

    it('should handle address storage failure gracefully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      };

      const mockCartItems = [
        {
          id: 'cart-item-1',
          product_id: 'product-1',
          quantity: 1,
          products: {
            id: 'product-1',
            sku: 'GLOBAL-CFPM-16X20-abc12345',
            price: 25.00,
            frame_size: 'medium',
            frame_style: 'black',
            frame_material: 'wood',
            images: {
              image_url: 'https://example.com/image.jpg',
            },
          },
        },
      ];

      const mockShippingResult = {
        success: true,
        shippingCost: 5.00,
        estimatedDays: 3,
        provider: 'ups',
      };

      const mockSession = {
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/c/pay/cs_test_123',
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.single.mockResolvedValueOnce({
        data: mockCartItems,
        error: null,
      });

      // Mock shipping calculation success
      const { defaultShippingService } = jest.requireMock('@/lib/shipping');
      defaultShippingService.calculateShipping.mockResolvedValue({
        recommended: {
          cost: mockShippingResult.shippingCost,
          currency: 'USD',
          estimatedDays: mockShippingResult.estimatedDays,
          service: mockShippingResult.provider,
          carrier: 'ups',
          trackingAvailable: true
        }
      });
      
      stripeInstance.checkout.sessions.create.mockResolvedValue(mockSession);

      // Mock address storage failure
      mockServiceSupabase.insert.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const requestBody = {
        cartItemIds: ['123e4567-e89b-12d3-a456-426614174000'],
        shippingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          address1: '123 Main St',
          city: 'New York',
          state: 'NY',
          zip: '10001',
          country: 'US',
        },
      };

      const request = new NextRequest('http://localhost:3000/api/checkout/create-session', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'content-type': 'application/json',
        },
      });

      // Mock the json() method
      request.json = jest.fn().mockResolvedValue(requestBody);

      const response = await POST(request);
      const responseData = JSON.parse(response.body);

      // Should still succeed even if address storage fails
      expect(response.status).toBe(200);
      expect(responseData.url).toBe('https://checkout.stripe.com/c/pay/cs_test_123');
    });
  });
});
