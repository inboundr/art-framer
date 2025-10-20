import { renderHook, act } from '@testing-library/react';
import { useDynamicTheme } from '../useDynamicTheme';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('useDynamicTheme', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  it('should initialize with default theme', () => {
    const { result } = renderHook(() => useDynamicTheme());

    expect(result.current.theme).toBeDefined();
    expect(result.current.isDark).toBe(false);
    expect(result.current.getAdaptiveColor).toBeDefined();
  });

  it('should detect dark mode preference', () => {
    // Mock prefers-color-scheme: dark
    window.matchMedia = jest.fn().mockImplementation(query => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    const { result } = renderHook(() => useDynamicTheme());

    expect(result.current.isDark).toBe(true);
  });

  it('should load theme from localStorage', () => {
    localStorageMock.getItem.mockReturnValue('dark');

    const { result } = renderHook(() => useDynamicTheme());

    expect(result.current.isDark).toBe(true);
  });

  it('should toggle theme', () => {
    const { result } = renderHook(() => useDynamicTheme());

    // The initial state might be dark due to system preferences
    const initialIsDark = result.current.isDark;

    act(() => {
      result.current.toggleTheme();
    });

    // After toggle, it should be the opposite
    expect(result.current.isDark).toBe(!initialIsDark);
    expect(localStorageMock.setItem).toHaveBeenCalledWith('art-framer-color-scheme', initialIsDark ? 'light' : 'dark');
  });

  it('should set specific theme', () => {
    const { result } = renderHook(() => useDynamicTheme());

    act(() => {
      result.current.setTheme('dark');
    });

    expect(result.current.isDark).toBe(true);
    expect(localStorageMock.setItem).toHaveBeenCalledWith('art-framer-theme', 'dark');
  });

  it('should provide adaptive colors', () => {
    const { result } = renderHook(() => useDynamicTheme());

    const lightColor = result.current.getAdaptiveColor('light', 'dark');
    const darkColor = result.current.getAdaptiveColor('dark', 'light');

    // The colors should be based on the current theme state
    const isDark = result.current.isDark;
    expect(lightColor).toBe(isDark ? 'dark' : 'light');
    expect(darkColor).toBe(isDark ? 'light' : 'dark');
  });

  it('should handle theme persistence', () => {
    const { result } = renderHook(() => useDynamicTheme());

    act(() => {
      result.current.setTheme('dark');
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith('art-framer-theme', 'dark');

    // Simulate page reload
    localStorageMock.getItem.mockReturnValue('dark');
    
    const { result: newResult } = renderHook(() => useDynamicTheme());
    expect(newResult.current.isDark).toBe(true);
  });

  it('should provide theme colors', () => {
    const { result } = renderHook(() => useDynamicTheme());

    expect(result.current.theme.colors).toBeDefined();
    expect(result.current.theme.colors.background).toBeDefined();
    expect(result.current.theme.colors.foreground).toBeDefined();
    expect(result.current.theme.colors.primary).toBeDefined();
  });

  it('should handle system theme changes', () => {
    const { result } = renderHook(() => useDynamicTheme());

    // Mock system theme change
    const mockMatchMedia = jest.fn().mockImplementation(query => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    window.matchMedia = mockMatchMedia;

    act(() => {
      // Simulate system theme change
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.matches = true;
    });

    expect(result.current.isDark).toBe(true);
  });

  it('should provide theme utilities', () => {
    const { result } = renderHook(() => useDynamicTheme());

    expect(result.current.getContextualColor).toBeDefined();
    expect(result.current.generateColorVariations).toBeDefined();
    expect(result.current.setColorScheme).toBeDefined();
  });
});
