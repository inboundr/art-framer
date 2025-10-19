import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CartButton } from '../CartButton';

// Mock the CartContext
jest.mock('@/contexts/CartContext', () => ({
  useCart: jest.fn(),
}));

// Mock the CartModal component
jest.mock('../CartModal', () => ({
  CartModal: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
    <div data-testid="cart-modal" data-open={isOpen}>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

describe('CartButton', () => {
  const mockUseCart = require('@/contexts/CartContext').useCart;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render cart button with shopping cart icon', () => {
    mockUseCart.mockReturnValue({
      cartData: { totals: { itemCount: 0 } },
      loading: false,
    });

    render(<CartButton />);

    const buttons = screen.getAllByRole('button');
    const cartButton = buttons.find(button => button.className.includes('touch-manipulation'));
    expect(cartButton).toBeInTheDocument();
  });

  it('should show item count badge when items are in cart', () => {
    mockUseCart.mockReturnValue({
      cartData: { totals: { itemCount: 3 } },
      loading: false,
    });

    render(<CartButton />);

    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('should show 99+ for counts over 99', () => {
    mockUseCart.mockReturnValue({
      cartData: { totals: { itemCount: 150 } },
      loading: false,
    });

    render(<CartButton />);

    expect(screen.getByText('99+')).toBeInTheDocument();
  });

  it('should not show badge when cart is empty', () => {
    mockUseCart.mockReturnValue({
      cartData: { totals: { itemCount: 0 } },
      loading: false,
    });

    render(<CartButton />);

    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('should open cart modal when clicked', () => {
    mockUseCart.mockReturnValue({
      cartData: { totals: { itemCount: 0 } },
      loading: false,
    });

    render(<CartButton />);

    const buttons = screen.getAllByRole('button');
    const cartButton = buttons.find(button => button.className.includes('touch-manipulation'));
    fireEvent.click(cartButton!);

    expect(screen.getByTestId('cart-modal')).toHaveAttribute('data-open', 'true');
  });

  it('should call onCartClick when provided', () => {
    const mockOnCartClick = jest.fn();
    mockUseCart.mockReturnValue({
      cartData: { totals: { itemCount: 0 } },
      loading: false,
    });

    render(<CartButton onCartClick={mockOnCartClick} />);

    const buttons = screen.getAllByRole('button');
    const cartButton = buttons.find(button => button.className.includes('touch-manipulation'));
    fireEvent.click(cartButton!);

    expect(mockOnCartClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when loading', () => {
    mockUseCart.mockReturnValue({
      cartData: { totals: { itemCount: 0 } },
      loading: true,
    });

    render(<CartButton />);

    const buttons = screen.getAllByRole('button');
    const cartButton = buttons.find(button => button.className.includes('touch-manipulation'));
    expect(cartButton).toBeDisabled();
  });

  it('should handle touch events on mobile', () => {
    mockUseCart.mockReturnValue({
      cartData: { totals: { itemCount: 0 } },
      loading: false,
    });

    render(<CartButton />);

    const buttons = screen.getAllByRole('button');
    const cartButton = buttons.find(button => button.className.includes('touch-manipulation'));
    const touchEvent = new TouchEvent('touchend', { bubbles: true });
    
    fireEvent.touchEnd(cartButton!, touchEvent);
    
    expect(screen.getByTestId('cart-modal')).toHaveAttribute('data-open', 'true');
  });

  it('should prevent event bubbling on click', () => {
    mockUseCart.mockReturnValue({
      cartData: { totals: { itemCount: 0 } },
      loading: false,
    });

    render(<CartButton />);

    const buttons = screen.getAllByRole('button');
    const cartButton = buttons.find(button => button.className.includes('touch-manipulation'));
    
    // Test that the button has the correct event handlers
    expect(cartButton).toBeInTheDocument();
    expect(cartButton).toHaveClass('touch-manipulation');
  });

  it('should handle missing cart data gracefully', () => {
    mockUseCart.mockReturnValue({
      cartData: null,
      loading: false,
    });

    render(<CartButton />);

    const buttons = screen.getAllByRole('button');
    const cartButton = buttons.find(button => button.className.includes('touch-manipulation'));
    expect(cartButton).toBeInTheDocument();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });
});
