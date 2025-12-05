/**
 * User-Friendly Error Messages
 * 
 * Converts technical errors into user-friendly messages
 */

import { ProdigiRateLimitError, ProdigiValidationError, ProdigiNotFoundError } from '@/lib/prodigi-v2/errors';

export interface UserFriendlyError {
  message: string;
  title: string;
  action?: string;
  retryable: boolean;
}

/**
 * Convert technical error to user-friendly message
 */
export function getUserFriendlyError(error: unknown): UserFriendlyError {
  // Rate limit errors
  if (error instanceof ProdigiRateLimitError) {
    return {
      title: 'Please wait a moment',
      message: 'We\'re processing many requests right now. Please wait a moment and try again.',
      action: 'Try again in a few seconds',
      retryable: true,
    };
  }

  // Validation errors
  if (error instanceof ProdigiValidationError) {
    const errorMessage = error.message.toLowerCase();
    
    if (errorMessage.includes('product not available') || errorMessage.includes('sku not found')) {
      return {
        title: 'Product unavailable',
        message: 'This product is currently unavailable in the selected configuration. Please try a different size or style.',
        action: 'Try a different option',
        retryable: false,
      };
    }

    if (errorMessage.includes('shipping') || errorMessage.includes('destination')) {
      return {
        title: 'Shipping unavailable',
        message: 'Shipping is not available to this location. Please try a different address or contact support.',
        action: 'Try a different address',
        retryable: false,
      };
    }

    return {
      title: 'Invalid configuration',
      message: 'There was an issue with your selection. Please try different options.',
      action: 'Try again',
      retryable: true,
    };
  }

  // Not found errors
  if (error instanceof ProdigiNotFoundError) {
    return {
      title: 'Not found',
      message: 'The requested item could not be found. It may have been removed or is temporarily unavailable.',
      action: 'Try searching again',
      retryable: false,
    };
  }

  // Network/timeout errors
  if (error instanceof Error) {
    const errorMessage = error.message.toLowerCase();
    
    if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
      return {
        title: 'Request timed out',
        message: 'The request took too long to complete. Please check your connection and try again.',
        action: 'Try again',
        retryable: true,
      };
    }

    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      return {
        title: 'Connection error',
        message: 'Unable to connect to our servers. Please check your internet connection and try again.',
        action: 'Check connection and try again',
        retryable: true,
      };
    }

    if (errorMessage.includes('currency') || errorMessage.includes('conversion')) {
      return {
        title: 'Price unavailable',
        message: 'We couldn\'t calculate the price in your currency. Please try again or contact support.',
        action: 'Try again',
        retryable: true,
      };
    }
  }

  // Generic error
  return {
    title: 'Something went wrong',
    message: 'An unexpected error occurred. Please try again or contact support if the problem persists.',
    action: 'Try again',
    retryable: true,
  };
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  return getUserFriendlyError(error).retryable;
}

