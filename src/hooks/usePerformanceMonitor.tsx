/**
 * Performance monitoring hook for dynamic UI components
 * Tracks animation performance, layout shifts, and render times
 */

'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

export interface PerformanceMetrics {
  animationFrameRate: number;
  layoutShifts: number;
  renderTime: number;
  memoryUsage?: number;
  isLowPerformance: boolean;
}

export interface AnimationMetrics {
  duration: number;
  frameCount: number;
  droppedFrames: number;
  averageFrameTime: number;
}

/**
 * Hook for monitoring overall performance
 */
export function usePerformanceMonitor(enabled: boolean = process.env.NODE_ENV === 'development') {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    animationFrameRate: 60,
    layoutShifts: 0,
    renderTime: 0,
    isLowPerformance: false,
  });

  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(0);
  const animationIdRef = useRef<number | undefined>(undefined);
  const observerRef = useRef<PerformanceObserver | undefined>(undefined);

  // Monitor frame rate
  const measureFrameRate = useCallback(() => {
    if (!enabled) return;

    const now = performance.now();
    frameCountRef.current++;

    if (now - lastTimeRef.current >= 1000) {
      const fps = (frameCountRef.current * 1000) / (now - lastTimeRef.current);
      
      setMetrics(prev => ({
        ...prev,
        animationFrameRate: Math.round(fps),
        isLowPerformance: fps < 30,
      }));

      frameCountRef.current = 0;
      lastTimeRef.current = now;
    }

    animationIdRef.current = requestAnimationFrame(measureFrameRate);
  }, [enabled]);

  // Monitor layout shifts and other metrics
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    // Performance Observer for layout shifts and render metrics
    if ('PerformanceObserver' in window) {
      observerRef.current = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        
        entries.forEach((entry) => {
          if (entry.entryType === 'layout-shift') {
            setMetrics(prev => ({
              ...prev,
              layoutShifts: prev.layoutShifts + (entry as any).value,
            }));
          }
          
          if (entry.entryType === 'measure') {
            setMetrics(prev => ({
              ...prev,
              renderTime: entry.duration,
            }));
          }
        });
      });

      try {
        observerRef.current.observe({ entryTypes: ['layout-shift', 'measure'] });
      } catch (error) {
        console.warn('Performance Observer not fully supported:', error);
      }
    }

    // Memory usage monitoring
    const updateMemoryUsage = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        setMetrics(prev => ({
          ...prev,
          memoryUsage: memory.usedJSHeapSize / 1024 / 1024, // MB
        }));
      }
    };

    const memoryInterval = setInterval(updateMemoryUsage, 5000);

    // Start frame rate monitoring
    measureFrameRate();

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      clearInterval(memoryInterval);
    };
  }, [enabled, measureFrameRate]);

  const logMetrics = useCallback(() => {
    if (!enabled) return;
    
    console.log('Performance Metrics:', {
      ...metrics,
      timestamp: new Date().toISOString(),
    });
  }, [metrics, enabled]);

  return {
    metrics,
    logMetrics,
    isMonitoring: enabled,
  };
}

/**
 * Hook for monitoring specific animation performance
 */
