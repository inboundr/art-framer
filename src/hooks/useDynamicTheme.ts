/**
 * Dynamic theme hook for context-aware styling
 * Provides adaptive theming based on user preferences, content, and environment
 */

'use client';

import { useState, useEffect, useCallback, useMemo, createContext, useContext } from 'react';
import { useDynamicLayout } from './useDynamicLayout';

export interface ThemeColors {
  // Primary colors
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  
  // Accent colors
  accent: string;
  accentForeground: string;
  muted: string;
  mutedForeground: string;
  
  // Background colors
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  
  // Border and input colors
  border: string;
  input: string;
  ring: string;
  
  // Status colors
  destructive: string;
  destructiveForeground: string;
  warning: string;
  warningForeground: string;
  success: string;
  successForeground: string;
  info: string;
  infoForeground: string;
}

export interface ThemeSpacing {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
}

export interface ThemeTypography {
  fontFamily: string;
  fontSize: {
    xs: string;
    sm: string;
    base: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
    '4xl': string;
  };
  fontWeight: {
    light: number;
    normal: number;
    medium: number;
    semibold: number;
    bold: number;
  };
  lineHeight: {
    tight: string;
    normal: string;
    relaxed: string;
  };
}

export interface ThemeAnimations {
  duration: {
    fast: string;
    normal: string;
    slow: string;
  };
  easing: {
    linear: string;
    easeIn: string;
    easeOut: string;
    easeInOut: string;
    bounce: string;
  };
}

export interface Theme {
  name: string;
  colors: ThemeColors;
  spacing: ThemeSpacing;
  typography: ThemeTypography;
  animations: ThemeAnimations;
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    full: string;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
}

export interface ThemeContext {
  theme: Theme;
  themeName: string;
  isDark: boolean;
  isHighContrast: boolean;
  colorScheme: 'light' | 'dark' | 'auto';
  setTheme: (theme: string) => void;
  setColorScheme: (scheme: 'light' | 'dark' | 'auto') => void;
  toggleTheme: () => void;
  getAdaptiveColor: (lightColor: string, darkColor: string) => string;
  getContextualColor: (context: 'primary' | 'secondary' | 'accent' | 'muted') => string;
  generateColorVariations: (baseColor: string) => Record<string, string>;
}

// Default theme definitions
const lightTheme: Theme = {
  name: 'light',
  colors: {
    primary: 'hsl(346, 77%, 49%)', // Pink primary
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
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
  },
  typography: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
    },
    fontWeight: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75',
    },
  },
  animations: {
    duration: {
      fast: '150ms',
      normal: '300ms',
      slow: '500ms',
    },
    easing: {
      linear: 'linear',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    },
  },
  borderRadius: {
    sm: '0.125rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  },
};

const darkTheme: Theme = {
  ...lightTheme,
  name: 'dark',
  colors: {
    primary: 'hsl(346, 77%, 49%)', // Same pink primary
    primaryForeground: 'hsl(0, 0%, 100%)',
    secondary: 'hsl(217.2, 32.6%, 17.5%)',
    secondaryForeground: 'hsl(210, 40%, 98%)',
    accent: 'hsl(217.2, 32.6%, 17.5%)',
    accentForeground: 'hsl(210, 40%, 98%)',
    muted: 'hsl(217.2, 32.6%, 17.5%)',
    mutedForeground: 'hsl(215, 20.2%, 65.1%)',
    background: 'hsl(222.2, 84%, 4.9%)',
    foreground: 'hsl(210, 40%, 98%)',
    card: 'hsl(222.2, 84%, 4.9%)',
    cardForeground: 'hsl(210, 40%, 98%)',
    border: 'hsl(217.2, 32.6%, 17.5%)',
    input: 'hsl(217.2, 32.6%, 17.5%)',
    ring: 'hsl(346, 77%, 49%)',
    destructive: 'hsl(0, 62.8%, 30.6%)',
    destructiveForeground: 'hsl(210, 40%, 98%)',
    warning: 'hsl(38, 92%, 50%)',
    warningForeground: 'hsl(222.2, 84%, 4.9%)',
    success: 'hsl(142, 76%, 36%)',
    successForeground: 'hsl(210, 40%, 98%)',
    info: 'hsl(217, 91%, 60%)',
    infoForeground: 'hsl(210, 40%, 98%)',
  },
};

const highContrastTheme: Theme = {
  ...darkTheme,
  name: 'high-contrast',
  colors: {
    ...darkTheme.colors,
    background: 'hsl(0, 0%, 0%)',
    foreground: 'hsl(0, 0%, 100%)',
    card: 'hsl(0, 0%, 0%)',
    cardForeground: 'hsl(0, 0%, 100%)',
    border: 'hsl(0, 0%, 100%)',
    input: 'hsl(0, 0%, 10%)',
    muted: 'hsl(0, 0%, 10%)',
    mutedForeground: 'hsl(0, 0%, 90%)',
    secondary: 'hsl(0, 0%, 20%)',
    secondaryForeground: 'hsl(0, 0%, 100%)',
    accent: 'hsl(0, 0%, 20%)',
    accentForeground: 'hsl(0, 0%, 100%)',
  },
};

