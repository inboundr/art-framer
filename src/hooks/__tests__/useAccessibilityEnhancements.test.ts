import { renderHook, act } from '@testing-library/react';
import { useAccessibilityEnhancements } from '../useAccessibilityEnhancements';

// Mock window.matchMedia
const mockMatchMedia = jest.fn();
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: mockMatchMedia,
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

describe('useAccessibilityEnhancements', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMatchMedia.mockReturnValue({
      matches: false,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    });
  });

  it('should initialize with default preferences', () => {
    const { result } = renderHook(() => useAccessibilityEnhancements());

    expect(result.current.preferences).toEqual({
      reducedMotion: false,
      highContrast: false,
      largeText: false,
      focusVisible: true,
      screenReaderOptimized: false,
    });
  });

  it('should detect system preferences on mount', () => {
    mockMatchMedia.mockReturnValue({
      matches: true,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    });

    const { result } = renderHook(() => useAccessibilityEnhancements());

    expect(result.current.systemPreferences).toEqual({
      reducedMotion: true,
      highContrast: true,
      largeText: true,
    });
  });

  it('should update individual preferences', () => {
    const { result } = renderHook(() => useAccessibilityEnhancements());

    act(() => {
      result.current.updatePreference('reducedMotion', true);
    });

    expect(result.current.preferences.reducedMotion).toBe(true);
  });

  it('should save preferences to localStorage', () => {
    const { result } = renderHook(() => useAccessibilityEnhancements());

    act(() => {
      result.current.updatePreference('reducedMotion', true);
      result.current.updatePreference('highContrast', true);
    });

    // Check that localStorage was called for each preference update
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'art-framer-accessibility',
      JSON.stringify({ reducedMotion: true })
    );
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'art-framer-accessibility',
      JSON.stringify({ highContrast: true })
    );
  });

  it('should load preferences from localStorage on mount', () => {
    const storedPreferences = {
      reducedMotion: true,
      highContrast: true,
    };

    localStorageMock.getItem.mockReturnValue(JSON.stringify(storedPreferences));

    const { result } = renderHook(() => useAccessibilityEnhancements());

    expect(result.current.preferences.reducedMotion).toBe(true);
    expect(result.current.preferences.highContrast).toBe(true);
  });

  it('should handle invalid localStorage data gracefully', () => {
    localStorageMock.getItem.mockReturnValue('invalid json');

    const { result } = renderHook(() => useAccessibilityEnhancements());

    // Should not throw and should use default preferences
    expect(result.current.preferences.reducedMotion).toBe(false);
  });

  it('should provide effective preferences', () => {
    const { result } = renderHook(() => useAccessibilityEnhancements());

    expect(result.current.effectivePreferences).toBeDefined();
    expect(typeof result.current.effectivePreferences).toBe('object');
  });

  it('should handle localStorage errors gracefully', () => {
    localStorageMock.setItem.mockImplementation(() => {
      throw new Error('Storage quota exceeded');
    });

    const { result } = renderHook(() => useAccessibilityEnhancements());

    // Should not throw when updating preferences
    expect(() => {
      act(() => {
        result.current.updatePreference('reducedMotion', true);
      });
    }).not.toThrow();
  });
});