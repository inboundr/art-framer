import { NextRequest } from 'next/server';
import { PUT, DELETE } from '../[id]/route';

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
  createServiceClient: jest.fn(),
}));

describe('Cart Item API - Individual Item Operations', () => {
  let mockSupabase: any;
  let mockServiceSupabase: any;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  };

  const mockCartItem = {
    id: 'cart-item-123',
    user_id: 'user-123',
    product_id: 'product-123',
    quantity: 2,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    products: {
      id: 'product-123',
      sku: 'FRAME-8x10-BLACK',
      price: 25.00,
      name: '8x10 Black Frame',
      frame_size: '8x10',
      frame_style: 'Black',
      images: {
        id: 'image-123',
        prompt: 'Test image',
        image_url: 'https://example.com/image.jpg',
        thumbnail_url: 'https://example.com/thumb.jpg',
        user_id: 'user-123',
        created_at: '2024-01-01T00:00:00Z',
      }
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Supabase client
    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
    };

    // Mock service Supabase client
    mockServiceSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      delete: jest.fn().mockReturnThis(),
    };

    // Mock createClient and createServiceClient
    const { createClient, createServiceClient } = jest.requireMock('@/lib/supabase/server');
    createClient.mockResolvedValue(mockSupabase);
    createServiceClient.mockReturnValue(mockServiceSupabase);
  });

  describe('PUT /api/cart/[id]', () => {
    it('should update cart item quantity successfully', async () => {
      const params = Promise.resolve({ id: 'cart-item-123' });
      
      // Mock authentication
      mockServiceSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock cart item verification
      mockServiceSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'cart-item-123', user_id: 'user-123' },
                error: null,
              })
            })
          })
        })
      });

      // Mock update operation
      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockCartItem,
                error: null,
              })
            })
          })
        })
      });

      const requestBody = { quantity: 3 };
      const request = new NextRequest('http://localhost:3000/api/cart/cart-item-123', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: {
          'content-type': 'application/json',
          'authorization': 'Bearer test-token',
        },
      });

      // Mock the json() method
      request.json = jest.fn().mockResolvedValue(requestBody);

      const response = await PUT(request, { params });
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(200);
      expect(responseData.cartItem).toEqual(mockCartItem);
    });

    it('should handle unauthenticated user', async () => {
      const params = Promise.resolve({ id: 'cart-item-123' });
      
      // Mock authentication failure
      mockServiceSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' },
      });
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'No user in cookie' },
      });

      const requestBody = { quantity: 3 };
      const request = new NextRequest('http://localhost:3000/api/cart/cart-item-123', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: {
          'content-type': 'application/json',
        },
      });

      const response = await PUT(request, { params });
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(401);
      expect(responseData.error).toBe('Unauthorized');
    });

    it('should handle cart item not found', async () => {
      const params = Promise.resolve({ id: 'cart-item-123' });
      
      // Mock authentication
      mockServiceSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock cart item verification failure
      mockServiceSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Cart item not found' },
              })
            })
          })
        })
      });

      const requestBody = { quantity: 3 };
      const request = new NextRequest('http://localhost:3000/api/cart/cart-item-123', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: {
          'content-type': 'application/json',
          'authorization': 'Bearer test-token',
        },
      });

      // Mock the json() method
      request.json = jest.fn().mockResolvedValue(requestBody);

      const response = await PUT(request, { params });
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(404);
      expect(responseData.error).toBe('Cart item not found or access denied');
    });

    it('should handle invalid request data', async () => {
      const params = Promise.resolve({ id: 'cart-item-123' });
      
      // Mock authentication
      mockServiceSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const requestBody = { quantity: 0 }; // Invalid quantity
      const request = new NextRequest('http://localhost:3000/api/cart/cart-item-123', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: {
          'content-type': 'application/json',
          'authorization': 'Bearer test-token',
        },
      });

      // Mock the json() method
      request.json = jest.fn().mockResolvedValue(requestBody);

      const response = await PUT(request, { params });
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Invalid request data');
    });

    it('should handle update database error', async () => {
      const params = Promise.resolve({ id: 'cart-item-123' });
      
      // Mock authentication
      mockServiceSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock cart item verification
      mockServiceSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'cart-item-123', user_id: 'user-123' },
                error: null,
              })
            })
          })
        })
      });

      // Mock update operation failure
      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Database error' },
              })
            })
          })
        })
      });

      const requestBody = { quantity: 3 };
      const request = new NextRequest('http://localhost:3000/api/cart/cart-item-123', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: {
          'content-type': 'application/json',
          'authorization': 'Bearer test-token',
        },
      });

      // Mock the json() method
      request.json = jest.fn().mockResolvedValue(requestBody);

      const response = await PUT(request, { params });
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(500);
      expect(responseData.error).toBe('Failed to update cart item');
    });
  });

  describe('DELETE /api/cart/[id]', () => {
    it('should delete cart item successfully', async () => {
      const params = Promise.resolve({ id: 'cart-item-123' });
      
      // Mock authentication
      mockServiceSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock service Supabase client for DELETE
      mockServiceSupabase.from.mockImplementation((table) => {
        if (table === 'cart_items') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { id: 'cart-item-123', user_id: 'user-123' },
                    error: null,
                  })
                })
              })
            }),
            delete: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: null,
                error: null,
              })
            })
          };
        }
        return {};
      });

      const request = new NextRequest('http://localhost:3000/api/cart/cart-item-123', {
        method: 'DELETE',
        headers: {
          'authorization': 'Bearer test-token',
        },
      });

      const response = await DELETE(request, { params });
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(200);
      expect(responseData.message).toBe('Cart item deleted successfully');
    });

    it('should handle unauthenticated user', async () => {
      const params = Promise.resolve({ id: 'cart-item-123' });
      
      // Mock authentication failure
      mockServiceSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' },
      });
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'No user in cookie' },
      });

      const request = new NextRequest('http://localhost:3000/api/cart/cart-item-123', {
        method: 'DELETE',
        headers: {
          'authorization': 'Bearer test-token',
        },
      });

      const response = await DELETE(request, { params });
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(401);
      expect(responseData.error).toBe('Unauthorized');
    });

    it('should handle cart item not found', async () => {
      const params = Promise.resolve({ id: 'cart-item-123' });
      
      // Mock authentication
      mockServiceSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock cart item verification failure
      mockServiceSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Cart item not found' },
              })
            })
          })
        })
      });

      const request = new NextRequest('http://localhost:3000/api/cart/cart-item-123', {
        method: 'DELETE',
        headers: {
          'authorization': 'Bearer test-token',
        },
      });

      const response = await DELETE(request, { params });
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(404);
      expect(responseData.error).toBe('Cart item not found or access denied');
    });

    it('should handle delete database error', async () => {
      const params = Promise.resolve({ id: 'cart-item-123' });
      
      // Mock authentication
      mockServiceSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock cart item verification
      mockServiceSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'cart-item-123', user_id: 'user-123' },
                error: null,
              })
            })
          })
        })
      });

      // Mock service Supabase client for DELETE error
      mockServiceSupabase.from.mockImplementation((table) => {
        if (table === 'cart_items') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { id: 'cart-item-123', user_id: 'user-123' },
                    error: null,
                  })
                })
              })
            }),
            delete: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Database error' },
              })
            })
          };
        }
        return {};
      });

      const request = new NextRequest('http://localhost:3000/api/cart/cart-item-123', {
        method: 'DELETE',
        headers: {
          'authorization': 'Bearer test-token',
        },
      });

      const response = await DELETE(request, { params });
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(500);
      expect(responseData.error).toBe('Failed to delete cart item');
    });
  });
});
