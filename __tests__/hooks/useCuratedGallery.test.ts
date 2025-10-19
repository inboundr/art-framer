import { renderHook, act } from '@testing-library/react';
import { useCuratedGallery } from '@/hooks/useCuratedGallery';

// Mock the curated images API
jest.mock('@/lib/curated-images', () => ({
  curatedImageAPI: {
    getGallery: jest.fn(),
    getFeaturedImages: jest.fn(),
    getCategories: jest.fn(),
    getTags: jest.fn(),
    searchImages: jest.fn(),
  },
}));

describe('useCuratedGallery Hook', () => {
  let mockCuratedImageAPI: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCuratedImageAPI = require('@/lib/curated-images').curatedImageAPI;
  });

  it('should initialize with empty state', async () => {
    mockCuratedImageAPI.getGallery.mockResolvedValue({
      images: [],
      pagination: {
        page: 1,
        total_pages: 0,
        total: 0,
        has_more: false,
      },
    });

    const { result } = renderHook(() => useCuratedGallery());

    // Wait for initial load to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    expect(result.current.images).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.hasMore).toBe(false);
  });

  it('should fetch curated images successfully', async () => {
    const mockImages = [
      {
        id: 'curated-1',
        image_url: 'https://example.com/image1.jpg',
        prompt: 'Beautiful sunset',
        category: 'nature',
        is_featured: true,
      },
    ];

    mockCuratedImageAPI.getGallery.mockResolvedValue({
      images: mockImages,
      pagination: {
        page: 1,
        total_pages: 1,
        total: mockImages.length,
        has_more: true,
      },
    });

    const { result } = renderHook(() => useCuratedGallery());

    // Wait for initial load to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    expect(result.current.images).toEqual(mockImages);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.hasMore).toBe(true);
  });

  it('should handle fetch error', async () => {
    mockCuratedImageAPI.getGallery.mockRejectedValue(new Error('Failed to fetch images'));

    const { result } = renderHook(() => useCuratedGallery());

    // Wait for initial load to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    expect(result.current.images).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('should load more images', async () => {
    const initialImages = [
      {
        id: 'curated-1',
        image_url: 'https://example.com/image1.jpg',
        prompt: 'Beautiful sunset',
        category: 'nature',
        is_featured: true,
      },
    ];

    const moreImages = [
      {
        id: 'curated-2',
        image_url: 'https://example.com/image2.jpg',
        prompt: 'Abstract art',
        category: 'art',
        is_featured: false,
      },
    ];

    mockCuratedImageAPI.getGallery
      .mockResolvedValueOnce({
        images: initialImages,
        pagination: {
          page: 1,
          total_pages: 2,
          total: 2,
          has_more: true,
        },
      })
      .mockResolvedValueOnce({
        images: moreImages,
        pagination: {
          page: 2,
          total_pages: 2,
          total: 2,
          has_more: false,
        },
      });

    const { result } = renderHook(() => useCuratedGallery());

    // Wait for initial load to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    expect(result.current.images).toEqual(initialImages);
    expect(result.current.hasMore).toBe(true);

    // Load more
    await act(async () => {
      await result.current.loadMore();
    });

    expect(result.current.images).toEqual([...initialImages, ...moreImages]);
    expect(result.current.hasMore).toBe(false);
  });

  it('should handle loading state during fetch', async () => {
    let resolveFetch: (value: any) => void;
    const fetchPromise = new Promise((resolve) => {
      resolveFetch = resolve;
    });

    mockCuratedImageAPI.getGallery.mockReturnValueOnce(fetchPromise);

    const { result } = renderHook(() => useCuratedGallery());

    // Start fetch
    act(() => {
      result.current.loadGallery();
    });

    expect(result.current.loading).toBe(true);

    // Resolve fetch
    await act(async () => {
      resolveFetch!({
        images: [],
        pagination: {
          page: 1,
          total_pages: 1,
          total: 0,
          has_more: false,
        },
      });
    });

    expect(result.current.loading).toBe(false);
  });
});