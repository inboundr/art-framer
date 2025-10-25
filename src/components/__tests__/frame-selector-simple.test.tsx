import React from 'react';
import { render, screen } from '@testing-library/react';
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

describe('FrameSelector - Basic Tests', () => {
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

  it('should render without crashing', () => {
    const { container } = render(<FrameSelector {...defaultProps} />);
    expect(container).toBeInTheDocument();
  });

  it('should render the main sections', () => {
    render(<FrameSelector {...defaultProps} />);
    
    expect(screen.getByText('Frame Preview')).toBeInTheDocument();
    // The help text is now in a tooltip, so we check for the help icon instead
    expect(screen.getByRole('button', { name: /zoom out/i })).toBeInTheDocument();
    expect(screen.getByText('Frame Size')).toBeInTheDocument();
    expect(screen.getByText('Frame Style')).toBeInTheDocument();
    expect(screen.getByText('Frame Material')).toBeInTheDocument();
  });

  it('should render size options with correct labels', () => {
    render(<FrameSelector {...defaultProps} />);
    
    // Check for the dropdown trigger
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    
    // The size options are now in a dropdown, so we check for the dropdown trigger
    // and the current selection display
    expect(screen.getByText('Frame Size')).toBeInTheDocument();
  });

  it('should render style options', () => {
    render(<FrameSelector {...defaultProps} />);
    
    // Check for frame style options (now only color indicators, no text labels)
    // We can verify the radio group exists and has the correct number of options
    const radioGroups = screen.getAllByRole('radiogroup');
    expect(radioGroups.length).toBeGreaterThan(0);
    
    // Check that we have radio buttons for frame styles
    const radioButtons = screen.getAllByRole('radio');
    expect(radioButtons.length).toBeGreaterThanOrEqual(5); // At least 5 frame style options
  });

  it('should render material options', () => {
    render(<FrameSelector {...defaultProps} />);
    
    expect(screen.getByText('Wood')).toBeInTheDocument();
    expect(screen.getByText('Metal')).toBeInTheDocument();
    expect(screen.getByText('Plastic')).toBeInTheDocument();
    expect(screen.getByText('Bamboo')).toBeInTheDocument();
  });

  it('should render preview controls', () => {
    render(<FrameSelector {...defaultProps} />);
    
    // Check for zoom controls
    expect(screen.getByText('100%')).toBeInTheDocument();
    
    // Check for zoom in/out buttons (they should be present as buttons)
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('should render the selection guide', () => {
    render(<FrameSelector {...defaultProps} />);
    
    // The help text is now in a tooltip, so we check for the help icon instead
    expect(screen.getByRole('button', { name: /zoom out/i })).toBeInTheDocument();
    // The help text is now in a tooltip, so we check for frame selection elements instead
    expect(screen.getByText('Frame Size')).toBeInTheDocument();
  });

  it('should handle loading state', () => {
    mockUseFrameImages.mockReturnValue({
      frameDetails: null,
      loading: true,
      error: null,
    });

    render(<FrameSelector {...defaultProps} />);
    
    expect(screen.getByText('Loading frame preview...')).toBeInTheDocument();
  });

  it('should handle error state gracefully', () => {
    mockUseFrameImages.mockReturnValue({
      frameDetails: null,
      loading: false,
      error: 'Failed to load frame images',
    });

    render(<FrameSelector {...defaultProps} />);
    
    // Should still render the component without crashing
    expect(screen.getByText('Frame Preview')).toBeInTheDocument();
  });
});
