import { renderHook, act } from '@testing-library/react';
import { 
  useDynamicLayoutSafe, 
  useDynamicThemeSafe, 
  useDynamicAnimationsSafe, 
  useIntersectionAnimationSafe,
  useDynamicUI 
} from '../useDynamicHooksSafe';

// Mock the dynamic hooks
jest.mock('../useDynamicLayout', () => ({
  useDynamicLayout: jest.fn()
}));

jest.mock('../useDynamicTheme', () => ({
  useDynamicTheme: jest.fn()
}));

jest.mock('../useDynamicAnimations', () => ({
  useDynamicAnimations: jest.fn(),
  useIntersectionAnimation: jest.fn()
}));

import { useDynamicLayout } from '../useDynamicLayout';
import { useDynamicTheme } from '../useDynamicTheme';
import { useDynamicAnimations, useIntersectionAnimation } from '../useDynamicAnimations';

const mockUseDynamicLayout = useDynamicLayout as jest.MockedFunction<typeof useDynamicLayout>;
const mockUseDynamicTheme = useDynamicTheme as jest.MockedFunction<typeof useDynamicTheme>;
const mockUseDynamicAnimations = useDynamicAnimations as jest.MockedFunction<typeof useDynamicAnimations>;
const mockUseIntersectionAnimation = useIntersectionAnimation as jest.MockedFunction<typeof useIntersectionAnimation>;

