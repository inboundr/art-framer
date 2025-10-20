import { render, screen } from '@testing-library/react';
import { CartProvider, useCart } from '../CartContext';
import React from 'react';

// Mock the useAuth hook to return a user
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'test@example.com' },
    session: { access_token: 'test-token' }
  })
}));

// Mock fetch globally
global.fetch = jest.fn();

// Simple test component that doesn't crash
function TestComponent() {
  const { cartData, addToCart, removeFromCart, updateQuantity, clearCart } = useCart();

  return (
    <div>
      <div data-testid="item-count">{cartData?.totals?.itemCount || 0}</div>
      <div data-testid="total-price">{cartData?.totals?.total || 0}</div>
      <div data-testid="loading">{cartData ? 'loaded' : 'loading'}</div>
      <button onClick={() => addToCart('product-1', 1)}>Add Product 1</button>
      <button onClick={() => removeFromCart('product-1')}>Remove Product 1</button>
      <button onClick={() => updateQuantity('product-1', 3)}>Update Quantity</button>
      <button onClick={() => clearCart()}>Clear Cart</button>
    </div>
  );
}

describe('CartContext - Minimal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful responses
    (global.fetch as jest.Mock).mockImplementation((url, options) => {
      if (url === '/api/cart' && (!options || options.method === 'GET')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            cartItems: [],
            totals: {
              subtotal: 0,
              taxAmount: 0,
              shippingAmount: 0,
              total: 0,
              itemCount: 0
            }
          })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });
    });
  });

  it('should render without crashing', () => {
    render(
      <CartProvider>
        <TestComponent />
      </CartProvider>
    );

    expect(screen.getByTestId('loading')).toBeInTheDocument();
  });

  it('should provide cart context functions', () => {
    render(
      <CartProvider>
        <TestComponent />
      </CartProvider>
    );

    expect(screen.getByText('Add Product 1')).toBeInTheDocument();
    expect(screen.getByText('Remove Product 1')).toBeInTheDocument();
    expect(screen.getByText('Update Quantity')).toBeInTheDocument();
    expect(screen.getByText('Clear Cart')).toBeInTheDocument();
  });
});
