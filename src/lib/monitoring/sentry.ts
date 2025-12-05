/**
 * Sentry Error Tracking
 * 
 * Centralized error tracking setup for production monitoring
 */

// Only initialize Sentry on server-side
let sentryInitialized = false;

export function initSentry() {
  if (typeof window !== 'undefined' || sentryInitialized) {
    return;
  }

  try {
    const Sentry = require('@sentry/nextjs');
    
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
      
      // Filter out health checks and other noise
      beforeSend(event: any, hint: any) {
        // Don't send events in development unless explicitly enabled
        if (process.env.NODE_ENV === 'development' && !process.env.SENTRY_ENABLE_DEV) {
          return null;
        }
        
        // Filter out known non-critical errors
        if (event.exception) {
          const errorMessage = event.exception.values?.[0]?.value || '';
          if (errorMessage.includes('ResizeObserver') || 
              errorMessage.includes('Non-Error promise rejection')) {
            return null;
          }
        }
        
        return event;
      },
    });

    sentryInitialized = true;
    console.log('[Sentry] Initialized successfully');
  } catch (error) {
    console.warn('[Sentry] Failed to initialize:', error);
  }
}

export function captureError(error: Error, context?: Record<string, any>) {
  if (typeof window === 'undefined') {
    // Server-side
    try {
      const Sentry = require('@sentry/nextjs');
      Sentry.captureException(error, {
        extra: context,
      });
    } catch (e) {
      console.error('[Sentry] Failed to capture error:', e);
    }
  } else {
    // Client-side
    try {
      const Sentry = require('@sentry/nextjs');
      Sentry.captureException(error, {
        extra: context,
      });
    } catch (e) {
      console.error('[Sentry] Failed to capture error:', e);
    }
  }
}

export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: Record<string, any>) {
  if (typeof window === 'undefined') {
    // Server-side
    try {
      const Sentry = require('@sentry/nextjs');
      Sentry.captureMessage(message, level, {
        extra: context,
      });
    } catch (e) {
      console.warn('[Sentry] Failed to capture message:', e);
    }
  } else {
    // Client-side
    try {
      const Sentry = require('@sentry/nextjs');
      Sentry.captureMessage(message, level, {
        extra: context,
      });
    } catch (e) {
      console.warn('[Sentry] Failed to capture message:', e);
    }
  }
}

