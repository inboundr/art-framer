'use client';

import { useState, useEffect } from 'react';

interface FrameImage {
  url: string;
  type: 'preview' | 'thumbnail' | 'full';
  width: number;
  height: number;
}

interface FrameDetails {
  sku: string;
  name: string;
  description: string;
  price: number;
  dimensions: {
    width: number;
    height: number;
    depth?: number;
  };
  images: FrameImage[];
}

interface UseFrameImagesResult {
  frameDetails: FrameDetails | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useFrameImages(
  frameSize: string,
  frameStyle: string,
  frameMaterial: string
): UseFrameImagesResult {
  const [frameDetails, setFrameDetails] = useState<FrameDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFrameImages = async () => {
    // Early return if any required parameter is missing or invalid
    if (!frameSize || !frameStyle || !frameMaterial) {
      setFrameDetails(null);
      setError(null);
      setLoading(false);
      return;
    }

    // Validate frame size format (should be like "8x10", "16x20", etc.)
    if (!/^\d+x\d+$/.test(frameSize)) {
      setFrameDetails(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        frameSize,
        frameStyle,
        frameMaterial,
      });

      const response = await fetch(`/api/frames/images?${params}`);
      
      const data = await response.json();
      
      if (!response.ok) {
        // Extract error message from response if available
        // Don't throw for 502 errors (Prodigi API issues) - just log and set error state
        const errorMessage = data.error || data.details || `Failed to fetch frame images (${response.status})`;
        
        // For 502 errors (Prodigi API failures), don't throw - just set error state
        if (response.status === 502) {
          console.warn('Prodigi API temporarily unavailable:', errorMessage);
          setError(null); // Don't show error to user for temporary API issues
          setFrameDetails(null);
          return;
        }
        
        throw new Error(errorMessage);
      }

      if (data.success && data.frame) {
        setFrameDetails(data.frame);
      } else {
        throw new Error(data.error || 'Failed to fetch frame details');
      }
    } catch (err) {
      // Only log errors, don't throw them - this prevents console errors during cart clearing
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      
      // Don't set error state for network errors or API failures during cart operations
      // These are often transient and shouldn't be shown to users
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('Prodigi')) {
        console.warn('Frame images fetch failed (likely transient):', errorMessage);
        setError(null);
      } else {
        console.error('Error fetching frame images:', err);
        setError(errorMessage);
      }
      setFrameDetails(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFrameImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frameSize, frameStyle, frameMaterial]);

  return {
    frameDetails,
    loading,
    error,
    refetch: fetchFrameImages,
  };
}
