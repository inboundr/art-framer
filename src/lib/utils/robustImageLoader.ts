/**
 * Robust Image Loading System with Retry Logic and Error Handling
 * 
 * This module provides a comprehensive image loading solution that handles:
 * - Network failures and timeouts
 * - CORS issues with external image sources
 * - Retry logic with exponential backoff
 * - Fallback images and error states
 * - Loading states and progress tracking
 * - Image caching and optimization
 */

export interface ImageLoadOptions {
  /** Maximum number of retry attempts */
  maxRetries?: number;
  /** Delay between retries in milliseconds */
  retryDelay?: number;
  /** Timeout for each image load attempt */
  timeout?: number;
  /** Whether to use proxy for external images */
  useProxy?: boolean;
  /** Fallback image URL when loading fails */
  fallbackUrl?: string;
  /** Whether to enable caching */
  enableCache?: boolean;
  /** Custom headers for image requests */
  headers?: Record<string, string>;
}

export interface ImageLoadResult {
  /** The loaded image URL (or fallback) */
  url: string;
  /** Whether the image loaded successfully */
  success: boolean;
  /** Error message if loading failed */
  error?: string;
  /** Number of retry attempts made */
  retryCount: number;
  /** Loading duration in milliseconds */
  loadTime: number;
  /** Whether this is a fallback image */
  isFallback: boolean;
}

export interface ImageLoadState {
  /** Current loading state */
  status: 'idle' | 'loading' | 'success' | 'error' | 'retrying';
  /** Progress percentage (0-100) */
  progress: number;
  /** Current retry attempt */
  retryCount: number;
  /** Error message if any */
  error?: string;
  /** Loaded image URL */
  url?: string;
}

const DEFAULT_OPTIONS: Required<ImageLoadOptions> = {
  maxRetries: 3,
  retryDelay: 1000,
  timeout: 10000,
  useProxy: true,
  fallbackUrl: '/placeholder.svg',
  enableCache: true,
  headers: {}
};

/**
 * Image cache for storing loaded images
 */
class ImageCache {
  private cache = new Map<string, { url: string; timestamp: number; success: boolean }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  set(key: string, value: { url: string; success: boolean }): void {
    this.cache.set(key, {
      ...value,
      timestamp: Date.now()
    });
  }

  get(key: string): { url: string; success: boolean } | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    // Check if cache is expired
    if (Date.now() - cached.timestamp > this.CACHE_DURATION) {
      this.cache.delete(key);
      return null;
    }

    return cached;
  }

  clear(): void {
    this.cache.clear();
  }

  has(key: string): boolean {
    return this.cache.has(key) && this.get(key) !== null;
  }
}

const imageCache = new ImageCache();

/**
 * Creates a proxied URL for external images to bypass CORS
 */
function createProxiedUrl(originalUrl: string): string {
  if (!originalUrl || !originalUrl.startsWith('http')) {
    return originalUrl;
  }

  // If it's already a proxy URL, return as-is
  if (originalUrl.includes('/api/proxy-image')) {
    return originalUrl;
  }

  // Create proxy URL
  const proxyUrl = new URL('/api/proxy-image', window.location.origin);
  proxyUrl.searchParams.set('url', originalUrl);
  return proxyUrl.toString();
}

/**
 * Preloads an image and returns a promise that resolves when loaded
 */
function preloadImage(url: string, timeout: number = 10000): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const timeoutId = setTimeout(() => {
      reject(new Error(`Image load timeout after ${timeout}ms`));
    }, timeout);

    img.onload = () => {
      clearTimeout(timeoutId);
      resolve(img);
    };

    img.onerror = () => {
      clearTimeout(timeoutId);
      reject(new Error(`Failed to load image: ${url}`));
    };

    img.src = url;
  });
}

/**
 * Robust image loader with retry logic and error handling
 */
export class RobustImageLoader {
  private options: Required<ImageLoadOptions>;