describe('useDynamicHooksSafe', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('useDynamicLayoutSafe', () => {
    it('should return layout data when hook succeeds', () => {
      const mockLayout = {
        width: 1920,
        height: 1080,
        breakpoint: 'xl' as const,
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        orientation: 'landscape' as const,
        aspectRatio: 16/9,
        density: 2,
        reducedMotion: false,
        optimalImageGrid: { columns: 4, gap: 20, minItemWidth: 250, maxItemWidth: 500 },
        optimalCardGrid: { columns: 3, gap: 32, minItemWidth: 300, maxItemWidth: 600 },
        componentSize: { width: 400, height: 300, padding: 20, margin: 12, fontSize: 16, iconSize: 24 },
        tightSpacing: 12,
        normalSpacing: 20,
        looseSpacing: 32,
        getOptimalGrid: jest.fn(),
        getComponentSize: jest.fn(),
        getSpacing: jest.fn(),
        isBreakpoint: jest.fn(),
        isBreakpointUp: jest.fn(),
        isBreakpointDown: jest.fn(),
        getResponsiveClasses: jest.fn(),
        getContainerQueries: jest.fn(),
        breakpoints: { xs: 0, sm: 640, md: 768, lg: 1024, xl: 1280, '2xl': 1536 }
      };

      mockUseDynamicLayout.mockReturnValue(mockLayout);

      const { result } = renderHook(() => useDynamicLayoutSafe());

      expect(result.current).toEqual(mockLayout);
      expect(mockUseDynamicLayout).toHaveBeenCalled();
    });

    it('should return default layout when hook fails', () => {
      mockUseDynamicLayout.mockImplementation(() => {
        throw new Error('Layout hook failed');
      });

      const { result } = renderHook(() => useDynamicLayoutSafe());

      expect(result.current.width).toBe(1024);
      expect(result.current.height).toBe(768);
      expect(result.current.breakpoint).toBe('lg');
      expect(result.current.isMobile).toBe(false);
      expect(result.current.isDesktop).toBe(true);
      expect(console.warn).toHaveBeenCalledWith('useDynamicLayout failed, using fallback:', expect.any(Error));
    });
  });

  describe('useDynamicThemeSafe', () => {
    it('should return theme data when hook succeeds', () => {
      const mockTheme = {
        theme: {
          name: 'dark',
          colors: {
            background: '#000000',
            foreground: '#ffffff',
            primary: '#3b82f6',
            secondary: '#64748b',
            accent: '#f59e0b',
            muted: '#374151',
            border: '#4b5563',
            input: '#1f2937',
            ring: '#3b82f6',
            chart: {
              '1': '#3b82f6',
              '2': '#ef4444',
              '3': '#10b981',
              '4': '#f59e0b',
              '5': '#8b5cf6'
            }
          },
          fontFamily: { sans: ['Inter', 'sans-serif'], mono: ['JetBrains Mono', 'monospace'] },
          fontSize: { xs: '0.75rem', sm: '0.875rem', base: '1rem', lg: '1.125rem', xl: '1.25rem' },
          fontWeight: { normal: '400', medium: '500', semibold: '600', bold: '700' },
          lineHeight: { tight: '1.25', normal: '1.5', relaxed: '1.75' },
          letterSpacing: { tight: '-0.025em', normal: '0', wide: '0.025em' },
          borderRadius: { sm: '0.125rem', md: '0.375rem', lg: '0.5rem', xl: '0.75rem', full: '9999px' },
          shadows: {
            sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
            md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
            lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
            xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
          }
        },
        themeName: 'dark',
        isDark: true,
        isHighContrast: false,
        colorScheme: 'dark' as const,
        setTheme: jest.fn(),
        setColorScheme: jest.fn(),
        toggleTheme: jest.fn(),
        getAdaptiveColor: jest.fn(),
        getContextualColor: jest.fn(),
        generateColorVariations: jest.fn()
      };

      mockUseDynamicTheme.mockReturnValue(mockTheme);

      const { result } = renderHook(() => useDynamicThemeSafe());

      expect(result.current).toEqual(mockTheme);
      expect(mockUseDynamicTheme).toHaveBeenCalled();
    });

    it('should return default theme when hook fails', () => {
      mockUseDynamicTheme.mockImplementation(() => {
        throw new Error('Theme hook failed');
      });

      const { result } = renderHook(() => useDynamicThemeSafe());

      expect(result.current.themeName).toBe('light');
      expect(result.current.isDark).toBe(false);
      expect(result.current.colorScheme).toBe('light');
      expect(console.warn).toHaveBeenCalledWith('useDynamicTheme failed, using fallback:', expect.any(Error));
    });
  });

  describe('useDynamicAnimationsSafe', () => {
    it('should return animations data when hook succeeds', () => {
      const mockAnimations = {
        presets: { fadeIn: { opacity: [0, 1] }, slideUp: { transform: ['translateY(20px)', 'translateY(0)'] } },
        defaultConfig: { duration: 500, easing: 'ease-in-out', delay: 0, iterations: 1, direction: 'normal' as const, fillMode: 'forwards' as const },
        defaultTransition: { property: 'all', duration: 300, easing: 'ease-out', delay: 0 },
        animate: jest.fn(),
        animatePreset: jest.fn(),
        staggeredAnimate: jest.fn(),
        createTransition: jest.fn(),
        createSpringAnimation: jest.fn(),
        createTransformAnimation: jest.fn(),
        getCSSAnimation: jest.fn(),
        isAnimating: jest.fn(),
        getAvailablePresets: jest.fn(),
        getOptimizedConfig: jest.fn(),
        getOptimizedTransition: jest.fn(),
        reducedMotion: false,
        animationStates: new Map()
      };

      mockUseDynamicAnimations.mockReturnValue(mockAnimations);

      const { result } = renderHook(() => useDynamicAnimationsSafe());

      expect(result.current).toEqual(mockAnimations);
      expect(mockUseDynamicAnimations).toHaveBeenCalled();
    });

    it('should return default animations when hook fails', () => {
      mockUseDynamicAnimations.mockImplementation(() => {
        throw new Error('Animations hook failed');
      });

      const { result } = renderHook(() => useDynamicAnimationsSafe());

      expect(result.current.presets).toEqual({});
      expect(result.current.defaultConfig.duration).toBe(300);
      expect(result.current.reducedMotion).toBe(false);
      expect(console.warn).toHaveBeenCalledWith('useDynamicAnimations failed, using fallback:', expect.any(Error));
    });
  });

  describe('useIntersectionAnimationSafe', () => {
    it('should return intersection animation data when hook succeeds', () => {
      const mockIntersectionAnimation = {
        ref: jest.fn(),
        hasAnimated: false
      };

      mockUseIntersectionAnimation.mockReturnValue(mockIntersectionAnimation);

      const { result } = renderHook(() => useIntersectionAnimationSafe('fadeIn', { duration: 300 }));

      expect(result.current).toEqual(mockIntersectionAnimation);
      expect(mockUseIntersectionAnimation).toHaveBeenCalledWith('fadeIn', { duration: 300 }, {});
    });

    it('should return fallback when hook fails', () => {
      mockUseIntersectionAnimation.mockImplementation(() => {
        throw new Error('Intersection animation hook failed');
      });

      const { result } = renderHook(() => useIntersectionAnimationSafe('fadeIn'));

      expect(result.current.ref).toBeDefined();
      expect(result.current.hasAnimated).toBe(true);
      expect(console.warn).toHaveBeenCalledWith('useIntersectionAnimation failed, using fallback:', expect.any(Error));
    });

    it('should handle custom config and options', () => {
      const mockIntersectionAnimation = {
        ref: jest.fn(),
        hasAnimated: false
      };

      mockUseIntersectionAnimation.mockReturnValue(mockIntersectionAnimation);

      const config = { duration: 500, delay: 100 };
      const options = { threshold: 0.5, rootMargin: '10px' };

      const { result } = renderHook(() => useIntersectionAnimationSafe('slideUp', config, options));

      expect(result.current).toEqual(mockIntersectionAnimation);
      expect(mockUseIntersectionAnimation).toHaveBeenCalledWith('slideUp', config, options);
    });
  });

  describe('useDynamicUI', () => {
    it('should combine all safe hooks', () => {
      const mockLayout = {
        width: 1920,
        height: 1080,
        breakpoint: 'xl' as const,
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        orientation: 'landscape' as const,
        aspectRatio: 16/9,
        density: 2,
        reducedMotion: false,
        optimalImageGrid: { columns: 4, gap: 20, minItemWidth: 250, maxItemWidth: 500 },
        optimalCardGrid: { columns: 3, gap: 32, minItemWidth: 300, maxItemWidth: 600 },
        componentSize: { width: 400, height: 300, padding: 20, margin: 12, fontSize: 16, iconSize: 24 },
        tightSpacing: 12,
        normalSpacing: 20,
        looseSpacing: 32,
        getOptimalGrid: jest.fn(),
        getComponentSize: jest.fn(),
        getSpacing: jest.fn(),
        isBreakpoint: jest.fn(),
        isBreakpointUp: jest.fn(),
        isBreakpointDown: jest.fn(),
        getResponsiveClasses: jest.fn(),
        getContainerQueries: jest.fn(),
        breakpoints: { xs: 0, sm: 640, md: 768, lg: 1024, xl: 1280, '2xl': 1536 }
      };

      const mockTheme = {
        theme: {
          name: 'dark',
          colors: {
            background: '#000000',
            foreground: '#ffffff',
            primary: '#3b82f6',
            secondary: '#64748b',
            accent: '#f59e0b',
            muted: '#374151',
            border: '#4b5563',
            input: '#1f2937',
            ring: '#3b82f6',
            chart: {
              '1': '#3b82f6',
              '2': '#ef4444',
              '3': '#10b981',
              '4': '#f59e0b',
              '5': '#8b5cf6'
            }
          },
          fontFamily: { sans: ['Inter', 'sans-serif'], mono: ['JetBrains Mono', 'monospace'] },
          fontSize: { xs: '0.75rem', sm: '0.875rem', base: '1rem', lg: '1.125rem', xl: '1.25rem' },
          fontWeight: { normal: '400', medium: '500', semibold: '600', bold: '700' },
          lineHeight: { tight: '1.25', normal: '1.5', relaxed: '1.75' },
          letterSpacing: { tight: '-0.025em', normal: '0', wide: '0.025em' },
          borderRadius: { sm: '0.125rem', md: '0.375rem', lg: '0.5rem', xl: '0.75rem', full: '9999px' },
          shadows: {
            sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
            md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
            lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
            xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
          }
        },
        themeName: 'dark',
        isDark: true,
        isHighContrast: false,
        colorScheme: 'dark' as const,
        setTheme: jest.fn(),
        setColorScheme: jest.fn(),
        toggleTheme: jest.fn(),
        getAdaptiveColor: jest.fn(),
        getContextualColor: jest.fn(),
        generateColorVariations: jest.fn()
      };

      const mockAnimations = {
        presets: { fadeIn: { opacity: [0, 1] } },
        defaultConfig: { duration: 500, easing: 'ease-in-out', delay: 0, iterations: 1, direction: 'normal' as const, fillMode: 'forwards' as const },
        defaultTransition: { property: 'all', duration: 300, easing: 'ease-out', delay: 0 },
        animate: jest.fn(),
        animatePreset: jest.fn(),
        staggeredAnimate: jest.fn(),
        createTransition: jest.fn(),
        createSpringAnimation: jest.fn(),
        createTransformAnimation: jest.fn(),
        getCSSAnimation: jest.fn(),
        isAnimating: jest.fn(),
        getAvailablePresets: jest.fn(),
        getOptimizedConfig: jest.fn(),
        getOptimizedTransition: jest.fn(),
        reducedMotion: false,
        animationStates: new Map()
      };

      mockUseDynamicLayout.mockReturnValue(mockLayout);
      mockUseDynamicTheme.mockReturnValue(mockTheme);
      mockUseDynamicAnimations.mockReturnValue(mockAnimations);

      const { result } = renderHook(() => useDynamicUI());

      expect(result.current.layout).toEqual(mockLayout);
      expect(result.current.theme).toEqual(mockTheme);
      expect(result.current.animations).toEqual(mockAnimations);
      expect(result.current.isMobile).toBe(false);
      expect(result.current.isDark).toBe(true);
      expect(result.current.colors).toEqual(mockTheme.theme.colors);
      expect(result.current.animate).toBe(mockAnimations.animate);
      expect(result.current.createTransition).toBe(mockAnimations.createTransition);
    });

    it('should use fallbacks when hooks fail', () => {
      mockUseDynamicLayout.mockImplementation(() => {
        throw new Error('Layout hook failed');
      });
      mockUseDynamicTheme.mockImplementation(() => {
        throw new Error('Theme hook failed');
      });
      mockUseDynamicAnimations.mockImplementation(() => {
        throw new Error('Animations hook failed');
      });

      const { result } = renderHook(() => useDynamicUI());

      expect(result.current.layout.width).toBe(1024);
      expect(result.current.layout.height).toBe(768);
      expect(result.current.theme.themeName).toBe('light');
      expect(result.current.theme.isDark).toBe(false);
      expect(result.current.animations.presets).toEqual({});
      expect(result.current.isMobile).toBe(false);
      expect(result.current.isDark).toBe(false);
    });
  });
});
