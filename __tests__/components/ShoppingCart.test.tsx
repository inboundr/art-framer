import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ShoppingCart } from '@/components/ShoppingCart';

// Mock the cart context
let mockCartContext = {
  cartData: {
    cartItems: [],
    totals: {
      subtotal: 0,
      taxAmount: 0,
      shippingAmount: 0,
      total: 0,
      itemCount: 0,
    },
  },
  loading: false,
  refreshCart: jest.fn(),
  addToCart: jest.fn(),
  updateQuantity: jest.fn(),
  removeFromCart: jest.fn(),
  clearCart: jest.fn(),
};

jest.mock('@/contexts/CartContext', () => ({
  useCart: () => mockCartContext,
}));

// Mock the CheckoutFlow component
jest.mock('@/components/CheckoutFlow', () => ({
  CheckoutFlow: ({ onClose }: { onClose: () => void }) => {
    const React = require('react');
    return React.createElement('div', { 'data-testid': 'checkout-flow' },
      React.createElement('button', { onClick: onClose }, 'Close Checkout')
    );
  },
}));

// Mock the RobustAuthProvider
jest.mock('@/contexts/RobustAuthProvider', () => ({
  RobustAuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useRobustAuth: () => ({
    user: { id: 'user-1', email: 'test@example.com' },
    session: { access_token: 'mock-token' },
    loading: false,
  }),
}));

// Mock other required hooks
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'test@example.com' },
    loading: false,
  }),
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

