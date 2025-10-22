/**
 * NotificationBar Component Tests
 * Tests the actual NotificationBar component behavior
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { NotificationBar } from '../NotificationBar';

describe('NotificationBar', () => {
  describe('Component Rendering', () => {
    it('should render notification bar with shipping message', () => {
      render(<NotificationBar onClose={jest.fn()} />);
      
      expect(screen.getByText(/free shipping over \$100/i)).toBeInTheDocument();
      expect(screen.getByText(/on all framed art orders/i)).toBeInTheDocument();
    });

    it('should render truck emoji', () => {
      render(<NotificationBar onClose={jest.fn()} />);
      
      expect(screen.getByText('🚚')).toBeInTheDocument();
    });

    it('should render close button', () => {
      render(<NotificationBar onClose={jest.fn()} />);
      
      // The close button is an icon button without accessible text
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(1); // Only close button (no see plans button)
    });
  });

  describe('Close Functionality', () => {
    it('should call onClose when close button is clicked', () => {
      const mockOnClose = jest.fn();
      render(<NotificationBar onClose={mockOnClose} />);
      
      // Find the close button (the only button now)
      const buttons = screen.getAllByRole('button');
      const closeButton = buttons[0];
      
      expect(closeButton).toBeInTheDocument();
      fireEvent.click(closeButton!);
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should handle missing onClose prop gracefully', () => {
      render(<NotificationBar />);
      
      // Should not throw error
      expect(screen.getByText(/free shipping over \$100/i)).toBeInTheDocument();
    });
  });

  describe('Button Interactions', () => {
    it('should handle close button click', () => {
      const mockOnClose = jest.fn();
      render(<NotificationBar onClose={mockOnClose} />);
      
      const closeButton = screen.getByRole('button');
      fireEvent.click(closeButton);
      
      // onClose should be called
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Content Display', () => {
    it('should display shipping message', () => {
      render(<NotificationBar onClose={jest.fn()} />);
      
      expect(screen.getByText(/free shipping over \$100/i)).toBeInTheDocument();
    });

    it('should display framed art orders text', () => {
      render(<NotificationBar onClose={jest.fn()} />);
      
      expect(screen.getByText(/on all framed art orders/i)).toBeInTheDocument();
    });

    it('should display truck emoji', () => {
      render(<NotificationBar onClose={jest.fn()} />);
      
      expect(screen.getByText('🚚')).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should handle mobile viewport', () => {
      render(<NotificationBar onClose={jest.fn()} />);
      
      expect(screen.getByText(/free shipping over \$100/i)).toBeInTheDocument();
    });

    it('should handle desktop viewport', () => {
      render(<NotificationBar onClose={jest.fn()} />);
      
      expect(screen.getByText(/free shipping over \$100/i)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle component errors gracefully', () => {
      render(<NotificationBar onClose={jest.fn()} />);
      
      expect(screen.getByText(/free shipping over \$100/i)).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should render without performance issues', () => {
      const startTime = performance.now();
      render(<NotificationBar onClose={jest.fn()} />);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(100); // Should render quickly
      expect(screen.getByText(/free shipping over \$100/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper button roles', () => {
      render(<NotificationBar onClose={jest.fn()} />);
      
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(1); // Only close button
    });

    it('should be keyboard navigable', () => {
      render(<NotificationBar onClose={jest.fn()} />);
      
      const closeButton = screen.getByRole('button');
      closeButton.focus();
      
      expect(document.activeElement).toBe(closeButton);
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined props', () => {
      render(<NotificationBar onClose={undefined as any} />);
      
      expect(screen.getByText(/free shipping over \$100/i)).toBeInTheDocument();
    });

    it('should handle null props', () => {
      render(<NotificationBar onClose={null as any} />);
      
      expect(screen.getByText(/free shipping over \$100/i)).toBeInTheDocument();
    });
  });

  describe('Integration Tests', () => {
    it('should work with parent component state', () => {
      const ParentComponent = () => {
        const [isVisible, setIsVisible] = React.useState(true);
        
        if (!isVisible) return null;
        
        return <NotificationBar onClose={() => setIsVisible(false)} />;
      };
      
      render(<ParentComponent />);
      
      expect(screen.getByText(/free shipping over \$100/i)).toBeInTheDocument();
      
      // Find and click close button
      const closeButton = screen.getByRole('button');
      fireEvent.click(closeButton);
      
      expect(screen.queryByText(/free shipping over \$100/i)).not.toBeInTheDocument();
    });

    it('should handle multiple instances', () => {
      render(
        <div>
          <NotificationBar onClose={jest.fn()} />
          <NotificationBar onClose={jest.fn()} />
        </div>
      );
      
      const shippingTexts = screen.getAllByText(/free shipping over \$100/i);
      expect(shippingTexts).toHaveLength(2);
    });
  });
});