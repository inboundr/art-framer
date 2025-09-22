/**
 * Error Boundary for Dynamic UI Components
 * Provides graceful fallbacks when dynamic features fail
 */

'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class DynamicErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('Dynamic UI Error:', error, errorInfo);
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Report to analytics (optional)
    if (typeof window !== 'undefined' && 'gtag' in window) {
      (window as any).gtag('event', 'exception', {
        description: `Dynamic UI Error: ${error.message}`,
        fatal: false,
      });
    }
  }

  public render() {
    if (this.state.hasError) {
      // Use custom fallback or default
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <DynamicErrorFallback error={this.state.error} onRetry={this.handleRetry} />;
    }

    return this.props.children;
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };
}

interface DynamicErrorFallbackProps {
  error?: Error;
  onRetry: () => void;
}

function DynamicErrorFallback({ error, onRetry }: DynamicErrorFallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] p-6 bg-card border border-border rounded-lg">
      <div className="text-center space-y-4 max-w-md">
        {/* Error Icon */}
        <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center">
          <svg 
            className="w-6 h-6 text-destructive" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
            />
          </svg>
        </div>

        {/* Error Message */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Dynamic Feature Unavailable
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            The enhanced interface couldn't load. The basic version is still available.
          </p>
          {process.env.NODE_ENV === 'development' && error && (
            <details className="text-xs text-muted-foreground bg-muted p-3 rounded mt-2">
              <summary className="cursor-pointer font-medium">Error Details</summary>
              <pre className="mt-2 whitespace-pre-wrap">{error.message}</pre>
            </details>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 border border-border text-foreground rounded-md hover:bg-muted transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Higher-order component to wrap components with error boundary
 */
export function withDynamicErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  const WrappedComponent = (props: P) => (
    <DynamicErrorBoundary fallback={fallback}>
      <Component {...props} />
    </DynamicErrorBoundary>
  );

  WrappedComponent.displayName = `withDynamicErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

/**
 * Hook for handling dynamic feature errors in functional components
 */
export function useDynamicErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  const handleError = React.useCallback((error: Error) => {
    setError(error);
    console.warn('Dynamic feature error:', error);
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  const retryWithFallback = React.useCallback((
    dynamicFn: () => Promise<any>,
    fallbackFn: () => any
  ) => {
    return dynamicFn().catch((error) => {
      handleError(error);
      return fallbackFn();
    });
  }, [handleError]);

  return {
    error,
    handleError,
    clearError,
    retryWithFallback,
    hasError: error !== null,
  };
}
