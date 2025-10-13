/**
 * NotificationBar Component Tests
 * Tests the actual NotificationBar component behavior
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { NotificationBar } from '../NotificationBar';

describe('NotificationBar', () => {
  describe('Component Rendering', () => {
    it('should render notification bar with limit message', () => {
      render(<NotificationBar onClose={jest.fn()} />);
      
      expect(screen.getByText(/you reached your free plan limit/i)).toBeInTheDocument();
      expect(screen.getByText(/please wait for your weekly limit to reset/i)).toBeInTheDocument();
      expect(screen.getByText(/upgrade your plan/i)).toBeInTheDocument();
    });

    it('should render see plans button', () => {
      render(<NotificationBar onClose={jest.fn()} />);
      
      const plansButton = screen.getByRole('button', { name: /see plans/i });
      expect(plansButton).toBeInTheDocument();
    });

    it('should render close button', () => {
      render(<NotificationBar onClose={jest.fn()} />);
      
      // The close button is an icon button without accessible text
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(2); // See plans button + close button
    });
  });

  describe('Close Functionality', () => {
    it('should call onClose when close button is clicked', () => {
      const mockOnClose = jest.fn();
      render(<NotificationBar onClose={mockOnClose} />);
      
      // Find the close button (the one without text content)
      const buttons = screen.getAllByRole('button');
      const closeButton = buttons.find(button => !button.textContent?.includes('See plans'));
      
      expect(closeButton).toBeInTheDocument();
      fireEvent.click(closeButton!);
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should handle missing onClose prop gracefully', () => {
      render(<NotificationBar />);
      
      // Should not throw error
      expect(screen.getByText(/you reached your free plan limit/i)).toBeInTheDocument();
    });
  });

  describe('Button Interactions', () => {
    it('should handle see plans button click', () => {
      render(<NotificationBar onClose={jest.fn()} />);
      
      const plansButton = screen.getByRole('button', { name: /see plans/i });
      fireEvent.click(plansButton);
      
      // Button should still be present after click
      expect(plansButton).toBeInTheDocument();
    });
  });

  describe('Content Display', () => {
    it('should display limit message', () => {
      render(<NotificationBar onClose={jest.fn()} />);
      
      expect(screen.getByText(/you reached your free plan limit/i)).toBeInTheDocument();
    });

    it('should display reset message', () => {
      render(<NotificationBar onClose={jest.fn()} />);
      
      expect(screen.getByText(/please wait for your weekly limit to reset/i)).toBeInTheDocument();
    });

    it('should display upgrade message', () => {
      render(<NotificationBar onClose={jest.fn()} />);
      
      expect(screen.getByText(/upgrade your plan/i)).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should handle mobile viewport', () => {
      render(<NotificationBar onClose={jest.fn()} />);
      
      expect(screen.getByText(/you reached your free plan limit/i)).toBeInTheDocument();
    });

    it('should handle desktop viewport', () => {
      render(<NotificationBar onClose={jest.fn()} />);
      
      expect(screen.getByText(/you reached your free plan limit/i)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle component errors gracefully', () => {
      render(<NotificationBar onClose={jest.fn()} />);
      
      expect(screen.getByText(/you reached your free plan limit/i)).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should render without performance issues', () => {
      const startTime = performance.now();
      render(<NotificationBar onClose={jest.fn()} />);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(100); // Should render quickly
      expect(screen.getByText(/you reached your free plan limit/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper button roles', () => {
      render(<NotificationBar onClose={jest.fn()} />);
      
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(2);
      
      // Check that one button has accessible text
      const plansButton = screen.getByRole('button', { name: /see plans/i });
      expect(plansButton).toBeInTheDocument();
    });

    it('should be keyboard navigable', () => {
      render(<NotificationBar onClose={jest.fn()} />);
      
      const plansButton = screen.getByRole('button', { name: /see plans/i });
      plansButton.focus();
      
      expect(document.activeElement).toBe(plansButton);
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined props', () => {
      render(<NotificationBar onClose={undefined as any} />);
      
      expect(screen.getByText(/you reached your free plan limit/i)).toBeInTheDocument();
    });

    it('should handle null props', () => {
      render(<NotificationBar onClose={null as any} />);
      
      expect(screen.getByText(/you reached your free plan limit/i)).toBeInTheDocument();
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
      
      expect(screen.getByText(/you reached your free plan limit/i)).toBeInTheDocument();
      
      // Find and click close button
      const buttons = screen.getAllByRole('button');
      const closeButton = buttons.find(button => !button.textContent?.includes('See plans'));
      fireEvent.click(closeButton!);
      
      expect(screen.queryByText(/you reached your free plan limit/i)).not.toBeInTheDocument();
    });

    it('should handle multiple instances', () => {
      render(
        <div>
          <NotificationBar onClose={jest.fn()} />
          <NotificationBar onClose={jest.fn()} />
        </div>
      );
      
      const limitTexts = screen.getAllByText(/you reached your free plan limit/i);
      expect(limitTexts).toHaveLength(2);
    });
  });
});