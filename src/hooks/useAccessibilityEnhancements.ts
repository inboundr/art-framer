/**
 * Accessibility enhancements for dynamic UI components
 * Provides WCAG-compliant features for animations, themes, and interactions
 */

'use client';

import { useEffect, useCallback, useState, useRef } from 'react';

export interface AccessibilityPreferences {
  reducedMotion: boolean;
  highContrast: boolean;
  largeText: boolean;
  focusVisible: boolean;
  screenReaderOptimized: boolean;
}

export interface FocusManagementOptions {
  trapFocus?: boolean;
  restoreFocus?: boolean;
  initialFocus?: string;
  skipLinks?: boolean;
}

/**
 * Hook for managing accessibility preferences and system detection
 */
export function useAccessibilityEnhancements() {
  const [preferences, setPreferences] = useState<AccessibilityPreferences>({
    reducedMotion: false,
    highContrast: false,
    largeText: false,
    focusVisible: true,
    screenReaderOptimized: false,
  });

  const [systemPreferences, setSystemPreferences] = useState({
    reducedMotion: false,
    highContrast: false,
    largeText: false,
  });

  // Detect system accessibility preferences
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
    const largeTextQuery = window.matchMedia('(prefers-font-size: large)');

    const updateSystemPreferences = () => {
      setSystemPreferences({
        reducedMotion: reducedMotionQuery.matches,
        highContrast: highContrastQuery.matches,
        largeText: largeTextQuery.matches,
      });
    };

    updateSystemPreferences();

    reducedMotionQuery.addEventListener('change', updateSystemPreferences);
    highContrastQuery.addEventListener('change', updateSystemPreferences);
    
    // Note: prefers-font-size is not widely supported yet
    if (largeTextQuery.addEventListener) {
      largeTextQuery.addEventListener('change', updateSystemPreferences);
    }

    return () => {
      reducedMotionQuery.removeEventListener('change', updateSystemPreferences);
      highContrastQuery.removeEventListener('change', updateSystemPreferences);
      if (largeTextQuery.removeEventListener) {
        largeTextQuery.removeEventListener('change', updateSystemPreferences);
      }
    };
  }, []);

  // Detect screen reader usage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let screenReaderDetected = false;

    // Check for common screen reader indicators
    const checkScreenReader = () => {
      // Check for NVDA, JAWS, or other screen readers
      if (navigator.userAgent.includes('NVDA') || 
          navigator.userAgent.includes('JAWS') ||
          window.speechSynthesis?.speaking) {
        screenReaderDetected = true;
      }

      // Check for screen reader specific CSS
      const testElement = document.createElement('div');
      testElement.setAttribute('aria-hidden', 'true');
      testElement.style.position = 'absolute';
      testElement.style.left = '-10000px';
      testElement.textContent = 'Screen reader test';
      document.body.appendChild(testElement);

      setTimeout(() => {
        const computed = window.getComputedStyle(testElement);
        if (computed.position === 'static' || computed.left !== '-10000px') {
          screenReaderDetected = true;
        }
        document.body.removeChild(testElement);
        
        if (screenReaderDetected) {
          setPreferences(prev => ({ ...prev, screenReaderOptimized: true }));
        }
      }, 100);
    };

    checkScreenReader();
  }, []);

  // Update user preferences
  const updatePreference = useCallback(<K extends keyof AccessibilityPreferences>(
    key: K,
    value: AccessibilityPreferences[K]
  ) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
    
    // Persist to localStorage
    try {
      const stored = localStorage.getItem('art-framer-accessibility') || '{}';
      const current = JSON.parse(stored);
      const updated = { ...current, [key]: value };
      localStorage.setItem('art-framer-accessibility', JSON.stringify(updated));
    } catch (error) {
      console.warn('Failed to save accessibility preference:', error);
    }
  }, []);

  // Load preferences from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('art-framer-accessibility');
      if (stored) {
        const parsed = JSON.parse(stored);
        setPreferences(prev => ({ ...prev, ...parsed }));
      }
    } catch (error) {
      console.warn('Failed to load accessibility preferences:', error);
    }
  }, []);

  // Get effective preferences (user + system)
  const getEffectivePreferences = useCallback(() => {
    return {
      reducedMotion: preferences.reducedMotion || systemPreferences.reducedMotion,
      highContrast: preferences.highContrast || systemPreferences.highContrast,
      largeText: preferences.largeText || systemPreferences.largeText,
      focusVisible: preferences.focusVisible,
      screenReaderOptimized: preferences.screenReaderOptimized,
    };
  }, [preferences, systemPreferences]);

  return {
    preferences,
    systemPreferences,
    effectivePreferences: getEffectivePreferences(),
    updatePreference,
  };
}

/**
 * Hook for managing focus within dynamic components
 */
