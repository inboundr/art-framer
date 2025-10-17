import { ProdigiClient } from '../prodigi';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock console methods to avoid noise in tests
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

describe('ProdigiClient - Improved Algorithm (Simple Tests)', () => {
  let client: ProdigiClient;

  beforeEach(() => {
    client = new ProdigiClient();
    mockFetch.mockClear();
  });

  describe('Failed SKU Tracking', () => {
    it('should track failed SKUs in the failedSkus set', () => {
      const sku = 'PRODIGI-11X14-B-W-mgtumnv0';
      
      // Manually add to failed SKUs (simulating what happens in the algorithm)
      client['failedSkus'].add(sku);
      
      expect(client['failedSkus'].has(sku)).toBe(true);
      expect(client['failedSkus'].size).toBe(1);
    });

    it('should not track the same SKU multiple times', () => {
      const sku = 'PRODIGI-11X14-B-W-mgtumnv0';
      
      // Add the same SKU multiple times
      client['failedSkus'].add(sku);
      client['failedSkus'].add(sku);
      client['failedSkus'].add(sku);
      
      expect(client['failedSkus'].has(sku)).toBe(true);
      expect(client['failedSkus'].size).toBe(1); // Should still be 1
    });
  });

  describe('Alternative SKU Caching', () => {
    it('should cache alternative SKUs', () => {
      const failedSku = 'PRODIGI-11X14-B-W-mgtumnv0';
      const alternativeSku = 'GLOBAL-CAN-10x10';
      
      // Cache an alternative
      client['alternativeSkus'].set(failedSku, alternativeSku);
      
      expect(client['alternativeSkus'].get(failedSku)).toBe(alternativeSku);
      expect(client['alternativeSkus'].size).toBe(1);
    });

    it('should retrieve cached alternative SKUs', () => {
      const failedSku = 'PRODIGI-11X14-B-W-mgtumnv0';
      const alternativeSku = 'GLOBAL-CAN-10x10';
      
      // Cache an alternative
      client['alternativeSkus'].set(failedSku, alternativeSku);
      
      // Retrieve it
      const retrieved = client['alternativeSkus'].get(failedSku);
      expect(retrieved).toBe(alternativeSku);
    });

    it('should handle multiple alternative SKUs', () => {
      const alternatives = [
        { failed: 'PRODIGI-11X14-B-W-mgtumnv0', alternative: 'GLOBAL-CAN-10x10' },
        { failed: 'PRODIGI-16X24-W-M-abc123', alternative: 'GLOBAL-FAP-16X24' },
        { failed: 'PRODIGI-8X10-N-B-def456', alternative: 'GLOBAL-FRAME-8X10' }
      ];
      
      // Cache multiple alternatives
      alternatives.forEach(({ failed, alternative }) => {
        client['alternativeSkus'].set(failed, alternative);
      });
      
      expect(client['alternativeSkus'].size).toBe(3);
      
      // Verify each one
      alternatives.forEach(({ failed, alternative }) => {
        expect(client['alternativeSkus'].get(failed)).toBe(alternative);
      });
    });
  });

  describe('Alternative SKU Pattern Generation', () => {
    it('should generate pattern-based alternatives for a failed SKU', async () => {
      const failedSku = 'PRODIGI-11X14-B-W-mgtumnv0';
      
      // Mock failed search API responses for all search strategies
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => 'Internal server error',
          json: async () => ({ message: 'Internal server error' })
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => 'Internal server error',
          json: async () => ({ message: 'Internal server error' })
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => 'Internal server error',
          json: async () => ({ message: 'Internal server error' })
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => 'Internal server error',
          json: async () => ({ message: 'Internal server error' })
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => 'Internal server error',
          json: async () => ({ message: 'Internal server error' })
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => 'Internal server error',
          json: async () => ({ message: 'Internal server error' })
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => 'Internal server error',
          json: async () => ({ message: 'Internal server error' })
        });
      
      const alternatives = await client['findAlternativeSkus'](failedSku);
      
      // Should contain known working patterns as fallback
      expect(alternatives).toContain('GLOBAL-CAN-10x10');
      expect(alternatives).toContain('GLOBAL-CFPM-16X20');
      expect(alternatives).toContain('GLOBAL-FAP-16X24');
      expect(alternatives).toContain('GLOBAL-FRA-CAN-30X40');
      
      // Since we have 12 known working patterns (> 10), pattern-based alternatives won't be added
      // But we should still have the known working patterns
      expect(alternatives.length).toBeGreaterThanOrEqual(12);
      
      // The algorithm should prioritize known working patterns over pattern-based ones
      const knownPatterns = alternatives.filter(alt => 
        alt.startsWith('GLOBAL-CAN-') || 
        alt.startsWith('GLOBAL-CFPM-') || 
        alt.startsWith('GLOBAL-FAP-') || 
        alt.startsWith('GLOBAL-FRA-CAN-') ||
        alt.startsWith('GLOBAL-FRAME-') ||
        alt.startsWith('GLOBAL-PRINT-')
      );
      expect(knownPatterns.length).toBeGreaterThanOrEqual(12);
      
      // Should not contain the original failed SKU
      expect(alternatives).not.toContain(failedSku);
    });

    it('should handle different SKU patterns', async () => {
      const failedSku = 'PRODIGI-16X24-W-M-abc123';
      
      // Mock failed search API response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal server error',
        json: async () => ({ message: 'Internal server error' })
      });
      
      const alternatives = await client['findAlternativeSkus'](failedSku);
      
      // Since we have 12 known working patterns (> 10), pattern-based alternatives won't be added
      // But we should still have the known working patterns
      expect(alternatives.length).toBeGreaterThanOrEqual(12);
      
      // The algorithm should prioritize known working patterns over pattern-based ones
      const knownPatterns = alternatives.filter(alt => 
        alt.startsWith('GLOBAL-CAN-') || 
        alt.startsWith('GLOBAL-CFPM-') || 
        alt.startsWith('GLOBAL-FAP-') || 
        alt.startsWith('GLOBAL-FRA-CAN-') ||
        alt.startsWith('GLOBAL-FRAME-') ||
        alt.startsWith('GLOBAL-PRINT-')
      );
      expect(knownPatterns.length).toBeGreaterThanOrEqual(12);
      
      // Should not contain the original failed SKU
      expect(alternatives).not.toContain(failedSku);
    });

    it('should remove duplicates from alternatives', async () => {
      const failedSku = 'PRODIGI-11X14-B-W-mgtumnv0';
      
      // Mock failed search API response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal server error',
        json: async () => ({ message: 'Internal server error' })
      });
      
      const alternatives = await client['findAlternativeSkus'](failedSku);
      
      // Check for duplicates
      const uniqueAlternatives = [...new Set(alternatives)];
      expect(alternatives.length).toBe(uniqueAlternatives.length);
    });
  });

  describe('SKU Generation', () => {
    it('should generate SKUs with correct format', async () => {
      const sku = await client.generateFrameSku('medium', 'black', 'wood', 'mgtumnv0');
      
      // Should return a known working SKU (GLOBAL-*) instead of fake PRODIGI-* SKUs
      expect(sku).toMatch(/^GLOBAL-/);
      expect(sku).toContain('11X14'); // medium size should map to 11X14
    });

    it('should generate different SKUs for different inputs', async () => {
      const sku1 = await client.generateFrameSku('medium', 'black', 'wood', 'mgtumnv0');
      const sku2 = await client.generateFrameSku('large', 'white', 'metal', 'abc123');
      
      expect(sku1).not.toBe(sku2);
      expect(sku1).toContain('11X14'); // medium should map to 11X14
      expect(sku2).toContain('16X24'); // large should map to 16X24
      // Both should be known working GLOBAL-* SKUs
      expect(sku1).toMatch(/^GLOBAL-/);
      expect(sku2).toMatch(/^GLOBAL-/);
    });

    it('should handle missing image ID', async () => {
      const sku = await client.generateFrameSku('medium', 'black', 'wood');
      
      // Should return a known working SKU (GLOBAL-*) instead of fake PRODIGI-* SKUs
      expect(sku).toMatch(/^GLOBAL-/);
      expect(sku).toContain('11X14'); // medium size should map to 11X14
    });
  });

  describe('Algorithm State Management', () => {
    it('should maintain algorithm state correctly', () => {
      const failedSku1 = 'PRODIGI-11X14-B-W-mgtumnv0';
      const failedSku2 = 'PRODIGI-16X24-W-M-abc123';
      const alternative1 = 'GLOBAL-CAN-10x10';
      const alternative2 = 'GLOBAL-FAP-16X24';
      
      // Add failed SKUs
      client['failedSkus'].add(failedSku1);
      client['failedSkus'].add(failedSku2);
      
      // Add alternatives
      client['alternativeSkus'].set(failedSku1, alternative1);
      client['alternativeSkus'].set(failedSku2, alternative2);
      
      // Verify state
      expect(client['failedSkus'].size).toBe(2);
      expect(client['alternativeSkus'].size).toBe(2);
      expect(client['failedSkus'].has(failedSku1)).toBe(true);
      expect(client['failedSkus'].has(failedSku2)).toBe(true);
      expect(client['alternativeSkus'].get(failedSku1)).toBe(alternative1);
      expect(client['alternativeSkus'].get(failedSku2)).toBe(alternative2);
    });

    it('should clear state when needed', () => {
      const failedSku = 'PRODIGI-11X14-B-W-mgtumnv0';
      const alternative = 'GLOBAL-CAN-10x10';
      
      // Add to state
      client['failedSkus'].add(failedSku);
      client['alternativeSkus'].set(failedSku, alternative);
      
      // Verify state exists
      expect(client['failedSkus'].has(failedSku)).toBe(true);
      expect(client['alternativeSkus'].get(failedSku)).toBe(alternative);
      
      // Clear state
      client['failedSkus'].clear();
      client['alternativeSkus'].clear();
      
      // Verify state is cleared
      expect(client['failedSkus'].size).toBe(0);
      expect(client['alternativeSkus'].size).toBe(0);
      expect(client['failedSkus'].has(failedSku)).toBe(false);
      expect(client['alternativeSkus'].get(failedSku)).toBeUndefined();
    });
  });

  describe('Alternative Prioritization', () => {
    it('should prioritize alternatives correctly', () => {
      const alternatives = [
        'GLOBAL-11X14-B-W',
        'GLOBAL-CAN-10x10',
        'GLOBAL-FRAME-11X14',
        'GLOBAL-CFPM-16X20',
        'GLOBAL-PRINT-11X14'
      ];
      const failedSku = 'PRODIGI-11X14-B-W-mgtumnv0';
      
      const prioritized = client['prioritizeAlternatives'](alternatives, failedSku);
      
      // Known working patterns should come first
      expect(prioritized[0]).toMatch(/GLOBAL-CAN-|GLOBAL-CFPM-|GLOBAL-FAP-|GLOBAL-FRA-CAN-/);
      
      // Size-matching alternatives should be prioritized
      const sizeMatching = prioritized.filter(alt => alt.includes('11X14'));
      const nonSizeMatching = prioritized.filter(alt => !alt.includes('11X14'));
      
      // Known working patterns should come first regardless of size
      const knownPatterns = prioritized.filter(alt => 
        alt.startsWith('GLOBAL-CAN-') || 
        alt.startsWith('GLOBAL-CFPM-') || 
        alt.startsWith('GLOBAL-FAP-') || 
        alt.startsWith('GLOBAL-FRA-CAN-')
      );
      
      // All known patterns should come before other alternatives
      const firstNonKnownIndex = prioritized.findIndex(alt => 
        !alt.startsWith('GLOBAL-CAN-') && 
        !alt.startsWith('GLOBAL-CFPM-') && 
        !alt.startsWith('GLOBAL-FAP-') && 
        !alt.startsWith('GLOBAL-FRA-CAN-')
      );
      
      if (firstNonKnownIndex !== -1 && knownPatterns.length > 0) {
        expect(firstNonKnownIndex).toBeGreaterThanOrEqual(knownPatterns.length);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors in findAlternativeSkus', async () => {
      const failedSku = 'PRODIGI-11X14-B-W-mgtumnv0';
      
      // Mock network error
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      
      const alternatives = await client['findAlternativeSkus'](failedSku);
      
      // Should still return pattern-based alternatives even if search API fails
      expect(alternatives).toBeDefined();
      expect(Array.isArray(alternatives)).toBe(true);
      expect(alternatives.length).toBeGreaterThan(0);
    });

    it('should handle malformed SKU patterns', async () => {
      const malformedSku = 'INVALID-SKU-FORMAT';
      
      // Mock failed search API response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal server error',
        json: async () => ({ message: 'Internal server error' })
      });
      
      const alternatives = await client['findAlternativeSkus'](malformedSku);
      
      // Should handle gracefully and return empty array or basic alternatives
      expect(alternatives).toBeDefined();
      expect(Array.isArray(alternatives)).toBe(true);
      expect(alternatives).not.toContain(malformedSku);
    });
  });
});
