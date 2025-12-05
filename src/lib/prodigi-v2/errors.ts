/**
 * Prodigi API v4 - Error Handling
 * 
 * Comprehensive error handling for all Prodigi API interactions
 */

import type { ProdigiError } from './types';
import { HTTP_STATUS, ERROR_CODES } from './constants';

// ============================================================================
// CUSTOM ERROR CLASSES
// ============================================================================

export class ProdigiAPIError extends Error {
  public readonly statusCode: number;
  public readonly statusText: string;
  public readonly data: any;
  public readonly traceParent?: string;
  public readonly endpoint?: string;
  public readonly method?: string;

  constructor(
    message: string,
    statusCode: number,
    statusText: string,
    data: any = {},
    traceParent?: string,
    endpoint?: string,
    method?: string
  ) {
    super(message);
    this.name = 'ProdigiAPIError';
    this.statusCode = statusCode;
    this.statusText = statusText;
    this.data = data;
    this.traceParent = traceParent;
    this.endpoint = endpoint;
    this.method = method;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ProdigiAPIError);
    }
  }

  /**
   * Check if error is retryable
   */
  isRetryable(): boolean {
    const retryableCodes = [
      HTTP_STATUS.TOO_MANY_REQUESTS,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      HTTP_STATUS.BAD_GATEWAY,
      HTTP_STATUS.SERVICE_UNAVAILABLE,
      HTTP_STATUS.GATEWAY_TIMEOUT,
    ];
    return retryableCodes.includes(this.statusCode as any);
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(): string {
    switch (this.statusCode) {
      case HTTP_STATUS.UNAUTHORIZED:
        return 'Authentication failed. Please check your API key.';
      case HTTP_STATUS.FORBIDDEN:
        return 'You do not have permission to perform this action.';
      case HTTP_STATUS.NOT_FOUND:
        return 'The requested resource was not found.';
      case HTTP_STATUS.TOO_MANY_REQUESTS:
        return 'Too many requests. Please try again later.';
      case HTTP_STATUS.INTERNAL_SERVER_ERROR:
        return 'Server error. Please try again later.';
      default:
        return this.message;
    }
  }

  /**
   * Convert to JSON for logging/storage
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      statusText: this.statusText,
      data: this.data,
      traceParent: this.traceParent,
      endpoint: this.endpoint,
      method: this.method,
      stack: this.stack,
    };
  }
}

export class ProdigiAuthenticationError extends ProdigiAPIError {
  constructor(message = 'Invalid or missing API key', data?: any, traceParent?: string) {
    super(
      message,
      HTTP_STATUS.UNAUTHORIZED,
      'Unauthorized',
      data,
      traceParent
    );
    this.name = 'ProdigiAuthenticationError';
  }
}

export class ProdigiAuthorizationError extends ProdigiAPIError {
  constructor(message = 'Insufficient permissions', data?: any, traceParent?: string) {
    super(
      message,
      HTTP_STATUS.FORBIDDEN,
      'Forbidden',
      data,
      traceParent
    );
    this.name = 'ProdigiAuthorizationError';
  }
}

export class ProdigiNotFoundError extends ProdigiAPIError {
  constructor(resource: string, data?: any, traceParent?: string) {
    super(
      `Resource not found: ${resource}`,
      HTTP_STATUS.NOT_FOUND,
      'Not Found',
      data,
      traceParent
    );
    this.name = 'ProdigiNotFoundError';
  }
}

export class ProdigiValidationError extends ProdigiAPIError {
  public readonly validationErrors: any[];

  constructor(message: string, validationErrors: any[] = [], data?: any, traceParent?: string) {
    super(
      message,
      HTTP_STATUS.BAD_REQUEST,
      'Bad Request',
      data,
      traceParent
    );
    this.name = 'ProdigiValidationError';
    this.validationErrors = validationErrors;
  }
}

export class ProdigiRateLimitError extends ProdigiAPIError {
  public readonly retryAfter?: number;

  constructor(retryAfter?: number, data?: any, traceParent?: string) {
    const message = retryAfter
      ? `Rate limit exceeded. Retry after ${retryAfter} seconds.`
      : 'Rate limit exceeded. Please try again later.';
    
    super(
      message,
      HTTP_STATUS.TOO_MANY_REQUESTS,
      'Too Many Requests',
      data,
      traceParent
    );
    this.name = 'ProdigiRateLimitError';
    this.retryAfter = retryAfter;
  }
}

export class ProdigiNetworkError extends Error {
  public readonly originalError: Error;

  constructor(message: string, originalError: Error) {
    super(message);
    this.name = 'ProdigiNetworkError';
    this.originalError = originalError;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ProdigiNetworkError);
    }
  }
}

export class ProdigiTimeoutError extends Error {
  public readonly timeout: number;

  constructor(timeout: number) {
    super(`Request timed out after ${timeout}ms`);
    this.name = 'ProdigiTimeoutError';
    this.timeout = timeout;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ProdigiTimeoutError);
    }
  }
}

// ============================================================================
// ERROR PARSING
// ============================================================================

/**
 * Parse error response from Prodigi API
 */
export function parseProdigiError(
  response: Response,
  errorData: any,
  endpoint?: string,
  method?: string
): ProdigiAPIError {
  const statusCode = response.status;
  const statusText = response.statusText;
  const traceParent = errorData.traceParent || response.headers.get('traceparent') || undefined;

  // Extract error message
  let message = errorData.statusText || errorData.message || statusText || 'Unknown error';
  
  // Create specific error types
  switch (statusCode) {
    case HTTP_STATUS.UNAUTHORIZED:
      return new ProdigiAuthenticationError(message, errorData.data, traceParent);
    
    case HTTP_STATUS.FORBIDDEN:
      return new ProdigiAuthorizationError(message, errorData.data, traceParent);
    
    case HTTP_STATUS.NOT_FOUND:
      return new ProdigiNotFoundError(endpoint || 'Unknown resource', errorData.data, traceParent);
    
    case HTTP_STATUS.BAD_REQUEST:
    case HTTP_STATUS.UNPROCESSABLE_ENTITY:
      return new ProdigiValidationError(
        message,
        errorData.data?.errors || [],
        errorData.data,
        traceParent
      );
    
    case HTTP_STATUS.TOO_MANY_REQUESTS:
      // Try to get retryAfter from header first, then from error data
      let retryAfter = response.headers.get('Retry-After');
      if (!retryAfter && errorData.retryAfter) {
        retryAfter = String(errorData.retryAfter);
      }
      // If still no retryAfter, default to 30 seconds (Prodigi's rate limit window)
      const retryAfterSeconds = retryAfter ? parseInt(retryAfter, 10) : 30;
      return new ProdigiRateLimitError(
        retryAfterSeconds,
        errorData.data || errorData,
        traceParent
      );
    
    default:
      return new ProdigiAPIError(
        message,
        statusCode,
        statusText,
        errorData.data,
        traceParent,
        endpoint,
        method
      );
  }
}

/**
 * Check if error is from Prodigi API
 */
export function isProdigiError(error: unknown): error is ProdigiAPIError {
  return error instanceof ProdigiAPIError;
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof ProdigiAPIError) {
    return error.isRetryable();
  }
  if (error instanceof ProdigiNetworkError || error instanceof ProdigiTimeoutError) {
    return true;
  }
  return false;
}

