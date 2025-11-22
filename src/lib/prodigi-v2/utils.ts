/**
 * Prodigi API v4 - Utility Functions
 * 
 * Helper functions for the Prodigi API integration
 */

import crypto from 'crypto';

// ============================================================================
// URL UTILITIES
// ============================================================================

/**
 * Build URL with query parameters
 */
export function buildUrl(baseUrl: string, params?: Record<string, string | number | boolean | undefined>): string {
  if (!params) return baseUrl;

  const filteredParams = Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== null)
    .reduce((acc, [key, value]) => ({ ...acc, [key]: String(value) }), {});

  const queryString = new URLSearchParams(filteredParams).toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

/**
 * Extract trace parent from response headers
 */
export function extractTraceParent(response: Response): string | undefined {
  return response.headers.get('traceparent') || undefined;
}

// ============================================================================
// HASH UTILITIES
// ============================================================================

/**
 * Generate MD5 hash for asset integrity
 */
export function generateMd5Hash(data: Buffer | string): string {
  return crypto.createHash('md5').update(data).digest('hex');
}

/**
 * Generate hash for cache key
 */
export function generateCacheKey(data: any): string {
  const str = typeof data === 'string' ? data : JSON.stringify(data);
  return crypto.createHash('sha256').update(str).digest('hex').substring(0, 16);
}

// ============================================================================
// IDEMPOTENCY UTILITIES
// ============================================================================

/**
 * Generate idempotency key for order creation
 */
export function generateIdempotencyKey(merchantReference: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `${merchantReference}-${timestamp}-${random}`;
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Validate email address
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate country code (ISO 3166-1 alpha-2)
 */
export function isValidCountryCode(code: string): boolean {
  return /^[A-Z]{2}$/.test(code);
}

/**
 * Validate URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate SKU format
 */
export function isValidSku(sku: string): boolean {
  // Prodigi SKUs are typically alphanumeric with hyphens
  return /^[A-Z0-9\-]+$/i.test(sku) && sku.length > 0 && sku.length < 100;
}

/**
 * Validate merchant reference
 */
export function isValidMerchantReference(ref: string): boolean {
  return ref.length > 0 && ref.length <= 100;
}

/**
 * Validate metadata size
 */
export function isValidMetadata(metadata: Record<string, any>): boolean {
  const jsonString = JSON.stringify(metadata);
  return jsonString.length <= 2000; // 2000 character limit
}

// ============================================================================
// DATA TRANSFORMATION UTILITIES
// ============================================================================

/**
 * Convert price string to number
 */
export function parsePrice(priceString: string): number {
  return parseFloat(priceString);
}

/**
 * Format price for display
 */
export function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

/**
 * Parse date string to Date object
 */
export function parseDate(dateString: string): Date {
  return new Date(dateString);
}

/**
 * Format date for API
 */
export function formatDateForApi(date: Date): string {
  return date.toISOString();
}

/**
 * Convert dimensions from one unit to another
 */
export function convertDimensions(
  value: number,
  fromUnit: 'in' | 'cm' | 'mm',
  toUnit: 'in' | 'cm' | 'mm'
): number {
  if (fromUnit === toUnit) return value;

  // Convert to mm first
  let valueInMm = value;
  if (fromUnit === 'in') valueInMm = value * 25.4;
  if (fromUnit === 'cm') valueInMm = value * 10;

  // Convert from mm to target unit
  if (toUnit === 'in') return valueInMm / 25.4;
  if (toUnit === 'cm') return valueInMm / 10;
  return valueInMm;
}

// ============================================================================
// RETRY UTILITIES
// ============================================================================

/**
 * Calculate retry delay with exponential backoff
 */
export function calculateRetryDelay(attempt: number, baseDelay: number = 1000): number {
  const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
  const jitter = Math.random() * 1000; // Add jitter to avoid thundering herd
  return Math.min(exponentialDelay + jitter, 30000); // Cap at 30 seconds
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// OBJECT UTILITIES
// ============================================================================

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Remove undefined values from object
 */
export function removeUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  return Object.entries(obj)
    .filter(([_, value]) => value !== undefined)
    .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {}) as Partial<T>;
}

/**
 * Sanitize object for logging (remove sensitive data)
 */
export function sanitizeForLogging<T extends Record<string, any>>(obj: T): Partial<T> {
  const sanitized: any = { ...obj };
  const sensitiveKeys = ['apiKey', 'api_key', 'password', 'token', 'secret'];
  
  Object.keys(sanitized).forEach(key => {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
      sanitized[key] = '[REDACTED]';
    }
    if (key === 'email') {
      sanitized[key] = sanitized[key] ? '[EMAIL]' : undefined;
    }
  });
  
  return sanitized;
}

// ============================================================================
// STRING UTILITIES
// ============================================================================

/**
 * Truncate string to specified length
 */
export function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}

/**
 * Generate random string
 */
export function generateRandomString(length: number = 16): string {
  return crypto.randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
}

// ============================================================================
// ARRAY UTILITIES
// ============================================================================

/**
 * Chunk array into smaller arrays
 */
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Remove duplicates from array
 */
export function removeDuplicates<T>(array: T[]): T[] {
  return [...new Set(array)];
}

// ============================================================================
// CACHE UTILITIES
// ============================================================================

/**
 * Simple in-memory cache
 */
export class MemoryCache<T> {
  private cache = new Map<string, { value: T; expiry: number }>();

  set(key: string, value: T, ttlMs: number): void {
    const expiry = Date.now() + ttlMs;
    this.cache.set(key, { value, expiry });
  }

  get(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  size(): number {
    // Clean up expired items first
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
    return this.cache.size;
  }
}

// ============================================================================
// RATE LIMITING UTILITIES
// ============================================================================

/**
 * Token bucket rate limiter
 */
export class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private readonly capacity: number,
    private readonly refillRate: number // tokens per second
  ) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  async consume(tokens: number = 1): Promise<boolean> {
    this.refill();

    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }

    // Wait for tokens to refill
    const waitTime = ((tokens - this.tokens) / this.refillRate) * 1000;
    await sleep(waitTime);
    
    this.refill();
    this.tokens -= tokens;
    return true;
  }

  private refill(): void {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000; // in seconds
    const tokensToAdd = timePassed * this.refillRate;
    
    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  getAvailableTokens(): number {
    this.refill();
    return Math.floor(this.tokens);
  }
}

// ============================================================================
// LOGGING UTILITIES
// ============================================================================

/**
 * Structured logger
 */
export class Logger {
  constructor(private readonly prefix: string) {}

  log(message: string, data?: any): void {
    console.log(`[${this.prefix}] ${message}`, data || '');
  }

  error(message: string, error?: any): void {
    console.error(`[${this.prefix}] ❌ ${message}`, error || '');
  }

  warn(message: string, data?: any): void {
    console.warn(`[${this.prefix}] ⚠️ ${message}`, data || '');
  }

  info(message: string, data?: any): void {
    console.info(`[${this.prefix}] ℹ️ ${message}`, data || '');
  }

  debug(message: string, data?: any): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[${this.prefix}] 🐛 ${message}`, data || '');
    }
  }

  success(message: string, data?: any): void {
    console.log(`[${this.prefix}] ✅ ${message}`, data || '');
  }
}

