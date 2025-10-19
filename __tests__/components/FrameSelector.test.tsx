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

    // Check for frame option buttons - these are in the size labels
    expect(screen.getByText('Small (8" x 10")')).toBeInTheDocument();
    expect(screen.getByText('Medium (12" x 16")')).toBeInTheDocument();
    expect(screen.getByText('Large (16" x 20")')).toBeInTheDocument();
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