export function useAnimationPerformanceMonitor() {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [metrics, setMetrics] = useState<AnimationMetrics | null>(null);
  
  const startTimeRef = useRef(0);
  const frameCountRef = useRef(0);
  const droppedFramesRef = useRef(0);
  const animationIdRef = useRef<number | undefined>(undefined);
  const lastFrameTimeRef = useRef(0);

  const startMonitoring = useCallback(() => {
    if (isMonitoring) return;

    setIsMonitoring(true);
    startTimeRef.current = performance.now();
    frameCountRef.current = 0;
    droppedFramesRef.current = 0;
    lastFrameTimeRef.current = performance.now();

    const monitorFrame = () => {
      const now = performance.now();
      const frameTime = now - lastFrameTimeRef.current;
      
      frameCountRef.current++;
      
      // Consider frame dropped if it took longer than 16.67ms (60fps)
      if (frameTime > 16.67) {
        droppedFramesRef.current++;
      }
      
      lastFrameTimeRef.current = now;
      
      if (isMonitoring) {
        animationIdRef.current = requestAnimationFrame(monitorFrame);
      }
    };

    animationIdRef.current = requestAnimationFrame(monitorFrame);
  }, [isMonitoring]);

  const stopMonitoring = useCallback(() => {
    if (!isMonitoring) return;

    setIsMonitoring(false);
    
    if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current);
    }

    const endTime = performance.now();
    const duration = endTime - startTimeRef.current;
    const frameCount = frameCountRef.current;
    const droppedFrames = droppedFramesRef.current;
    const averageFrameTime = duration / frameCount;

    const animationMetrics: AnimationMetrics = {
      duration,
      frameCount,
      droppedFrames,
      averageFrameTime,
    };

    setMetrics(animationMetrics);

    // Log performance data in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Animation Performance:', {
        ...animationMetrics,
        effectiveFPS: 1000 / averageFrameTime,
        droppedFramePercentage: (droppedFrames / frameCount) * 100,
      });
    }
  }, [isMonitoring]);

  return {
    startMonitoring,
    stopMonitoring,
    isMonitoring,
    metrics,
  };
}

/**
 * Hook for monitoring component render performance
 */
export function useRenderPerformanceMonitor(componentName: string) {
  const renderCountRef = useRef(0);
  const renderTimesRef = useRef<number[]>([]);

  useEffect(() => {
    const startTime = performance.now();
    renderCountRef.current++;

    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      renderTimesRef.current.push(renderTime);

      // Keep only last 10 render times
      if (renderTimesRef.current.length > 10) {
        renderTimesRef.current.shift();
      }

      // Log slow renders in development
      if (process.env.NODE_ENV === 'development' && renderTime > 16) {
        console.warn(`Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`);
      }
    };
  });

  const getAverageRenderTime = useCallback(() => {
    const times = renderTimesRef.current;
    return times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
  }, []);

  return {
    renderCount: renderCountRef.current,
    getAverageRenderTime,
    getRecentRenderTimes: () => [...renderTimesRef.current],
  };
}

/**
 * Hook for performance-aware feature toggling
 */
export function usePerformanceAwareFeatures() {
  const { metrics } = usePerformanceMonitor();
  const [adaptiveSettings, setAdaptiveSettings] = useState({
    enableAnimations: true,
    enableTransitions: true,
    enableComplexLayouts: true,
    reducedMotion: false,
  });

  useEffect(() => {
    const isLowPerformance = metrics.isLowPerformance || 
                           metrics.animationFrameRate < 30 ||
                           (metrics.memoryUsage && metrics.memoryUsage > 100);

    if (isLowPerformance) {
      setAdaptiveSettings({
        enableAnimations: false,
        enableTransitions: false,
        enableComplexLayouts: false,
        reducedMotion: true,
      });
    } else {
      setAdaptiveSettings({
        enableAnimations: true,
        enableTransitions: true,
        enableComplexLayouts: true,
        reducedMotion: false,
      });
    }
  }, [metrics]);

  return adaptiveSettings;
}

/**
 * Performance monitoring wrapper component
 */
export function PerformanceMonitor({ 
  children, 
  componentName = 'Unknown',
  logInterval = 10000 
}: { 
  children: React.ReactNode;
  componentName?: string;
  logInterval?: number;
}) {
  const { metrics, logMetrics } = usePerformanceMonitor();
  const renderMetrics = useRenderPerformanceMonitor(componentName);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    const interval = setInterval(() => {
      logMetrics();
      console.log(`${componentName} Render Metrics:`, {
        renderCount: renderMetrics.renderCount,
        averageRenderTime: renderMetrics.getAverageRenderTime(),
      });
    }, logInterval);

    return () => clearInterval(interval);
  }, [logMetrics, renderMetrics, componentName, logInterval]);

  return <>{children}</>;
}
