// Simple test for CuratedImageAPI without complex mocking
describe('CuratedImageAPI', () => {
  it('should be importable', () => {
    expect(() => {
      require('../curated-images');
    }).not.toThrow();
  });

  it('should have expected methods', () => {
    const { CuratedImageAPI } = require('../curated-images');
    const api = new CuratedImageAPI();
    
    expect(typeof api.getGallery).toBe('function');
    expect(typeof api.getFeaturedImages).toBe('function');
    expect(typeof api.getImagesByCategory).toBe('function');
    expect(typeof api.getCategories).toBe('function');
    expect(typeof api.getTags).toBe('function');
    expect(typeof api.searchImages).toBe('function');
  });
});