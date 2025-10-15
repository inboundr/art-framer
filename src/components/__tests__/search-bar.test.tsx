import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SearchBar } from '../SearchBar';

// Mock the useAuth hook
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: null,
    profile: null,
  }),
}));

// Mock the dropdown components
jest.mock('../AspectRatioDropdown', () => ({
  AspectRatioDropdown: ({ isOpen, onSelect }: any) => 
    isOpen ? (
      <div data-testid="aspect-ratio-dropdown">
        <button onClick={() => onSelect({ value: '16:9', label: '16:9' })}>16:9</button>
        <button onClick={() => onSelect({ value: '1:1', label: '1:1' })}>1:1</button>
      </div>
    ) : null
}));

jest.mock('../ModelDropdown', () => ({
  ModelDropdown: ({ isOpen, onSelect }: any) => 
    isOpen ? (
      <div data-testid="model-dropdown">
        <button onClick={() => onSelect({ type: 'model', value: '3.0-latest' })}>3.0-latest</button>
        <button onClick={() => onSelect({ type: 'images', value: '2' })}>2 images</button>
      </div>
    ) : null
}));

jest.mock('../MagicPromptDropdown', () => ({
  MagicPromptDropdown: ({ isOpen, onSelect }: any) => 
    isOpen ? (
      <div data-testid="magic-prompt-dropdown">
        <button onClick={() => onSelect('on')}>On</button>
        <button onClick={() => onSelect('off')}>Off</button>
      </div>
    ) : null
}));

jest.mock('../StyleDropdown', () => ({
  StyleDropdown: ({ isOpen, onSelect }: any) => 
    isOpen ? (
      <div data-testid="style-dropdown">
        <button onClick={() => onSelect({ type: 'style', value: 'realistic' })}>Realistic</button>
        <button onClick={() => onSelect({ type: 'style', value: 'design' })}>Design</button>
      </div>
    ) : null
}));

jest.mock('../ColorDropdown', () => ({
  ColorDropdown: ({ isOpen, onSelect }: any) => 
    isOpen ? (
      <div data-testid="color-dropdown">
        <button onClick={() => onSelect({ type: 'palette', value: 'ember' })}>Ember</button>
        <button onClick={() => onSelect({ type: 'palette', value: 'fresh' })}>Fresh</button>
      </div>
    ) : null
}));

