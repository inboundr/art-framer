'use client';

import { useState, useCallback, useEffect } from 'react';
import { ideogramAPI, IdeogramGalleryImage, IdeogramSearchResponse, IdeogramTrendingResponse } from '@/lib/ideogram/api';

interface UseGalleryOptions {
  onError?: (error: Error) => void;
  initialPage?: number;
  pageSize?: number;
}

export function useGallery(options: UseGalleryOptions = {}) {
  const [images, setImages] = useState<IdeogramGalleryImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(options.initialPage || 1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalImages, setTotalImages] = useState(0);

  const loadGallery = useCallback(async (page: number = 1, append: boolean = false) => {
    setLoading(true);
    setError(null);

    try {
      const response = await ideogramAPI.getGallery(page, options.pageSize || 20);
      
      if (append) {
        setImages(prev => [...prev, ...response.images]);
      } else {
        setImages(response.images);
      }
      
      setCurrentPage(response.pagination.page);
      setTotalPages(response.pagination.total_pages);
      setTotalImages(response.pagination.total);
      setHasMore(response.pagination.page < response.pagination.total_pages);
    } catch (err) {
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
    loadGallery(1, false);
  }, []);

  return {
    // State
    images,
    loading,
    error,
    hasMore,
    currentPage,
    totalPages,
    totalImages,
    
    // Actions
    loadGallery,
    loadMore,
    refresh,
    
    // Computed
    isEmpty: images.length === 0 && !loading,
  };
}

export function useSearch() {
  const [searchResults, setSearchResults] = useState<IdeogramGalleryImage[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<Error | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilters, setSearchFilters] = useState({
    aspect_ratio: '',
    model: '',
    style: '',
    color: '',
    date_range: '',
  });

  const searchImages = useCallback(async (
    query: string,
    page: number = 1,
    limit: number = 20,
    filters = searchFilters
  ) => {
    if (!query.trim()) return;

    setSearchLoading(true);
    setSearchError(null);
    setSearchQuery(query);

    try {
      const response = await ideogramAPI.searchImages(query, page, limit, filters);
      setSearchResults(response.images);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Search failed');
      setSearchError(error);
    } finally {
      setSearchLoading(false);
    }
  }, [searchFilters]);

  const updateSearchFilters = useCallback((newFilters: Partial<typeof searchFilters>) => {
    setSearchFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const clearSearch = useCallback(() => {
    setSearchResults([]);
    setSearchQuery('');
    setSearchError(null);
  }, []);

  return {
    // State
    searchResults,
    searchLoading,
    searchError,
    searchQuery,
    searchFilters,
    
    // Actions
    searchImages,
    updateSearchFilters,
    clearSearch,
    
    // Computed
    hasSearchResults: searchResults.length > 0,
    isSearching: searchLoading,
  };
}

export function useTrending() {
  const [trendingData, setTrendingData] = useState<IdeogramTrendingResponse | null>(null);
  const [trendingLoading, setTrendingLoading] = useState(false);
  const [trendingError, setTrendingError] = useState<Error | null>(null);

  const loadTrending = useCallback(async () => {
    setTrendingLoading(true);
    setTrendingError(null);

    try {
      const response = await ideogramAPI.getTrending();
      setTrendingData(response);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load trending');
      setTrendingError(error);
    } finally {
      setTrendingLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrending();
  }, [loadTrending]);

  return {
    // State
    trendingData,
    trendingLoading,
    trendingError,
    
    // Actions
    loadTrending,
    
    // Computed
    trending: trendingData?.trending || [],
    popular: trendingData?.popular || [],
    recent: trendingData?.recent || [],
  };
}

export function useImageInteractions() {
  const [interactionLoading, setInteractionLoading] = useState<string | null>(null);
  const [interactionError, setInteractionError] = useState<Error | null>(null);

  const likeImage = useCallback(async (imageId: string) => {
    setInteractionLoading(imageId);
    setInteractionError(null);

    try {
      const response = await ideogramAPI.likeImage(imageId);
      return response;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to like image');
      setInteractionError(error);
      throw error;
    } finally {
      setInteractionLoading(null);
    }
  }, []);

  const unlikeImage = useCallback(async (imageId: string) => {
    setInteractionLoading(imageId);
    setInteractionError(null);

    try {
      const response = await ideogramAPI.unlikeImage(imageId);
      return response;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to unlike image');
      setInteractionError(error);
      throw error;
    } finally {
      setInteractionLoading(null);
    }
  }, []);

  const clearInteractionError = useCallback(() => {
    setInteractionError(null);
  }, []);

  return {
    // State
    interactionLoading,
    interactionError,
    
    // Actions
    likeImage,
    unlikeImage,
    clearInteractionError,
    
    // Computed
    isInteracting: (imageId: string) => interactionLoading === imageId,
  };
}
