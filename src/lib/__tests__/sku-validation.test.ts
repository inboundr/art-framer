import {
  validateSkuWithProdigi,
  getValidSkuForFrame,
  validateAndFixSku,
  createSkuValidationMiddleware,
  batchValidateSkus
} from '../sku-validation';
import { simpleProdigiClient } from '../prodigi-simple';

// Mock the simpleProdigiClient
jest.mock('../prodigi-simple', () => ({
  simpleProdigiClient: {
    validateSku: jest.fn(),
    getBestSkuForFrame: jest.fn(),
    getKnownWorkingSkus: jest.fn()
  }
}));

const mockSimpleProdigiClient = simpleProdigiClient as jest.Mocked<typeof simpleProdigiClient>;

// Mock console methods
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  console.log = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  console.log = originalConsoleLog;
  console.warn = originalConsoleWarn;
});

describe('SKU Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateSkuWithProdigi', () => {
    it('should return true for valid SKU', async () => {
      mockSimpleProdigiClient.validateSku.mockResolvedValue(true);

      const result = await validateSkuWithProdigi('GLOBAL-FAP-8X10');

      expect(result).toBe(true);
      expect(mockSimpleProdigiClient.validateSku).toHaveBeenCalledWith('GLOBAL-FAP-8X10');
    });

    it('should return false for invalid SKU', async () => {
      mockSimpleProdigiClient.validateSku.mockResolvedValue(false);

      const result = await validateSkuWithProdigi('INVALID-SKU');

      expect(result).toBe(false);
      expect(mockSimpleProdigiClient.validateSku).toHaveBeenCalledWith('INVALID-SKU');
    });

    it('should return false and log warning on error', async () => {
      const error = new Error('API Error');
      mockSimpleProdigiClient.validateSku.mockRejectedValue(error);

      const result = await validateSkuWithProdigi('ERROR-SKU');

      expect(result).toBe(false);
      expect(console.warn).toHaveBeenCalledWith('SKU validation failed for ERROR-SKU:', error);
    });
  });

  describe('getValidSkuForFrame', () => {
    it('should return best SKU for frame specifications', () => {
      mockSimpleProdigiClient.getBestSkuForFrame.mockReturnValue('GLOBAL-FAP-8X10');

      const result = getValidSkuForFrame('small', 'black', 'wood');

      expect(result).toBe('GLOBAL-FAP-8X10');
      expect(mockSimpleProdigiClient.getBestSkuForFrame).toHaveBeenCalledWith('small', 'black', 'wood');
    });
  });

  describe('validateAndFixSku', () => {
    beforeEach(() => {
      mockSimpleProdigiClient.getKnownWorkingSkus.mockReturnValue([
        'GLOBAL-FAP-8X10',
        'GLOBAL-FAP-11X14',
        'GLOBAL-FAP-16X24',
        'GLOBAL-CAN-10x10',
        'GLOBAL-CFPM-16X20',
        'GLOBAL-FRA-CAN-30X40'
      ]);
    });

    it('should return known working SKU as-is', async () => {
      const result = await validateAndFixSku('GLOBAL-FAP-8X10');

      expect(result).toBe('GLOBAL-FAP-8X10');
      expect(mockSimpleProdigiClient.validateSku).not.toHaveBeenCalled();
    });

    it('should validate and return valid generated SKU', async () => {
      mockSimpleProdigiClient.validateSku.mockResolvedValue(true);

      const result = await validateAndFixSku('PRODIGI-12345');

      expect(result).toBe('PRODIGI-12345');
      expect(mockSimpleProdigiClient.validateSku).toHaveBeenCalledWith('PRODIGI-12345');
    });

    it('should replace invalid generated SKU with valid one when frame specs provided', async () => {
      mockSimpleProdigiClient.validateSku.mockResolvedValue(false);
      mockSimpleProdigiClient.getBestSkuForFrame.mockReturnValue('GLOBAL-FAP-8X10');

      const result = await validateAndFixSku('PRODIGI-INVALID', 'small', 'black', 'wood');

      expect(result).toBe('GLOBAL-FAP-8X10');
      expect(console.warn).toHaveBeenCalledWith('Invalid generated SKU PRODIGI-INVALID, replacing with valid SKU');
      expect(mockSimpleProdigiClient.getBestSkuForFrame).toHaveBeenCalledWith('small', 'black', 'wood');
    });

    it('should generate valid SKU when frame specs provided', async () => {
      mockSimpleProdigiClient.getBestSkuForFrame.mockReturnValue('GLOBAL-FAP-11X14');

      const result = await validateAndFixSku('UNKNOWN-SKU', 'medium', 'white', 'metal');

      expect(result).toBe('GLOBAL-FAP-11X14');
      expect(mockSimpleProdigiClient.getBestSkuForFrame).toHaveBeenCalledWith('medium', 'white', 'metal');
    });

    it('should return fallback SKU when no frame specs provided', async () => {
      const result = await validateAndFixSku('UNKNOWN-SKU');

      expect(result).toBe('GLOBAL-FAP-11X14');
    });

    it('should handle validation errors gracefully', async () => {
      mockSimpleProdigiClient.validateSku.mockRejectedValue(new Error('Network error'));
      mockSimpleProdigiClient.getBestSkuForFrame.mockReturnValue('GLOBAL-FAP-8X10');

      const result = await validateAndFixSku('PRODIGI-ERROR', 'small', 'black', 'wood');

      expect(result).toBe('GLOBAL-FAP-8X10');
      expect(console.warn).toHaveBeenCalledWith('SKU validation failed for PRODIGI-ERROR:', expect.any(Error));
    });
  });

  describe('createSkuValidationMiddleware', () => {
    let middleware: ReturnType<typeof createSkuValidationMiddleware>;

    beforeEach(() => {
      middleware = createSkuValidationMiddleware();
      mockSimpleProdigiClient.getKnownWorkingSkus.mockReturnValue([
        'GLOBAL-FAP-8X10',
        'GLOBAL-FAP-11X14',
        'GLOBAL-FAP-16X24'
      ]);
    });

    describe('validateProductSku', () => {
      it('should return product data unchanged for valid SKU', async () => {
        const productData = {
          sku: 'GLOBAL-FAP-8X10',
          frame_size: 'small',
          frame_style: 'black',
          frame_material: 'wood'
        };

        const result = await middleware.validateProductSku(productData);

        expect(result).toEqual(productData);
      });

      it('should fix invalid SKU and log the change', async () => {
        mockSimpleProdigiClient.getBestSkuForFrame.mockReturnValue('GLOBAL-FAP-8X10');

        const productData = {
          sku: 'INVALID-SKU',
          frame_size: 'small',
          frame_style: 'black',
          frame_material: 'wood'
        };

        const result = await middleware.validateProductSku(productData);

        expect(result).toEqual({
          sku: 'GLOBAL-FAP-8X10',
          frame_size: 'small',
          frame_style: 'black',
          frame_material: 'wood'
        });
        expect(console.log).toHaveBeenCalledWith('🔄 SKU validation: INVALID-SKU → GLOBAL-FAP-8X10');
      });

      it('should handle missing frame specifications', async () => {
        const productData = {
          sku: 'INVALID-SKU'
        };

        const result = await middleware.validateProductSku(productData);

        expect(result.sku).toBe('GLOBAL-FAP-11X14'); // Fallback SKU
        expect(console.log).toHaveBeenCalledWith('🔄 SKU validation: INVALID-SKU → GLOBAL-FAP-11X14');
      });
    });

    describe('validateUpdateSku', () => {
      it('should return update data unchanged when no SKU provided', async () => {
        const updateData = {
          frame_size: 'medium',
          frame_style: 'white',
          frame_material: 'metal'
        };

        const result = await middleware.validateUpdateSku(updateData);

        expect(result).toEqual(updateData);
      });

      it('should return update data unchanged for valid SKU', async () => {
        const updateData = {
          sku: 'GLOBAL-FAP-8X10',
          frame_size: 'small',
          frame_style: 'black',
          frame_material: 'wood'
        };

        const result = await middleware.validateUpdateSku(updateData);

        expect(result).toEqual(updateData);
      });

      it('should fix invalid SKU in update data', async () => {
        mockSimpleProdigiClient.getBestSkuForFrame.mockReturnValue('GLOBAL-FAP-11X14');

        const updateData = {
          sku: 'INVALID-SKU',
          frame_size: 'medium',
          frame_style: 'white',
          frame_material: 'metal'
        };

        const result = await middleware.validateUpdateSku(updateData);

        expect(result).toEqual({
          sku: 'GLOBAL-FAP-11X14',
          frame_size: 'medium',
          frame_style: 'white',
          frame_material: 'metal'
        });
        expect(console.log).toHaveBeenCalledWith('🔄 SKU validation: INVALID-SKU → GLOBAL-FAP-11X14');
      });

      it('should handle partial update data', async () => {
        const updateData = {
          sku: 'INVALID-SKU'
        };

        const result = await middleware.validateUpdateSku(updateData);

        expect(result.sku).toBe('GLOBAL-FAP-11X14'); // Fallback SKU
      });
    });
  });

  describe('batchValidateSkus', () => {
    it('should validate multiple SKUs and return results', async () => {
      mockSimpleProdigiClient.validateSku
        .mockResolvedValueOnce(true)  // GLOBAL-FAP-8X10
        .mockResolvedValueOnce(false) // INVALID-SKU
        .mockResolvedValueOnce(true)  // GLOBAL-FAP-11X14
        .mockResolvedValueOnce(false); // ANOTHER-INVALID

      const skus = ['GLOBAL-FAP-8X10', 'INVALID-SKU', 'GLOBAL-FAP-11X14', 'ANOTHER-INVALID'];

      const result = await batchValidateSkus(skus);

      expect(result).toEqual({
        valid: ['GLOBAL-FAP-8X10', 'GLOBAL-FAP-11X14'],
        invalid: ['INVALID-SKU', 'ANOTHER-INVALID']
      });
    });

    it('should handle validation errors in batch', async () => {
      mockSimpleProdigiClient.validateSku
        .mockResolvedValueOnce(true)  // GLOBAL-FAP-8X10
        .mockRejectedValueOnce(new Error('Network error')) // ERROR-SKU
        .mockResolvedValueOnce(false); // INVALID-SKU

      const skus = ['GLOBAL-FAP-8X10', 'ERROR-SKU', 'INVALID-SKU'];

      const result = await batchValidateSkus(skus);

      expect(result).toEqual({
        valid: ['GLOBAL-FAP-8X10'],
        invalid: ['ERROR-SKU', 'INVALID-SKU']
      });
    });

    it('should handle empty SKU list', async () => {
      const result = await batchValidateSkus([]);

      expect(result).toEqual({
        valid: [],
        invalid: []
      });
    });

    it('should handle all valid SKUs', async () => {
      mockSimpleProdigiClient.validateSku
        .mockResolvedValue(true)
        .mockResolvedValue(true)
        .mockResolvedValue(true);

      const skus = ['GLOBAL-FAP-8X10', 'GLOBAL-FAP-11X14', 'GLOBAL-FAP-16X24'];

      const result = await batchValidateSkus(skus);

      expect(result).toEqual({
        valid: ['GLOBAL-FAP-8X10', 'GLOBAL-FAP-11X14', 'GLOBAL-FAP-16X24'],
        invalid: []
      });
    });

    it('should handle all invalid SKUs', async () => {
      mockSimpleProdigiClient.validateSku
        .mockResolvedValue(false)
        .mockResolvedValue(false)
        .mockResolvedValue(false);

      const skus = ['INVALID-1', 'INVALID-2', 'INVALID-3'];

      const result = await batchValidateSkus(skus);

      expect(result).toEqual({
        valid: [],
        invalid: ['INVALID-1', 'INVALID-2', 'INVALID-3']
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty SKU string', async () => {
      mockSimpleProdigiClient.getBestSkuForFrame.mockReturnValue('GLOBAL-FAP-11X14');

      const result = await validateAndFixSku('');

      expect(result).toBe('GLOBAL-FAP-11X14');
    });

    it('should handle null/undefined frame specifications', async () => {
      mockSimpleProdigiClient.getBestSkuForFrame.mockReturnValue('GLOBAL-FAP-11X14');

      const result = await validateAndFixSku('INVALID-SKU', null as any, undefined, '');

      expect(result).toBe('GLOBAL-FAP-11X14');
    });

    it('should handle middleware with empty product data', async () => {
      const middleware = createSkuValidationMiddleware();
      mockSimpleProdigiClient.getBestSkuForFrame.mockReturnValue('GLOBAL-FAP-11X14');

      const result = await middleware.validateProductSku({ sku: 'INVALID' });

      expect(result.sku).toBe('GLOBAL-FAP-11X14');
    });
  });
});
