import { NextRequest } from 'next/server';
import { POST } from '../../webhooks/stripe/route';

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  createServiceClient: jest.fn(),
}));

// Mock Prodigi client
jest.mock('@/lib/prodigi', () => ({
  prodigiClient: {
    extractBaseProdigiSku: jest.fn((sku: string) => sku.replace(/-\w{8}$/, '')),
    convertToProdigiOrder: jest.fn(),
    createOrder: jest.fn(),
  },
}));

// Mock Stripe
jest.mock('@/lib/stripe', () => ({
  stripe: {
    webhooks: {
      constructEvent: jest.fn(),
    },
  },
  constructWebhookEvent: jest.fn(),
}));

describe('Stripe Webhook Handler - Comprehensive Tests', () => {
  let mockSupabase: any;
  let mockStripe: any;
  let mockProdigiClient: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Supabase client
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      single: jest.fn(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
    };

    // Mock createServiceClient
    const { createServiceClient } = require('@/lib/supabase/server');
    createServiceClient.mockResolvedValue(mockSupabase);

    // Mock cart items query (this is called with .select().eq().in() chain)
    mockSupabase.select.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        in: jest.fn().mockResolvedValue({
          data: [
            {
              id: 'item-1',
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
          ],
          error: null,
        })
      })
    });

    // Mock Stripe
    const { stripe, constructWebhookEvent } = require('@/lib/stripe');
    mockStripe = stripe;
    mockStripe.webhooks.constructEvent = jest.fn();

    // Mock Prodigi client
    mockProdigiClient = require('@/lib/prodigi').prodigiClient;
  });

  describe('checkout.session.completed event', () => {
    const mockSession = {
      id: 'cs_test_123',
      payment_status: 'paid',
      customer_email: 'test@example.com',
      customer_details: {
        name: 'John Doe',
        phone: '555-1234',
        address: {
          line1: '123 Main St',
          line2: 'Apt 1',
          city: 'New York',
          state: 'NY',
          postal_code: '10001',
          country: 'US',
        },
      },
      metadata: {
        userId: 'user-123',
        subtotal: '25.00',
        taxAmount: '2.50',
        shippingAmount: '5.00',
        total: '32.50',
        cartItemIds: 'item-1,item-2',
      },
    };

    const mockEvent = {
      type: 'checkout.session.completed',
      data: {
        object: mockSession,
      },
    };

    it('should handle successful checkout session completion', async () => {
      // Mock Stripe webhook verification
      const { constructWebhookEvent } = require('@/lib/stripe');
      constructWebhookEvent.mockImplementation((payload, signature) => {
        console.log('Mock constructWebhookEvent called with:', { payload, signature });
        return mockEvent;
      });
      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);

      // Mock database queries
      mockSupabase.single
        .mockResolvedValueOnce({
          data: { id: 'user-123', email: 'test@example.com' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: [
            {
              id: 'item-1',
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
          ],
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            shipping_address: {
              firstName: 'John',
              lastName: 'Doe',
              address1: '123 Main St',
              city: 'New York',
              state: 'NY',
              zip: '10001',
              country: 'US',
            },
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            id: 'order-123',
            order_number: 'ORD-123',
            customer_email: 'test@example.com',
            customer_phone: '555-1234',
            shipping_address: {
              firstName: 'John',
              lastName: 'Doe',
              address1: '123 Main St',
              city: 'New York',
              state: 'NY',
              zip: '10001',
              country: 'US',
            },
            billing_address: {
              firstName: 'John',
              lastName: 'Doe',
              address1: '123 Main St',
              city: 'New York',
              state: 'NY',
              zip: '10001',
              country: 'US',
            },
            order_items: [
              {
                id: 'order-item-1',
                product_id: 'product-1',
                quantity: 1,
                unit_price: 25.00,
                total_price: 25.00,
                products: {
                  id: 'product-1',
                  sku: 'GLOBAL-CFPM-16X20-abc12345',
                  frame_size: 'medium',
                  frame_style: 'black',
                  frame_material: 'wood',
                  images: {
                    image_url: 'https://example.com/image.jpg',
                  },
                },
              },
            ],
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { id: 'dropship-123' },
          error: null,
        });

      // Mock Prodigi client
      mockProdigiClient.convertToProdigiOrder.mockResolvedValue({
        merchantReference: 'ORD-123',
        shippingMethod: 'Standard',
        recipient: { name: 'John Doe' },
        items: [{ sku: 'GLOBAL-CFPM-16X20' }],
      });

      // Mock cart items query (this is called with .in() method)
      mockSupabase.in.mockResolvedValue({
        data: [
          {
            id: 'item-1',
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
        ],
        error: null,
      });

      mockProdigiClient.createOrder.mockResolvedValue({
        id: 'ord_123456',
        status: 'InProgress',
        trackingNumber: 'TRK123',
        trackingUrl: 'https://tracking.example.com/TRK123',
        estimatedDelivery: '2024-01-15T00:00:00Z',
      });

      // Mock insert operations
      mockSupabase.insert.mockResolvedValue({
        data: { id: 'order-123' },
        error: null,
      });

      // Mock update operations
      mockSupabase.update.mockResolvedValue({
        data: null,
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: {
          'content-type': 'application/json',
          'stripe-signature': 'test-signature',
        },
      });

      const response = await POST(request);
      const responseData = JSON.parse(response.body);

      console.log('Response status:', response.status);
      console.log('Response data:', responseData);

      expect(response.status).toBe(200);
      expect(responseData.received).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('cart_items');
      expect(mockSupabase.from).toHaveBeenCalledWith('orders');
      // Note: insert is not called because order already exists (idempotency check)
    });

    it('should handle missing stored address and fallback to Stripe session', async () => {
      // Mock Stripe webhook verification
      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);

      // Mock database queries - no stored address
      mockSupabase.single
        .mockResolvedValueOnce({
          data: { id: 'user-123', email: 'test@example.com' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: [
            {
              id: 'item-1',
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
          ],
          error: null,
        })
        .mockResolvedValueOnce({
          data: null, // No existing order - should create new one
          error: null,
        })
        .mockResolvedValueOnce({
          data: null, // No stored address
          error: { message: 'Not found' },
        })
        .mockResolvedValueOnce({
          data: {
            id: 'order-123',
            order_number: 'ORD-123',
            customer_email: 'test@example.com',
            customer_phone: '555-1234',
            shipping_address: {
              firstName: 'John',
              lastName: 'Doe',
              address1: '123 Main St',
              city: 'New York',
              state: 'NY',
              zip: '10001',
              country: 'US',
            },
            billing_address: {
              firstName: 'John',
              lastName: 'Doe',
              address1: '123 Main St',
              city: 'New York',
              state: 'NY',
              zip: '10001',
              country: 'US',
            },
            order_items: [
              {
                id: 'order-item-1',
                product_id: 'product-1',
                quantity: 1,
                unit_price: 25.00,
                total_price: 25.00,
                products: {
                  id: 'product-1',
                  sku: 'GLOBAL-CFPM-16X20-abc12345',
                  frame_size: 'medium',
                  frame_style: 'black',
                  frame_material: 'wood',
                  images: {
                    image_url: 'https://example.com/image.jpg',
                  },
                },
              },
            ],
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { id: 'dropship-123' },
          error: null,
        });

      // Mock Prodigi client
      mockProdigiClient.convertToProdigiOrder.mockResolvedValue({
        merchantReference: 'ORD-123',
        shippingMethod: 'Standard',
        recipient: { name: 'John Doe' },
        items: [{ sku: 'GLOBAL-CFPM-16X20' }],
      });

      mockProdigiClient.createOrder.mockResolvedValue({
        id: 'ord_123456',
        status: 'InProgress',
      });

      // Mock insert operations
      mockSupabase.insert.mockResolvedValue({
        data: { id: 'order-123' },
        error: null,
      });

      // Mock update operations
      mockSupabase.update.mockResolvedValue({
        data: null,
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: {
          'content-type': 'application/json',
          'stripe-signature': 'test-signature',
        },
      });

      const response = await POST(request);
      const responseData = JSON.parse(response.body);

      console.log('Response status:', response.status);
      console.log('Response data:', responseData);

      expect(response.status).toBe(200);
      expect(responseData.received).toBe(true);
    });

    it('should handle incomplete stored address and fallback to Stripe session', async () => {
      // Mock Stripe webhook verification
      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);

      // Mock database queries - incomplete stored address
      mockSupabase.single
        .mockResolvedValueOnce({
          data: { id: 'user-123', email: 'test@example.com' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: [
            {
              id: 'item-1',
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
          ],
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            shipping_address: {
              // Incomplete address - missing required fields
              firstName: 'John',
              lastName: 'Doe',
              // Missing address1, city, state
            },
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            id: 'order-123',
            order_number: 'ORD-123',
            customer_email: 'test@example.com',
            customer_phone: '555-1234',
            shipping_address: {
              firstName: 'John',
              lastName: 'Doe',
              address1: '123 Main St',
              city: 'New York',
              state: 'NY',
              zip: '10001',
              country: 'US',
            },
            billing_address: {
              firstName: 'John',
              lastName: 'Doe',
              address1: '123 Main St',
              city: 'New York',
              state: 'NY',
              zip: '10001',
              country: 'US',
            },
            order_items: [
              {
                id: 'order-item-1',
                product_id: 'product-1',
                quantity: 1,
                unit_price: 25.00,
                total_price: 25.00,
                products: {
                  id: 'product-1',
                  sku: 'GLOBAL-CFPM-16X20-abc12345',
                  frame_size: 'medium',
                  frame_style: 'black',
                  frame_material: 'wood',
                  images: {
                    image_url: 'https://example.com/image.jpg',
                  },
                },
              },
            ],
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { id: 'dropship-123' },
          error: null,
        });

      // Mock Prodigi client
      mockProdigiClient.convertToProdigiOrder.mockResolvedValue({
        merchantReference: 'ORD-123',
        shippingMethod: 'Standard',
        recipient: { name: 'John Doe' },
        items: [{ sku: 'GLOBAL-CFPM-16X20' }],
      });

      mockProdigiClient.createOrder.mockResolvedValue({
        id: 'ord_123456',
        status: 'InProgress',
      });

      // Mock insert operations
      mockSupabase.insert.mockResolvedValue({
        data: { id: 'order-123' },
        error: null,
      });

      // Mock update operations
      mockSupabase.update.mockResolvedValue({
        data: null,
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: {
          'content-type': 'application/json',
          'stripe-signature': 'test-signature',
        },
      });

      const response = await POST(request);
      const responseData = JSON.parse(response.body);

      expect(response.status).toBe(200);
      expect(responseData.received).toBe(true);
    });

    it('should handle Prodigi API errors gracefully', async () => {
      // Mock Stripe webhook verification
      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);

      // Mock database queries
      mockSupabase.single
        .mockResolvedValueOnce({
          data: { id: 'user-123', email: 'test@example.com' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: [
            {
              id: 'item-1',
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
          ],
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            shipping_address: {
              firstName: 'John',
              lastName: 'Doe',
              address1: '123 Main St',
              city: 'New York',
              state: 'NY',
              zip: '10001',
              country: 'US',
            },
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            id: 'order-123',
            order_number: 'ORD-123',
            customer_email: 'test@example.com',
            customer_phone: '555-1234',
            shipping_address: {
              firstName: 'John',
              lastName: 'Doe',
              address1: '123 Main St',
              city: 'New York',
              state: 'NY',
              zip: '10001',
              country: 'US',
            },
            billing_address: {
              firstName: 'John',
              lastName: 'Doe',
              address1: '123 Main St',
              city: 'New York',
              state: 'NY',
              zip: '10001',
              country: 'US',
            },
            order_items: [
              {
                id: 'order-item-1',
                product_id: 'product-1',
                quantity: 1,
                unit_price: 25.00,
                total_price: 25.00,
                products: {
                  id: 'product-1',
                  sku: 'GLOBAL-CFPM-16X20-abc12345',
                  frame_size: 'medium',
                  frame_style: 'black',
                  frame_material: 'wood',
                  images: {
                    image_url: 'https://example.com/image.jpg',
                  },
                },
              },
            ],
          },
          error: null,
        });

      // Mock Prodigi client to throw error
      mockProdigiClient.convertToProdigiOrder.mockResolvedValue({
        merchantReference: 'ORD-123',
        shippingMethod: 'Standard',
        recipient: { name: 'John Doe' },
        items: [{ sku: 'GLOBAL-CFPM-16X20' }],
      });

      mockProdigiClient.createOrder.mockRejectedValue(new Error('Prodigi API error'));

      // Mock insert operations
      mockSupabase.insert.mockResolvedValue({
        data: { id: 'order-123' },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: {
          'content-type': 'application/json',
          'stripe-signature': 'test-signature',
        },
      });

      const response = await POST(request);
      const responseData = JSON.parse(response.body);

      expect(response.status).toBe(200);
      expect(responseData.received).toBe(true);
    });

    it('should handle database errors gracefully', async () => {
      // Mock Stripe webhook verification
      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);

      // Mock database error for cart items query
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database connection failed' },
          })
        })
      });

      const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: {
          'content-type': 'application/json',
          'stripe-signature': 'test-signature',
        },
      });

      const response = await POST(request);
      const responseData = JSON.parse(response.body);

      console.log('Webhook Response status:', response.status);
      console.log('Webhook Response data:', responseData);

      expect(response.status).toBe(200);
      expect(responseData.received).toBe(true);
    });
  });

  describe('Other event types', () => {
    it('should handle payment_intent.succeeded event', async () => {
      const mockEvent = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_123',
            amount: 3250,
            currency: 'usd',
          },
        },
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);

      const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: {
          'content-type': 'application/json',
          'stripe-signature': 'test-signature',
        },
      });

      const response = await POST(request);
      const responseData = JSON.parse(response.body);

      expect(response.status).toBe(200);
      expect(responseData.received).toBe(true);
    });

    it('should handle charge.dispute.created event', async () => {
      const mockEvent = {
        type: 'charge.dispute.created',
        data: {
          object: {
            id: 'dp_test_123',
            amount: 3250,
            currency: 'usd',
            reason: 'fraudulent',
          },
        },
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);

      const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: {
          'content-type': 'application/json',
          'stripe-signature': 'test-signature',
        },
      });

      const response = await POST(request);
      const responseData = JSON.parse(response.body);

      expect(response.status).toBe(200);
      expect(responseData.received).toBe(true);
    });

    it('should handle unknown event types', async () => {
      const mockEvent = {
        type: 'unknown.event.type',
        data: {
          object: {},
        },
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);

      const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: {
          'content-type': 'application/json',
          'stripe-signature': 'test-signature',
        },
      });

      const response = await POST(request);
      const responseData = JSON.parse(response.body);

      expect(response.status).toBe(200);
      expect(responseData.received).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should handle invalid JSON', async () => {
      // Mock constructWebhookEvent to throw an error for invalid JSON
      const { constructWebhookEvent } = require('@/lib/stripe');
      constructWebhookEvent.mockImplementation(() => {
        throw new Error('Invalid JSON');
      });

      const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'content-type': 'application/json',
          'stripe-signature': 'test-signature',
        },
      });

      const response = await POST(request);
      const responseData = JSON.parse(response.body);

      expect(response.status).toBe(400);
      expect(responseData.received).toBe(false);
    });

    it('should handle missing Stripe signature', async () => {
      const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify({ type: 'test.event' }),
        headers: {
          'content-type': 'application/json',
        },
      });

      const response = await POST(request);
      const responseData = JSON.parse(response.body);

      expect(response.status).toBe(400);
      expect(responseData.received).toBe(false);
    });

    it('should handle Stripe webhook verification failure', async () => {
      // Mock constructWebhookEvent to throw an error for invalid signature
      const { constructWebhookEvent } = require('@/lib/stripe');
      constructWebhookEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify({ type: 'test.event' }),
        headers: {
          'content-type': 'application/json',
          'stripe-signature': 'invalid-signature',
        },
      });

      const response = await POST(request);
      const responseData = JSON.parse(response.body);

      expect(response.status).toBe(400);
      expect(responseData.received).toBe(false);
    });
  });
});
