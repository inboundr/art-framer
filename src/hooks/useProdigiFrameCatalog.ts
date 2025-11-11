import { useState, useEffect, useCallback } from 'react';
import { FrameCatalogOption, FrameCombinationsMap } from '@/lib/prodigi-frame-catalog';

interface UseProdigiFrameCatalogReturn {
  options: FrameCatalogOption[];
  combinations: FrameCombinationsMap;
  colors: string[];
  loading: boolean;
  error: string | null;
  stats: {
    totalProducts: number;
    frameColors: number;
    sizes: number;
    combinations: number;
    priceRange: { min: number; max: number };
  } | null;
  refetch: () => void;
  clearCache: () => Promise<void>;
  getAvailableSizes: (frameColor: string) => string[];
  isAvailable: (frameColor: string, size: string) => boolean;
}

/**
 * React hook to fetch and manage Prodigi frame catalog data
 * Replaces hardcoded frame options with dynamic data from Prodigi API
 */
export function useProdigiFrameCatalog(): UseProdigiFrameCatalogReturn {
  const [options, setOptions] = useState<FrameCatalogOption[]>([]);
  const [combinations, setCombinations] = useState<FrameCombinationsMap>({});
  const [colors, setColors] = useState<string[]>([]);
  const [stats, setStats] = useState<UseProdigiFrameCatalogReturn['stats']>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCatalog = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔍 Fetching frame catalog from Prodigi...');

      // Fetch all frame options
      const optionsResponse = await fetch('/api/prodigi/frame-catalog');
      const optionsData = await optionsResponse.json();

      if (!optionsData.success) {
        throw new Error(optionsData.error || 'Failed to fetch frame options');
      }

      setOptions(optionsData.options || []);
      console.log(`✅ Loaded ${optionsData.options?.length || 0} frame options`);

      // Fetch combinations
      const combinationsResponse = await fetch('/api/prodigi/frame-catalog?action=combinations');
      const combinationsData = await combinationsResponse.json();

      if (combinationsData.success) {
        setCombinations(combinationsData.combinations || {});
      }

      // Fetch colors
      const colorsResponse = await fetch('/api/prodigi/frame-catalog?action=colors');
      const colorsData = await colorsResponse.json();

      if (colorsData.success) {
        setColors(colorsData.colors || []);
      }

      // Fetch stats
      const statsResponse = await fetch('/api/prodigi/frame-catalog?action=stats');
      const statsData = await statsResponse.json();

      if (statsData.success) {
        setStats(statsData.stats || null);
        console.log('📊 Catalog stats:', statsData.stats);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch frame catalog';
      setError(errorMessage);
      console.error('❌ Error fetching frame catalog:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch catalog on mount
  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  /**
   * Clear the catalog cache and refetch
   */
  const clearCache = useCallback(async () => {
    try {
      await fetch('/api/prodigi/frame-catalog/clear-cache', {
        method: 'POST'
      });
      await fetchCatalog();
    } catch (err) {
      console.error('Error clearing cache:', err);
    }
  }, [fetchCatalog]);

  /**
   * Get available sizes for a specific frame color
   */
  const getAvailableSizes = useCallback((frameColor: string): string[] => {
    const colorCombinations = combinations[frameColor];
    if (!colorCombinations) return [];
    
    return Object.keys(colorCombinations).sort((a, b) => {
      const order = ['small', 'medium', 'large', 'extra_large'];
      return order.indexOf(a) - order.indexOf(b);
    });
  }, [combinations]);

  /**
   * Check if a specific frame color and size combination is available
   */
  const isAvailable = useCallback((frameColor: string, size: string): boolean => {
    const colorCombinations = combinations[frameColor];
    if (!colorCombinations) return false;
    
    const sizeOptions = colorCombinations[size];
    return sizeOptions && sizeOptions.length > 0 && sizeOptions.some(opt => opt.available);
  }, [combinations]);

  /**
   * Refetch the catalog
   */
  const refetch = useCallback(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  return {
    options,
    combinations,
    colors,
    loading,
    error,
    stats,
    refetch,
    clearCache,
    getAvailableSizes,
    isAvailable
  };
}

/**
 * Hook to get available sizes for a specific frame color
 */
export function useFrameSizes(frameColor: string) {
  const [sizes, setSizes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSizes = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `/api/prodigi/frame-catalog?action=sizes&frameColor=${encodeURIComponent(frameColor)}`
        );
        const data = await response.json();

        if (data.success) {
          setSizes(data.sizes || []);
        } else {
          throw new Error(data.error || 'Failed to fetch sizes');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch sizes');
      } finally {
        setLoading(false);
      }
    };

    if (frameColor) {
      fetchSizes();
    }
  }, [frameColor]);

  return { sizes, loading, error };
}

/**
 * Hook to check frame catalog statistics
 */
export function useFrameCatalogStats() {
  const [stats, setStats] = useState<UseProdigiFrameCatalogReturn['stats']>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/prodigi/frame-catalog?action=stats');
        const data = await response.json();

        if (data.success) {
          setStats(data.stats);
        } else {
          throw new Error(data.error || 'Failed to fetch stats');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch stats');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return { stats, loading, error };
}

