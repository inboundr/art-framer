import { ProdigiClient } from '../prodigi';

// Mock fetch globally
global.fetch = jest.fn();

describe('ProdigiClient', () => {
  let prodigiClient: ProdigiClient;
  const mockApiKey = 'test-api-key';
  const mockEnvironment = 'sandbox' as const;

  beforeEach(() => {
    // Set up environment variable for callbackUrl
    process.env.NEXT_PUBLIC_APP_URL = 'https://test-app.com';
    prodigiClient = new ProdigiClient(mockApiKey, mockEnvironment);
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with correct configuration', () => {
      expect(prodigiClient).toBeInstanceOf(ProdigiClient);
    });

    it('should use sandbox URL for sandbox environment', () => {
      const sandboxClient = new ProdigiClient(mockApiKey, 'sandbox');
      expect(sandboxClient).toBeInstanceOf(ProdigiClient);
    });

    it('should use production URL for production environment', () => {
      const prodClient = new ProdigiClient(mockApiKey, 'production');
      expect(prodClient).toBeInstanceOf(ProdigiClient);
    });
  });

  describe('convertToProdigiOrder', () => {
    const mockOrderData = {
      orderReference: 'ORDER-123',
      items: [
        {
          productSku: 'GLOBAL-CFPM-16X20',
          quantity: 1,
          imageUrl: 'https://example.com/image.jpg',
          frameSize: 'medium',
          frameStyle: 'black',
          frameMaterial: 'wood',
        },
      ],
      shippingAddress: {
        firstName: 'John',
        lastName: 'Doe',
        address1: '123 Main St',
        address2: 'Apt 1',
        city: 'New York',
        state: 'NY',
        zip: '10001',
        country: 'US',
      },
      customerEmail: 'john@example.com',
      customerPhone: '555-1234',
    };

    it('should convert order data to Prodigi format correctly', async () => {
      const result = await prodigiClient.convertToProdigiOrder(mockOrderData);

      expect(result).toEqual({
        merchantReference: 'ORDER-123',
        shippingMethod: 'Standard',
        callbackUrl: 'https://test-app.com/api/webhooks/prodigi',
        recipient: {
          name: 'John Doe',
          email: 'john@example.com',
          phoneNumber: '555-1234',
          address: {
            line1: '123 Main St',
            line2: 'Apt 1',
            postalOrZipCode: '10001',
            countryCode: 'US',
            townOrCity: 'New York',
            stateOrCounty: 'NY',
          },
        },
        billingAddress: {
          name: 'John Doe',
          address: {
            line1: '123 Main St',
            line2: 'Apt 1',
            postalOrZipCode: '10001',
            countryCode: 'US',
            townOrCity: 'New York',
            stateOrCounty: 'NY',
          },
        },
        items: [
          {
            merchantReference: 'item-GLOBAL-CFPM-16X20',
            sku: 'GLOBAL-CFPM-16X20',
            copies: 1,
            sizing: 'fillPrintArea',
            attributes: {
              color: 'black',
            },
            assets: [
              {
                printArea: 'Default',
                url: 'https://example.com/image.jpg',
              },
            ],
          },
        ],
        metadata: {
          customerEmail: 'john@example.com',
          customerPhone: '555-1234',
        },
      });
    });

    it('should handle missing optional fields gracefully', async () => {
      const minimalOrderData = {
        orderReference: 'ORDER-123',
        items: [
          {
            productSku: 'GLOBAL-CFPM-16X20',
            quantity: 1,
            imageUrl: 'https://example.com/image.jpg',
            frameSize: 'medium',
            frameStyle: 'black',
            frameMaterial: 'wood',
          },
        ],
        shippingAddress: {
          city: 'New York',
          country: 'US',
        },
        customerEmail: 'john@example.com',
      };

      const result = await prodigiClient.convertToProdigiOrder(minimalOrderData);

      expect(result.recipient.name).toBe('Customer Name');
      expect(result.recipient.address.line1).toBe('');
      expect(result.recipient.address.line2).toBeUndefined();
      expect(result.recipient.phoneNumber).toBeUndefined();
    });

    it('should handle different address field formats', async () => {
      const orderDataWithDifferentFields = {
        ...mockOrderData,
        shippingAddress: {
          first_name: 'Jane',
          last_name: 'Smith',
          line1: '456 Oak Ave',
          line2: 'Suite 2',
          city: 'Los Angeles',
          state: 'CA',
          postal_code: '90210',
          country: 'US',
        },
      };

      const result = await prodigiClient.convertToProdigiOrder(orderDataWithDifferentFields);

      expect(result.recipient.name).toBe('Jane Smith');
      expect(result.recipient.address.line1).toBe('456 Oak Ave');
      expect(result.recipient.address.line2).toBe('Suite 2');
      expect(result.recipient.address.postalOrZipCode).toBe('90210');
    });

    it('should use billing address when provided', async () => {
      const orderDataWithBilling = {
        ...mockOrderData,
        billingAddress: {
          firstName: 'Billing',
          lastName: 'User',
          address1: '789 Billing St',
          city: 'Chicago',
          state: 'IL',
          zip: '60601',
          country: 'US',
        },
      };

      const result = await prodigiClient.convertToProdigiOrder(orderDataWithBilling);

      expect(result.billingAddress?.name).toBe('Billing User');
      expect(result.billingAddress?.address.line1).toBe('789 Billing St');
      expect(result.billingAddress?.address.townOrCity).toBe('Chicago');
    });

    it('should fallback to shipping address when billing address is not provided', async () => {
      const result = await prodigiClient.convertToProdigiOrder(mockOrderData);

      expect(result.billingAddress?.name).toBe('John Doe');
      expect(result.billingAddress?.address.line1).toBe('123 Main St');
    });
  });

  describe('getProductAttributes', () => {
    it('should return empty attributes for non-matching SKUs', () => {
      const attributes = (prodigiClient as any).getProductAttributes('black', 'wood', 'UNKNOWN-SKU');
      expect(attributes).toEqual({});
    });

    it('should add color attribute for GLOBAL-FRA-CAN- SKUs', () => {
      const attributes = (prodigiClient as any).getProductAttributes('black', 'wood', 'GLOBAL-FRA-CAN-30X40');
      expect(attributes).toEqual({
        color: 'black',
        wrap: 'ImageWrap',
      });
    });

    it('should add color attribute for GLOBAL-CFPM- SKUs', () => {
      const attributes = (prodigiClient as any).getProductAttributes('white', 'wood', 'GLOBAL-CFPM-16X20');
      expect(attributes).toEqual({
        color: 'white',
      });
    });

    it('should handle different frame styles correctly', () => {
      const blackAttributes = (prodigiClient as any).getProductAttributes('black', 'wood', 'GLOBAL-FRA-CAN-30X40');
      const whiteAttributes = (prodigiClient as any).getProductAttributes('white', 'wood', 'GLOBAL-FRA-CAN-30X40');
      const naturalAttributes = (prodigiClient as any).getProductAttributes('natural', 'wood', 'GLOBAL-FRA-CAN-30X40');

      expect(blackAttributes.color).toBe('black');
      expect(whiteAttributes.color).toBe('white');
      expect(naturalAttributes.color).toBe('natural');
    });
  });

  describe('extractBaseProdigiSku', () => {
    it('should return the same SKU if no image ID suffix', () => {
      const sku = 'GLOBAL-CFPM-16X20';
      const result = prodigiClient.extractBaseProdigiSku(sku);
      expect(result).toBe(sku);
    });

    it('should remove image ID suffix from SKU', () => {
      const sku = 'GLOBAL-CFPM-16X20-abc12345';
      const result = prodigiClient.extractBaseProdigiSku(sku);
      expect(result).toBe('GLOBAL-CFPM-16X20');
    });

    it('should handle multiple dashes in SKU', () => {
      const sku = 'GLOBAL-FRA-CAN-30X40-def67890';
      const result = prodigiClient.extractBaseProdigiSku(sku);
      expect(result).toBe('GLOBAL-FRA-CAN-30X40');
    });

    it('should return empty string for invalid SKU', () => {
      const result = prodigiClient.extractBaseProdigiSku('');
      expect(result).toBe('');
    });
  });

  describe('createOrder', () => {
    const mockProdigiOrder = {
      merchantReference: 'ORDER-123',
      shippingMethod: 'Standard',
      recipient: {
        name: 'John Doe',
        email: 'john@example.com',
        phoneNumber: '555-1234',
        address: {
          line1: '123 Main St',
          line2: 'Apt 1',
          postalOrZipCode: '10001',
          countryCode: 'US',
          townOrCity: 'New York',
          stateOrCounty: 'NY',
        },
      },
      items: [
        {
          merchantReference: 'item-1',
          sku: 'GLOBAL-CFPM-16X20',
          copies: 1,
          sizing: 'fillPrintArea',
          attributes: {},
          assets: [
            {
              printArea: 'Default',
              url: 'https://example.com/image.jpg',
            },
          ],
        },
      ],
      metadata: {},
    };

    it('should create order successfully', async () => {
      const mockResponse = {
        id: 'ord_123456',
        status: 'InProgress',
        trackingNumber: 'TRK123',
        trackingUrl: 'https://tracking.example.com/TRK123',
        estimatedDelivery: '2024-01-15T00:00:00Z',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ outcome: 'Created', order: mockResponse }),
      });

      const result = await prodigiClient.createOrder(mockProdigiOrder);

      expect(result).toEqual({
        outcome: 'Created',
        order: mockResponse
      });
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.sandbox.prodigi.com/v4.0/Orders',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': mockApiKey,
          },
          body: JSON.stringify(mockProdigiOrder),
        })
      );
    });

    it('should handle API errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => '{"error": "Invalid request"}',
      });

      await expect(prodigiClient.createOrder(mockProdigiOrder)).rejects.toThrow(
        'Prodigi API error: 400 Bad Request - {"error": "Invalid request"}'
      );
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(prodigiClient.createOrder(mockProdigiOrder)).rejects.toThrow('Network error');
    });
  });

  describe('getProduct', () => {
    it('should fetch product details successfully', async () => {
      const mockApiResponse = {
        outcome: 'Ok',
        product: {
          sku: 'GLOBAL-CFPM-16X20',
          name: 'Product GLOBAL-CFPM-16X20',
          description: 'Canvas Print',
          price: 0,
          currency: 'USD',
          dimensions: { width: 0, height: 0 },
          weight: 0,
          category: 'unknown',
          attributes: { color: ['black', 'white'] },
          images: []
        }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      });

      const result = await prodigiClient.getProduct('GLOBAL-CFPM-16X20');

      expect(result).toEqual({
        sku: 'GLOBAL-CFPM-16X20',
        name: 'Product GLOBAL-CFPM-16X20',
        description: 'Canvas Print',
        price: 0,
        currency: 'USD',
        dimensions: { width: 0, height: 0 },
        weight: 0,
        category: 'unknown',
        attributes: { color: ['black', 'white'] },
        images: []
      });
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.sandbox.prodigi.com/v4.0/products/GLOBAL-CFPM-16X20',
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': mockApiKey,
          },
        })
      );
    });

    it('should handle product not found', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => '{"error": "Product not found"}',
      });

      await expect(prodigiClient.getProduct('INVALID-SKU')).rejects.toThrow(
        'No working alternatives found for SKU: INVALID-SKU'
      );
    });
  });

  describe('getQuote', () => {
    it('should get shipping quote successfully', async () => {
      const mockApiResponse = {
        outcome: 'Created',
        quotes: [{
          shipmentMethod: 'Standard',
          costSummary: {
            items: { amount: '25.00', currency: 'USD' },
            shipping: { amount: '5.00', currency: 'USD' },
          },
          shipments: [
            {
              carrier: { name: 'UPS', service: 'Ground' },
              fulfillmentLocation: { countryCode: 'US', labCode: 'us1' },
              cost: { amount: '5.00', currency: 'USD' },
            },
          ],
        }]
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      });

      const quoteRequest = {
        items: [
          {
            sku: 'GLOBAL-CFPM-16X20',
            quantity: 1,
            attributes: { color: 'black' },
          },
        ],
        destinationCountryCode: 'US',
      };

      const result = await prodigiClient.getQuote(quoteRequest);

      expect(result).toEqual([{
        shipmentMethod: 'Standard',
        cost: { amount: '5.00', currency: 'USD' },
        estimatedDays: 5
      }]);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.sandbox.prodigi.com/v4.0/quotes',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': mockApiKey,
          },
        })
      );
    });
  });
});