/**
 * Get error message for logging
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ProdigiAPIError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * Get detailed error information for debugging
 */
export function getErrorDetails(error: unknown): Record<string, any> {
  if (error instanceof ProdigiAPIError) {
    return error.toJSON();
  }
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  return {
    error: String(error),
  };
}

// ============================================================================
// ERROR HANDLERS
// ============================================================================

/**
 * Handle fetch errors
 */
export function handleFetchError(error: unknown, endpoint?: string): never {
  if (error instanceof TypeError && error.message.includes('fetch')) {
    throw new ProdigiNetworkError(
      `Network error while connecting to ${endpoint || 'Prodigi API'}`,
      error
    );
  }
  
  if (error instanceof Error) {
    throw error;
  }
  
  throw new Error(`Unknown error: ${String(error)}`);
}

/**
 * Log error with context
 */
export function logError(
  error: unknown,
  context: {
    endpoint?: string;
    method?: string;
    requestBody?: any;
    additionalInfo?: Record<string, any>;
  } = {}
): void {
  const errorDetails = getErrorDetails(error);
  
  console.error('❌ Prodigi API Error:', {
    ...errorDetails,
    context: {
      endpoint: context.endpoint,
      method: context.method,
      timestamp: new Date().toISOString(),
      ...context.additionalInfo,
    },
  });

  // Log request body if available (but sanitize sensitive data)
  if (context.requestBody) {
    const sanitized = { ...context.requestBody };
    // Remove sensitive fields if present
    if (sanitized.apiKey) sanitized.apiKey = '[REDACTED]';
    if (sanitized.recipient?.email) sanitized.recipient.email = '[REDACTED]';
    
    console.error('Request body:', sanitized);
  }
}