export function useFocusManagement(options: FocusManagementOptions = {}) {
  const containerRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const focusableElementsRef = useRef<HTMLElement[]>([]);

  // Get focusable elements
  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) return [];

    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'textarea:not([disabled])',
      'select:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]',
    ].join(', ');

    return Array.from(containerRef.current.querySelectorAll(focusableSelectors)) as HTMLElement[];
  }, []);

  // Set up focus trap
  const setupFocusTrap = useCallback(() => {
    if (!options.trapFocus || !containerRef.current) return;

    const focusableElements = getFocusableElements();
    focusableElementsRef.current = focusableElements;

    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    containerRef.current.addEventListener('keydown', handleKeyDown);

    return () => {
      containerRef.current?.removeEventListener('keydown', handleKeyDown);
    };
  }, [options.trapFocus, getFocusableElements]);

  // Save and restore focus
  const saveFocus = useCallback(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;
  }, []);

  const restoreFocus = useCallback(() => {
    if (options.restoreFocus && previousFocusRef.current) {
      previousFocusRef.current.focus();
    }
  }, [options.restoreFocus]);

  // Set initial focus
  const setInitialFocus = useCallback(() => {
    if (!containerRef.current) return;

    let elementToFocus: HTMLElement | null = null;

    if (options.initialFocus) {
      elementToFocus = containerRef.current.querySelector(options.initialFocus);
    }

    if (!elementToFocus) {
      const focusableElements = getFocusableElements();
      elementToFocus = focusableElements[0] || containerRef.current;
    }

    if (elementToFocus) {
      elementToFocus.focus();
    }
  }, [options.initialFocus, getFocusableElements]);

  // Setup focus management
  useEffect(() => {
    if (!containerRef.current) return;

    saveFocus();
    const cleanup = setupFocusTrap();
    setInitialFocus();

    return () => {
      cleanup?.();
      restoreFocus();
    };
  }, [saveFocus, setupFocusTrap, setInitialFocus, restoreFocus]);

  return {
    containerRef,
    focusableElements: focusableElementsRef.current,
    setInitialFocus,
    restoreFocus,
  };
}

/**
 * Hook for accessible announcements to screen readers
 */
export function useAriaAnnouncements() {
  const announcementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Create announcement region
    const announcementDiv = document.createElement('div');
    announcementDiv.setAttribute('aria-live', 'polite');
    announcementDiv.setAttribute('aria-atomic', 'true');
    announcementDiv.setAttribute('id', 'art-framer-announcements');
    announcementDiv.style.position = 'absolute';
    announcementDiv.style.left = '-10000px';
    announcementDiv.style.width = '1px';
    announcementDiv.style.height = '1px';
    announcementDiv.style.overflow = 'hidden';

    document.body.appendChild(announcementDiv);
    announcementRef.current = announcementDiv;

    return () => {
      if (announcementRef.current && document.body.contains(announcementRef.current)) {
        document.body.removeChild(announcementRef.current);
      }
    };
  }, []);

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (!announcementRef.current) return;

    announcementRef.current.setAttribute('aria-live', priority);
    announcementRef.current.textContent = message;

    // Clear after a short delay to allow for repeated announcements
    setTimeout(() => {
      if (announcementRef.current) {
        announcementRef.current.textContent = '';
      }
    }, 1000);
  }, []);

  return { announce };
}

/**
 * Hook for accessible animations with reduced motion support
 */
export function useAccessibleAnimation() {
  const { effectivePreferences } = useAccessibilityEnhancements();

  const getAnimationProps = useCallback((
    defaultProps: Record<string, any>,
    reducedMotionProps?: Record<string, any>
  ) => {
    if (effectivePreferences.reducedMotion && reducedMotionProps) {
      return reducedMotionProps;
    }
    return defaultProps;
  }, [effectivePreferences.reducedMotion]);

  const shouldAnimate = useCallback(() => {
    return !effectivePreferences.reducedMotion;
  }, [effectivePreferences.reducedMotion]);

  return {
    shouldAnimate,
    getAnimationProps,
    reducedMotion: effectivePreferences.reducedMotion,
  };
}

/**
 * Hook for color contrast compliance
 */
export function useColorContrast() {
  const { effectivePreferences } = useAccessibilityEnhancements();

  // Calculate contrast ratio between two colors
  const getContrastRatio = useCallback((color1: string, color2: string): number => {
    // This is a simplified implementation
    // In production, you'd want a more robust color parsing and contrast calculation
    
    const getLuminance = (color: string): number => {
      // Convert hex to RGB and calculate relative luminance
      const hex = color.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16) / 255;
      const g = parseInt(hex.substr(2, 2), 16) / 255;
      const b = parseInt(hex.substr(4, 2), 16) / 255;

      const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      
      return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
    };

    const lum1 = getLuminance(color1);
    const lum2 = getLuminance(color2);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);

    return (brightest + 0.05) / (darkest + 0.05);
  }, []);

  const meetsWCAGAA = useCallback((foreground: string, background: string): boolean => {
    return getContrastRatio(foreground, background) >= 4.5;
  }, [getContrastRatio]);

  const meetsWCAGAAA = useCallback((foreground: string, background: string): boolean => {
    return getContrastRatio(foreground, background) >= 7;
  }, [getContrastRatio]);

  const getAccessibleColor = useCallback((
    foreground: string, 
    background: string,
    targetRatio: number = 4.5
  ): string => {
    if (getContrastRatio(foreground, background) >= targetRatio) {
      return foreground;
    }

    // If high contrast is preferred, return a high contrast alternative
    if (effectivePreferences.highContrast) {
      return background === '#ffffff' ? '#000000' : '#ffffff';
    }

    return foreground; // Return original if we can't improve it
  }, [getContrastRatio, effectivePreferences.highContrast]);

  return {
    getContrastRatio,
    meetsWCAGAA,
    meetsWCAGAAA,
    getAccessibleColor,
    highContrast: effectivePreferences.highContrast,
  };
}
