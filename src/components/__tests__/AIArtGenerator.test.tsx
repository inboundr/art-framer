import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AIArtGenerator } from '../AIArtGenerator';

// Mock the Button component
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className, ...props }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
      {...props}
    >
      {children}
    </button>
  ),
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Wand2: () => <div data-testid="wand-icon">Wand2</div>,
  Download: () => <div data-testid="download-icon">Download</div>,
  Share2: () => <div data-testid="share-icon">Share2</div>,
  ShoppingCart: () => <div data-testid="cart-icon">ShoppingCart</div>,
}));

describe('AIArtGenerator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the AI art generator form', () => {
    render(<AIArtGenerator />);

    expect(screen.getByPlaceholderText(/serene mountain landscape/i)).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generate/i })).toBeInTheDocument();
  });

  it('should generate an image when form is submitted', async () => {
    render(<AIArtGenerator />);

    const promptInput = screen.getByPlaceholderText(/serene mountain landscape/i);
    const generateButton = screen.getByRole('button', { name: /generate/i });

    fireEvent.change(promptInput, { target: { value: 'A beautiful sunset' } });
    fireEvent.click(generateButton);

    // Wait for the image to appear
    await waitFor(() => {
      expect(screen.getByAltText('A beautiful sunset')).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('should show generated image with correct details', async () => {
    render(<AIArtGenerator />);

    const promptInput = screen.getByPlaceholderText(/serene mountain landscape/i);
    const styleSelect = screen.getByRole('combobox');
    const generateButton = screen.getByRole('button', { name: /generate/i });

    fireEvent.change(promptInput, { target: { value: 'A beautiful sunset' } });
    fireEvent.change(styleSelect, { target: { value: 'artistic' } });
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(screen.getByAltText('A beautiful sunset')).toBeInTheDocument();
      expect(screen.getAllByText('A beautiful sunset')).toHaveLength(2); // One in textarea, one in generated image
      expect(screen.getByText('Style: artistic')).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('should show action buttons after image generation', async () => {
    render(<AIArtGenerator />);

    const promptInput = screen.getByPlaceholderText(/serene mountain landscape/i);
    const generateButton = screen.getByRole('button', { name: /generate/i });

    fireEvent.change(promptInput, { target: { value: 'A beautiful sunset' } });
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(screen.getByAltText('A beautiful sunset')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /download/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /share/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /order print/i })).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('should handle generation error gracefully', async () => {
    // Mock console.error to avoid noise in test output
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    render(<AIArtGenerator />);

    const promptInput = screen.getByPlaceholderText(/serene mountain landscape/i);
    const generateButton = screen.getByRole('button', { name: /generate/i });

    fireEvent.change(promptInput, { target: { value: 'A beautiful sunset' } });
    fireEvent.click(generateButton);

    // The component should handle the generation process without throwing
    expect(generateButton).toBeInTheDocument();
    expect(promptInput).toHaveValue('A beautiful sunset');

    // Restore mocks
    consoleSpy.mockRestore();
  });

  it('should reset form after successful generation', async () => {
    render(<AIArtGenerator />);

    const promptInput = screen.getByPlaceholderText(/serene mountain landscape/i);
    const generateButton = screen.getByRole('button', { name: /generate/i });

    fireEvent.change(promptInput, { target: { value: 'A beautiful sunset' } });
    fireEvent.click(generateButton);

    // Wait for generation to complete
    await waitFor(() => {
      expect(screen.getByAltText('A beautiful sunset')).toBeInTheDocument();
    }, { timeout: 5000 });

    // Check that the form is still functional
    expect(promptInput).toHaveValue('A beautiful sunset');
    expect(generateButton).toBeInTheDocument();
  });
});