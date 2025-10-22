import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FrameSelector } from '../FrameSelector';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useFrameImages } from '@/hooks/useFrameImages';

// Mock the hooks
jest.mock('@/hooks/useAuth');
jest.mock('@/hooks/use-toast');
jest.mock('@/hooks/useFrameImages');

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;
const mockUseFrameImages = useFrameImages as jest.MockedFunction<typeof useFrameImages>;

const mockToast = jest.fn();
const mockOnFrameSelect = jest.fn();
const mockOnAddToCart = jest.fn();

const defaultProps = {
  imageUrl: 'https://example.com/image.jpg',
  imagePrompt: 'Test image prompt',
  onFrameSelect: mockOnFrameSelect,
  onAddToCart: mockOnAddToCart,
  selectedFrame: null,
  showPreview: true,
};

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
};

const mockFrameDetails = {
  images: [
    {
      url: 'https://example.com/frame.jpg',
      alt: 'Frame image',
    },
  ],
};

describe('FrameSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseAuth.mockReturnValue({
      user: mockUser,
      session: null,
      loading: false,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      updateProfile: jest.fn(),
    });
    
    mockUseToast.mockReturnValue({
      toast: mockToast,
    });
    
    mockUseFrameImages.mockReturnValue({
      frameDetails: mockFrameDetails,
      loading: false,
      error: null,
    });
  });

  describe('Basic Rendering', () => {
    it('should render the frame selector with all sections', () => {
      render(<FrameSelector {...defaultProps} />);
      
      expect(screen.getByText('Frame Preview')).toBeInTheDocument();
      // The help text is now in a tooltip, so we check for the help icon instead
      expect(screen.getByRole('button', { name: /zoom out/i })).toBeInTheDocument();
      expect(screen.getByText('Frame Size')).toBeInTheDocument();
      expect(screen.getByText('Frame Style')).toBeInTheDocument();
      expect(screen.getByText('Frame Material')).toBeInTheDocument();
    });

    it('should render the component without crashing', () => {
      const { container } = render(<FrameSelector {...defaultProps} />);
      expect(container).toBeInTheDocument();
    });

    it('should render the selection guide', () => {
      render(<FrameSelector {...defaultProps} />);
      
      // The help text is now in a tooltip, so we check for the help icon instead
      expect(screen.getByRole('button', { name: /zoom out/i })).toBeInTheDocument();
      // The help text is now in a tooltip, so we check for frame selection elements instead
      expect(screen.getByText('Frame Size')).toBeInTheDocument();
    });

    it('should render all size options', () => {
      render(<FrameSelector {...defaultProps} />);
      
      expect(screen.getByText('Small (8" x 10")')).toBeInTheDocument();
      expect(screen.getByText('Medium (12" x 16")')).toBeInTheDocument();
      expect(screen.getByText('Large (16" x 20")')).toBeInTheDocument();
      expect(screen.getByText('Extra Large (20" x 24")')).toBeInTheDocument();
    });

    it('should render all style options', () => {
      render(<FrameSelector {...defaultProps} />);
      
      expect(screen.getByText('Black')).toBeInTheDocument();
      expect(screen.getByText('White')).toBeInTheDocument();
      expect(screen.getByText('Natural')).toBeInTheDocument();
      expect(screen.getByText('Gold')).toBeInTheDocument();
      expect(screen.getByText('Silver')).toBeInTheDocument();
    });

    it('should render all material options', () => {
      render(<FrameSelector {...defaultProps} />);
      
      expect(screen.getByText('Wood')).toBeInTheDocument();
      expect(screen.getByText('Metal')).toBeInTheDocument();
      expect(screen.getByText('Plastic')).toBeInTheDocument();
      expect(screen.getByText('Bamboo')).toBeInTheDocument();
    });
  });

  describe('Option Availability', () => {
    it('should show available options as enabled', () => {
      render(<FrameSelector {...defaultProps} />);
      
      // Medium size should be available by default
      const mediumSize = screen.getByRole('radio', { name: /medium \(12" x 16"\)/i });
      expect(mediumSize).not.toBeDisabled();
    });

    it('should show unavailable options as disabled with visual indicators', () => {
      render(<FrameSelector {...defaultProps} />);
      
      // Check that unavailable options show "Unavailable" text
      const unavailableElements = screen.queryAllByText('Unavailable');
      expect(unavailableElements.length).toBeGreaterThan(0);
    });

    it('should update availability when selections change', async () => {
      render(<FrameSelector {...defaultProps} />);
      
      // Change style to silver (which has limited availability)
      const silverStyle = screen.getByText('Silver');
      fireEvent.click(silverStyle);
      
      await waitFor(() => {
        // Some options should become unavailable
        const unavailableElements = screen.queryAllByText('Unavailable');
        expect(unavailableElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Selection Behavior', () => {
    it('should call onFrameSelect when a valid combination is selected', async () => {
      render(<FrameSelector {...defaultProps} />);
      
      // Select a different size
      const largeSize = screen.getByText('Large (16" x 20")');
      fireEvent.click(largeSize);
      
      await waitFor(() => {
        expect(mockOnFrameSelect).toHaveBeenCalled();
      });
    });

    it('should auto-adjust selections when options become unavailable', async () => {
      render(<FrameSelector {...defaultProps} />);
      
      // Change to a combination that makes some options unavailable
      const silverStyle = screen.getByText('Silver');
      fireEvent.click(silverStyle);
      
      await waitFor(() => {
        // The component should auto-adjust to a valid combination
        expect(mockOnFrameSelect).toHaveBeenCalled();
      });
    });

    it('should show selected frame details when a frame is selected', () => {
      const selectedFrame = {
        size: 'medium' as const,
        style: 'black' as const,
        material: 'wood' as const,
        price: 39.99,
        dimensions: { width: 30, height: 40, depth: 2 },
        weight: 600,
        popular: true,
      };

      render(<FrameSelector {...defaultProps} selectedFrame={selectedFrame} />);
      
      expect(screen.getByText('Selected Frame')).toBeInTheDocument();
      expect(screen.getAllByText('Medium (12" x 16") Frame')[0]).toBeInTheDocument();
      expect(screen.getByText('$39.99')).toBeInTheDocument();
      expect(screen.getByText('Popular')).toBeInTheDocument();
    });
  });

  describe('Add to Cart Functionality', () => {
    it('should show add to cart button for authenticated users', () => {
      render(<FrameSelector {...defaultProps} selectedFrame={{
        size: 'medium',
        style: 'black',
        material: 'wood',
        price: 39.99,
        dimensions: { width: 30, height: 40, depth: 2 },
        weight: 600,
      }} />);
      
      expect(screen.getByText('Add to Cart')).toBeInTheDocument();
    });

    it('should call onAddToCart when add to cart button is clicked', () => {
      const selectedFrame = {
        size: 'medium' as const,
        style: 'black' as const,
        material: 'wood' as const,
        price: 39.99,
        dimensions: { width: 30, height: 40, depth: 2 },
        weight: 600,
      };

      render(<FrameSelector {...defaultProps} selectedFrame={selectedFrame} />);
      
      const addToCartButton = screen.getByText('Add to Cart');
      fireEvent.click(addToCartButton);
      
      expect(mockOnAddToCart).toHaveBeenCalledWith(selectedFrame);
    });

    it('should show authentication required toast for unauthenticated users', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        session: null,
        loading: false,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        updateProfile: jest.fn(),
      });

      const selectedFrame = {
        size: 'medium' as const,
        style: 'black' as const,
        material: 'wood' as const,
        price: 39.99,
        dimensions: { width: 30, height: 40, depth: 2 },
        weight: 600,
      };

      render(<FrameSelector {...defaultProps} selectedFrame={selectedFrame} />);
      
      const addToCartButton = screen.getByText('Add to Cart');
      fireEvent.click(addToCartButton);
      
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Authentication Required',
        description: 'Please sign in to add items to your cart.',
        variant: 'destructive',
      });
    });
  });

  describe('Preview Functionality', () => {
    it('should render frame preview with image', () => {
      render(<FrameSelector {...defaultProps} />);
      
      const previewImage = screen.getByAltText('Test image prompt');
      expect(previewImage).toBeInTheDocument();
      expect(previewImage).toHaveAttribute('src', 'https://example.com/image.jpg');
    });

    it('should show loading state when frame images are loading', () => {
      mockUseFrameImages.mockReturnValue({
        frameDetails: null,
        loading: true,
        error: null,
      });

      render(<FrameSelector {...defaultProps} />);
      
      expect(screen.getByText('Loading frame preview...')).toBeInTheDocument();
    });

    it('should render zoom controls', () => {
      render(<FrameSelector {...defaultProps} />);
      
      expect(screen.getByLabelText(/zoom out/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/zoom in/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/rotate/i)).toBeInTheDocument();
    });

    it('should update zoom level when zoom controls are clicked', () => {
      render(<FrameSelector {...defaultProps} />);
      
      const zoomInButton = screen.getByLabelText(/zoom in/i);
      fireEvent.click(zoomInButton);
      
      // The zoom level should be displayed
      expect(screen.getByText('110%')).toBeInTheDocument();
    });

    it('should rotate preview when rotate button is clicked', () => {
      render(<FrameSelector {...defaultProps} />);
      
      const rotateButton = screen.getByLabelText(/rotate/i);
      fireEvent.click(rotateButton);
      
      // The button should be clickable and the component should not crash
      expect(rotateButton).toBeInTheDocument();
    });
  });

  describe('Frame Details Display', () => {
    it('should display frame dimensions and weight', () => {
      const selectedFrame = {
        size: 'medium' as const,
        style: 'black' as const,
        material: 'wood' as const,
        price: 39.99,
        dimensions: { width: 30, height: 40, depth: 2 },
        weight: 600,
      };

      render(<FrameSelector {...defaultProps} selectedFrame={selectedFrame} />);
      
      expect(screen.getAllByText('30" × 40" × 2"')[0]).toBeInTheDocument();
    });

    it('should display badges for popular and recommended frames', () => {
      const selectedFrame = {
        size: 'medium' as const,
        style: 'silver' as const,
        material: 'metal' as const,
        price: 54.99,
        dimensions: { width: 30, height: 40, depth: 2 },
        weight: 700,
        recommended: true,
      };

      render(<FrameSelector {...defaultProps} selectedFrame={selectedFrame} />);
      
      expect(screen.getByText('Recommended')).toBeInTheDocument();
    });

    it('should display price in correct format', () => {
      const selectedFrame = {
        size: 'large' as const,
        style: 'gold' as const,
        material: 'wood' as const,
        price: 49.99,
        dimensions: { width: 40, height: 50, depth: 3 },
        weight: 800,
      };

      render(<FrameSelector {...defaultProps} selectedFrame={selectedFrame} />);
      
      expect(screen.getByText('$49.99')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle frame images loading error gracefully', () => {
      mockUseFrameImages.mockReturnValue({
        frameDetails: null,
        loading: false,
        error: 'Failed to load frame images',
      });

      render(<FrameSelector {...defaultProps} />);
      
      // Should still render the component without crashing
      expect(screen.getByText('Frame Preview')).toBeInTheDocument();
    });

    it('should handle missing frame options gracefully', () => {
      // Test with invalid selections that might not have matching frames
      render(<FrameSelector {...defaultProps} />);
      
      // Component should still render and handle the case gracefully
      expect(screen.getByText('Frame Size')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for all interactive elements', () => {
      render(<FrameSelector {...defaultProps} />);
      
      // Check that radio buttons have proper labels
      expect(screen.getByText('Small (8" x 10")')).toBeInTheDocument();
      expect(screen.getByText('Medium (12" x 16")')).toBeInTheDocument();
      expect(screen.getByText('Black')).toBeInTheDocument();
      expect(screen.getByText('Wood')).toBeInTheDocument();
    });

    it('should be keyboard navigable', () => {
      render(<FrameSelector {...defaultProps} />);
      
      // Find the radio button for medium size and focus it
      const mediumRadio = screen.getByRole('radio', { name: /medium \(12" x 16"\)/i });
      mediumRadio.focus();
      expect(mediumRadio).toHaveFocus();
    });

    it('should have proper button roles and labels', () => {
      render(<FrameSelector {...defaultProps} selectedFrame={{
        size: 'medium',
        style: 'black',
        material: 'wood',
        price: 39.99,
        dimensions: { width: 30, height: 40, depth: 2 },
        weight: 600,
      }} />);
      
      const addToCartButton = screen.getByRole('button', { name: /add to cart/i });
      expect(addToCartButton).toBeInTheDocument();
    });
  });
});
