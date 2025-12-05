/**
 * Prodigi API v4 - Core API Client
 * 
 * Main client for making authenticated requests to the Prodigi API
 * Handles authentication, retries, rate limiting, caching, and error handling
 */

import type {
  ProdigiClientConfig,
  RequestOptions,
  Environment,
} from './types';
import {
  ProdigiAPIError,
  ProdigiTimeoutError,
  parseProdigiError,
  handleFetchError,
  logError,
} from './errors';
import {
  API_URLS,
  DEFAULT_CONFIG,
  RETRY_CONFIG,
  HTTP_STATUS,
} from './constants';
import {
  buildUrl,
  extractTraceParent,
  calculateRetryDelay,
  sleep,
  sanitizeForLogging,
  MemoryCache,
  TokenBucket,
  Logger,
} from './utils';

/**
 * Core Prodigi API Client
 * 
 * Provides low-level HTTP request functionality with:
 * - Authentication
 * - Automatic retries with exponential backoff
 * - Rate limiting
 * - Response caching
 * - Comprehensive error handling
 * - Request/response logging
 */
export class ProdigiClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly environment: Environment;
  private readonly timeout: number;
  private readonly retries: number;
  private readonly retryDelay: number;
  private readonly callbackUrl?: string;
  
  // Caching
  private readonly cache: MemoryCache<any>;
  private readonly enableCache: boolean;
  private readonly cacheTtl: number;
  
  // Rate limiting
  private readonly rateLimiter: TokenBucket;
  
  // Logging
  private readonly logger: Logger;

  constructor(config: ProdigiClientConfig) {
    // Validate required configuration
    if (!config.apiKey) {
      throw new Error('Prodigi API key is required');
    }

    this.apiKey = config.apiKey;
    this.environment = config.environment || 'sandbox';
    this.baseUrl = API_URLS[this.environment];
    this.timeout = config.timeout || DEFAULT_CONFIG.timeout;
    this.retries = config.retries ?? DEFAULT_CONFIG.retries;
    this.retryDelay = config.retryDelay || DEFAULT_CONFIG.retryDelay;
    this.callbackUrl = config.callbackUrl;
    
    // Setup caching
    this.enableCache = config.enableCache ?? DEFAULT_CONFIG.enableCache;
    this.cacheTtl = config.cacheTtl || DEFAULT_CONFIG.cacheTtl;
    this.cache = new MemoryCache();
    
    // Setup rate limiting - Prodigi allows 30 requests per 30 seconds (1 req/s average)
    // Use conservative limit: 1 request per second with burst of 2
    this.rateLimiter = new TokenBucket(2, 1); // 2 tokens, refill 1 per second
    
    // Setup logging
    this.logger = new Logger(`Prodigi:${this.environment}`);

    this.logger.info('Client initialized', {
      environment: this.environment,
      baseUrl: this.baseUrl,
      timeout: this.timeout,
      retries: this.retries,
      cacheEnabled: this.enableCache,
    });
  }

  /**
   * Make an authenticated request to the Prodigi API
   */
  async request<T>(options: RequestOptions): Promise<T> {
    const {
      method,
      endpoint,
      body,
      params,
      idempotencyKey,
    } = options;

    // Build full URL
    const url = buildUrl(`${this.baseUrl}${endpoint}`, params);
    
    // Check cache for GET requests
    if (method === 'GET' && this.enableCache) {
      const cached = this.cache.get(url);
      if (cached) {
        this.logger.debug('Cache hit', { url });
        return cached as T;
      }
    }

    // Apply rate limiting
    await this.rateLimiter.consume();

    // Make request with retries
    return this.requestWithRetry<T>({
      url,
      method,
      body,
      idempotencyKey,
      endpoint,
    });
  }

  /**
   * Make request with automatic retries
   */
  private async requestWithRetry<T>(options: {
    url: string;
    method: string;
    body?: any;
    idempotencyKey?: string;
    endpoint: string;
    attempt?: number;
  }): Promise<T> {
    const { url, method, body, idempotencyKey, endpoint, attempt = 1 } = options;

    try {
      const response = await this.executeRequest(url, method, body, idempotencyKey);
      const data = await this.parseResponse<T>(response);

      // Cache successful GET requests
      if (method === 'GET' && this.enableCache) {
        this.cache.set(url, data, this.cacheTtl);
      }

      return data;
    } catch (error) {
      // Check if we should retry
      const shouldRetry = this.shouldRetry(error, attempt);
      
      if (shouldRetry && attempt <= this.retries) {
        const delay = calculateRetryDelay(attempt, this.retryDelay);
        this.logger.warn(`Retrying request (attempt ${attempt}/${this.retries})`, {
          endpoint,
          delay,
          error: error instanceof Error ? error.message : String(error),
        });
        
        await sleep(delay);
        
        return this.requestWithRetry({
          url,
          method,
          body,
          idempotencyKey,
          endpoint,
          attempt: attempt + 1,
        });
      }

      // Log error and throw
      logError(error, {
        endpoint,
        method,
        requestBody: body,
      });
      
      // Track error in Sentry if available
      if (typeof window === 'undefined') {
        try {
          const { captureError } = require('@/lib/monitoring/sentry');
          captureError(error instanceof Error ? error : new Error(String(error)), {
            endpoint,
            method,
            attempt,
          });
        } catch (e) {
          // Sentry not available, ignore
        }
      }
      
      throw error;
    }
  }

  /**
   * Execute HTTP request
   */
  private async executeRequest(
    url: string,
    method: string,
    body?: any,
    idempotencyKey?: string
  ): Promise<Response> {
    const headers: HeadersInit = {
      'X-API-Key': this.apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    // Add idempotency key if provided
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      // Log the full request body for debugging Prodigi errors
      if (body) {
        console.error('[Prodigi] Request body being sent:', JSON.stringify(body, null, 2));
      }
      
      this.logger.debug(`${method} ${url}`, {
        body: body ? sanitizeForLogging(body) : undefined,
      });

      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Check for HTTP errors
      if (!response.ok) {
        await this.handleErrorResponse(response, url, method);
      }

      this.logger.success(`${method} ${url} - ${response.status}`);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);

      // Handle timeout
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ProdigiTimeoutError(this.timeout);
      }

      // Handle network errors
      handleFetchError(error, url);
      throw error; // This line won't be reached, but TypeScript needs it
    }
  }

  /**
   * Handle error response
   */
  private async handleErrorResponse(
    response: Response,
    url: string,
    method: string
  ): Promise<never> {
    let errorData: any = {};
    let rawText = '';
    
    try {
      rawText = await response.text();
      errorData = rawText ? JSON.parse(rawText) : {};
      
      // DEBUG: Log the raw error response to understand its structure
      console.error('[Prodigi] Raw error response:', {
        status: response.status,
        statusText: response.statusText,
        rawText,
        parsed: errorData,
        url,
        method,
      });
      
      // Try to extract validation errors from the response
      if (errorData && typeof errorData === 'object') {
        console.error('[Prodigi] Error data structure:', JSON.stringify(errorData, null, 2));
        if (errorData.errors) {
          console.error('[Prodigi] Validation errors:', errorData.errors);
        }
        if (errorData.message) {
          console.error('[Prodigi] Error message:', errorData.message);
        }
      }
    } catch (parseError) {
      // Handle non-JSON error responses (e.g., rate limit messages)
      if (response.status === 429) {
        // Rate limit error - parse the plain text message
        // Format: "API calls quota exceeded! maximum admitted 30 per 30s."
        const rateLimitMatch = rawText.match(/maximum admitted (\d+) per (\d+)s/);
        const retryAfter = rateLimitMatch ? parseInt(rateLimitMatch[2], 10) : 30;
        
        errorData = {
          message: rawText || 'Rate limit exceeded',
          statusText: response.statusText,
          retryAfter,
        };
        
        console.log('[Prodigi] Rate limit error (non-JSON):', {
          status: response.status,
          message: rawText,
          retryAfter,
        });
      } else {
        console.log('[Prodigi] Failed to parse error response:', {
          status: response.status,
          rawText,
          parseError: parseError instanceof Error ? parseError.message : String(parseError),
        });
        // For non-429 errors, use raw text as message
        errorData = {
          message: rawText || response.statusText || 'Unknown error',
          statusText: response.statusText,
        };
      }
    }

    const error = parseProdigiError(response, errorData, url, method);
    throw error;
  }

  /**
   * Parse response
   */
  private async parseResponse<T>(response: Response): Promise<T> {
    const traceParent = extractTraceParent(response);
    
    try {
      const text = await response.text();
      
      if (!text) {
        return {} as T;
      }

      const data = JSON.parse(text);
      
      // Prodigi API wraps responses in different structures:
      // - POST /Orders: { outcome: "Created", order: {...} }
      // - GET /Orders/{id}: { outcome: "Ok", order: {...} }
      // - GET /Orders: { outcome: "Ok", orders: [...] }
      
      // For single entities, extract from wrapper
      if (data.order) {
        return data.order as T;
      }
      
      // For collections and other responses, return as-is
      return data as T;
    } catch (error) {
      throw new ProdigiAPIError(
        'Failed to parse response',
        response.status,
        response.statusText,
        { parseError: error instanceof Error ? error.message : String(error) },
        traceParent
      );
    }
  }

  /**
   * Determine if request should be retried
   */
  private shouldRetry(error: unknown, attempt: number): boolean {
    if (attempt >= this.retries) {
      return false;
    }

    // Retry on network errors
    if (error instanceof ProdigiTimeoutError) {
      return true;
    }

    // Retry on specific API errors
    if (error instanceof ProdigiAPIError) {
      return error.isRetryable();
    }

    return false;
  }

  /**
   * Clear cache
   */
  public clearCache(): void {
    this.cache.clear();
    this.logger.info('Cache cleared');
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { size: number; enabled: boolean } {
    return {
      size: this.cache.size(),
      enabled: this.enableCache,
    };
  }

  /**
   * Get rate limit information
   */
  public getRateLimitInfo(): { availableTokens: number } {
    return {
      availableTokens: this.rateLimiter.getAvailableTokens(),
    };
  }

  /**
   * Get client configuration
   */
  public getConfig(): {
    environment: Environment;
    baseUrl: string;
    timeout: number;
    retries: number;
    cacheEnabled: boolean;
  } {
    return {
      environment: this.environment,
      baseUrl: this.baseUrl,
      timeout: this.timeout,
      retries: this.retries,
      cacheEnabled: this.enableCache,
    };
  }

  /**
   * Get callback URL if configured
   */
  public getCallbackUrl(): string | undefined {
    return this.callbackUrl;
  }
}

