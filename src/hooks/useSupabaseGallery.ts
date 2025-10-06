import { useState, useCallback, useEffect, useMemo } from 'react';
import { supabaseImageAPI, Image, GalleryResponse, SearchFilters } from '@/lib/supabase/images';
import { useAuth } from '@/contexts/AuthContext';

export function useGallery(options: { pageSize?: number; onError?: (error: Error) => void } = {}) {
  // Memoize options to prevent infinite re-renders
  const memoizedOptions = useMemo(() => options, [
    options.pageSize,
    options.onError
  ]);
  const [images, setImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalImages, setTotalImages] = useState(0);

  const loadGallery = useCallback(async (page: number = 1, append: boolean = false) => {
    console.log('🔍 Loading gallery, page:', page, 'append:', append);
    setLoading(true);
    setError(null);

    try {
      const response = await supabaseImageAPI.getGallery(page, memoizedOptions.pageSize || 20);
      console.log('✅ Gallery response:', response);
      
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
      console.error('❌ Gallery loading error:', err);
      const error = err instanceof Error ? err : new Error('Failed to load gallery');
      setError(error);
      
      // If it's a timeout or connection error, show empty state instead of error
      if (error.message.includes('timeout') || error.message.includes('Failed to fetch')) {
        console.log('🔄 Gallery timeout/connection error, showing empty state');
        if (!append) {
          setImages([]);
        }
        setHasMore(false);
        setError(null); // Clear error state for timeout issues
      } else {
        memoizedOptions.onError?.(error);
      }
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
      const response = await supabaseImageAPI.getGallery(currentPage + 1, memoizedOptions.pageSize || 20);
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
      
      if (error.message.includes('timeout') || error.message.includes('Failed to fetch')) {
        console.log('🔄 Load more timeout/connection error');
        setHasMore(false);
        setError(null);
      } else {
        memoizedOptions.onError?.(error);
      }
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, currentPage, memoizedOptions]);

  const refresh = useCallback(async () => {
    console.log('🔄 Refreshing gallery');
    setLoading(true);
    setError(null);

    try {
      const response = await supabaseImageAPI.getGallery(1, memoizedOptions.pageSize || 20);
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
      
      if (error.message.includes('timeout') || error.message.includes('Failed to fetch')) {
        console.log('🔄 Refresh timeout/connection error');
        setImages([]);
        setHasMore(false);
        setError(null);
      } else {
        memoizedOptions.onError?.(error);
      }
    } finally {
      setLoading(false);
    }
  }, [memoizedOptions]);

  // Load initial gallery on mount
  useEffect(() => {
    console.log('🚀 useGallery useEffect triggered');
    
    const loadInitialGallery = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await supabaseImageAPI.getGallery(1, memoizedOptions.pageSize || 20);
        console.log('✅ Initial gallery response:', response);
        
        setImages(response.images);
        setCurrentPage(response.pagination.page);
        setTotalPages(response.pagination.total_pages);
        setTotalImages(response.pagination.total);
        setHasMore(response.pagination.has_more);
      } catch (err) {
        console.error('❌ Initial gallery error:', err);
        const error = err instanceof Error ? err : new Error('Failed to load initial gallery');
        setError(error);
        
        if (error.message.includes('timeout') || error.message.includes('Failed to fetch')) {
          console.log('🔄 Initial gallery timeout/connection error');
          setImages([]);
          setHasMore(false);
          setError(null);
        } else {
          memoizedOptions.onError?.(error);
        }
      } finally {
        setLoading(false);
      }
    };

    loadInitialGallery();
  }, [memoizedOptions]); // Safe dependencies only

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
  };
}

export function useSearch() {
  const [searchResults, setSearchResults] = useState<Image[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<Error | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({});

  const searchImages = useCallback(async (
    query: string,
    page: number = 1,
    limit: number = 20,
    filters?: SearchFilters
  ) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    setSearchError(null);
    setSearchQuery(query);

    try {
      const response = await supabaseImageAPI.searchImages(
        query,
        page,
        limit,
        filters || searchFilters
      );
      
      if (page === 1) {
        setSearchResults(response.images);
      } else {
        setSearchResults(prev => [...prev, ...response.images]);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to search images');
      setSearchError(error);
    } finally {
      setSearchLoading(false);
    }
  }, [searchFilters]);

  const updateSearchFilters = useCallback((filters: Partial<SearchFilters>) => {
    setSearchFilters(prev => ({ ...prev, ...filters }));
  }, []);

  return {
    searchResults,
    searchLoading,
    searchError,
    searchQuery,
    searchFilters,
    searchImages,
    updateSearchFilters,
  };
}

export function useTrending() {
  const [trendingData, setTrendingData] = useState<Image[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(false);
  const [trendingError, setTrendingError] = useState<Error | null>(null);

  const loadTrending = useCallback(async (limit: number = 20) => {
    setTrendingLoading(true);
    setTrendingError(null);

    try {
      const images = await supabaseImageAPI.getTrending(limit);
      setTrendingData(images);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load trending images');
      setTrendingError(error);
    } finally {
      setTrendingLoading(false);
    }
  }, []);

  return {
    trendingData,
    trendingLoading,
    trendingError,
    loadTrending,
  };
}

export function useImageInteractions() {
  const { user } = useAuth();
  const [interactionLoading, setInteractionLoading] = useState<string | null>(null);
  const [interactionError, setInteractionError] = useState<Error | null>(null);

  const likeImage = useCallback(async (imageId: string) => {
    if (!user) {
      throw new Error('User must be logged in to like images');
    }

    setInteractionLoading(imageId);
    setInteractionError(null);

    try {
      await supabaseImageAPI.likeImage(imageId, user.id);
      return { success: true };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to like image');
      setInteractionError(error);
      throw error;
    } finally {
      setInteractionLoading(null);
    }
  }, [user]);

  const unlikeImage = useCallback(async (imageId: string) => {
    if (!user) {
      throw new Error('User must be logged in to unlike images');
    }

    setInteractionLoading(imageId);
    setInteractionError(null);

    try {
      await supabaseImageAPI.unlikeImage(imageId, user.id);
      return { success: true };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to unlike image');
      setInteractionError(error);
      throw error;
    } finally {
      setInteractionLoading(null);
    }
  }, [user]);

  const isInteracting = (imageId: string) => interactionLoading === imageId;

  return {
    interactionLoading,
    interactionError,
    likeImage,
    unlikeImage,
    isInteracting,
  };
}