const themes = {
  light: lightTheme,
  dark: darkTheme,
  'high-contrast': highContrastTheme,
};

// Theme context
const ThemeContextProvider = createContext<ThemeContext | null>(null);

/**
 * Hook for dynamic theme management
 */
export function useDynamicTheme() {
  const { isMobile, reducedMotion } = useDynamicLayout();
  const [themeName, setThemeName] = useState<keyof typeof themes>('light');
  const [colorScheme, setColorScheme] = useState<'light' | 'dark' | 'auto'>('auto');
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [systemPrefersDark, setSystemPrefersDark] = useState(false);

  // Detect system preferences
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check for dark mode preference
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemPrefersDark(darkModeQuery.matches);

    const handleDarkModeChange = (e: MediaQueryListEvent) => {
      setSystemPrefersDark(e.matches);
    };

    darkModeQuery.addEventListener('change', handleDarkModeChange);

    // Check for high contrast preference
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
    setIsHighContrast(highContrastQuery.matches);

    const handleHighContrastChange = (e: MediaQueryListEvent) => {
      setIsHighContrast(e.matches);
    };

    highContrastQuery.addEventListener('change', handleHighContrastChange);

    // Load saved preferences
    const savedTheme = localStorage.getItem('art-framer-theme');
    const savedColorScheme = localStorage.getItem('art-framer-color-scheme');

    if (savedTheme && savedTheme in themes) {
      setThemeName(savedTheme as keyof typeof themes);
    }

    if (savedColorScheme && ['light', 'dark', 'auto'].includes(savedColorScheme)) {
      setColorScheme(savedColorScheme as 'light' | 'dark' | 'auto');
    }

    return () => {
      darkModeQuery.removeEventListener('change', handleDarkModeChange);
      highContrastQuery.removeEventListener('change', handleHighContrastChange);
    };
  }, []);

  // Determine effective theme
  const effectiveTheme = useMemo(() => {
    if (isHighContrast) {
      return themes['high-contrast'];
    }

    if (colorScheme === 'auto') {
      return systemPrefersDark ? themes.dark : themes.light;
    }

    return themes[colorScheme];
  }, [themeName, colorScheme, isHighContrast, systemPrefersDark]);

  const isDark = useMemo(() => {
    return effectiveTheme.name === 'dark' || effectiveTheme.name === 'high-contrast';
  }, [effectiveTheme]);

  /**
   * Set theme and persist to localStorage
   */
  const setTheme = useCallback((theme: string) => {
    if (theme in themes) {
      setThemeName(theme as keyof typeof themes);
      localStorage.setItem('art-framer-theme', theme);
    }
  }, []);

  /**
   * Set color scheme and persist to localStorage
   */
  const setColorSchemeValue = useCallback((scheme: 'light' | 'dark' | 'auto') => {
    setColorScheme(scheme);
    localStorage.setItem('art-framer-color-scheme', scheme);
  }, []);

  /**
   * Toggle between light and dark themes
   */
  const toggleTheme = useCallback(() => {
    const newScheme = colorScheme === 'light' ? 'dark' : 'light';
    setColorSchemeValue(newScheme);
  }, [colorScheme, setColorSchemeValue]);

  /**
   * Get adaptive color based on current theme
   */
  const getAdaptiveColor = useCallback((lightColor: string, darkColor: string): string => {
    return isDark ? darkColor : lightColor;
  }, [isDark]);

  /**
   * Get contextual color from theme
   */
  const getContextualColor = useCallback((
    context: 'primary' | 'secondary' | 'accent' | 'muted'
  ): string => {
    return effectiveTheme.colors[context];
  }, [effectiveTheme]);

  /**
   * Generate color variations from a base color
   */
  const generateColorVariations = useCallback((baseColor: string): Record<string, string> => {
    // Parse HSL color
    const hslMatch = baseColor.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
    if (!hslMatch) return { base: baseColor };

    const [, h, s, l] = hslMatch.map(Number);

    return {
      '50': `hsl(${h}, ${s}%, ${Math.min(95, l + 45)}%)`,
      '100': `hsl(${h}, ${s}%, ${Math.min(90, l + 35)}%)`,
      '200': `hsl(${h}, ${s}%, ${Math.min(85, l + 25)}%)`,
      '300': `hsl(${h}, ${s}%, ${Math.min(80, l + 15)}%)`,
      '400': `hsl(${h}, ${s}%, ${Math.min(75, l + 5)}%)`,
      '500': baseColor, // Base color
      '600': `hsl(${h}, ${s}%, ${Math.max(25, l - 5)}%)`,
      '700': `hsl(${h}, ${s}%, ${Math.max(20, l - 15)}%)`,
      '800': `hsl(${h}, ${s}%, ${Math.max(15, l - 25)}%)`,
      '900': `hsl(${h}, ${s}%, ${Math.max(10, l - 35)}%)`,
      '950': `hsl(${h}, ${s}%, ${Math.max(5, l - 45)}%)`,
    };
  }, []);

  /**
   * Get CSS custom properties for the current theme
   */
  const getCSSCustomProperties = useCallback((): Record<string, string> => {
    const properties: Record<string, string> = {};

    // Colors
    Object.entries(effectiveTheme.colors).forEach(([key, value]) => {
      properties[`--color-${key}`] = value;
    });

    // Spacing
    Object.entries(effectiveTheme.spacing).forEach(([key, value]) => {
      properties[`--spacing-${key}`] = value;
    });

    // Typography
    properties['--font-family'] = effectiveTheme.typography.fontFamily;
    Object.entries(effectiveTheme.typography.fontSize).forEach(([key, value]) => {
      properties[`--font-size-${key}`] = value;
    });
    Object.entries(effectiveTheme.typography.fontWeight).forEach(([key, value]) => {
      properties[`--font-weight-${key}`] = value.toString();
    });
    Object.entries(effectiveTheme.typography.lineHeight).forEach(([key, value]) => {
      properties[`--line-height-${key}`] = value;
    });

    // Animations (adjust for reduced motion)
    const animationMultiplier = reducedMotion ? 0 : 1;
    Object.entries(effectiveTheme.animations.duration).forEach(([key, value]) => {
      const duration = parseInt(value) * animationMultiplier;
      properties[`--duration-${key}`] = `${duration}ms`;
    });
    Object.entries(effectiveTheme.animations.easing).forEach(([key, value]) => {
      properties[`--easing-${key}`] = value;
    });

    // Border radius
    Object.entries(effectiveTheme.borderRadius).forEach(([key, value]) => {
      properties[`--radius-${key}`] = value;
    });

    // Shadows
    Object.entries(effectiveTheme.shadows).forEach(([key, value]) => {
      properties[`--shadow-${key}`] = value;
    });

    // Mobile-specific adjustments
    if (isMobile) {
      properties['--spacing-mobile-multiplier'] = '0.8';
      properties['--font-size-mobile-multiplier'] = '0.9';
    }

    return properties;
  }, [effectiveTheme, reducedMotion, isMobile]);

  /**
   * Apply theme to document
   */
  const applyThemeToDocument = useCallback(() => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    const properties = getCSSCustomProperties();

    Object.entries(properties).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });

    // Set theme class on body
    document.body.className = document.body.className
      .replace(/theme-\w+/g, '')
      .concat(` theme-${effectiveTheme.name}`);
  }, [getCSSCustomProperties, effectiveTheme]);

  // Apply theme when it changes
  useEffect(() => {
    applyThemeToDocument();
  }, [applyThemeToDocument]);

  const contextValue: ThemeContext = useMemo(() => ({
    theme: effectiveTheme,
    themeName: effectiveTheme.name,
    isDark,
    isHighContrast,
    colorScheme,
    setTheme,
    setColorScheme: setColorSchemeValue,
    toggleTheme,
    getAdaptiveColor,
    getContextualColor,
    generateColorVariations,
  }), [
    effectiveTheme,
    isDark,
    isHighContrast,
    colorScheme,
    setTheme,
    setColorSchemeValue,
    toggleTheme,
    getAdaptiveColor,
    getContextualColor,
    generateColorVariations,
  ]);

  return contextValue;
}

/**
 * Hook to use theme context
 */
export function useTheme(): ThemeContext {
  const context = useContext(ThemeContextProvider);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

/**
 * Create theme provider component (to be used in a separate file)
 */
export function createThemeProvider() {
  return { ThemeContextProvider };
}

/**
 * Hook for adaptive component styling
 */
export function useAdaptiveStyles() {
  const { theme, isDark, getAdaptiveColor } = useDynamicTheme();
  const { isMobile, isTablet } = useDynamicLayout();

  const getAdaptiveSize = useCallback((
    mobile: number,
    tablet: number,
    desktop: number
  ): number => {
    if (isMobile) return mobile;
    if (isTablet) return tablet;
    return desktop;
  }, [isMobile, isTablet]);

  const getAdaptiveSpacing = useCallback((
    base: keyof ThemeSpacing
  ): string => {
    const spacing = theme.spacing[base];
    const multiplier = isMobile ? 0.8 : 1;
    return `calc(${spacing} * ${multiplier})`;
  }, [theme.spacing, isMobile]);

  return {
    theme,
    isDark,
    getAdaptiveColor,
    getAdaptiveSize,
    getAdaptiveSpacing,
  };
}
