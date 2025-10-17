import { NextRequest } from 'next/server';
import { POST } from '../stripe/route';
import { createServiceClient } from '@/lib/supabase/server';
import { constructWebhookEvent } from '@/lib/stripe';

// Mock dependencies
jest.mock('@/lib/supabase/server');
jest.mock('@/lib/stripe');

const mockCreateServiceClient = createServiceClient as jest.MockedFunction<typeof createServiceClient>;
const mockConstructWebhookEvent = constructWebhookEvent as jest.MockedFunction<typeof constructWebhookEvent>;

describe('/api/webhooks/stripe - Shipping Address Extraction', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Supabase service client
    mockSupabase = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            in: jest.fn(() => ({
              data: [
                {
                  id: 'cart-item-1',
                  product_id: 'product-1',
                  quantity: 1,
                  products: {
                    id: 'product-1',
                    sku: 'TEST-SKU-1',
                    price: 29.99,
                    images: {
                      id: 'image-1',
                      prompt: 'Test image',
                      image_url: 'https://example.com/image.jpg',
                    },
                  },
                },
              ],
              error: null,
            })),
          })),
        })),
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => ({
              data: {
                id: 'order-123',
                order_number: 'ORD-1234567890-ABC123',
                total_amount: 38.38,
              },
              error: null,
            })),
          })),
        })),
      })),
    };

    mockCreateServiceClient.mockResolvedValue(mockSupabase);

    // Mock the webhook signature verification to always succeed
    mockConstructWebhookEvent.mockImplementation(async (body, signature) => {
      // Return a mock event - we'll override this in individual tests
      return {
        type: 'checkout.session.completed',
        id: 'evt_test_123',
        data: {
          object: {
            id: 'cs_test_123',
            payment_status: 'paid',
            customer_email: 'test@example.com',
            currency: 'usd',
            payment_intent: 'pi_test_123',
            metadata: {
              userId: 'user-123',
              cartItemIds: 'cart-item-1',
              subtotal: '29.99',
              taxAmount: '2.40',
              shippingAmount: '5.99',
              total: '38.38',
            },
          },
        },
      } as any;
    });
  });

  it('should extract shipping address from Stripe session with shipping_details', async () => {
    // Override the default mock with specific shipping details
    mockConstructWebhookEvent.mockResolvedValueOnce({
      type: 'checkout.session.completed',
      id: 'evt_test_123',
      data: {
        object: {
          id: 'cs_test_123',
          payment_status: 'paid',
          customer_email: 'test@example.com',
          currency: 'usd',
          payment_intent: 'pi_test_123',
          shipping_details: {
            address: {
              line1: '123 Main St',
              line2: 'Apt 4B',
              city: 'San Francisco',
              state: 'CA',
              postal_code: '94105',
              country: 'US',
            },
          },
          customer_details: {
            name: 'John Doe',
            phone: '+1234567890',
            address: {
              line1: '123 Main St',
              line2: 'Apt 4B',
              city: 'San Francisco',
              state: 'CA',
              postal_code: '94105',
              country: 'US',
            },
          },
          metadata: {
            userId: 'user-123',
            cartItemIds: 'cart-item-1',
            subtotal: '29.99',
            taxAmount: '2.40',
            shippingAmount: '5.99',
            total: '38.38',
          },
        },
      },
    } as any);

    // Create mock request body
    const requestBody = '{"type":"checkout.session.completed"}';
    const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
      method: 'POST',
      body: requestBody,
      headers: {
        'stripe-signature': 'test-signature',
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    // Verify order was created with correct shipping address
    const insertCall = mockSupabase.from().insert.mock.calls[0][0];
    expect(insertCall.shipping_address).toEqual({
      line1: '123 Main St',
      line2: 'Apt 4B',
      city: 'San Francisco',
      state: 'CA',
      postal_code: '94105',
      country: 'US',
    });
  });

  it('should use fallback shipping address when shipping_details is missing', async () => {
    // Mock webhook event without shipping details
    const mockEvent = {
      type: 'checkout.session.completed',
      id: 'evt_test_123',
      data: {
        object: {
          id: 'cs_test_123',
          payment_status: 'paid',
          customer_email: 'test@example.com',
          currency: 'cad',
          payment_intent: 'pi_test_123',
          // No shipping_details
          customer_details: {
            name: 'John Doe',
            phone: '+1234567890',
          },
          metadata: {
            userId: 'user-123',
            cartItemIds: 'cart-item-1',
            subtotal: '29.99',
            taxAmount: '2.40',
            shippingAmount: '5.99',
            total: '38.38',
          },
        },
      },
    };

    mockConstructWebhookEvent.mockResolvedValue(mockEvent as any);

    const requestBody = JSON.stringify(mockEvent);
    const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
      method: 'POST',
      body: requestBody,
      headers: {
        'stripe-signature': 'test-signature',
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    // Verify order was created with fallback shipping address
    const insertCall = mockSupabase.from().insert.mock.calls[0][0];
    expect(insertCall.shipping_address).toEqual({
      line1: 'Address not provided',
      line2: null,
      city: 'Unknown',
      state: 'Unknown',
      postal_code: '00000',
      country: 'CA', // Should be CA for CAD currency
    });
  });

  it('should use fallback shipping address when shipping_details.address is null', async () => {
    // Mock webhook event with null shipping address
    const mockEvent = {
      type: 'checkout.session.completed',
      id: 'evt_test_123',
      data: {
        object: {
          id: 'cs_test_123',
          payment_status: 'paid',
          customer_email: 'test@example.com',
          currency: 'usd',
          payment_intent: 'pi_test_123',
          shipping_details: {
            address: null, // Null address
          },
          customer_details: {
            name: 'John Doe',
            phone: '+1234567890',
          },
          metadata: {
            userId: 'user-123',
            cartItemIds: 'cart-item-1',
            subtotal: '29.99',
            taxAmount: '2.40',
            shippingAmount: '5.99',
            total: '38.38',
          },
        },
      },
    };

    mockConstructWebhookEvent.mockResolvedValue(mockEvent as any);

    const requestBody = JSON.stringify(mockEvent);
    const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
      method: 'POST',
      body: requestBody,
      headers: {
        'stripe-signature': 'test-signature',
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    // Verify order was created with fallback shipping address
    const insertCall = mockSupabase.from().insert.mock.calls[0][0];
    expect(insertCall.shipping_address).toEqual({
      line1: 'Address not provided',
      line2: null,
      city: 'Unknown',
      state: 'Unknown',
      postal_code: '00000',
      country: 'US', // Should be US for USD currency
    });
  });

  it('should use customer_details.address as billing address fallback', async () => {
    const mockEvent = {
      type: 'checkout.session.completed',
      id: 'evt_test_123',
      data: {
        object: {
          id: 'cs_test_123',
          payment_status: 'paid',
          customer_email: 'test@example.com',
          currency: 'usd',
          payment_intent: 'pi_test_123',
          shipping_details: {
            address: {
              line1: '123 Main St',
              city: 'San Francisco',
              state: 'CA',
              postal_code: '94105',
              country: 'US',
            },
          },
          customer_details: {
            name: 'John Doe',
            phone: '+1234567890',
            address: {
              line1: '456 Billing St',
              city: 'Los Angeles',
              state: 'CA',
              postal_code: '90210',
              country: 'US',
            },
          },
          metadata: {
            userId: 'user-123',
            cartItemIds: 'cart-item-1',
            subtotal: '29.99',
            taxAmount: '2.40',
            shippingAmount: '5.99',
            total: '38.38',
          },
        },
      },
    };

    mockConstructWebhookEvent.mockResolvedValue(mockEvent as any);

    const requestBody = JSON.stringify(mockEvent);
    const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
      method: 'POST',
      body: requestBody,
      headers: {
        'stripe-signature': 'test-signature',
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    // Verify billing address uses customer_details.address
    const insertCall = mockSupabase.from().insert.mock.calls[0][0];
    expect(insertCall.billing_address).toEqual({
      line1: '456 Billing St',
      city: 'Los Angeles',
      state: 'CA',
      postal_code: '90210',
      country: 'US',
    });
  });

  it('should use shipping address as billing address fallback when customer_details.address is missing', async () => {
    const mockEvent = {
      type: 'checkout.session.completed',
      id: 'evt_test_123',
      data: {
        object: {
          id: 'cs_test_123',
          payment_status: 'paid',
          customer_email: 'test@example.com',
          currency: 'usd',
          payment_intent: 'pi_test_123',
          shipping_details: {
            address: {
              line1: '123 Main St',
              city: 'San Francisco',
              state: 'CA',
              postal_code: '94105',
              country: 'US',
            },
          },
          customer_details: {
            name: 'John Doe',
            phone: '+1234567890',
            // No address
          },
          metadata: {
            userId: 'user-123',
            cartItemIds: 'cart-item-1',
            subtotal: '29.99',
            taxAmount: '2.40',
            shippingAmount: '5.99',
            total: '38.38',
          },
        },
      },
    };

    mockConstructWebhookEvent.mockResolvedValue(mockEvent as any);

    const requestBody = JSON.stringify(mockEvent);
    const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
      method: 'POST',
      body: requestBody,
      headers: {
        'stripe-signature': 'test-signature',
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    // Verify billing address falls back to shipping address
    const insertCall = mockSupabase.from().insert.mock.calls[0][0];
    expect(insertCall.billing_address).toEqual({
      line1: '123 Main St',
      city: 'San Francisco',
      state: 'CA',
      postal_code: '94105',
      country: 'US',
    });
  });
});
