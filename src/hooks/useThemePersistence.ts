/**
 * Enhanced theme persistence hook
 * Provides robust theme storage and synchronization across browser sessions
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

export type ThemeMode = 'light' | 'dark' | 'auto';
export type ColorScheme = 'light' | 'dark';

export interface ThemePreferences {
  mode: ThemeMode;
  colorScheme: ColorScheme;
  highContrast: boolean;
  reducedMotion: boolean;
  customColors?: Record<string, string>;
  lastUpdated: number;
}

const THEME_STORAGE_KEY = 'art-framer-theme-preferences';
const THEME_SYNC_EVENT = 'art-framer-theme-sync';

const defaultPreferences: ThemePreferences = {
  mode: 'auto',
  colorScheme: 'light',
  highContrast: false,
  reducedMotion: false,
  lastUpdated: Date.now(),
};

/**
 * Hook for persistent theme management with cross-tab synchronization
 */
export function useThemePersistence() {
  const [preferences, setPreferences] = useState<ThemePreferences>(defaultPreferences);
  const [isLoaded, setIsLoaded] = useState(false);
  const [systemPrefersDark, setSystemPrefersDark] = useState(false);
  const [systemPrefersHighContrast, setSystemPrefersHighContrast] = useState(false);
  const [systemPrefersReducedMotion, setSystemPrefersReducedMotion] = useState(false);

  // Load preferences from localStorage
  const loadPreferences = useCallback(() => {
    if (typeof window === 'undefined') return defaultPreferences;

    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ThemePreferences;
        // Validate the stored data
        if (parsed && typeof parsed === 'object' && parsed.lastUpdated) {
          return { ...defaultPreferences, ...parsed };
        }
      }
    } catch (error) {
      console.warn('Failed to load theme preferences:', error);
    }

    return defaultPreferences;
  }, []);

  // Save preferences to localStorage
  const savePreferences = useCallback((prefs: ThemePreferences) => {
    if (typeof window === 'undefined') return;

    try {
      const toSave = { ...prefs, lastUpdated: Date.now() };
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(toSave));
      
      // Broadcast change to other tabs
      window.dispatchEvent(new CustomEvent(THEME_SYNC_EVENT, {
        detail: toSave
      }));
    } catch (error) {
      console.warn('Failed to save theme preferences:', error);
    }
  }, []);

  // Initialize preferences and system detection
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Load stored preferences
    const stored = loadPreferences();
    setPreferences(stored);
    setIsLoaded(true);

    // Detect system preferences
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    setSystemPrefersDark(darkModeQuery.matches);
    setSystemPrefersHighContrast(highContrastQuery.matches);
    setSystemPrefersReducedMotion(reducedMotionQuery.matches);

    // Listen for system preference changes
    const handleDarkModeChange = (e: MediaQueryListEvent) => {
      setSystemPrefersDark(e.matches);
    };

    const handleHighContrastChange = (e: MediaQueryListEvent) => {
      setSystemPrefersHighContrast(e.matches);
    };

    const handleReducedMotionChange = (e: MediaQueryListEvent) => {
      setSystemPrefersReducedMotion(e.matches);
    };

    darkModeQuery.addEventListener('change', handleDarkModeChange);
    highContrastQuery.addEventListener('change', handleHighContrastChange);
    reducedMotionQuery.addEventListener('change', handleReducedMotionChange);

    // Listen for cross-tab synchronization
    const handleThemeSync = (event: CustomEvent<ThemePreferences>) => {
      const newPrefs = event.detail;
      if (newPrefs.lastUpdated > preferences.lastUpdated) {
        setPreferences(newPrefs);
      }
    };

    window.addEventListener(THEME_SYNC_EVENT, handleThemeSync as EventListener);

    // Listen for storage changes (fallback for cross-tab sync)
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY && event.newValue) {
        try {
          const newPrefs = JSON.parse(event.newValue) as ThemePreferences;
          if (newPrefs.lastUpdated > preferences.lastUpdated) {
            setPreferences(newPrefs);
          }
        } catch (error) {
          console.warn('Failed to parse theme sync data:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      darkModeQuery.removeEventListener('change', handleDarkModeChange);
      highContrastQuery.removeEventListener('change', handleHighContrastChange);
      reducedMotionQuery.removeEventListener('change', handleReducedMotionChange);
      window.removeEventListener(THEME_SYNC_EVENT, handleThemeSync as EventListener);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [loadPreferences, preferences.lastUpdated]);

  // Update theme mode
  const setThemeMode = useCallback((mode: ThemeMode) => {
    const newPrefs = { ...preferences, mode };
    setPreferences(newPrefs);
    savePreferences(newPrefs);
  }, [preferences, savePreferences]);

  // Update color scheme
  const setColorScheme = useCallback((colorScheme: ColorScheme) => {
    const newPrefs = { ...preferences, colorScheme };
    setPreferences(newPrefs);
    savePreferences(newPrefs);
  }, [preferences, savePreferences]);

  // Toggle theme
  const toggleTheme = useCallback(() => {
    const currentScheme = getEffectiveColorScheme();
    const newScheme: ColorScheme = currentScheme === 'light' ? 'dark' : 'light';
    const newMode: ThemeMode = newScheme;
    
    const newPrefs = { ...preferences, mode: newMode, colorScheme: newScheme };
    setPreferences(newPrefs);
    savePreferences(newPrefs);
  }, [preferences, savePreferences]);

  // Set high contrast mode
  const setHighContrast = useCallback((highContrast: boolean) => {
    const newPrefs = { ...preferences, highContrast };
    setPreferences(newPrefs);
    savePreferences(newPrefs);
  }, [preferences, savePreferences]);

  // Set reduced motion
  const setReducedMotion = useCallback((reducedMotion: boolean) => {
    const newPrefs = { ...preferences, reducedMotion };
    setPreferences(newPrefs);
    savePreferences(newPrefs);
  }, [preferences, savePreferences]);

  // Set custom colors
  const setCustomColors = useCallback((customColors: Record<string, string>) => {
    const newPrefs = { ...preferences, customColors };
    setPreferences(newPrefs);
    savePreferences(newPrefs);
  }, [preferences, savePreferences]);

  // Get effective color scheme (considering auto mode)
  const getEffectiveColorScheme = useCallback((): ColorScheme => {
    if (preferences.mode === 'auto') {
      return systemPrefersDark ? 'dark' : 'light';
    }
    return preferences.colorScheme;
  }, [preferences.mode, preferences.colorScheme, systemPrefersDark]);

  // Get effective high contrast setting
  const getEffectiveHighContrast = useCallback((): boolean => {
    return preferences.highContrast || systemPrefersHighContrast;
  }, [preferences.highContrast, systemPrefersHighContrast]);

  // Get effective reduced motion setting
  const getEffectiveReducedMotion = useCallback((): boolean => {
    return preferences.reducedMotion || systemPrefersReducedMotion;
  }, [preferences.reducedMotion, systemPrefersReducedMotion]);

  // Reset to defaults
  const resetPreferences = useCallback(() => {
    const newPrefs = { ...defaultPreferences, lastUpdated: Date.now() };
    setPreferences(newPrefs);
    savePreferences(newPrefs);
  }, [savePreferences]);

  // Export preferences for backup
  const exportPreferences = useCallback(() => {
    return JSON.stringify(preferences, null, 2);
  }, [preferences]);

  // Import preferences from backup
  const importPreferences = useCallback((data: string) => {
    try {
      const imported = JSON.parse(data) as ThemePreferences;
      const newPrefs = { ...defaultPreferences, ...imported, lastUpdated: Date.now() };
      setPreferences(newPrefs);
      savePreferences(newPrefs);
      return true;
    } catch (error) {
      console.warn('Failed to import theme preferences:', error);
      return false;
    }
  }, [savePreferences]);

  return {
    // Current preferences
    preferences,
    isLoaded,
    
    // System preferences
    systemPrefersDark,
    systemPrefersHighContrast,
    systemPrefersReducedMotion,
    
    // Effective values (considering system preferences)
    effectiveColorScheme: getEffectiveColorScheme(),
    effectiveHighContrast: getEffectiveHighContrast(),
    effectiveReducedMotion: getEffectiveReducedMotion(),
    
    // Update methods
    setThemeMode,
    setColorScheme,
    toggleTheme,
    setHighContrast,
    setReducedMotion,
    setCustomColors,
    
    // Utility methods
    resetPreferences,
    exportPreferences,
    importPreferences,
    
    // Computed values
    isDark: getEffectiveColorScheme() === 'dark',
    isAuto: preferences.mode === 'auto',
  };
}

/**
 * Hook for theme preference synchronization across components
 */
export function useThemeSync() {
  const [syncKey, setSyncKey] = useState(0);

  useEffect(() => {
    const handleSync = () => {
      setSyncKey(prev => prev + 1);
    };

    window.addEventListener(THEME_SYNC_EVENT, handleSync);
    return () => window.removeEventListener(THEME_SYNC_EVENT, handleSync);
  }, []);

  return { syncKey };
}

/**
 * Utility function to get theme preferences without hook
 */
export function getStoredThemePreferences(): ThemePreferences {
  if (typeof window === 'undefined') return defaultPreferences;

  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as ThemePreferences;
      if (parsed && typeof parsed === 'object' && parsed.lastUpdated) {
        return { ...defaultPreferences, ...parsed };
      }
    }
  } catch (error) {
    console.warn('Failed to get stored theme preferences:', error);
  }

  return defaultPreferences;
}
