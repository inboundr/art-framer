import { ProdigiProductService, ProductSearchCriteria } from '../prodigi-product-service';
import { ProdigiClient } from '../prodigi';

// Mock the ProdigiClient
jest.mock('../prodigi', () => ({
  ProdigiClient: jest.fn().mockImplementation(() => ({
    getAllProducts: jest.fn(),
    searchProducts: jest.fn(),
    getProductDetails: jest.fn(),
    getProductSku: jest.fn(),
    clearCache: jest.fn()
  }))
}));

const mockProdigiClient = {
  getAllProducts: jest.fn(),
  searchProducts: jest.fn(),
  getProductDetails: jest.fn(),
  getProductSku: jest.fn(),
  clearCache: jest.fn()
};

// Mock console methods
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

describe('ProdigiProductService', () => {
  let service: ProdigiProductService;
  let mockProdigiClientInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create a fresh mock instance
    mockProdigiClientInstance = {
      getAllProducts: jest.fn(),
      searchProducts: jest.fn(),
      getProductDetails: jest.fn(),
      getProductSku: jest.fn(),
      clearCache: jest.fn()
    };

    // Mock the ProdigiClient constructor
    (ProdigiClient as jest.MockedClass<typeof ProdigiClient>).mockImplementation(() => mockProdigiClientInstance);
    
    service = new ProdigiProductService();
  });

  describe('constructor', () => {
    it('should initialize with ProdigiClient', () => {
      expect(ProdigiClient).toHaveBeenCalled();
    });

    it('should warn when API key is not configured', () => {
      const originalEnv = process.env.PRODIGI_API_KEY;
      process.env.PRODIGI_API_KEY = 'your_prodigi_api_key_here';
      
      new ProdigiProductService();
      
      expect(console.warn).toHaveBeenCalledWith('⚠️ Prodigi API key not configured, using fallback mode');
      
      process.env.PRODIGI_API_KEY = originalEnv;
    });
  });

  describe('getAllProducts', () => {
    it('should return products from ProdigiClient', async () => {
      const mockProducts = [
        {
          sku: 'GLOBAL-CAN-10x10',
          name: 'Canvas Print 10x10',
          category: 'canvas',
          price: 29.99
        }
      ];

      mockProdigiClientInstance.getAllProducts.mockResolvedValue(mockProducts);

      const result = await service.getAllProducts();

      expect(result.success).toBe(true);
      expect(result.products).toEqual(mockProducts);
      expect(result.count).toBe(1);
      expect(result.fallback).toBe(false);
      expect(mockProdigiClientInstance.getAllProducts).toHaveBeenCalledWith(undefined);
    });

    it('should return products with category filter', async () => {
      const mockProducts = [
        {
          sku: 'GLOBAL-CAN-10x10',
          name: 'Canvas Print 10x10',
          category: 'canvas',
          price: 29.99
        }
      ];

      mockProdigiClientInstance.getAllProducts.mockResolvedValue(mockProducts);

      const result = await service.getAllProducts('canvas');

      expect(result.success).toBe(true);
      expect(result.products).toEqual(mockProducts);
      expect(mockProdigiClientInstance.getAllProducts).toHaveBeenCalledWith('canvas');
    });

    it('should return fallback response on error', async () => {
      mockProdigiClientInstance.getAllProducts.mockRejectedValue(new Error('API Error'));

      const result = await service.getAllProducts();

      expect(result.success).toBe(true);
      expect(result.fallback).toBe(true);
      expect(result.error).toBe('Prodigi API unavailable');
      expect(result.products).toHaveLength(4);
      expect(console.error).toHaveBeenCalledWith('Error fetching products:', expect.any(Error));
    });

    it('should use cache for subsequent calls', async () => {
      const mockProducts = [
        {
          sku: 'GLOBAL-CAN-10x10',
          name: 'Canvas Print 10x10',
          category: 'canvas',
          price: 29.99
        }
      ];

      mockProdigiClientInstance.getAllProducts.mockResolvedValue(mockProducts);

      // First call
      await service.getAllProducts();
      expect(mockProdigiClientInstance.getAllProducts).toHaveBeenCalledTimes(1);

      // Second call should use cache
      await service.getAllProducts();
      expect(mockProdigiClientInstance.getAllProducts).toHaveBeenCalledTimes(1);
    });
  });

  describe('searchProducts', () => {
    it('should search products with criteria', async () => {
      const criteria: ProductSearchCriteria = {
        category: 'canvas',
        size: '10x10',
        priceMin: 20,
        priceMax: 50
      };

      const mockProducts = [
        {
          sku: 'GLOBAL-CAN-10x10',
          name: 'Canvas Print 10x10',
          category: 'canvas',
          price: 29.99
        }
      ];

      mockProdigiClientInstance.searchProducts.mockResolvedValue(mockProducts);

      const result = await service.searchProducts(criteria);

      expect(result.success).toBe(true);
      expect(result.products).toEqual(mockProducts);
      expect(result.count).toBe(1);
      expect(result.fallback).toBe(false);
      expect(mockProdigiClientInstance.searchProducts).toHaveBeenCalledWith(criteria);
    });

    it('should return fallback response on error', async () => {
      const criteria: ProductSearchCriteria = { category: 'canvas' };
      mockProdigiClientInstance.searchProducts.mockRejectedValue(new Error('Search Error'));

      const result = await service.searchProducts(criteria);

      expect(result.success).toBe(true);
      expect(result.fallback).toBe(true);
      expect(result.error).toBe('Prodigi API unavailable');
      expect(console.error).toHaveBeenCalledWith('Error searching products:', expect.any(Error));
    });

    it('should use cache for identical search criteria', async () => {
      const criteria: ProductSearchCriteria = { category: 'canvas' };
      const mockProducts = [{ sku: 'GLOBAL-CAN-10x10', name: 'Canvas Print 10x10' }];

      mockProdigiClientInstance.searchProducts.mockResolvedValue(mockProducts);

      // First search
      await service.searchProducts(criteria);
      expect(mockProdigiClientInstance.searchProducts).toHaveBeenCalledTimes(1);

      // Second search with same criteria should use cache
      await service.searchProducts(criteria);
      expect(mockProdigiClientInstance.searchProducts).toHaveBeenCalledTimes(1);
    });
  });

  describe('getProductsByCategory', () => {
    it('should delegate to getAllProducts with category', async () => {
      const mockProducts = [{ sku: 'GLOBAL-CAN-10x10', category: 'canvas' }];
      mockProdigiClientInstance.getAllProducts.mockResolvedValue(mockProducts);

      const result = await service.getProductsByCategory('canvas');

      expect(result.success).toBe(true);
      expect(mockProdigiClientInstance.getAllProducts).toHaveBeenCalledWith('canvas');
    });
  });

  describe('getProductDetails', () => {
    it('should return product details from ProdigiClient', async () => {
      const mockProduct = {
        sku: 'GLOBAL-CAN-10x10',
        name: 'Canvas Print 10x10',
        price: 29.99
      };

      mockProdigiClientInstance.getProductDetails.mockResolvedValue(mockProduct);

      const result = await service.getProductDetails('GLOBAL-CAN-10x10');

      expect(result).toEqual(mockProduct);
      expect(mockProdigiClientInstance.getProductDetails).toHaveBeenCalledWith('GLOBAL-CAN-10x10');
    });

    it('should return fallback product on error', async () => {
      mockProdigiClientInstance.getProductDetails.mockRejectedValue(new Error('Product not found'));

      const result = await service.getProductDetails('NON-EXISTENT');

      expect(result.sku).toBe('GLOBAL-CAN-10x10'); // First fallback product
      expect(console.error).toHaveBeenCalledWith('Error fetching product NON-EXISTENT:', expect.any(Error));
    });
  });

  describe('findBestProduct', () => {
    it('should return SKU from ProdigiClient', async () => {
      mockProdigiClientInstance.getProductSku.mockResolvedValue('GLOBAL-CAN-10x10');

      const result = await service.findBestProduct('small', 'black', 'wood');

      expect(result).toBe('GLOBAL-CAN-10x10');
      expect(mockProdigiClientInstance.getProductSku).toHaveBeenCalledWith('small', 'black', 'wood');
    });

    it('should return fallback SKU on error', async () => {
      mockProdigiClientInstance.getProductSku.mockRejectedValue(new Error('No matching product'));

      const result = await service.findBestProduct('small', 'black', 'wood');

      expect(result).toBe('GLOBAL-CAN-10x10'); // Fallback for 'small'
      expect(console.error).toHaveBeenCalledWith('Error finding best product:', expect.any(Error));
    });

    it('should return default fallback for unknown size', async () => {
      mockProdigiClientInstance.getProductSku.mockRejectedValue(new Error('No matching product'));

      const result = await service.findBestProduct('unknown', 'black', 'wood');

      expect(result).toBe('GLOBAL-CFPM-16X20'); // Default fallback
    });
  });

  describe('getCategories', () => {
    it('should return categories from products', async () => {
      const mockProducts = [
        { category: 'canvas' },
        { category: 'framed' },
        { category: 'canvas' },
        { category: 'prints' }
      ];

      mockProdigiClientInstance.getAllProducts.mockResolvedValue(mockProducts);

      const result = await service.getCategories();

      expect(result).toEqual(['canvas', 'framed', 'prints']);
      expect(mockProdigiClientInstance.getAllProducts).toHaveBeenCalled();
    });

    it('should return fallback categories on error', async () => {
      mockProdigiClientInstance.getAllProducts.mockRejectedValue(new Error('API Error'));

      const result = await service.getCategories();

      expect(result).toEqual(['canvas', 'framed', 'prints', 'posters']);
      expect(console.error).toHaveBeenCalledWith('Error fetching categories:', expect.any(Error));
    });
  });

  describe('getSizes', () => {
    it('should return sizes from products', async () => {
      const mockProducts = [
        { attributes: { size: '10x10' } },
        { attributes: { size: '16x20' } },
        { attributes: { size: '10x10' } },
        { attributes: { size: '30x40' } }
      ];

      mockProdigiClientInstance.getAllProducts.mockResolvedValue(mockProducts);

      const result = await service.getSizes();

      expect(result).toEqual(['10x10', '16x20', '30x40']);
    });

    it('should return fallback sizes on error', async () => {
      mockProdigiClientInstance.getAllProducts.mockRejectedValue(new Error('API Error'));

      const result = await service.getSizes();

      expect(result).toEqual(['10x10', '16x20', '16x24', '30x40']);
      expect(console.error).toHaveBeenCalledWith('Error fetching sizes:', expect.any(Error));
    });
  });

  describe('getMaterials', () => {
    it('should return materials from products', async () => {
      const mockProducts = [
        { attributes: { material: 'canvas' } },
        { attributes: { material: 'wood' } },
        { attributes: { material: 'canvas' } },
        { attributes: { material: 'metal' } }
      ];

      mockProdigiClientInstance.getAllProducts.mockResolvedValue(mockProducts);

      const result = await service.getMaterials();

      expect(result).toEqual(['canvas', 'wood', 'metal']);
    });

    it('should return fallback materials on error', async () => {
      mockProdigiClientInstance.getAllProducts.mockRejectedValue(new Error('API Error'));

      const result = await service.getMaterials();

      expect(result).toEqual(['canvas', 'wood', 'metal', 'paper']);
      expect(console.error).toHaveBeenCalledWith('Error fetching materials:', expect.any(Error));
    });
  });

  describe('getFinishes', () => {
    it('should return finishes from products', async () => {
      const mockProducts = [
        { attributes: { finish: 'matte' } },
        { attributes: { finish: 'glossy' } },
        { attributes: { finish: 'matte' } },
        { attributes: { finish: 'satin' } }
      ];

      mockProdigiClientInstance.getAllProducts.mockResolvedValue(mockProducts);

      const result = await service.getFinishes();

      expect(result).toEqual(['matte', 'glossy', 'satin']);
    });

    it('should return fallback finishes on error', async () => {
      mockProdigiClientInstance.getAllProducts.mockRejectedValue(new Error('API Error'));

      const result = await service.getFinishes();

      expect(result).toEqual(['matte', 'glossy', 'satin']);
      expect(console.error).toHaveBeenCalledWith('Error fetching finishes:', expect.any(Error));
    });
  });

  describe('clearCache', () => {
    it('should clear all caches', () => {
      service.clearCache();

      expect(mockProdigiClientInstance.clearCache).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith('🗑️ Product service cache cleared');
    });
  });

  describe('fallback responses', () => {
    it('should provide fallback products with correct structure', () => {
      const fallbackResponse = service.getFallbackResponse();

      expect(fallbackResponse.success).toBe(true);
      expect(fallbackResponse.fallback).toBe(true);
      expect(fallbackResponse.error).toBe('Prodigi API unavailable');
      expect(fallbackResponse.products).toHaveLength(4);
      expect(fallbackResponse.count).toBe(4);

      const firstProduct = fallbackResponse.products[0];
      expect(firstProduct).toHaveProperty('sku');
      expect(firstProduct).toHaveProperty('name');
      expect(firstProduct).toHaveProperty('description');
      expect(firstProduct).toHaveProperty('price');
      expect(firstProduct).toHaveProperty('currency');
      expect(firstProduct).toHaveProperty('dimensions');
      expect(firstProduct).toHaveProperty('weight');
      expect(firstProduct).toHaveProperty('category');
      expect(firstProduct).toHaveProperty('attributes');
      expect(firstProduct).toHaveProperty('images');
    });

    it('should provide fallback product for specific SKU', () => {
      const fallbackProduct = service['getFallbackProduct']('GLOBAL-CAN-10x10');

      expect(fallbackProduct.sku).toBe('GLOBAL-CAN-10x10');
      expect(fallbackProduct.name).toBe('Canvas Print 10x10');
    });

    it('should provide default fallback product for unknown SKU', () => {
      const fallbackProduct = service['getFallbackProduct']('UNKNOWN-SKU');

      expect(fallbackProduct.sku).toBe('GLOBAL-CAN-10x10'); // First fallback product
    });

    it('should provide fallback SKU for frame sizes', () => {
      expect(service['getFallbackSku']('small')).toBe('GLOBAL-CAN-10x10');
      expect(service['getFallbackSku']('medium')).toBe('GLOBAL-CFPM-16X20');
      expect(service['getFallbackSku']('large')).toBe('GLOBAL-FAP-16X24');
      expect(service['getFallbackSku']('extra_large')).toBe('GLOBAL-FRA-CAN-30X40');
      expect(service['getFallbackSku']('unknown')).toBe('GLOBAL-CFPM-16X20'); // Default
    });
  });

  describe('cache functionality', () => {
    it('should cache results for subsequent calls', async () => {
      const mockProducts = [{ sku: 'GLOBAL-CAN-10x10', name: 'Canvas Print 10x10' }];
      mockProdigiClientInstance.getAllProducts.mockResolvedValue(mockProducts);

      // First call
      const result1 = await service.getAllProducts();
      expect(mockProdigiClientInstance.getAllProducts).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const result2 = await service.getAllProducts();
      expect(mockProdigiClientInstance.getAllProducts).toHaveBeenCalledTimes(1);
      expect(result1).toEqual(result2);
    });

    it('should have separate cache for different categories', async () => {
      const canvasProducts = [{ sku: 'GLOBAL-CAN-10x10', category: 'canvas' }];
      const framedProducts = [{ sku: 'GLOBAL-FAP-16X24', category: 'framed' }];

      mockProdigiClientInstance.getAllProducts
        .mockResolvedValueOnce(canvasProducts)
        .mockResolvedValueOnce(framedProducts);

      // Call with canvas category
      await service.getAllProducts('canvas');
      expect(mockProdigiClientInstance.getAllProducts).toHaveBeenCalledWith('canvas');

      // Call with framed category
      await service.getAllProducts('framed');
      expect(mockProdigiClientInstance.getAllProducts).toHaveBeenCalledWith('framed');

      // Should have been called twice
      expect(mockProdigiClientInstance.getAllProducts).toHaveBeenCalledTimes(2);
    });
  });
});
