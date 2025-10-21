import { NextRequest } from 'next/server';
import { GET, POST, DELETE } from '../cart/route';

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
  createServiceClient: jest.fn(),
}));

// Mock pricing module
jest.mock('@/lib/pricing', () => ({
  defaultPricingCalculator: {
    calculateTotal: jest.fn(),
  },
}));

describe('Cart API - Comprehensive Tests', () => {
  let mockSupabase: any;
  let mockServiceSupabase: any;
  let mockPricingCalculator: any;

  // Mock data
  const mockCartItems = [
    {
      id: 'cart-item-1',
      user_id: 'user-123',
      product_id: '123e4567-e89b-12d3-a456-426614174000',
      quantity: 2,
      created_at: '2024-01-01T00:00:00Z',
      products: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        sku: 'FRAME-8x10-BLACK',
        price: 25.00,
        name: '8x10 Black Frame',
        frame_size: '8x10',
        frame_style: 'Black',
      }
    }
  ];

  const mockProduct = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    sku: 'FRAME-8x10-BLACK',
    price: 25.00,
    name: '8x10 Black Frame',
    frame_size: '8x10',
    frame_style: 'Black',
    available: true,
  };

  const mockCartItem = {
    id: 'cart-item-1',
    user_id: 'user-123',
    product_id: '123e4567-e89b-12d3-a456-426614174000',
    quantity: 1,
    created_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Supabase client
    mockSupabase = {
      auth: {
        getUser: jest.fn(),
        getSession: jest.fn(),
        refreshSession: jest.fn(),
      },
    };

    // Mock service Supabase client
    mockServiceSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
    };

    // Configure service client with flexible mocks
    mockServiceSupabase.from.mockImplementation((table: string) => {
      console.log('Service client from() called with table:', table);
      console.log('Service client mock implementation called');
      if (table === 'cart_items') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: mockCartItems,
                error: null,
              }),
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null, // No existing item for new cart item
                  error: null,
                })
              })
            })
          }),
          upsert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  ...mockCartItem,
                  products: mockProduct
                },
                error: null,
              })
            })
          }),
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: null,
                error: null,
              })
            })
          })
        };
      } else if (table === 'products') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: '123e4567-e89b-12d3-a456-426614174000',
                    status: 'active',
                    price: 25.00,
                  },
                  error: null,
                })
              })
            })
          })
        };
      }
      return mockServiceSupabase;
    });

    // Mock createClient and createServiceClient
    const { createClient, createServiceClient } = jest.requireMock('@/lib/supabase/server');
    createClient.mockResolvedValue(mockSupabase);
    createServiceClient.mockReturnValue(mockServiceSupabase);
    
    // Add debugging to see if service client is being called
    console.log('Service client mock setup:', mockServiceSupabase);

    // Mock pricing calculator
    mockPricingCalculator = {
      calculateTotal: jest.fn(),
    };

    const { defaultPricingCalculator } = jest.requireMock('@/lib/pricing');
    Object.assign(defaultPricingCalculator, mockPricingCalculator);
  });

  describe('GET /api/cart', () => {
    it('should retrieve cart items for authenticated user', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      };

      const mockCartItems = [
        {
          id: 'cart-item-1',
          product_id: 'product-1',
          quantity: 2,
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

      const mockTotals = {
        subtotal: 50.00,
        taxAmount: 4.00,
        shippingAmount: 0, // API always sets this to 0
        total: 59.00,
        itemCount: 2,
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock the service client query chain
      mockServiceSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: mockCartItems,
              error: null,
            })
          })
        })
      });

      mockPricingCalculator.calculateTotal.mockReturnValue(mockTotals);

      const request = new NextRequest('http://localhost:3000/api/cart', {
        method: 'GET',
        headers: {
          'authorization': 'Bearer test-token',
        },
      });

      const response = await GET(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(200);
      expect(responseData.cartItems).toEqual(mockCartItems);
      expect(responseData.totals).toEqual(mockTotals);
    });

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

      const request = new NextRequest('http://localhost:3000/api/cart', {
        method: 'GET',
      });

      const response = await GET(request);
      const responseData = JSON.parse(response.body as unknown as string);

      console.log('Response status:', response.status);
      console.log('Response data:', responseData);

      expect(response.status).toBe(401);
      expect(responseData.error).toBe('Unauthorized');
    });

    it('should handle database errors', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock the service client query chain to return an error
      mockServiceSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            })
          })
        })
      });

      const request = new NextRequest('http://localhost:3000/api/cart', {
        method: 'GET',
        headers: {
          'authorization': 'Bearer test-token',
        },
      });

      const response = await GET(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(500);
      expect(responseData.error).toBe('Failed to fetch cart items');
    });
  });

  describe('POST /api/cart', () => {
    it('should add item to cart successfully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      };

      const mockProduct = {
        id: 'product-1',
        sku: 'GLOBAL-CFPM-16X20-abc12345',
        price: 25.00,
        frame_size: 'medium',
        frame_style: 'black',
        frame_material: 'wood',
        images: {
          image_url: 'https://example.com/image.jpg',
        },
      };

      const mockCartItem = {
        id: 'cart-item-1',
        user_id: 'user-123',
        product_id: '123e4567-e89b-12d3-a456-426614174000',
        quantity: 1,
        created_at: '2024-01-01T00:00:00Z',
        products: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          sku: 'FRAME-8x10-BLACK',
          price: 25,
          name: '8x10 Black Frame',
          frame_size: '8x10',
          frame_style: 'Black',
          available: true
        }
      };

      // Mock authentication - both cookie and header methods
      mockSupabase.auth.getUser.mockImplementation((token) => {
        if (token) {
          // Header authentication with token
          return Promise.resolve({
            data: { user: mockUser },
            error: null,
          });
        } else {
          // Cookie authentication
          return Promise.resolve({
            data: { user: null },
            error: { message: 'No user in cookie' },
          });
        }
      });
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: mockUser } },
        error: null,
      });
      mockSupabase.auth.refreshSession.mockResolvedValue({
        data: { session: { user: mockUser } },
        error: null,
      });

      // Mock product lookup - removed specific mock to use flexible implementation

      // Mock existing cart item lookup (returns null for new item) - removed specific mock to use flexible implementation

      // Mock upsert operation - the API calls from().upsert()
      // The flexible mock implementation should handle this

      const requestBody = {
        productId: '123e4567-e89b-12d3-a456-426614174000',
        quantity: 1,
      };

      const request = new NextRequest('http://localhost:3000/api/cart', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'content-type': 'application/json',
          'authorization': 'Bearer test-token',
        },
      });
      
      // Mock the json() method
      request.json = jest.fn().mockResolvedValue(requestBody);

      const response = await POST(request);
      const responseData = JSON.parse(response.body as unknown as string);

      console.log('POST Response status:', response.status);
      console.log('POST Response data:', responseData);

      expect(response.status).toBe(201);
      expect(responseData.cartItem).toEqual(mockCartItem);
    });

    it('should update existing cart item quantity', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      };

      const mockProduct = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        sku: 'GLOBAL-CFPM-16X20-abc12345',
        price: 25.00,
        frame_size: 'medium',
        frame_style: 'black',
        frame_material: 'wood',
        images: {
          image_url: 'https://example.com/image.jpg',
        },
      };

      const existingCartItem = {
        id: 'cart-item-1',
        user_id: 'user-123',
        product_id: '123e4567-e89b-12d3-a456-426614174000',
        quantity: 2,
      };

      const updatedCartItem = {
        ...existingCartItem,
        quantity: 3,
        products: mockProduct,
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock product lookup
      mockServiceSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockProduct,
                error: null,
              })
            })
          })
        })
      });

      // Mock existing cart item lookup - return existing item
      mockServiceSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: existingCartItem,
                error: null,
              })
            })
          })
        })
      });

      // Mock upsert operation - return updated item
      mockServiceSupabase.from.mockReturnValueOnce({
        upsert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: updatedCartItem,
              error: null,
            })
          })
        })
      });

      const requestBody = {
        productId: '123e4567-e89b-12d3-a456-426614174000',
        quantity: 1, // This will be added to existing quantity of 2
      };

      const request = new NextRequest('http://localhost:3000/api/cart', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'content-type': 'application/json',
          'authorization': 'Bearer test-token',
        },
      });
      
      // Mock the json() method
      request.json = jest.fn().mockResolvedValue(requestBody);

      const response = await POST(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(200);
      expect(responseData.cartItem.quantity).toBe(3);
    });

    it('should handle product not found', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock product lookup to return error
      mockServiceSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Product not found' },
              })
            })
          })
        })
      });

      const requestBody = {
        productId: '123e4567-e89b-12d3-a456-426614174999', // Valid UUID that doesn't exist
        quantity: 1,
      };

      const request = new NextRequest('http://localhost:3000/api/cart', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'content-type': 'application/json',
          'authorization': 'Bearer test-token',
        },
      });
      
      // Mock the json() method
      request.json = jest.fn().mockResolvedValue(requestBody);

      const response = await POST(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(404);
      expect(responseData.error).toBe('Product not found or not available');
    });

    it('should handle invalid request body', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/cart', {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'content-type': 'application/json',
          'authorization': 'Bearer test-token',
        },
      });

      // Mock the json() method to throw an error for invalid JSON
      request.json = jest.fn().mockRejectedValue(new Error('Invalid JSON'));

      const response = await POST(request);
      const responseData = JSON.parse(response.body as unknown as string);

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
        // Missing productId
        quantity: 1,
      };

      const request = new NextRequest('http://localhost:3000/api/cart', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'content-type': 'application/json',
          'authorization': 'Bearer test-token',
        },
      });

      // Mock the json() method
      request.json = jest.fn().mockResolvedValue(requestBody);

      const response = await POST(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Invalid request data');
    });
  });


  describe('DELETE /api/cart', () => {
    it('should remove cart item successfully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock the delete chain: from().delete().eq().eq()
      mockServiceSupabase.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            })
          })
        })
      });

      const request = new NextRequest('http://localhost:3000/api/cart?productId=product-1', {
        method: 'DELETE',
        headers: {
          'authorization': 'Bearer test-token',
        },
      });

      const response = await DELETE(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(200);
      expect(responseData.message).toBe('Item removed from cart successfully');
    });

    it('should clear entire cart', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock the delete chain: from().delete().eq().eq()
      mockServiceSupabase.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            })
          })
        })
      });

      const request = new NextRequest('http://localhost:3000/api/cart?productId=all', {
        method: 'DELETE',
        headers: {
          'authorization': 'Bearer test-token',
        },
      });

      const response = await DELETE(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(200);
      expect(responseData.message).toBe('Item removed from cart successfully');
    });

    it('should handle cart item not found', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock the delete chain with error: from().delete().eq().eq()
      mockServiceSupabase.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Cart item not found' },
            })
          })
        })
      });

      const request = new NextRequest('http://localhost:3000/api/cart?productId=non-existent-item', {
        method: 'DELETE',
        headers: {
          'authorization': 'Bearer test-token',
        },
      });

      const response = await DELETE(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(500);
      expect(responseData.error).toBe('Failed to remove item from cart');
    });
  });

  describe('Error handling', () => {
    it('should handle authentication errors', async () => {
      // Mock all authentication methods to fail
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Authentication failed' },
      });
      
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'No session' },
      });
      
      mockSupabase.auth.refreshSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Refresh failed' },
      });

      const request = new NextRequest('http://localhost:3000/api/cart', {
        method: 'GET',
        headers: {
          'authorization': 'Bearer invalid-token',
        },
      });

      const response = await GET(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(401);
      expect(responseData.error).toBe('Unauthorized');
    });

    it('should handle database connection errors', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock the service client query chain to throw an error
      mockServiceSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockRejectedValue(new Error('Database connection failed'))
          })
        })
      });

      const request = new NextRequest('http://localhost:3000/api/cart', {
        method: 'GET',
        headers: {
          'authorization': 'Bearer test-token',
        },
      });

      const response = await GET(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(500);
      expect(responseData.error).toBe('Internal server error');
    });

    it('should handle pricing calculation errors', async () => {
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
            name: 'Test Frame',
            frame_size: 'medium',
            frame_style: 'black',
          },
        },
      ];

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock the service client query chain
      mockServiceSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: mockCartItems,
              error: null,
            })
          })
        })
      });

      mockPricingCalculator.calculateTotal.mockImplementation(() => {
        throw new Error('Pricing calculation failed');
      });

      const request = new NextRequest('http://localhost:3000/api/cart', {
        method: 'GET',
        headers: {
          'authorization': 'Bearer test-token',
        },
      });

      const response = await GET(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(500);
      expect(responseData.error).toBe('Internal server error');
    });
  });
});
