import { getAspectRatioCategory, parseSizeToDimensions } from '@/lib/utils/aspect-ratio';

// Simulate the filtering logic from ConfigurationSummary
function filterSizesByAspect(sizes: string[], aspect: 'Portrait' | 'Landscape' | 'Square') {
  const normalized = sizes.map(s => s.replace(/[×\s]/g, 'x').toLowerCase());
  const filtered = normalized.filter(size => getAspectRatioCategory(size) === aspect);
  return filtered.length > 0 ? filtered : normalized; // fallback to avoid empty list
}

describe('Aspect Ratio ↔ Size interaction (e2e logic)', () => {
  it('parses sizes with units and special characters', () => {
    expect(parseSizeToDimensions('20x30cm')).toEqual({ width: 20, height: 30 });
    expect(parseSizeToDimensions('30 x 20 cm')).toEqual({ width: 30, height: 20 });
    expect(parseSizeToDimensions('8×10')).toEqual({ width: 8, height: 10 });
  });

  it('categorizes aspect ratio correctly', () => {
    expect(getAspectRatioCategory('20x30cm')).toBe('Portrait');
    expect(getAspectRatioCategory('30x20cm')).toBe('Landscape');
    expect(getAspectRatioCategory('16x16')).toBe('Square');
  });

  it('keeps sizes non-empty when filtering to Landscape', () => {
    const sizes = ['20x30cm', '30 x 20 cm', '8×10', '16x16'];
    const result = filterSizesByAspect(sizes, 'Landscape');
    expect(result.length).toBeGreaterThan(0);
    // Should include a landscape size
    expect(result).toContain('30x20cm');
  });

  it('keeps current size if it matches selected aspect ratio', () => {
    const sizes = ['20x30cm']; // only portrait in catalog
    const result = filterSizesByAspect(sizes, 'Portrait');
    expect(result).toContain('20x30cm');
  });
});

