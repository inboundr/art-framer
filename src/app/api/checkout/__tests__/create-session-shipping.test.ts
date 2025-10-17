import { NextRequest } from 'next/server';
import { POST } from '../create-session/route';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

// Mock dependencies
jest.mock('@/lib/supabase/server');
jest.mock('stripe');

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockCreateServiceClient = createServiceClient as jest.MockedFunction<typeof createServiceClient>;
const mockStripe = Stripe as jest.MockedClass<typeof Stripe>;

describe('/api/checkout/create-session - Shipping Address Collection', () => {
  let mockSupabase: any;
  let mockStripeInstance: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock Supabase client
    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
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
                    frame_size: 'small',
                    frame_style: 'black',
                    frame_material: 'wood',
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
      })),
    };

    mockCreateClient.mockResolvedValue(mockSupabase);
    mockCreateServiceClient.mockResolvedValue(mockSupabase);

    // Mock authenticated user
    mockSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-123',
          email: 'test@example.com',
        },
      },
      error: null,
    });

    // Mock Stripe instance
    mockStripeInstance = {
      checkout: {
        sessions: {
          create: jest.fn(),
        },
      },
    };

    mockStripe.mockImplementation(() => mockStripeInstance);
  });

  it('should include shipping_address_collection in Stripe checkout session', async () => {
    // Mock successful Stripe session creation
    mockStripeInstance.checkout.sessions.create.mockResolvedValue({
      id: 'cs_test_123',
      url: 'https://checkout.stripe.com/test',
    });

    // Mock pricing and shipping services
    jest.doMock('@/lib/pricing', () => ({
      defaultPricingCalculator: {
        calculateTotal: jest.fn(() => ({
          subtotal: 29.99,
          taxAmount: 2.40,
          shippingAmount: 5.99,
          total: 38.38,
        })),
      },
    }));

    jest.doMock('@/lib/shipping', () => ({
      defaultShippingService: {
        calculateShipping: jest.fn(() => ({
          recommended: {
            cost: 5.99,
            currency: 'USD',
            estimatedDays: 5,
            service: 'Standard Shipping',
            carrier: 'UPS',
            trackingAvailable: true,
          },
        })),
      },
    }));

    const requestBody = {
      cartItemIds: ['cart-item-1'],
      shippingAddress: {
        countryCode: 'US',
        stateOrCounty: 'CA',
        postalCode: '90210',
      },
    };

    const request = new NextRequest('http://localhost:3000/api/checkout/create-session', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer valid-token',
      },
    });

    const response = await POST(request);
    const responseData = await response.json();

    // Verify Stripe session was created with shipping address collection
    expect(mockStripeInstance.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        shipping_address_collection: {
          allowed_countries: expect.arrayContaining([
            'US', 'CA', 'GB', 'AU', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'PT', 'IE', 'FI', 'LU', 'JP', 'KR', 'SG', 'HK', 'CH', 'SE', 'NO', 'DK', 'PL', 'CZ', 'HU', 'MX', 'BR', 'IN', 'NZ'
          ]),
        },
      })
    );

    expect(response.status).toBe(200);
    expect(responseData.sessionId).toBe('cs_test_123');
  });

  it('should include all required countries in shipping_address_collection', async () => {
    mockStripeInstance.checkout.sessions.create.mockResolvedValue({
      id: 'cs_test_123',
      url: 'https://checkout.stripe.com/test',
    });

    // Mock pricing and shipping services
    jest.doMock('@/lib/pricing', () => ({
      defaultPricingCalculator: {
        calculateTotal: jest.fn(() => ({
          subtotal: 29.99,
          taxAmount: 2.40,
          shippingAmount: 5.99,
          total: 38.38,
        })),
      },
    }));

    jest.doMock('@/lib/shipping', () => ({
      defaultShippingService: {
        calculateShipping: jest.fn(() => ({
          recommended: {
            cost: 5.99,
            currency: 'USD',
            estimatedDays: 5,
            service: 'Standard Shipping',
            carrier: 'UPS',
            trackingAvailable: true,
          },
        })),
      },
    }));

    const requestBody = {
      cartItemIds: ['cart-item-1'],
      shippingAddress: {
        countryCode: 'CA',
        stateOrCounty: 'ON',
        postalCode: 'M5V 3A8',
      },
    };

    const request = new NextRequest('http://localhost:3000/api/checkout/create-session', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer valid-token',
      },
    });

    await POST(request);

    const createCall = mockStripeInstance.checkout.sessions.create.mock.calls[0][0];
    const allowedCountries = createCall.shipping_address_collection.allowed_countries;

    // Verify key countries are included
    expect(allowedCountries).toContain('US');
    expect(allowedCountries).toContain('CA');
    expect(allowedCountries).toContain('GB');
    expect(allowedCountries).toContain('AU');
    expect(allowedCountries).toContain('DE');
    expect(allowedCountries).toContain('FR');
    expect(allowedCountries).toContain('JP');
    expect(allowedCountries).toContain('MX');
    expect(allowedCountries).toContain('BR');
  });

  it('should handle different currencies based on shipping country', async () => {
    mockStripeInstance.checkout.sessions.create.mockResolvedValue({
      id: 'cs_test_123',
      url: 'https://checkout.stripe.com/test',
    });

    // Mock pricing and shipping services
    jest.doMock('@/lib/pricing', () => ({
      defaultPricingCalculator: {
        calculateTotal: jest.fn(() => ({
          subtotal: 29.99,
          taxAmount: 2.40,
          shippingAmount: 5.99,
          total: 38.38,
        })),
      },
    }));

    jest.doMock('@/lib/shipping', () => ({
      defaultShippingService: {
        calculateShipping: jest.fn(() => ({
          recommended: {
            cost: 5.99,
            currency: 'CAD',
            estimatedDays: 5,
            service: 'Standard Shipping',
            carrier: 'UPS',
            trackingAvailable: true,
          },
        })),
      },
    }));

    const requestBody = {
      cartItemIds: ['cart-item-1'],
      shippingAddress: {
        countryCode: 'CA',
        stateOrCounty: 'ON',
        postalCode: 'M5V 3A8',
      },
    };

    const request = new NextRequest('http://localhost:3000/api/checkout/create-session', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer valid-token',
      },
    });

    await POST(request);

    const createCall = mockStripeInstance.checkout.sessions.create.mock.calls[0][0];
    
    // Verify currency is set to CAD for Canadian address
    expect(createCall.line_items[0].price_data.currency).toBe('cad');
  });
});
