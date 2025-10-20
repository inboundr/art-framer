// Simple test for SupabaseImageAPI without complex mocking
describe('SupabaseImageAPI', () => {
  it('should be importable', () => {
    expect(() => {
      require('../images');
    }).not.toThrow();
  });

  it('should have expected methods', () => {
    const { SupabaseImageAPI } = require('../images');
    const api = new SupabaseImageAPI();
    
    expect(typeof api.getGallery).toBe('function');
    expect(typeof api.getUserImages).toBe('function');
    expect(typeof api.uploadImage).toBe('function');
    expect(typeof api.deleteImage).toBe('function');
    expect(typeof api.likeImage).toBe('function');
    expect(typeof api.unlikeImage).toBe('function');
    expect(typeof api.isImageLiked).toBe('function');
  });
});