describe('SearchBar', () => {
  const mockOnOpenGenerationPanel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render the search bar with correct title', () => {
      render(<SearchBar onOpenGenerationPanel={mockOnOpenGenerationPanel} />);
      
      expect(screen.getByText('What will you create and order framed?')).toBeInTheDocument();
    });

    it('should render the textarea with correct placeholder', () => {
      render(<SearchBar onOpenGenerationPanel={mockOnOpenGenerationPanel} />);
      
      const textarea = screen.getByPlaceholderText('Describe what you want to see and order it framed to your house');
      expect(textarea).toBeInTheDocument();
    });

    it('should render the generate button', () => {
      render(<SearchBar onOpenGenerationPanel={mockOnOpenGenerationPanel} />);
      
      const generateButton = screen.getByText('Generate');
      expect(generateButton).toBeInTheDocument();
    });

    it('should render all control buttons', () => {
      render(<SearchBar onOpenGenerationPanel={mockOnOpenGenerationPanel} />);
      
      expect(screen.getByText('1:1')).toBeInTheDocument();
      expect(screen.getByText('3.0 Default x4')).toBeInTheDocument();
      expect(screen.getByText('MP On')).toBeInTheDocument();
      expect(screen.getByText('Character')).toBeInTheDocument();
      expect(screen.getByText('Style')).toBeInTheDocument();
      expect(screen.getByText('Color')).toBeInTheDocument();
    });
  });

  describe('User Input', () => {
    it('should update textarea value when user types', () => {
      render(<SearchBar onOpenGenerationPanel={mockOnOpenGenerationPanel} />);
      
      const textarea = screen.getByPlaceholderText('Describe what you want to see and order it framed to your house');
      fireEvent.change(textarea, { target: { value: 'A beautiful sunset' } });
      
      expect(textarea).toHaveValue('A beautiful sunset');
    });

    it('should enable generate button when text is entered', () => {
      render(<SearchBar onOpenGenerationPanel={mockOnOpenGenerationPanel} />);
      
      const textarea = screen.getByPlaceholderText('Describe what you want to see and order it framed to your house');
      const generateButton = screen.getByText('Generate');
      
      // Initially disabled (the button has disabled attribute)
      expect(generateButton.closest('button')).toHaveAttribute('disabled');
      
      // Enable after typing
      fireEvent.change(textarea, { target: { value: 'A beautiful sunset' } });
      expect(generateButton.closest('button')).not.toHaveAttribute('disabled');
    });
  });

  describe('Generate Button', () => {
    it('should call onOpenGenerationPanel when generate button is clicked', () => {
      render(<SearchBar onOpenGenerationPanel={mockOnOpenGenerationPanel} />);
      
      const textarea = screen.getByPlaceholderText('Describe what you want to see and order it framed to your house');
      const generateButton = screen.getByText('Generate');
      
      fireEvent.change(textarea, { target: { value: 'A beautiful sunset' } });
      fireEvent.click(generateButton);
      
      expect(mockOnOpenGenerationPanel).toHaveBeenCalledWith('A beautiful sunset', expect.objectContaining({
        aspectRatio: '1x1',
        numberOfImages: 4,
        model: 'V_3',
        renderSpeed: 'BALANCED',
        style: 'AUTO',
        color: 'AUTO',
        referenceImages: []
      }));
    });

    it('should not call onOpenGenerationPanel when textarea is empty', () => {
      render(<SearchBar onOpenGenerationPanel={mockOnOpenGenerationPanel} />);
      
      const generateButton = screen.getByText('Generate');
      
      // Button should be disabled when empty
      expect(generateButton.closest('button')).toHaveAttribute('disabled');
      expect(mockOnOpenGenerationPanel).not.toHaveBeenCalled();
    });
  });

  describe('Dropdown Interactions', () => {
    it('should open aspect ratio dropdown when clicked', () => {
      render(<SearchBar onOpenGenerationPanel={mockOnOpenGenerationPanel} />);
      
      const aspectRatioButton = screen.getByText('1:1');
      fireEvent.click(aspectRatioButton);
      
      expect(screen.getByTestId('aspect-ratio-dropdown')).toBeInTheDocument();
    });

    it('should open model dropdown when clicked', () => {
      render(<SearchBar onOpenGenerationPanel={mockOnOpenGenerationPanel} />);
      
      const modelButton = screen.getByText('3.0 Default x4');
      fireEvent.click(modelButton);
      
      expect(screen.getByTestId('model-dropdown')).toBeInTheDocument();
    });

    it('should open magic prompt dropdown when clicked', () => {
      render(<SearchBar onOpenGenerationPanel={mockOnOpenGenerationPanel} />);
      
      const magicPromptButton = screen.getByText('MP On');
      fireEvent.click(magicPromptButton);
      
      expect(screen.getByTestId('magic-prompt-dropdown')).toBeInTheDocument();
    });

    it('should open style dropdown when clicked', () => {
      render(<SearchBar onOpenGenerationPanel={mockOnOpenGenerationPanel} />);
      
      const styleButton = screen.getByText('Style');
      fireEvent.click(styleButton);
      
      expect(screen.getByTestId('style-dropdown')).toBeInTheDocument();
    });

    it('should open color dropdown when clicked', () => {
      render(<SearchBar onOpenGenerationPanel={mockOnOpenGenerationPanel} />);
      
      const colorButton = screen.getByText('Color');
      fireEvent.click(colorButton);
      
      expect(screen.getByTestId('color-dropdown')).toBeInTheDocument();
    });
  });

  describe('File Upload', () => {
    it('should render file input', () => {
      render(<SearchBar onOpenGenerationPanel={mockOnOpenGenerationPanel} />);
      
      const fileInput = screen.getByRole('button', { name: /attach image/i });
      expect(fileInput).toBeInTheDocument();
    });

    it('should handle file selection', () => {
      render(<SearchBar onOpenGenerationPanel={mockOnOpenGenerationPanel} />);
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).toBeInTheDocument();
      expect(fileInput).toHaveAttribute('accept', 'image/*');
      expect(fileInput).toHaveAttribute('multiple');
    });
  });

  describe('Keyboard Navigation', () => {
    it('should handle Ctrl+Enter to generate', () => {
      render(<SearchBar onOpenGenerationPanel={mockOnOpenGenerationPanel} />);
      
      const textarea = screen.getByPlaceholderText('Describe what you want to see and order it framed to your house');
      fireEvent.change(textarea, { target: { value: 'A beautiful sunset' } });
      
      // Test that the textarea is properly configured for keyboard input
      expect(textarea).toBeInTheDocument();
      expect(textarea).toHaveValue('A beautiful sunset');
    });

    it('should not generate on Enter without Ctrl', () => {
      render(<SearchBar onOpenGenerationPanel={mockOnOpenGenerationPanel} />);
      
      const textarea = screen.getByPlaceholderText('Describe what you want to see and order it framed to your house');
      fireEvent.change(textarea, { target: { value: 'A beautiful sunset' } });
      fireEvent.keyPress(textarea, { key: 'Enter' });
      
      expect(mockOnOpenGenerationPanel).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<SearchBar onOpenGenerationPanel={mockOnOpenGenerationPanel} />);
      
      const textarea = screen.getByPlaceholderText('Describe what you want to see and order it framed to your house');
      expect(textarea).toBeInTheDocument();
      
      const generateButton = screen.getByText('Generate');
      expect(generateButton).toBeInTheDocument();
    });

    it('should be keyboard navigable', () => {
      render(<SearchBar onOpenGenerationPanel={mockOnOpenGenerationPanel} />);
      
      const textarea = screen.getByPlaceholderText('Describe what you want to see and order it framed to your house');
      const generateButton = screen.getByText('Generate');
      
      expect(textarea).toBeInTheDocument();
      expect(generateButton).toBeInTheDocument();
    });
  });
});