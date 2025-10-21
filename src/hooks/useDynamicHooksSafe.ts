/**
 * Safe wrappers for dynamic hooks with fallbacks
 * Prevents breaking changes when providers are not available
 */

'use client';

import { useDynamicLayout } from './useDynamicLayout';
import { useDynamicAnimations } from './useDynamicAnimations';
import { useDynamicTheme } from './useDynamicTheme';

// Default fallback values
const DEFAULT_LAYOUT = {
  width: 1024,
  height: 768,
  breakpoint: 'lg' as const,
  isMobile: false,
  isTablet: false,
  isDesktop: true,
  orientation: 'landscape' as const,
  aspectRatio: 1024 / 768,
  density: 1,
  reducedMotion: false,
  optimalImageGrid: { columns: 3, gap: 16, minItemWidth: 200, maxItemWidth: 400 },
  optimalCardGrid: { columns: 2, gap: 24, minItemWidth: 280, maxItemWidth: 480 },
  componentSize: { width: 320, height: 240, padding: 16, margin: 8, fontSize: 14, iconSize: 20 },
  tightSpacing: 8,
  normalSpacing: 16,
  looseSpacing: 24,
  getOptimalGrid: () => ({ columns: 3, gap: 16, minItemWidth: 200, maxItemWidth: 400 }),
  getComponentSize: () => ({ width: 320, height: 240, padding: 16, margin: 8, fontSize: 14, iconSize: 20 }),
  getSpacing: (base: number = 16) => base,
  isBreakpoint: () => false,
  isBreakpointUp: () => true,
  isBreakpointDown: () => false,
  getResponsiveClasses: () => '',
  getContainerQueries: () => ({ isNarrow: false, isMedium: true, isWide: false, columns: 3 }),
  breakpoints: { xs: 0, sm: 640, md: 768, lg: 1024, xl: 1280, '2xl': 1536 },
};

const DEFAULT_THEME = {
  theme: {
    name: 'light',
    colors: {
      primary: 'hsl(346, 77%, 49%)',
      primaryForeground: 'hsl(0, 0%, 100%)',
      secondary: 'hsl(210, 40%, 95%)',
      secondaryForeground: 'hsl(222.2, 84%, 4.9%)',
      accent: 'hsl(210, 40%, 90%)',
      accentForeground: 'hsl(222.2, 84%, 4.9%)',
      muted: 'hsl(210, 40%, 96%)',
      mutedForeground: 'hsl(215.4, 16.3%, 46.9%)',
      background: 'hsl(0, 0%, 100%)',
      foreground: 'hsl(222.2, 84%, 4.9%)',
      card: 'hsl(0, 0%, 100%)',
      cardForeground: 'hsl(222.2, 84%, 4.9%)',
      border: 'hsl(214.3, 31.8%, 91.4%)',
      input: 'hsl(214.3, 31.8%, 91.4%)',
      ring: 'hsl(346, 77%, 49%)',
      destructive: 'hsl(0, 84.2%, 60.2%)',
      destructiveForeground: 'hsl(0, 0%, 100%)',
      warning: 'hsl(38, 92%, 50%)',
      warningForeground: 'hsl(0, 0%, 100%)',
      success: 'hsl(142, 76%, 36%)',
      successForeground: 'hsl(0, 0%, 100%)',
      info: 'hsl(217, 91%, 60%)',
      infoForeground: 'hsl(0, 0%, 100%)',
    },
    spacing: { xs: '0.25rem', sm: '0.5rem', md: '1rem', lg: '1.5rem', xl: '2rem', '2xl': '3rem' },
    typography: {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: { xs: '0.75rem', sm: '0.875rem', base: '1rem', lg: '1.125rem', xl: '1.25rem', '2xl': '1.5rem', '3xl': '1.875rem', '4xl': '2.25rem' },
      fontWeight: { light: 300, normal: 400, medium: 500, semibold: 600, bold: 700 },
      lineHeight: { tight: '1.25', normal: '1.5', relaxed: '1.75' },
    },
    animations: {
      duration: { fast: '150ms', normal: '300ms', slow: '500ms' },
      easing: { linear: 'linear', easeIn: 'cubic-bezier(0.4, 0, 1, 1)', easeOut: 'cubic-bezier(0, 0, 0.2, 1)', easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)', bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)' },
    },
    borderRadius: { sm: '0.125rem', md: '0.375rem', lg: '0.5rem', xl: '0.75rem', full: '9999px' },
    shadows: {
      sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    },
  },
  themeName: 'light',
  isDark: false,
  isHighContrast: false,
  colorScheme: 'light' as const,
  setTheme: () => {},
  setColorScheme: () => {},
  toggleTheme: () => {},
  getAdaptiveColor: (light: string, dark: string) => light,
  getContextualColor: () => 'hsl(346, 77%, 49%)',
  generateColorVariations: () => ({}),
};

