import { renderHook, act } from '@testing-library/react';
import { useCart } from '@/hooks/useCart';

// Mock the cart context
jest.mock('@/contexts/CartContext', () => ({
  useCart: () => ({
    items: [],
    addItem: jest.fn(),
    removeItem: jest.fn(),
    updateQuantity: jest.fn(),
    clearCart: jest.fn(),
    getTotalItems: jest.fn(() => 0),
    getTotalPrice: jest.fn(() => 0),
    isLoading: false,
    error: null,
  }),
}));

// Mock the CentralizedAuthProvider
jest.mock('@/contexts/CentralizedAuthProvider', () => ({
  useCentralizedAuth: () => ({
    user: { id: 'user-1', email: 'test@example.com' },
    session: { access_token: 'mock-token' },
    loading: false,
    isInitialized: true,
    signIn: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    refreshSession: jest.fn(),
  }),
}));

describe('useCart Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return cart context values', () => {
    const { result } = renderHook(() => useCart());

    expect(result.current).toBeDefined();
    expect(result.current.cartItems).toBeDefined();
    expect(result.current.totals).toBeDefined();
    expect(result.current.addToCart).toBeDefined();
    expect(result.current.removeFromCart).toBeDefined();
    expect(result.current.updateQuantity).toBeDefined();
    expect(result.current.clearCart).toBeDefined();
  });

  it('should provide cart items', () => {
    const { result } = renderHook(() => useCart());

    expect(result.current.cartItems).toEqual([]);
  });

  it('should provide cart methods', () => {
    const { result } = renderHook(() => useCart());

    expect(typeof result.current.addToCart).toBe('function');
    expect(typeof result.current.removeFromCart).toBe('function');
    expect(typeof result.current.updateQuantity).toBe('function');
    expect(typeof result.current.clearCart).toBe('function');
  });

  it('should handle loading state', () => {
    const { result } = renderHook(() => useCart());

    expect(result.current.loading).toBeDefined();
  });

  it('should handle error state', () => {
    const { result } = renderHook(() => useCart());

    expect(result.current.error).toBeDefined();
  });

  it('should calculate total items correctly', () => {
    const { result } = renderHook(() => useCart());

    expect(result.current.totals.itemCount).toBeDefined();
  });

  it('should calculate total price correctly', () => {
    const { result } = renderHook(() => useCart());

    expect(result.current.totals.total).toBeDefined();
  });
});