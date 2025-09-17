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
    if (!frameSize || !frameStyle || !frameMaterial) {
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
      
      if (!response.ok) {
        throw new Error('Failed to fetch frame images');
      }

      const data = await response.json();
      
      if (data.success && data.frame) {
        setFrameDetails(data.frame);
      } else {
        throw new Error(data.error || 'Failed to fetch frame details');
      }
    } catch (err) {
      console.error('Error fetching frame images:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFrameImages();
  }, [frameSize, frameStyle, frameMaterial]);

  return {
    frameDetails,
    loading,
    error,
    refetch: fetchFrameImages,
  };
}
