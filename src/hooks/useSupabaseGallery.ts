import { useState, useCallback, useEffect } from 'react';
import { supabaseImageAPI, Image, GalleryResponse, SearchFilters } from '@/lib/supabase/images';
import { useAuth } from '@/contexts/AuthContext';

export function useGallery(options: { pageSize?: number; onError?: (error: Error) => void } = {}) {
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
      const response = await supabaseImageAPI.getGallery(page, options.pageSize || 20);
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
      options.onError?.(error);
    } finally {
      setLoading(false);
    }
  }, [options.pageSize, options.onError]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    await loadGallery(currentPage + 1, true);
  }, [loading, hasMore, currentPage]);

  const refresh = useCallback(async () => {
    await loadGallery(1, false);
  }, []);

  // Load initial gallery on mount
  useEffect(() => {
    console.log('🚀 useGallery useEffect triggered');
    loadGallery(1, false);
  }, []);

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
