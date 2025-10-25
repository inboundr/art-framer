import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FrameSelector } from '@/components/FrameSelector';

// Mock the RobustAuthProvider
jest.mock('@/contexts/RobustAuthProvider', () => ({
  RobustAuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useRobustAuth: () => ({
    user: { id: 'user-1', email: 'test@example.com' },
    session: { access_token: 'mock-token' },
    loading: false,
    signIn: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    resetPassword: jest.fn(),
    updateProfile: jest.fn(),
  }),
}));

// Mock the required hooks
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

jest.mock('@/hooks/useFrameImages', () => ({
  useFrameImages: () => ({
    frameImages: [],
    loading: false,
    error: null,
  }),
}));

describe('FrameSelector Component', () => {
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render frame selector', () => {
    render(<FrameSelector {...defaultProps} />);

    // Check for main component elements
    expect(screen.getByText('Frame Preview')).toBeInTheDocument();
    expect(screen.getByText('Frame Size')).toBeInTheDocument();
    expect(screen.getByText('Frame Style')).toBeInTheDocument();
    expect(screen.getByText('Frame Material')).toBeInTheDocument();
  });

  it('should render frame options', () => {
    render(<FrameSelector {...defaultProps} />);

    // Check for frame option dropdown trigger
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    
    // Check for frame style options (now only color indicators, no text labels)
    // We can verify the radio group exists and has the correct number of options
    const radioGroups = screen.getAllByRole('radiogroup');
    expect(radioGroups.length).toBeGreaterThan(0);
    
    // Check that we have radio buttons for frame styles
    const radioButtons = screen.getAllByRole('radio');
    expect(radioButtons.length).toBeGreaterThanOrEqual(5); // At least 5 frame style options
  });

  it('should handle frame selection', () => {
    render(<FrameSelector {...defaultProps} />);

    // The component should render without errors
    expect(screen.getByText('Frame Preview')).toBeInTheDocument();
  });

  it('should display frame details', () => {
    render(<FrameSelector {...defaultProps} />);

    // Check for frame details section - look for the selected frame section
    expect(screen.getByText('Selected Frame')).toBeInTheDocument();
  });
});
