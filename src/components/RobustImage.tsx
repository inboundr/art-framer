/**
 * RobustImage Component
 * 
 * A React component that provides robust image loading with:
 * - Retry logic and error handling
 * - Loading states and progress indicators
 * - Fallback images and error states
 * - Lazy loading and optimization
 * - Caching and performance optimization
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  RobustImageLoader, 
  ImageLoadState, 
  ImageLoadResult,
  useRobustImageLoader 
} from '@/lib/utils/robustImageLoader';

export interface RobustImageProps {
  /** Image URL to load */
  src: string;
  /** Alt text for the image */
  alt: string;
  /** CSS classes for the image container */
  className?: string;
  /** CSS classes for the image element */
  imageClassName?: string;
  /** Fallback image URL */
  fallbackSrc?: string;
  /** Whether to show loading spinner */
  showLoading?: boolean;
  /** Whether to show error state */
  showError?: boolean;
  /** Custom loading component */
  loadingComponent?: React.ReactNode;
  /** Custom error component */
  errorComponent?: React.ReactNode;
  /** Whether to enable lazy loading */
  lazy?: boolean;
  /** Image load options */
  loadOptions?: {
    maxRetries?: number;
    retryDelay?: number;
    timeout?: number;
    useProxy?: boolean;
    enableCache?: boolean;
  };
  /** Callback when image loads successfully */
  onLoad?: (result: ImageLoadResult) => void;
  /** Callback when image fails to load */
  onError?: (error: string) => void;
  /** Callback when loading state changes */
  onLoadingChange?: (loading: boolean) => void;
  /** Additional props for the img element */
  imgProps?: React.ImgHTMLAttributes<HTMLImageElement>;
}

export function RobustImage({
  src,
  alt,
  className = '',
  imageClassName = '',
  fallbackSrc = '/placeholder.svg',
  showLoading = true,
  showError = true,
  loadingComponent,
  errorComponent,
  lazy = true,
  loadOptions = {},
  onLoad,
  onError,
  onLoadingChange,
  imgProps = {},
  ...props
}: RobustImageProps) {
  const [loadState, setLoadState] = useState<ImageLoadState>({
    status: 'idle',
    progress: 0,
    retryCount: 0
  });
  
  const [isVisible, setIsVisible] = useState(!lazy);
  const [hasLoaded, setHasLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  
  const { loadImage } = useRobustImageLoader({
    fallbackUrl: fallbackSrc,
    ...loadOptions
  });

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || isVisible) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    observerRef.current = observer;

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [lazy, isVisible]);

  // Load image when visible
  useEffect(() => {
    if (!isVisible || !src) return;

    const loadImageAsync = async () => {
      try {
        onLoadingChange?.(true);
        
        const result = await loadImage(src, (state) => {
          setLoadState(state);
        });

        if (result.success) {
          setHasLoaded(true);
          onLoad?.(result);
        } else {
          onError?.(result.error || 'Failed to load image');
        }
      } catch (error) {
        console.error('Image load error:', error);
        onError?.(error instanceof Error ? error.message : 'Unknown error');
      } finally {
        onLoadingChange?.(false);
      }
    };

    loadImageAsync();
  }, [isVisible, src, loadImage, onLoad, onError, onLoadingChange]);

  // Render loading state
  const renderLoading = () => {
    if (loadingComponent) {
      return loadingComponent;
    }

    return (
      <div className="flex items-center justify-center w-full h-full bg-gray-100 rounded">
        <div className="flex flex-col items-center space-y-2">
          <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
          {loadState.retryCount > 0 && (
            <span className="text-xs text-gray-500">
              Retry {loadState.retryCount}
            </span>
          )}
        </div>
      </div>
    );
  };

  // Render error state
  const renderError = () => {
    if (errorComponent) {
      return errorComponent;
    }

    return (
      <div className="flex items-center justify-center w-full h-full bg-gray-100 rounded">
        <div className="flex flex-col items-center space-y-2 text-gray-500">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <span className="text-xs">Failed to load</span>
        </div>
      </div>
    );
  };

  // Render the actual image
  const renderImage = () => {
    if (!hasLoaded || loadState.status === 'error') {
      return null;
    }

    return (
      <img
        ref={imgRef}
        src={loadState.url}
        alt={alt}
        className={`w-full h-full object-cover ${imageClassName}`}
        {...imgProps}
      />
    );
  };

  return (
    <div className={`relative overflow-hidden ${className}`} {...props}>
      <div ref={imgRef} className="w-full h-full">
        {/* Loading state */}
        {loadState.status === 'loading' || loadState.status === 'retrying' ? (
          showLoading ? renderLoading() : null
        ) : null}

        {/* Error state */}
        {loadState.status === 'error' ? (
          showError ? renderError() : null
        ) : null}

        {/* Success state */}
        {loadState.status === 'success' ? renderImage() : null}

        {/* Progress bar */}
        {loadState.status === 'loading' && loadState.progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200">
            <div 
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${loadState.progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Image Gallery with robust loading
 */
export interface RobustImageGalleryProps {
  images: Array<{ id: string; url: string; alt: string }>;
  className?: string;
  imageClassName?: string;
  loadOptions?: Parameters<typeof useRobustImageLoader>[0];
  onImageLoad?: (index: number, result: ImageLoadResult) => void;
  onImageError?: (index: number, error: string) => void;
}

export function RobustImageGallery({
  images,
  className = '',
  imageClassName = '',
  loadOptions = {},
  onImageLoad,
  onImageError
}: RobustImageGalleryProps) {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

  const handleImageLoad = useCallback((index: number, result: ImageLoadResult) => {
    setLoadedImages(prev => new Set([...prev, images[index].id]));
    onImageLoad?.(index, result);
  }, [images, onImageLoad]);

  const handleImageError = useCallback((index: number, error: string) => {
    onImageError?.(index, error);
  }, [onImageError]);

  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 ${className}`}>
      {images.map((image, index) => (
        <RobustImage
          key={image.id}
          src={image.url}
          alt={image.alt}
          className={`aspect-square ${imageClassName}`}
          loadOptions={loadOptions}
          onLoad={(result) => handleImageLoad(index, result)}
          onError={(error) => handleImageError(index, error)}
          lazy={true}
        />
      ))}
    </div>
  );
}

/**
 * Hook for managing multiple images
 */
export function useRobustImages(urls: string[], options: Parameters<typeof useRobustImageLoader>[0] = {}) {
  const [images, setImages] = useState<Array<{ url: string; state: ImageLoadState; result?: ImageLoadResult }>>(
    urls.map(url => ({ url, state: { status: 'idle', progress: 0, retryCount: 0 } }))
  );
  
  const { loadImages } = useRobustImageLoader(options);

  const loadAllImages = useCallback(async () => {
    try {
      const results = await loadImages(urls, (index, state) => {
        setImages(prev => prev.map((img, i) => 
          i === index ? { ...img, state } : img
        ));
      });

      setImages(prev => prev.map((img, index) => ({
        ...img,
        result: results[index]
      })));
    } catch (error) {
      console.error('Failed to load images:', error);
    }
  }, [urls, loadImages]);

  useEffect(() => {
    loadAllImages();
  }, [loadAllImages]);

  return {
    images,
    loadAllImages,
    isLoading: images.some(img => img.state.status === 'loading'),
    hasErrors: images.some(img => img.state.status === 'error'),
    loadedCount: images.filter(img => img.state.status === 'success').length
  };
}