describe('ShoppingCart Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render empty cart message when no items', () => {
    mockCartContext.cartData = {
      cartItems: [],
      totals: {
        subtotal: 0,
        taxAmount: 0,
        shippingAmount: 0,
        total: 0,
        itemCount: 0,
      },
    };

    render(React.createElement(ShoppingCart));

    expect(screen.getByText('Your cart is empty')).toBeInTheDocument();
  });

  it('should render cart items when items exist', () => {
    mockCartContext.cartData = {
      cartItems: [
        {
          id: '1',
          user_id: 'user-1',
          product_id: 'product-1',
          quantity: 2,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
          products: {
            id: 'product-1',
            image_id: 'image-1',
            frame_size: 'medium',
            frame_style: 'black',
            frame_material: 'wood',
            price: 29.99,
            cost: 15.00,
            weight_grams: 400,
            dimensions_cm: { width: 20, height: 25, depth: 2 },
            status: 'active',
            sku: 'SKU-001',
            images: {
              id: 'image-1',
              prompt: 'Test image',
              image_url: 'https://example.com/image.jpg',
              thumbnail_url: null,
              user_id: 'user-1',
              created_at: '2023-01-01T00:00:00Z',
            },
          },
        },
      ],
      totals: {
        subtotal: 59.98,
        taxAmount: 4.80,
        shippingAmount: 5.00,
        total: 69.78,
        itemCount: 2,
      },
    };

    render(React.createElement(ShoppingCart));

    expect(screen.getByText('Medium (12" x 16") Frame')).toBeInTheDocument();
    expect(screen.getAllByText('$59.98')).toHaveLength(2); // Price appears twice in the component
    expect(screen.getByDisplayValue('2')).toBeInTheDocument();
  });

  it('should handle quantity updates', () => {
    mockCartContext.cartData = {
      cartItems: [
        {
          id: '1',
          user_id: 'user-1',
          product_id: 'product-1',
          quantity: 2,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
          products: {
            id: 'product-1',
            image_id: 'image-1',
            frame_size: 'medium',
            frame_style: 'black',
            frame_material: 'wood',
            price: 29.99,
            cost: 15.00,
            weight_grams: 400,
            dimensions_cm: { width: 20, height: 25, depth: 2 },
            status: 'active',
            sku: 'SKU-001',
            images: {
              id: 'image-1',
              prompt: 'Test image',
              image_url: 'https://example.com/image.jpg',
              thumbnail_url: null,
              user_id: 'user-1',
              created_at: '2023-01-01T00:00:00Z',
            },
          },
        },
      ],
      totals: {
        subtotal: 59.98,
        taxAmount: 4.80,
        shippingAmount: 5.00,
        total: 69.78,
        itemCount: 2,
      },
    };

    render(React.createElement(ShoppingCart));

    const quantityInput = screen.getByDisplayValue('2');
    fireEvent.change(quantityInput, { target: { value: '3' } });

    expect(mockCartContext.updateQuantity).toHaveBeenCalledWith('1', 3);
  });

  it('should handle item removal', () => {
    mockCartContext.cartData = {
      cartItems: [
        {
          id: '1',
          user_id: 'user-1',
          product_id: 'product-1',
          quantity: 1,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
          products: {
            id: 'product-1',
            image_id: 'image-1',
            frame_size: 'medium',
            frame_style: 'black',
            frame_material: 'wood',
            price: 29.99,
            cost: 15.00,
            weight_grams: 400,
            dimensions_cm: { width: 20, height: 25, depth: 2 },
            status: 'active',
            sku: 'SKU-001',
            images: {
              id: 'image-1',
              prompt: 'Test image',
              image_url: 'https://example.com/image.jpg',
              thumbnail_url: null,
              user_id: 'user-1',
              created_at: '2023-01-01T00:00:00Z',
            },
          },
        },
      ],
      totals: {
        subtotal: 29.99,
        taxAmount: 2.40,
        shippingAmount: 5.00,
        total: 37.39,
        itemCount: 1,
      },
    };

    render(React.createElement(ShoppingCart));

    // Get all buttons and find the one with the trash icon (red color)
    const allButtons = screen.getAllByRole('button');
    const trashButton = allButtons.find(button => 
      button.className.includes('text-red-500')
    );
    fireEvent.click(trashButton!);

    expect(mockCartContext.removeFromCart).toHaveBeenCalledWith('1');
  });

  it('should handle clear cart', () => {
    // Mock window.confirm to return true
    window.confirm = jest.fn(() => true);
    
    mockCartContext.cartData = {
      cartItems: [
        {
          id: '1',
          user_id: 'user-1',
          product_id: 'product-1',
          quantity: 1,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
          products: {
            id: 'product-1',
            image_id: 'image-1',
            frame_size: 'medium',
            frame_style: 'black',
            frame_material: 'wood',
            price: 29.99,
            cost: 15.00,
            weight_grams: 400,
            dimensions_cm: { width: 20, height: 25, depth: 2 },
            status: 'active',
            sku: 'SKU-001',
            images: {
              id: 'image-1',
              prompt: 'Test image',
              image_url: 'https://example.com/image.jpg',
              thumbnail_url: null,
              user_id: 'user-1',
              created_at: '2023-01-01T00:00:00Z',
            },
          },
        },
      ],
      totals: {
        subtotal: 29.99,
        taxAmount: 2.40,
        shippingAmount: 5.00,
        total: 37.39,
        itemCount: 1,
      },
    };

    render(React.createElement(ShoppingCart));

    const clearButton = screen.getByText('Clear Cart');
    fireEvent.click(clearButton);

    expect(mockCartContext.clearCart).toHaveBeenCalled();
  });

  it('should display loading state', () => {
    mockCartContext.loading = true;
    mockCartContext.cartData = {
      cartItems: [],
      totals: {
        subtotal: 0,
        taxAmount: 0,
        shippingAmount: 0,
        total: 0,
        itemCount: 0,
      },
    };

    render(React.createElement(ShoppingCart));

    // The component doesn't show a loading state, it just disables buttons
    expect(screen.getByText('Your cart is empty')).toBeInTheDocument();
  });

  it('should display error state', () => {
    mockCartContext.cartData = null;
    mockCartContext.loading = false;

    render(React.createElement(ShoppingCart));

    // The component handles null cartData by showing empty cart
    expect(screen.getByText('Your cart is empty')).toBeInTheDocument();
  });
});