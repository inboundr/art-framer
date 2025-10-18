import { useState, useCallback, useEffect, useMemo } from 'react';
import { curatedImageAPI, CuratedImage, CuratedImageFilters } from '@/lib/curated-images';

export function useCuratedGallery(options: { 
  pageSize?: number; 
  onError?: (error: Error) => void;
  filters?: CuratedImageFilters;
} = {}) {
  // Memoize options to prevent infinite re-renders
  const memoizedOptions = useMemo(() => options, [
    options.pageSize,
    options.filters
    // Removed options.onError to prevent infinite re-renders
  ]);
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
      const response = await curatedImageAPI.getGallery(page, memoizedOptions.pageSize || 20, memoizedOptions.filters);
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
      memoizedOptions.onError?.(error);
    } finally {
      setLoading(false);
    }
  }, [memoizedOptions]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) {
      console.log('🚫 loadMore blocked - loading:', loading, 'hasMore:', hasMore);
      return;
    }
    console.log('🔄 loadMore called for page:', currentPage + 1);
    
    // Direct API call to avoid circular dependency
    setLoading(true);
    setError(null);

    try {
      const response = await curatedImageAPI.getGallery(currentPage + 1, memoizedOptions.pageSize || 20, memoizedOptions.filters);
      console.log('✅ Load more response:', response);
      
      setImages(prev => [...prev, ...response.images]);
      setCurrentPage(response.pagination.page);
      setTotalPages(response.pagination.total_pages);
      setTotalImages(response.pagination.total);
      setHasMore(response.pagination.has_more);
    } catch (err) {
      console.error('❌ Load more error:', err);
      const error = err instanceof Error ? err : new Error('Failed to load more images');
      setError(error);
      memoizedOptions.onError?.(error);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, currentPage, memoizedOptions]);

  const refresh = useCallback(async () => {
    console.log('🔄 Refreshing curated gallery');
    setLoading(true);
    setError(null);

    try {
      const response = await curatedImageAPI.getGallery(1, memoizedOptions.pageSize || 20, memoizedOptions.filters);
      console.log('✅ Refresh response:', response);
      
      setImages(response.images);
      setCurrentPage(response.pagination.page);
      setTotalPages(response.pagination.total_pages);
      setTotalImages(response.pagination.total);
      setHasMore(response.pagination.has_more);
    } catch (err) {
      console.error('❌ Refresh error:', err);
      const error = err instanceof Error ? err : new Error('Failed to refresh gallery');
      setError(error);
      memoizedOptions.onError?.(error);
    } finally {
      setLoading(false);
    }
  }, [memoizedOptions]);

  const searchImages = useCallback(async (query: string, page: number = 1) => {
    console.log('🔍 Searching curated images:', { query, page });
    setLoading(true);
    setError(null);

    try {
      const response = await curatedImageAPI.searchImages(query, page, memoizedOptions.pageSize || 20);
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
      memoizedOptions.onError?.(error);
    } finally {
      setLoading(false);
    }
  }, [memoizedOptions]);

  // Load initial gallery on mount
  useEffect(() => {
    console.log('🚀 useCuratedGallery useEffect triggered');
    console.log('🚀 useCuratedGallery options:', memoizedOptions);
    
    const loadInitialGallery = async () => {
      console.log('🔄 Starting loadInitialGallery...');
      setLoading(true);
      setError(null);

      try {
        console.log('📡 Calling curatedImageAPI.getGallery...');
        const response = await curatedImageAPI.getGallery(1, memoizedOptions.pageSize || 20, memoizedOptions.filters);
        console.log('✅ Initial curated gallery response:', response);
        
        setImages(response.images);
        setCurrentPage(response.pagination.page);
        setTotalPages(response.pagination.total_pages);
        setTotalImages(response.pagination.total);
        setHasMore(response.pagination.has_more);
      } catch (err) {
        console.error('❌ Initial curated gallery error:', err);
        const error = err instanceof Error ? err : new Error('Failed to load initial curated gallery');
        setError(error);
        // Don't call onError to prevent infinite re-renders
        // memoizedOptions.onError?.(error);
      } finally {
        setLoading(false);
      }
    };

    loadInitialGallery();
  }, [memoizedOptions]); // Use memoized options to prevent infinite re-renders

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
