/**
 * Dynamic Theme Provider Component
 * Wraps the application with dynamic theming capabilities
 */

'use client';

import React, { useEffect } from 'react';
import { useDynamicTheme, createThemeProvider } from '@/hooks/useDynamicTheme';
import { useThemePersistence } from '@/hooks/useThemePersistence';

const { ThemeContextProvider } = createThemeProvider();

interface DynamicThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: 'light' | 'dark' | 'auto';
  enableSystemTheme?: boolean;
}

function ThemeApplier({ children }: { children: React.ReactNode }) {
  const { theme, isDark, colorScheme } = useDynamicTheme();

  // Apply theme variables to CSS custom properties
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;

    // Set CSS custom properties for all theme values
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });

    Object.entries(theme.spacing).forEach(([key, value]) => {
      root.style.setProperty(`--spacing-${key}`, value);
    });

    Object.entries(theme.typography.fontSize).forEach(([key, value]) => {
      root.style.setProperty(`--font-size-${key}`, value);
    });

    Object.entries(theme.typography.fontWeight).forEach(([key, value]) => {
      root.style.setProperty(`--font-weight-${key}`, value.toString());
    });

    Object.entries(theme.borderRadius).forEach(([key, value]) => {
      root.style.setProperty(`--radius-${key}`, value);
    });

    Object.entries(theme.shadows).forEach(([key, value]) => {
      root.style.setProperty(`--shadow-${key}`, value);
    });

    // Set theme class on document
    document.documentElement.className = document.documentElement.className
      .replace(/theme-\w+/g, '')
      .concat(` theme-${theme.name}`);

    // Set color scheme for system compatibility
    document.documentElement.style.colorScheme = colorScheme === 'auto' 
      ? (isDark ? 'dark' : 'light')
      : colorScheme;

  }, [theme, isDark, colorScheme]);

  return <>{children}</>;
}

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const themeContext = useDynamicTheme();

  return (
    <ThemeContextProvider.Provider value={themeContext}>
      {children}
    </ThemeContextProvider.Provider>
  );
}

export function DynamicThemeProvider({ 
  children,
  defaultTheme = 'auto',
  enableSystemTheme = true,
}: DynamicThemeProviderProps) {
  return (
    <ThemeProvider>
      <ThemeApplier>
        {children}
      </ThemeApplier>
    </ThemeProvider>
  );
}

/**
 * Theme Toggle Component
 * Provides a button to toggle between light and dark themes
 */
export function ThemeToggle({ 
  className = '',
  showLabel = true,
  variant = 'button',
}: {
  className?: string;
  showLabel?: boolean;
  variant?: 'button' | 'switch' | 'icon';
}) {
  const { theme, isDark, toggleTheme, colorScheme } = useDynamicTheme();

  const buttonStyles: React.CSSProperties = {
    backgroundColor: theme.colors.card,
    color: theme.colors.cardForeground,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.borderRadius.md,
    padding: variant === 'icon' ? '8px' : '8px 16px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  };

  const iconStyles: React.CSSProperties = {
    width: '16px',
    height: '16px',
    fill: 'currentColor',
  };

  if (variant === 'switch') {
    return (
      <label 
        className={`inline-flex items-center cursor-pointer ${className}`}
        style={{ gap: '8px' }}
      >
        {showLabel && (
          <span style={{ color: theme.colors.foreground, fontSize: theme.typography.fontSize.sm }}>
            {isDark ? 'Dark' : 'Light'} Mode
          </span>
        )}
        <div
          className="relative"
          style={{
            width: '44px',
            height: '24px',
            backgroundColor: isDark ? theme.colors.primary : theme.colors.muted,
            borderRadius: '12px',
            transition: 'background-color 0.2s ease',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '2px',
              left: isDark ? '22px' : '2px',
              width: '20px',
              height: '20px',
              backgroundColor: theme.colors.background,
              borderRadius: '50%',
              transition: 'left 0.2s ease',
              boxShadow: theme.shadows.sm,
            }}
          />
        </div>
        <input
          type="checkbox"
          checked={isDark}
          onChange={toggleTheme}
          className="sr-only"
        />
      </label>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className={className}
      style={buttonStyles}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {isDark ? (
        <svg style={iconStyles} viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="5" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
      ) : (
        <svg style={iconStyles} viewBox="0 0 24 24">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
      {showLabel && variant !== 'icon' && (
        <span>{isDark ? 'Light' : 'Dark'} Mode</span>
      )}
    </button>
  );
}

/**
 * Dynamic Status Indicator
 * Shows current theme and layout information (development only)
 */
export function DynamicStatusIndicator() {
  const { theme, isDark, colorScheme } = useDynamicTheme();
  
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div
      className="fixed bottom-4 right-4 p-3 rounded-lg text-xs font-mono z-50"
      style={{
        backgroundColor: theme.colors.card,
        color: theme.colors.cardForeground,
        border: `1px solid ${theme.colors.border}`,
        boxShadow: theme.shadows.lg,
        maxWidth: '200px',
      }}
    >
      <div className="space-y-1">
        <div>
          <strong>Theme:</strong> {theme.name}
        </div>
        <div>
          <strong>Mode:</strong> {isDark ? 'Dark' : 'Light'}
        </div>
        <div>
          <strong>Scheme:</strong> {colorScheme}
        </div>
        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: `1px solid ${theme.colors.border}` }}>
          <div style={{ fontSize: '10px', opacity: 0.7 }}>
            Dynamic UI Active
          </div>
        </div>
      </div>
    </div>
  );
}
