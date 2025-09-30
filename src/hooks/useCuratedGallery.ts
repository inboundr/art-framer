import { useState, useCallback, useEffect } from 'react';
import { curatedImageAPI, CuratedImage, CuratedImageFilters } from '@/lib/curated-images';

export function useCuratedGallery(options: { 
  pageSize?: number; 
  onError?: (error: Error) => void;
  filters?: CuratedImageFilters;
} = {}) {
  const [images, setImages] = useState<CuratedImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalImages, setTotalImages] = useState(0);

  const loadGallery = useCallback(async (page: number = 1, append: boolean = false) => {
    console.log('🔍 Loading curated gallery, page:', page, 'append:', append);
    setLoading(true);
    setError(null);

    try {
      const response = await curatedImageAPI.getGallery(page, options.pageSize || 20, options.filters);
      console.log('✅ Curated gallery response:', response);
      
      if (append) {
        setImages(prev => [...prev, ...response.images]);
      } else {
        setImages(response.images);
      }
      
      setCurrentPage(response.pagination.page);
      setTotalPages(response.pagination.total_pages);
      setTotalImages(response.pagination.total);
      setHasMore(response.pagination.has_more);
    } catch (err) {
      console.error('❌ Curated gallery loading error:', err);
      const error = err instanceof Error ? err : new Error('Failed to load curated gallery');
      setError(error);
      options.onError?.(error);
    } finally {
      setLoading(false);
    }
  }, [options.pageSize, options.onError, options.filters]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    await loadGallery(currentPage + 1, true);
  }, [loading, hasMore, currentPage, loadGallery]);

  const refresh = useCallback(async () => {
    await loadGallery(1, false);
  }, [loadGallery]);

  const searchImages = useCallback(async (query: string, page: number = 1) => {
    console.log('🔍 Searching curated images:', { query, page });
    setLoading(true);
    setError(null);

    try {
      const response = await curatedImageAPI.searchImages(query, page, options.pageSize || 20);
      console.log('✅ Search response:', response);
      
      if (page === 1) {
        setImages(response.images);
      } else {
        setImages(prev => [...prev, ...response.images]);
      }
      
      setCurrentPage(response.pagination.page);
      setTotalPages(response.pagination.total_pages);
      setTotalImages(response.pagination.total);
      setHasMore(response.pagination.has_more);
    } catch (err) {
      console.error('❌ Search error:', err);
      const error = err instanceof Error ? err : new Error('Failed to search images');
      setError(error);
      options.onError?.(error);
    } finally {
      setLoading(false);
    }
  }, [options.pageSize, options.onError]);

  // Load initial gallery on mount
  useEffect(() => {
    console.log('🚀 useCuratedGallery useEffect triggered');
    loadGallery(1, false);
  }, [loadGallery]);

  return {
    images,
    loading,
    error,
    hasMore,
    currentPage,
    totalPages,
    totalImages,
    loadGallery,
    loadMore,
    refresh,
    searchImages,
  };
}

export function useFeaturedImages(limit: number = 12) {
  const [images, setImages] = useState<CuratedImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadFeaturedImages = useCallback(async () => {
    console.log('🔍 Loading featured images');
    setLoading(true);
    setError(null);

    try {
      const featuredImages = await curatedImageAPI.getFeaturedImages(limit);
      console.log('✅ Featured images loaded:', { count: featuredImages.length });
      setImages(featuredImages);
    } catch (err) {
      console.error('❌ Featured images loading error:', err);
      const error = err instanceof Error ? err : new Error('Failed to load featured images');
      setError(error);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    loadFeaturedImages();
  }, [loadFeaturedImages]);

  return {
    images,
    loading,
    error,
    refresh: loadFeaturedImages,
  };
}

export function useCuratedCategories() {
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadCategories = useCallback(async () => {
    console.log('🔍 Loading categories');
    setLoading(true);
    setError(null);

    try {
      const categoriesList = await curatedImageAPI.getCategories();
      console.log('✅ Categories loaded:', { count: categoriesList.length });
      setCategories(categoriesList);
    } catch (err) {
      console.error('❌ Categories loading error:', err);
      const error = err instanceof Error ? err : new Error('Failed to load categories');
      setError(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  return {
    categories,
    loading,
    error,
    refresh: loadCategories,
  };
}

export function useCuratedTags() {
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadTags = useCallback(async () => {
    console.log('🔍 Loading tags');
    setLoading(true);
    setError(null);

    try {
      const tagsList = await curatedImageAPI.getTags();
      console.log('✅ Tags loaded:', { count: tagsList.length });
      setTags(tagsList);
    } catch (err) {
      console.error('❌ Tags loading error:', err);
      const error = err instanceof Error ? err : new Error('Failed to load tags');
      setError(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  return {
    tags,
    loading,
    error,
    refresh: loadTags,
  };
}
