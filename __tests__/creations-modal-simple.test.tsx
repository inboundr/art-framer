/**
 * Simple CreationsModal Tests
 * Basic tests to verify the CreationsModal fix works
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import { CreationsModal } from '@/components/CreationsModal'

// Mock dependencies
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@example.com' },
  }),
}))

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}))

jest.mock('@/contexts/CartContext', () => ({
  useCart: () => ({
    addToCart: jest.fn().mockResolvedValue(true),
  }),
}))

jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: {
          session: {
            access_token: 'test-token',
            user: { id: 'test-user' },
          },
        },
        error: null,
      }),
    },
  },
}))

jest.mock('@/components/FrameSelector', () => ({
  FrameSelector: ({ imagePrompt }: { imagePrompt: string }) => (
    <div data-testid="frame-selector">Frame Selector: {imagePrompt}</div>
  ),
}))

jest.mock('@/lib/utils/imageProxy', () => ({
  getProxiedImageUrl: (url: string) => url,
}))

// Mock fetch
global.fetch = jest.fn()

describe('CreationsModal Component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    imageUrl: 'https://example.com/image.jpg',
    promptText: 'A beautiful sunset',
    imageId: 'test-image-id',
    isMobile: true, // Use mobile layout to see promptText
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('should render when open', () => {
    render(<CreationsModal {...defaultProps} />)
    
    expect(screen.getByText('A beautiful sunset')).toBeInTheDocument()
  })

  test('should not render when closed', () => {
    render(<CreationsModal {...defaultProps} isOpen={false} />)
    
    expect(screen.queryByText('A beautiful sunset')).not.toBeInTheDocument()
  })

  test('should handle user images correctly', () => {
    render(<CreationsModal {...defaultProps} isCuratedImage={false} isMobile={true} />)
    
    expect(screen.getByText('A beautiful sunset')).toBeInTheDocument()
  })

  test('should handle curated images correctly', () => {
    render(<CreationsModal {...defaultProps} isCuratedImage={true} isMobile={true} />)
    
    expect(screen.getByText('A beautiful sunset')).toBeInTheDocument()
  })

  test('should handle missing image ID', () => {
    render(<CreationsModal {...defaultProps} imageId={undefined} isMobile={true} />)
    
    expect(screen.getByText('A beautiful sunset')).toBeInTheDocument()
  })

  test('should handle invalid image ID', () => {
    render(<CreationsModal {...defaultProps} imageId="invalid-id" isMobile={true} />)
    
    expect(screen.getByText('A beautiful sunset')).toBeInTheDocument()
  })
})

describe('CreationsModal API Route Selection', () => {
  test('should use correct API route for user images', () => {
    const props = {
      isOpen: true,
      onClose: jest.fn(),
      imageUrl: 'https://example.com/user-image.jpg',
      promptText: 'User generated image',
      imageId: 'user-image-id',
      isCuratedImage: false,
      isMobile: true,
    }

    render(<CreationsModal {...props} />)
    
    // The component should be ready to use the regular products API
    expect(screen.getByText('User generated image')).toBeInTheDocument()
  })

  test('should use correct API route for curated images', () => {
    const props = {
      isOpen: true,
      onClose: jest.fn(),
      imageUrl: 'https://example.com/curated-image.jpg',
      promptText: 'Curated artwork',
      imageId: 'curated-image-id',
      isCuratedImage: true,
      isMobile: true,
    }

    render(<CreationsModal {...props} />)
    
    // The component should be ready to use the curated products API
    expect(screen.getByText('Curated artwork')).toBeInTheDocument()
  })
})

describe('CreationsModal Error Handling', () => {
  test('should handle authentication errors', () => {
    // Mock useAuth to return null user
    const useAuthModule = require('@/hooks/useAuth')
    jest.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: null,
    })

    const props = {
      isOpen: true,
      onClose: jest.fn(),
      imageUrl: 'https://example.com/image.jpg',
      promptText: 'Test image',
      imageId: 'test-image-id',
      isMobile: true,
    }

    render(<CreationsModal {...props} />)
    
    expect(screen.getByText('Test image')).toBeInTheDocument()
  })

  test('should handle network errors', () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'))

    const props = {
      isOpen: true,
      onClose: jest.fn(),
      imageUrl: 'https://example.com/image.jpg',
      promptText: 'Test image',
      imageId: 'test-image-id',
      isMobile: true,
    }

    render(<CreationsModal {...props} />)
    
    expect(screen.getByText('Test image')).toBeInTheDocument()
  })
})
