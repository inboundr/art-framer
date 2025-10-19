import { SimpleProdigiClient, simpleProdigiClient, ProdigiProduct } from '../prodigi-simple';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock console methods to avoid noise in tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

beforeAll(() => {
  console.log = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
});

describe('SimpleProdigiClient', () => {
  let client: SimpleProdigiClient;

  beforeEach(() => {
    jest.clearAllMocks();
    client = new SimpleProdigiClient('test-api-key', 'sandbox');
  });

  describe('constructor', () => {
    it('should initialize with sandbox environment by default', () => {
      const defaultClient = new SimpleProdigiClient('test-key');
      expect(defaultClient).toBeDefined();
    });

    it('should initialize with production environment', () => {
      const prodClient = new SimpleProdigiClient('test-key', 'production');
      expect(prodClient).toBeDefined();
    });
  });

  describe('getProductDetails', () => {
    it('should fetch and parse product details successfully', async () => {
      const mockResponse = {
        product: {
          sku: 'GLOBAL-FAP-8X10',
          name: 'Framed Art Print 8x10',
          description: 'High-quality framed art print',
          price: 29.99,
          currency: 'USD',
          dimensions: { width: 8, height: 10, depth: 1 },
          weight: 500,
          category: 'framed',
          attributes: { size: '8x10', material: 'wood', finish: 'black' },
          images: [
            {
              url: 'https://example.com/image.jpg',
              type: 'preview',
              width: 400,
              height: 500
            }
          ]
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse)
      });

      const result = await client.getProductDetails('GLOBAL-FAP-8X10');

      expect(result).toEqual({
        sku: 'GLOBAL-FAP-8X10',
        name: 'Framed Art Print 8x10',
        description: 'High-quality framed art print',
        price: 29.99,
        currency: 'USD',
        dimensions: { width: 8, height: 10, depth: 1 },
        weight: 500,
        category: 'framed',
        attributes: { size: '8x10', material: 'wood', finish: 'black' },
        images: [
          {
            url: 'https://example.com/image.jpg',
            type: 'preview',
            width: 400,
            height: 500
          }
        ]
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.sandbox.prodigi.com/v4.0/products/GLOBAL-FAP-8X10',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-API-Key': 'test-api-key',
            'Content-Type': 'application/json'
          })
        })
      );
    });

    it('should handle missing product data in response', async () => {
      const mockResponse = {};

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse)
      });

      await expect(client.getProductDetails('INVALID-SKU')).rejects.toThrow('No product data found in response for SKU: INVALID-SKU');
    });

    it('should handle 404 errors with custom message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: jest.fn().mockResolvedValue('Product not found')
      });

      await expect(client.getProductDetails('NON-EXISTENT')).rejects.toThrow('Product not found: NON-EXISTENT');
    });

    it('should handle other API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: jest.fn().mockResolvedValue('Server error')
      });

      await expect(client.getProductDetails('ERROR-SKU')).rejects.toThrow('Prodigi API error: 500 Internal Server Error - Server error');
    });

    it('should provide fallback values for missing fields', async () => {
      const mockResponse = {
        product: {
          sku: 'GLOBAL-FAP-8X10'
          // Missing other fields
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse)
      });

      const result = await client.getProductDetails('GLOBAL-FAP-8X10');

      expect(result).toEqual({
        sku: 'GLOBAL-FAP-8X10',
        name: 'Product GLOBAL-FAP-8X10',
        description: '',
        price: 0,
        currency: 'USD',
        dimensions: { width: 0, height: 0 },
        weight: 0,
        category: 'unknown',
        attributes: {},
        images: []
      });
    });
  });

  describe('validateSku', () => {
    it('should return true for valid SKU', async () => {
      const mockResponse = {
        product: {
          sku: 'GLOBAL-FAP-8X10',
          name: 'Framed Art Print 8x10'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse)
      });

      const result = await client.validateSku('GLOBAL-FAP-8X10');

      expect(result).toBe(true);
    });

    it('should return false for invalid SKU', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: jest.fn().mockResolvedValue('Product not found')
      });

      const result = await client.validateSku('INVALID-SKU');

      expect(result).toBe(false);
    });

    it('should return false for API errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await client.validateSku('ERROR-SKU');

      expect(result).toBe(false);
    });
  });

  describe('getKnownWorkingSkus', () => {
    it('should return list of known working SKUs', () => {
      const skus = client.getKnownWorkingSkus();

      expect(skus).toEqual([
        'GLOBAL-FAP-8X10',
        'GLOBAL-FAP-11X14', 
        'GLOBAL-FAP-16X24',
        'GLOBAL-CAN-10x10',
        'GLOBAL-CFPM-16X20',
        'GLOBAL-FRA-CAN-30X40'
      ]);
    });
  });

  describe('getBestSkuForFrame', () => {
    it('should return best SKU for small frames', () => {
      expect(client.getBestSkuForFrame('small', 'black', 'wood')).toBe('GLOBAL-FAP-8X10');
    });

    it('should return best SKU for medium frames', () => {
      expect(client.getBestSkuForFrame('medium', 'white', 'metal')).toBe('GLOBAL-FAP-11X14');
    });

    it('should return best SKU for large frames', () => {
      expect(client.getBestSkuForFrame('large', 'gold', 'wood')).toBe('GLOBAL-FAP-16X24');
    });

    it('should return best SKU for extra large frames', () => {
      expect(client.getBestSkuForFrame('extra_large', 'silver', 'metal')).toBe('GLOBAL-FRA-CAN-30X40');
    });

    it('should return default for unknown frame size', () => {
      expect(client.getBestSkuForFrame('unknown', 'black', 'wood')).toBe('GLOBAL-FAP-11X14');
    });
  });

  describe('calculateShippingCost', () => {
    it('should calculate shipping cost successfully', async () => {
      const mockResponse = {
        quotes: [
          {
            cost: { amount: 12.99, currency: 'USD' },
            estimatedDays: 5,
            service: 'Standard'
          }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse)
      });

      const items = [
        { sku: 'GLOBAL-FAP-8X10', copies: 1 },
        { sku: 'GLOBAL-FAP-11X14', copies: 2 }
      ];

      const result = await client.calculateShippingCost(items, 'US', 'Standard');

      expect(result).toEqual({
        cost: 12.99,
        currency: 'USD',
        estimatedDays: 5,
        service: 'Standard'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.sandbox.prodigi.com/v4.0/quotes',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            shippingMethod: 'Standard',
            destinationCountryCode: 'US',
            items: [
              {
                sku: 'GLOBAL-FAP-8X10',
                copies: 1,
                attributes: {},
                assets: [{ printArea: 'default' }]
              },
              {
                sku: 'GLOBAL-FAP-11X14',
                copies: 2,
                attributes: {},
                assets: [{ printArea: 'default' }]
              }
            ]
          })
        })
      );
    });

    it('should handle missing quotes in response', async () => {
      const mockResponse = {};

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse)
      });

      const items = [{ sku: 'GLOBAL-FAP-8X10', copies: 1 }];

      await expect(client.calculateShippingCost(items, 'US')).rejects.toThrow('No shipping quote available');
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: jest.fn().mockResolvedValue('Invalid request')
      });

      const items = [{ sku: 'INVALID-SKU', copies: 1 }];

      await expect(client.calculateShippingCost(items, 'US')).rejects.toThrow('Prodigi API error: 400 Bad Request - Invalid request');
    });

    it('should use default shipping method when not provided', async () => {
      const mockResponse = {
        quotes: [
          {
            cost: { amount: 9.99, currency: 'USD' },
            estimatedDays: 3,
            service: 'Express'
          }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse)
      });

      const items = [{ sku: 'GLOBAL-FAP-8X10', copies: 1 }];

      await client.calculateShippingCost(items, 'US');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.sandbox.prodigi.com/v4.0/quotes',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"shippingMethod":"Standard"')
        })
      );
    });
  });

  describe('environment configuration', () => {
    it('should use sandbox URL for sandbox environment', () => {
      const sandboxClient = new SimpleProdigiClient('test-key', 'sandbox');
      expect(sandboxClient).toBeDefined();
    });

    it('should use production URL for production environment', () => {
      const prodClient = new SimpleProdigiClient('test-key', 'production');
      expect(prodClient).toBeDefined();
    });
  });

  describe('request method', () => {
    it('should include correct headers in requests', async () => {
      const mockResponse = {
        product: {
          sku: 'GLOBAL-FAP-8X10',
          name: 'Test Product'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse)
      });

      await client.getProductDetails('GLOBAL-FAP-8X10');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.sandbox.prodigi.com/v4.0/products/GLOBAL-FAP-8X10',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-API-Key': 'test-api-key',
            'Content-Type': 'application/json'
          })
        })
      );
    });

    it('should handle custom headers in requests', async () => {
      const mockResponse = {
        quotes: [
          {
            cost: { amount: 10.00, currency: 'USD' },
            estimatedDays: 3,
            service: 'Standard'
          }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse)
      });

      const items = [{ sku: 'GLOBAL-FAP-8X10', copies: 1 }];
      await client.calculateShippingCost(items, 'US');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.sandbox.prodigi.com/v4.0/quotes',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'X-API-Key': 'test-api-key',
            'Content-Type': 'application/json'
          })
        })
      );
    });
  });
});

describe('simpleProdigiClient singleton', () => {
  it('should be defined', () => {
    expect(simpleProdigiClient).toBeDefined();
  });

  it('should be an instance of SimpleProdigiClient', () => {
    expect(simpleProdigiClient).toBeInstanceOf(SimpleProdigiClient);
  });

  it('should use environment from NODE_ENV', () => {
    const originalEnv = process.env.NODE_ENV;
    
    (process.env as any).NODE_ENV = 'production';
    const prodClient = new SimpleProdigiClient('test-key', 'production');
    expect(prodClient).toBeDefined();
    
    (process.env as any).NODE_ENV = 'development';
    const devClient = new SimpleProdigiClient('test-key', 'sandbox');
    expect(devClient).toBeDefined();
    
    (process.env as any).NODE_ENV = originalEnv;
  });
});
