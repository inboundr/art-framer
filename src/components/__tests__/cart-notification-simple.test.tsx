import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CartNotificationToast } from '../CartNotificationToast';

// Mock the router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

describe('CartNotificationToast - Simple Tests', () => {
  describe('Basic Rendering', () => {
    it('should render with default props', () => {
      render(<CartNotificationToast />);
      
      expect(screen.getByText('Item added to cart')).toBeInTheDocument();
      expect(screen.getByText('Ready to checkout?')).toBeInTheDocument();
      expect(screen.getByText('View Cart')).toBeInTheDocument();
      expect(screen.getByText('Continue')).toBeInTheDocument();
    });

    it('should render with custom item name', () => {
      render(<CartNotificationToast itemName="Large Black Frame" />);
      
      expect(screen.getByText('Large Black Frame added to cart')).toBeInTheDocument();
    });

    it('should render with item image', () => {
      render(
        <CartNotificationToast 
          itemName="Test Frame"
          itemImage="https://example.com/image.jpg"
        />
      );
      
      const image = screen.getByAltText('Test Frame');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', 'https://example.com/image.jpg');
    });
  });

  describe('Dark Theme Styling', () => {
    it('should have dark theme classes', () => {
      const { container } = render(<CartNotificationToast />);
      
      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass('bg-gray-800', 'border-gray-700');
    });

    it('should have white text for main content', () => {
      render(<CartNotificationToast itemName="Test Item" />);
      
      const mainText = screen.getByText('Test Item added to cart');
      expect(mainText).toHaveClass('text-white');
    });

    it('should have gray text for secondary content', () => {
      render(<CartNotificationToast />);
      
      const secondaryText = screen.getByText('Ready to checkout?');
      expect(secondaryText).toHaveClass('text-gray-300');
    });

    it('should have emerald green primary button', () => {
      render(<CartNotificationToast />);
      
      const viewCartButton = screen.getByText('View Cart');
      expect(viewCartButton).toHaveClass('bg-emerald-600', 'hover:bg-emerald-700');
    });

    it('should have dark outline secondary button', () => {
      render(<CartNotificationToast />);
      
      const continueButton = screen.getByText('Continue');
      expect(continueButton).toHaveClass('border-gray-600', 'hover:border-gray-500');
    });
  });

  describe('Success Icon Positioning', () => {
    it('should show success icon on image when image provided', () => {
      render(
        <CartNotificationToast 
          itemImage="https://example.com/image.jpg"
          itemName="Test Item"
        />
      );
      
      // Success icon should be positioned on the image
      const imageContainer = screen.getByAltText('Test Item').parentElement;
      const successIcon = imageContainer?.querySelector('.absolute');
      expect(successIcon).toBeInTheDocument();
      expect(successIcon).toHaveClass('-top-1', '-right-1');
    });

    it('should have emerald green success icon', () => {
      render(
        <CartNotificationToast 
          itemImage="https://example.com/image.jpg"
        />
      );
      
      const imageContainer = screen.getByAltText('Item').parentElement;
      const successIcon = imageContainer?.querySelector('.absolute');
      expect(successIcon).toHaveClass('bg-emerald-500');
    });
  });

  describe('Button Interactions', () => {
    it('should call onViewCart when View Cart button is clicked', () => {
      const mockOnViewCart = jest.fn();
      render(
        <CartNotificationToast 
          onViewCart={mockOnViewCart}
        />
      );
      
      const viewCartButton = screen.getByText('View Cart');
      fireEvent.click(viewCartButton);
      
      expect(mockOnViewCart).toHaveBeenCalledTimes(1);
    });

    it('should call onContinueShopping when Continue button is clicked', () => {
      const mockOnContinueShopping = jest.fn();
      render(
        <CartNotificationToast 
          onContinueShopping={mockOnContinueShopping}
        />
      );
      
      const continueButton = screen.getByText('Continue');
      fireEvent.click(continueButton);
      
      expect(mockOnContinueShopping).toHaveBeenCalledTimes(1);
    });
  });

  describe('Conditional Rendering', () => {
    it('should hide View Cart button when showViewCart is false', () => {
      render(<CartNotificationToast showViewCart={false} />);
      
      expect(screen.queryByText('View Cart')).not.toBeInTheDocument();
      expect(screen.getByText('Continue')).toBeInTheDocument();
    });

    it('should show View Cart button by default', () => {
      render(<CartNotificationToast />);
      
      expect(screen.getByText('View Cart')).toBeInTheDocument();
    });
  });

  describe('Layout and Spacing', () => {
    it('should have proper layout structure', () => {
      const { container } = render(<CartNotificationToast />);
      
      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass('flex', 'items-start', 'gap-3', 'p-4');
    });

    it('should have max width constraint', () => {
      const { container } = render(<CartNotificationToast />);
      
      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass('max-w-md');
    });

    it('should have proper button spacing', () => {
      render(<CartNotificationToast />);
      
      const buttonContainer = screen.getByText('View Cart').parentElement;
      expect(buttonContainer).toHaveClass('flex', 'gap-2');
    });
  });
});