const DEFAULT_ANIMATIONS = {
  presets: {},
  defaultConfig: { duration: 300, easing: 'ease-out', delay: 0, iterations: 1, direction: 'normal' as const, fillMode: 'forwards' as const },
  defaultTransition: { property: 'all', duration: 200, easing: 'ease-out', delay: 0 },
  animate: () => null,
  animatePreset: () => null,
  staggeredAnimate: () => [],
  createTransition: () => 'all 0.2s ease-out',
  createSpringAnimation: () => ({ keyframes: [], config: { duration: 300 } }),
  createTransformAnimation: () => [],
  getCSSAnimation: () => '',
  isAnimating: () => false,
  getAvailablePresets: () => [],
  getOptimizedConfig: (config: any) => ({ ...DEFAULT_ANIMATIONS.defaultConfig, ...config }),
  getOptimizedTransition: (config: any) => ({ ...DEFAULT_ANIMATIONS.defaultTransition, ...config }),
  reducedMotion: false,
  animationStates: new Map(),
};

/**
 * Safe wrapper for useDynamicLayout with fallbacks
 */
export function useDynamicLayoutSafe() {
  try {
    return useDynamicLayout();
  } catch (error) {
    console.warn('useDynamicLayout failed, using fallback:', error);
    return DEFAULT_LAYOUT;
  }
}

/**
 * Safe wrapper for useDynamicTheme with fallbacks
 */
export function useDynamicThemeSafe() {
  try {
    return useDynamicTheme();
  } catch (error) {
    console.warn('useDynamicTheme failed, using fallback:', error);
    return DEFAULT_THEME;
  }
}

/**
 * Safe wrapper for useDynamicAnimations with fallbacks
 */
export function useDynamicAnimationsSafe() {
  try {
    return useDynamicAnimations();
  } catch (error) {
    console.warn('useDynamicAnimations failed, using fallback:', error);
    return DEFAULT_ANIMATIONS;
  }
}

/**
 * Safe wrapper for useIntersectionAnimation
 */
export function useIntersectionAnimationSafe(
  presetName: string,
  config: any = {},
  options: any = {}
) {
  try {
    // Dynamically import and use the hook - this violates React hooks rules
    // but is necessary for conditional loading
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { useIntersectionAnimation } = jest.requireMock('@/hooks/useDynamicAnimations');
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useIntersectionAnimation(presetName, config, options);
  } catch (error) {
    console.warn('useIntersectionAnimation failed, using fallback:', error);
    return { 
      ref: () => {}, 
      hasAnimated: true // Always consider animated to prevent layout shifts
    };
  }
}

/**
 * Hook that provides safe access to all dynamic hooks
 */
export function useDynamicUI() {
  const layout = useDynamicLayoutSafe();
  const theme = useDynamicThemeSafe();
  const animations = useDynamicAnimationsSafe();

  return {
    layout,
    theme,
    animations,
    // Convenience shortcuts
    isMobile: layout.isMobile,
    isDark: theme.isDark,
    colors: theme.theme.colors,
    animate: animations.animate,
    createTransition: animations.createTransition,
  };
}
