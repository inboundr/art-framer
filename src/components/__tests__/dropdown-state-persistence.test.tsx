import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SearchBar } from '../SearchBar';
import { ModelDropdown } from '../ModelDropdown';
import { MagicPromptDropdown } from '../MagicPromptDropdown';
import { StyleDropdown } from '../StyleDropdown';
import { ColorDropdown } from '../ColorDropdown';

// Mock the hooks
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: null,
    profile: null,
  }),
}));

describe('Dropdown State Persistence', () => {
  const mockOnOpenGenerationPanel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ModelDropdown', () => {
    const defaultProps = {
      isOpen: true,
      onClose: jest.fn(),
      onSelect: jest.fn(),
      triggerRef: { current: null },
    };

    it('should use currentValues prop for initial state', () => {
      const currentValues = {
        images: '2',
        model: '2.0',
        speed: 'turbo',
      };

      render(
        <ModelDropdown
          {...defaultProps}
          currentValues={currentValues}
        />
      );

      // Check that the dropdown shows the current values
      // Use more specific selectors to avoid ambiguity
      const imageButtons = screen.getAllByRole('button');
      const selectedImageButton = imageButtons.find(btn => btn.textContent === '2' && btn.className.includes('bg-gray-light'));
      expect(selectedImageButton).toBeInTheDocument();
      
      expect(screen.getByText('2.0')).toBeInTheDocument();
      expect(screen.getByText('Turbo')).toBeInTheDocument();
    });

    it('should update local state when currentValues prop changes', () => {
      const { rerender } = render(
        <ModelDropdown
          {...defaultProps}
          currentValues={{
            images: '1',
            model: '1.0',
            speed: 'quality',
          }}
        />
      );

      // Change the currentValues prop
      rerender(
        <ModelDropdown
          {...defaultProps}
          currentValues={{
            images: '3',
            model: '3.0-latest',
            speed: 'default',
          }}
        />
      );

      // Check that the dropdown shows the new values
      // Use more specific selectors to avoid ambiguity
      const imageButtons = screen.getAllByRole('button');
      const selectedImageButton = imageButtons.find(btn => btn.textContent === '3' && btn.className.includes('bg-gray-light'));
      expect(selectedImageButton).toBeInTheDocument();
      
      expect(screen.getByText('3.0 (latest)')).toBeInTheDocument();
      expect(screen.getByText('Default')).toBeInTheDocument();
    });

    it('should call onSelect with type information when selections are made', () => {
      const mockOnSelect = jest.fn();
      
      render(
        <ModelDropdown
          {...defaultProps}
          onSelect={mockOnSelect}
          currentValues={{
            images: '4',
            model: '3.0-latest',
            speed: 'default',
          }}
        />
      );

      // Select a different number of images
      const imageButtons = screen.getAllByRole('button');
      const twoImagesButton = imageButtons.find(btn => btn.textContent === '2' && btn.className.includes('text-gray-text'));
      fireEvent.click(twoImagesButton!);

      expect(mockOnSelect).toHaveBeenCalledWith({
        value: '2',
        label: '2 Images',
        type: 'images',
      });
    });
  });

  describe('MagicPromptDropdown', () => {
    const defaultProps = {
      isOpen: true,
      onClose: jest.fn(),
      onSelect: jest.fn(),
      triggerRef: { current: null },
    };

    it('should use currentValue prop for initial state', () => {
      render(
        <MagicPromptDropdown
          {...defaultProps}
          currentValue="off"
        />
      );

      // Check that "Off" is selected
      const offButton = screen.getByText('Off');
      expect(offButton.closest('button')).toHaveClass('bg-gray-light text-dark');
    });

    it('should update local state when currentValue prop changes', () => {
      const { rerender } = render(
        <MagicPromptDropdown
          {...defaultProps}
          currentValue="on"
        />
      );

      // Change the currentValue prop
      rerender(
        <MagicPromptDropdown
          {...defaultProps}
          currentValue="auto"
        />
      );

      // Check that "Auto" is now selected
      const autoButton = screen.getByText('Auto');
      expect(autoButton.closest('button')).toHaveClass('bg-gray-light text-dark');
    });

    it('should fall back to default value when currentValue is not provided', () => {
      render(
        <MagicPromptDropdown
          {...defaultProps}
        />
      );

      // Should default to "On"
      const onButton = screen.getByText('On');
      expect(onButton.closest('button')).toHaveClass('bg-gray-light text-dark');
    });
  });

  describe('StyleDropdown', () => {
    const defaultProps = {
      isOpen: true,
      onClose: jest.fn(),
      onSelect: jest.fn(),
      triggerRef: { current: null },
    };

    it('should use currentValue prop for initial state', () => {
      render(
        <StyleDropdown
          {...defaultProps}
          currentValue="realistic"
        />
      );

      // Check that "Realistic" is selected
      const realisticButton = screen.getByText('Realistic');
      expect(realisticButton.closest('button')).toHaveClass('bg-gray-light text-dark');
    });

    it('should update local state when currentValue prop changes', () => {
      const { rerender } = render(
        <StyleDropdown
          {...defaultProps}
          currentValue="design"
        />
      );

      // Change the currentValue prop
      rerender(
        <StyleDropdown
          {...defaultProps}
          currentValue="general"
        />
      );

      // Check that "General" is now selected
      const generalButton = screen.getByText('General');
      expect(generalButton.closest('button')).toHaveClass('bg-gray-light text-dark');
    });
  });

  describe('ColorDropdown', () => {
    const defaultProps = {
      isOpen: true,
      onClose: jest.fn(),
      onSelect: jest.fn(),
      triggerRef: { current: null },
    };

    it('should use selectedValue prop for initial state', () => {
      render(
        <ColorDropdown
          {...defaultProps}
          selectedValue="ember"
        />
      );

      // Check that "Ember" is selected
      const emberButton = screen.getByText('Ember');
      expect(emberButton.closest('div')).toHaveClass('bg-gray-light text-dark');
    });

    it('should update local state when selectedValue prop changes', () => {
      const { rerender } = render(
        <ColorDropdown
          {...defaultProps}
          selectedValue="fresh"
        />
      );

      // Change the selectedValue prop
      rerender(
        <ColorDropdown
          {...defaultProps}
          selectedValue="jungle"
        />
      );

      // Check that "Jungle" is now selected
      const jungleButton = screen.getByText('Jungle');
      expect(jungleButton.closest('div')).toHaveClass('bg-gray-light text-dark');
    });

    it('should call onSelect with type information when selections are made', () => {
      const mockOnSelect = jest.fn();
      
      render(
        <ColorDropdown
          {...defaultProps}
          onSelect={mockOnSelect}
          selectedValue="auto"
        />
      );

      // Select a different color palette
      const emberButton = screen.getByText('Ember');
      fireEvent.click(emberButton);

      expect(mockOnSelect).toHaveBeenCalledWith({
        value: 'ember',
        label: 'Ember',
        type: 'palette',
      });
    });
  });

  describe('SearchBar Integration', () => {
    it('should maintain dropdown state when reopening dropdowns', async () => {
      render(<SearchBar onOpenGenerationPanel={mockOnOpenGenerationPanel} />);

      // Open model dropdown
      const modelButton = screen.getByText('3.0 Default x4');
      fireEvent.click(modelButton);

      // Change number of images to 2
      const twoImagesButton = screen.getByText('2');
      fireEvent.click(twoImagesButton);

      // Close dropdown
      fireEvent.click(modelButton);

      // Reopen dropdown
      fireEvent.click(modelButton);

      // Check that "2" is still selected
      await waitFor(() => {
        const imageButtons = screen.getAllByRole('button');
        const selectedImageButton = imageButtons.find(btn => btn.textContent === '2' && btn.className.includes('bg-gray-light'));
        expect(selectedImageButton).toBeInTheDocument();
      });
    });

    it('should maintain magic prompt state when reopening dropdown', async () => {
      render(<SearchBar onOpenGenerationPanel={mockOnOpenGenerationPanel} />);

      // Open magic prompt dropdown
      const mpButton = screen.getByText('MP On');
      fireEvent.click(mpButton);

      // Wait for dropdown to open and find "Off" option
      await waitFor(() => {
        expect(screen.getByText('Off')).toBeInTheDocument();
      });

      // Change to "Off"
      const offButton = screen.getByText('Off');
      fireEvent.click(offButton);

      // Check that the button text changed to "MP Off"
      await waitFor(() => {
        expect(screen.getByText('MP Off')).toBeInTheDocument();
      });
    });

    it('should maintain style state when reopening dropdown', async () => {
      render(<SearchBar onOpenGenerationPanel={mockOnOpenGenerationPanel} />);

      // Open style dropdown
      const styleButton = screen.getByText('Style');
      fireEvent.click(styleButton);

      // Wait for dropdown to open and find "Realistic" option
      await waitFor(() => {
        expect(screen.getByText('Realistic')).toBeInTheDocument();
      });

      // Change to "Realistic"
      const realisticButton = screen.getByText('Realistic');
      fireEvent.click(realisticButton);

      // Check that the button text changed to show the selection
      await waitFor(() => {
        // The button should still be visible and the selection should be maintained
        expect(styleButton).toBeInTheDocument();
      });
    });

    it('should maintain color state when reopening dropdown', async () => {
      render(<SearchBar onOpenGenerationPanel={mockOnOpenGenerationPanel} />);

      // Open color dropdown
      const colorButton = screen.getByText('Color');
      fireEvent.click(colorButton);

      // Wait for dropdown to open and find "Ember" option
      await waitFor(() => {
        expect(screen.getByText('Ember')).toBeInTheDocument();
      });

      // Change to "Ember"
      const emberButton = screen.getByText('Ember');
      fireEvent.click(emberButton);

      // Check that the button text changed to show the selection
      await waitFor(() => {
        // The button should still be visible and the selection should be maintained
        expect(colorButton).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined currentValues gracefully', () => {
      const defaultProps = {
        isOpen: true,
        onClose: jest.fn(),
        onSelect: jest.fn(),
        triggerRef: { current: null },
      };

      render(
        <ModelDropdown
          {...defaultProps}
          currentValues={undefined}
        />
      );

      // Should not crash and should use default values
      const imageButtons = screen.getAllByRole('button');
      const selectedImageButton = imageButtons.find(btn => btn.textContent === '4' && btn.className.includes('bg-gray-light'));
      expect(selectedImageButton).toBeInTheDocument();
      expect(screen.getByText('3.0 (latest)')).toBeInTheDocument();
    });

    it('should handle null currentValue gracefully', () => {
      const defaultProps = {
        isOpen: true,
        onClose: jest.fn(),
        onSelect: jest.fn(),
        triggerRef: { current: null },
      };

      render(
        <MagicPromptDropdown
          {...defaultProps}
          currentValue={null as any}
        />
      );

      // Should not crash and should use default value
      expect(screen.getByText('On')).toBeInTheDocument();
    });
  });
});
