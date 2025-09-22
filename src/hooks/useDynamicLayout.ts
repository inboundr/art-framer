/**
 * Dynamic layout hook for adaptive UI components
 * Provides intelligent layout decisions based on screen size, content, and context
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

export interface LayoutBreakpoints {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  '2xl': number;
}

export interface DynamicLayoutConfig {
  breakpoints?: Partial<LayoutBreakpoints>;
  debounceMs?: number;
  enableReducedMotion?: boolean;
}

export interface LayoutState {
  width: number;
  height: number;
  breakpoint: keyof LayoutBreakpoints;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  orientation: 'portrait' | 'landscape';
  aspectRatio: number;
  density: number;
  reducedMotion: boolean;
}

export interface GridConfig {
  columns: number;
  gap: number;
  minItemWidth: number;
  maxItemWidth: number;
}

export interface ComponentSize {
  width: number;
  height: number;
  padding: number;
  margin: number;
  fontSize: number;
  iconSize: number;
}

const defaultBreakpoints: LayoutBreakpoints = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

const defaultConfig: Required<DynamicLayoutConfig> = {
  breakpoints: defaultBreakpoints,
  debounceMs: 150,
  enableReducedMotion: true,
};

/**
 * Hook for dynamic layout management
 */
export function useDynamicLayout(config: DynamicLayoutConfig = {}) {
  const mergedConfig = { ...defaultConfig, ...config };
  const breakpoints = { ...defaultBreakpoints, ...mergedConfig.breakpoints };

  const [layoutState, setLayoutState] = useState<LayoutState>(() => {
    if (typeof window === 'undefined') {
      return {
        width: 1024,
        height: 768,
        breakpoint: 'lg' as keyof LayoutBreakpoints,
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        orientation: 'landscape' as const,
        aspectRatio: 1024 / 768,
        density: 1,
        reducedMotion: false,
      };
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    
    return {
      width,
      height,
      breakpoint: getBreakpoint(width, breakpoints),
      isMobile: width < breakpoints.md,
      isTablet: width >= breakpoints.md && width < breakpoints.lg,
      isDesktop: width >= breakpoints.lg,
      orientation: width > height ? 'landscape' : 'portrait',
      aspectRatio: width / height,
      density: window.devicePixelRatio || 1,
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    };
  });

  const updateLayout = useCallback(() => {
    if (typeof window === 'undefined') return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    setLayoutState({
      width,
      height,
      breakpoint: getBreakpoint(width, breakpoints),
      isMobile: width < breakpoints.md,
      isTablet: width >= breakpoints.md && width < breakpoints.lg,
      isDesktop: width >= breakpoints.lg,
      orientation: width > height ? 'landscape' : 'portrait',
      aspectRatio: width / height,
      density: window.devicePixelRatio || 1,
      reducedMotion: mergedConfig.enableReducedMotion && 
        window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    });
  }, [breakpoints, mergedConfig.enableReducedMotion]);

  // Debounced resize handler
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const debouncedResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateLayout, mergedConfig.debounceMs);
    };

    window.addEventListener('resize', debouncedResize);
    window.addEventListener('orientationchange', updateLayout);

    // Listen for reduced motion changes
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMotionChange = () => updateLayout();
    mediaQuery.addEventListener('change', handleMotionChange);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', debouncedResize);
      window.removeEventListener('orientationchange', updateLayout);
      mediaQuery.removeEventListener('change', handleMotionChange);
    };
  }, [updateLayout, mergedConfig.debounceMs]);

  /**
   * Calculate optimal grid configuration based on container width and item constraints
   */
  const getOptimalGrid = useCallback((
    containerWidth: number,
    minItemWidth: number = 200,
    maxItemWidth: number = 400,
    preferredGap: number = 16
  ): GridConfig => {
    const availableWidth = containerWidth - (preferredGap * 2); // Account for container padding
    
    // Calculate maximum possible columns
    const maxColumns = Math.floor(availableWidth / minItemWidth);
    
    // Calculate optimal columns considering gap
    let optimalColumns = maxColumns;
    let itemWidth = minItemWidth;
    
    for (let cols = 1; cols <= maxColumns; cols++) {
      const totalGapWidth = (cols - 1) * preferredGap;
      const availableItemWidth = (availableWidth - totalGapWidth) / cols;
      
      if (availableItemWidth >= minItemWidth && availableItemWidth <= maxItemWidth) {
        optimalColumns = cols;
        itemWidth = availableItemWidth;
      }
    }

    return {
      columns: Math.max(1, optimalColumns),
      gap: preferredGap,
      minItemWidth: itemWidth,
      maxItemWidth: Math.min(itemWidth, maxItemWidth),
    };
  }, []);

  /**
   * Get responsive component sizes based on breakpoint
   */
  const getComponentSize = useCallback((
    baseSize: Partial<ComponentSize> = {}
  ): ComponentSize => {
    const { breakpoint, isMobile, isTablet } = layoutState;
    
    const baseSizes: ComponentSize = {
      width: 320,
      height: 240,
      padding: 16,
      margin: 8,
      fontSize: 14,
      iconSize: 20,
      ...baseSize,
    };

    const multipliers = {
      xs: 0.8,
      sm: 0.9,
      md: 1.0,
      lg: 1.1,
      xl: 1.2,
      '2xl': 1.3,
    };

    const multiplier = multipliers[breakpoint] || 1;

    return {
      width: Math.round(baseSizes.width * multiplier),
      height: Math.round(baseSizes.height * multiplier),
      padding: Math.round(baseSizes.padding * multiplier),
      margin: Math.round(baseSizes.margin * multiplier),
      fontSize: Math.round(baseSizes.fontSize * multiplier),
      iconSize: Math.round(baseSizes.iconSize * multiplier),
    };
  }, [layoutState]);

  /**
   * Get responsive spacing based on layout density
   */
  const getSpacing = useCallback((
    baseSpacing: number = 16,
    scale: 'tight' | 'normal' | 'loose' = 'normal'
  ): number => {
    const { isMobile, density } = layoutState;
    
    const scaleMultipliers = {
      tight: 0.75,
      normal: 1,
      loose: 1.5,
    };

    const densityMultiplier = density > 2 ? 1.2 : density > 1.5 ? 1.1 : 1;
    const mobileMultiplier = isMobile ? 0.8 : 1;
    
    return Math.round(
      baseSpacing * 
      scaleMultipliers[scale] * 
      densityMultiplier * 
      mobileMultiplier
    );
  }, [layoutState]);

  /**
   * Check if a specific breakpoint is active
   */
  const isBreakpoint = useCallback((bp: keyof LayoutBreakpoints): boolean => {
    return layoutState.breakpoint === bp;
  }, [layoutState.breakpoint]);

  /**
   * Check if current breakpoint is at least the specified one
   */
  const isBreakpointUp = useCallback((bp: keyof LayoutBreakpoints): boolean => {
    const currentWidth = layoutState.width;
    return currentWidth >= breakpoints[bp];
  }, [layoutState.width, breakpoints]);

  /**
   * Check if current breakpoint is at most the specified one
   */
  const isBreakpointDown = useCallback((bp: keyof LayoutBreakpoints): boolean => {
    const currentWidth = layoutState.width;
    return currentWidth <= breakpoints[bp];
  }, [layoutState.width, breakpoints]);

  /**
   * Get CSS classes for responsive behavior
   */
  const getResponsiveClasses = useCallback((
    classes: Partial<Record<keyof LayoutBreakpoints, string>>
  ): string => {
    const { breakpoint } = layoutState;
    return classes[breakpoint] || classes.md || '';
  }, [layoutState.breakpoint]);

  /**
   * Calculate container queries for dynamic layouts
   */
  const getContainerQueries = useCallback((containerWidth: number) => {
    return {
      isNarrow: containerWidth < 400,
      isMedium: containerWidth >= 400 && containerWidth < 800,
      isWide: containerWidth >= 800,
      columns: containerWidth < 400 ? 1 : containerWidth < 800 ? 2 : 3,
    };
  }, []);

  // Memoized values for performance
  const memoizedValues = useMemo(() => ({
    optimalImageGrid: getOptimalGrid(layoutState.width, 200, 400, 16),
    optimalCardGrid: getOptimalGrid(layoutState.width, 280, 480, 24),
    componentSize: getComponentSize(),
    tightSpacing: getSpacing(8, 'tight'),
    normalSpacing: getSpacing(16, 'normal'),
    looseSpacing: getSpacing(24, 'loose'),
  }), [layoutState.width, getOptimalGrid, getComponentSize, getSpacing]);

  return {
    ...layoutState,
    ...memoizedValues,
    getOptimalGrid,
    getComponentSize,
    getSpacing,
    isBreakpoint,
    isBreakpointUp,
    isBreakpointDown,
    getResponsiveClasses,
    getContainerQueries,
    breakpoints,
  };
}

/**
 * Get breakpoint name for a given width
 */
function getBreakpoint(width: number, breakpoints: LayoutBreakpoints): keyof LayoutBreakpoints {
  if (width >= breakpoints['2xl']) return '2xl';
  if (width >= breakpoints.xl) return 'xl';
  if (width >= breakpoints.lg) return 'lg';
  if (width >= breakpoints.md) return 'md';
  if (width >= breakpoints.sm) return 'sm';
  return 'xs';
}

/**
 * Hook for container-based responsive behavior
 */
export function useContainerQuery(ref: React.RefObject<HTMLElement | null>) {
  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  useEffect(() => {
    if (!ref.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
        setContainerHeight(entry.contentRect.height);
      }
    });

    resizeObserver.observe(ref.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [ref]);

  return {
    width: containerWidth,
    height: containerHeight,
    aspectRatio: containerHeight > 0 ? containerWidth / containerHeight : 1,
    isNarrow: containerWidth < 400,
    isMedium: containerWidth >= 400 && containerWidth < 800,
    isWide: containerWidth >= 800,
  };
}