  constructor(options: ImageLoadOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Load an image with retry logic and error handling
   */
  async loadImage(
    originalUrl: string,
    onProgress?: (state: ImageLoadState) => void
  ): Promise<ImageLoadResult> {
    const startTime = Date.now();
    const cacheKey = `image_${originalUrl}`;

    // Check cache first
    if (this.options.enableCache && imageCache.has(cacheKey)) {
      const cached = imageCache.get(cacheKey)!;
      onProgress?.({
        status: 'success',
        progress: 100,
        retryCount: 0,
        url: cached.url
      });

      return {
        url: cached.url,
        success: cached.success,
        retryCount: 0,
        loadTime: Date.now() - startTime,
        isFallback: !cached.success
      };
    }

    // Determine the URL to use
    const imageUrl = this.options.useProxy 
      ? createProxiedUrl(originalUrl) 
      : originalUrl;

    let lastError: Error | null = null;
    let retryCount = 0;

    // Update progress
    onProgress?.({
      status: 'loading',
      progress: 0,
      retryCount: 0
    });

    while (retryCount <= this.options.maxRetries) {
      try {
        console.log(`🖼️ Loading image (attempt ${retryCount + 1}/${this.options.maxRetries + 1}):`, imageUrl);

        // Update progress
        onProgress?.({
          status: retryCount > 0 ? 'retrying' : 'loading',
          progress: Math.min((retryCount / (this.options.maxRetries + 1)) * 100, 90),
          retryCount
        });

        // Attempt to load the image
        await preloadImage(imageUrl, this.options.timeout);

        // Success!
        const loadTime = Date.now() - startTime;
        console.log(`✅ Image loaded successfully in ${loadTime}ms`);

        // Cache the result
        if (this.options.enableCache) {
          imageCache.set(cacheKey, { url: imageUrl, success: true });
        }

        onProgress?.({
          status: 'success',
          progress: 100,
          retryCount,
          url: imageUrl
        });

        return {
          url: imageUrl,
          success: true,
          retryCount,
          loadTime,
          isFallback: false
        };

      } catch (error) {
        lastError = error as Error;
        retryCount++;

        console.warn(`⚠️ Image load attempt ${retryCount} failed:`, error);

        // If we have more retries, wait before trying again
        if (retryCount <= this.options.maxRetries) {
          const delay = this.options.retryDelay * Math.pow(2, retryCount - 1); // Exponential backoff
          console.log(`🔄 Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed, use fallback
    console.error(`❌ All image load attempts failed for: ${originalUrl}`);
    
    const fallbackUrl = this.options.fallbackUrl;
    const loadTime = Date.now() - startTime;

    // Cache the failure
    if (this.options.enableCache) {
      imageCache.set(cacheKey, { url: fallbackUrl, success: false });
    }

    onProgress?.({
      status: 'error',
      progress: 100,
      retryCount,
      error: lastError?.message,
      url: fallbackUrl
    });

    return {
      url: fallbackUrl,
      success: false,
      error: lastError?.message,
      retryCount,
      loadTime,
      isFallback: true
    };
  }

  /**
   * Load multiple images in parallel with individual retry logic
   */
  async loadImages(
    urls: string[],
    onProgress?: (index: number, state: ImageLoadState) => void
  ): Promise<ImageLoadResult[]> {
    console.log(`🖼️ Loading ${urls.length} images in parallel`);

    const promises = urls.map((url, index) => 
      this.loadImage(url, (state) => onProgress?.(index, state))
    );

    return Promise.all(promises);
  }

  /**
   * Preload images in the background
   */
  async preloadImages(urls: string[]): Promise<void> {
    console.log(`🔄 Preloading ${urls.length} images in background`);
    
    const promises = urls.map(url => 
      this.loadImage(url).catch(error => {
        console.warn(`⚠️ Background preload failed for ${url}:`, error);
        return null;
      })
    );

    await Promise.allSettled(promises);
  }

  /**
   * Clear the image cache
   */
  clearCache(): void {
    imageCache.clear();
  }

  /**
   * Update loader options
   */
  updateOptions(newOptions: Partial<ImageLoadOptions>): void {
    this.options = { ...this.options, ...newOptions };
  }
}

/**
 * Default robust image loader instance
 */
export const robustImageLoader = new RobustImageLoader();

/**
 * React hook for robust image loading
 */
export function useRobustImageLoader(options: ImageLoadOptions = {}) {
  const [loader] = useState(() => new RobustImageLoader(options));

  const loadImage = useCallback(
    (url: string, onProgress?: (state: ImageLoadState) => void) => 
      loader.loadImage(url, onProgress),
    [loader]
  );

  const loadImages = useCallback(
    (urls: string[], onProgress?: (index: number, state: ImageLoadState) => void) => 
      loader.loadImages(urls, onProgress),
    [loader]
  );

  const preloadImages = useCallback(
    (urls: string[]) => loader.preloadImages(urls),
    [loader]
  );

  const clearCache = useCallback(() => loader.clearCache(), [loader]);

  return {
    loadImage,
    loadImages,
    preloadImages,
    clearCache,
    updateOptions: loader.updateOptions.bind(loader)
  };
}

/**
 * Utility function to get optimized image URL
 */
export function getOptimizedImageUrl(
  originalUrl: string, 
  options: { width?: number; height?: number; quality?: number } = {}
): string {
  if (!originalUrl) return '';

  // If it's an external URL, use proxy
  if (originalUrl.startsWith('http') && !originalUrl.includes(window.location.origin)) {
    return createProxiedUrl(originalUrl);
  }

  // For local images, you could add optimization parameters here
  // For now, return as-is
  return originalUrl;
}

/**
 * Image loading error types
 */
export class ImageLoadError extends Error {
  constructor(
    message: string,
    public url: string,
    public retryCount: number,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'ImageLoadError';
  }
}

/**
 * Batch image loader for handling multiple images efficiently
 */
export class BatchImageLoader {
  private loader: RobustImageLoader;
  private batchSize: number;
  private delayBetweenBatches: number;

  constructor(
    options: ImageLoadOptions = {},
    batchSize: number = 5,
    delayBetweenBatches: number = 100
  ) {
    this.loader = new RobustImageLoader(options);
    this.batchSize = batchSize;
    this.delayBetweenBatches = delayBetweenBatches;
  }

  async loadImagesInBatches(
    urls: string[],
    onProgress?: (index: number, state: ImageLoadState) => void
  ): Promise<ImageLoadResult[]> {
    const results: ImageLoadResult[] = [];
    
    for (let i = 0; i < urls.length; i += this.batchSize) {
      const batch = urls.slice(i, i + this.batchSize);
      console.log(`📦 Loading batch ${Math.floor(i / this.batchSize) + 1}/${Math.ceil(urls.length / this.batchSize)}`);
      
      const batchResults = await this.loader.loadImages(batch, onProgress);
      results.push(...batchResults);
      
      // Add delay between batches to avoid overwhelming the server
      if (i + this.batchSize < urls.length) {
        await new Promise(resolve => setTimeout(resolve, this.delayBetweenBatches));
      }
    }
    
    return results;
  }
}
