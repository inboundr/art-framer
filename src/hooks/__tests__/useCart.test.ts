import { renderHook, waitFor } from '@testing-library/react';
import { useCart } from '../useCart';

// Mock the useAuth hook
const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
};

jest.mock('../useAuth', () => ({
  useAuth: () => ({
    user: mockUser, // Authenticated user
  }),
}));

// Mock the useToast hook
jest.mock('../use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

// Mock fetch
global.fetch = jest.fn();

describe('useCart', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle 401 authentication errors gracefully', async () => {
    // Mock fetch to return 401 Unauthorized
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
    });

    const { result } = renderHook(() => useCart());

    // Wait for the cart to be fetched
    await waitFor(() => {
      expect(result.current.totals.itemCount).toBe(0);
      expect(result.current.cartItems).toEqual([]);
      expect(result.current.error).toBeNull(); // Should not set error for 401
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/cart');
  });

  it('should handle other API errors and set error state', async () => {
    // Mock fetch to return 500 Internal Server Error
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    });

    const { result } = renderHook(() => useCart());

    // Wait for the cart to be fetched
    await waitFor(() => {
      expect(result.current.error).toBe('Failed to fetch cart (500)');
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/cart');
  });

  it('should handle successful cart fetch', async () => {
    const mockCartData = {
      cartItems: [
        {
          id: '1',
          quantity: 2,
          products: { id: 'prod1', price: 10 },
        },
      ],
      totals: {
        subtotal: 20,
        taxAmount: 2,
        shippingAmount: 5,
        total: 27,
        itemCount: 2,
      },
    };

    // Mock fetch to return successful response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCartData,
    });

    const { result } = renderHook(() => useCart());

    // Wait for the cart to be fetched
    await waitFor(() => {
      expect(result.current.cartItems).toEqual(mockCartData.cartItems);
      expect(result.current.totals).toEqual(mockCartData.totals);
      expect(result.current.error).toBeNull();
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/cart');
  });

  it('should not show badge when itemCount is 0', async () => {
    // Mock fetch to return empty cart
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        cartItems: [],
        totals: {
          subtotal: 0,
          taxAmount: 0,
          shippingAmount: 0,
          total: 0,
          itemCount: 0,
        },
      }),
    });

    const { result } = renderHook(() => useCart());

    await waitFor(() => {
      expect(result.current.totals.itemCount).toBe(0);
    });

    // Badge should be hidden when itemCount is 0
    const shouldShowBadge = result.current.totals.itemCount > 0;
    expect(shouldShowBadge).toBe(false);
  });

  it('should show badge when itemCount is greater than 0', async () => {
    const mockCartData = {
      cartItems: [
        {
          id: '1',
          quantity: 3,
          products: { id: 'prod1', price: 10 },
        },
      ],
      totals: {
        subtotal: 30,
        taxAmount: 3,
        shippingAmount: 5,
        total: 38,
        itemCount: 3,
      },
    };

    // Mock fetch to return cart with items
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCartData,
    });

    const { result } = renderHook(() => useCart());

    await waitFor(() => {
      expect(result.current.totals.itemCount).toBe(3);
    });

    // Badge should be shown when itemCount > 0
    const shouldShowBadge = result.current.totals.itemCount > 0;
    expect(shouldShowBadge).toBe(true);
  });
});
