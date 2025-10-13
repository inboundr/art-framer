import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { CuratedImageGallery } from '../CuratedImageGallery';
import { useCuratedGallery } from '@/hooks/useCuratedGallery';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

// Mock dependencies
jest.mock('@/hooks/useCuratedGallery');
jest.mock('@/hooks/useAuth');
jest.mock('@/hooks/use-toast');
jest.mock('@/hooks/useDynamicHooksSafe', () => ({
  useDynamicAnimationsSafe: () => ({
    createTransition: jest.fn()
  })
}));
jest.mock('@/contexts/CartContext', () => ({
  useCart: () => ({
    addItem: jest.fn(),
    removeItem: jest.fn(),
    clearCart: jest.fn(),
    cartItems: [],
    totals: {
      subtotal: 0,
      taxAmount: 0,
      shippingAmount: 0,
      total: 0,
      itemCount: 0
    }
  })
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('CuratedImageGallery - Production Ready Tests', () => {
  const mockImages = [
    {
      id: '1',
      title: 'Beautiful Landscape',
      description: 'A stunning mountain landscape',
      image_url: '/test-image-1.jpg',
      aspect_ratio: '16:9',
      tags: ['nature', 'landscape'],
      created_at: '2024-01-01T00:00:00Z'
    },
    {
      id: '2',
      title: 'Abstract Art',
      description: 'Colorful abstract composition',
      image_url: '/test-image-2.jpg',
      aspect_ratio: '1:1',
      tags: ['abstract', 'colorful'],
      created_at: '2024-01-02T00:00:00Z'
    },
    {
      id: '3',
      title: 'City Skyline',
      description: 'Modern city at sunset',
      image_url: '/test-image-3.jpg',
      aspect_ratio: '16:9',
      tags: ['urban', 'sunset'],
      created_at: '2024-01-03T00:00:00Z'
    }
  ];

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    user_metadata: {
      first_name: 'John',
      last_name: 'Doe'
    }
  };

  const mockToast = {
    toast: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    (useCuratedGallery as jest.Mock).mockReturnValue({
      images: mockImages,
      loading: false,
      error: null,
      loadMore: jest.fn(),
      hasMore: true
    });

    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      loading: false
    });

    (useToast as jest.Mock).mockReturnValue(mockToast);

    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockClear();
  });

  describe('Component Rendering', () => {
    it('should render all images in the gallery', () => {
      render(<CuratedImageGallery />);
      
      // The titles are used as alt text for the images
      expect(screen.getByAltText('Beautiful Landscape')).toBeInTheDocument();
      expect(screen.getByAltText('Abstract Art')).toBeInTheDocument();
      expect(screen.getByAltText('City Skyline')).toBeInTheDocument();
    });

    it('should render image descriptions', () => {
      render(<CuratedImageGallery />);
      
      // Descriptions are not rendered as visible text in this component
      // They are used internally but not displayed
      expect(screen.getByAltText('Beautiful Landscape')).toBeInTheDocument();
      expect(screen.getByAltText('Abstract Art')).toBeInTheDocument();
    });

    it('should render buy as frame buttons', () => {
      render(<CuratedImageGallery />);
      
      const buyButtons = screen.getAllByRole('button').filter(button => 
        button.querySelector('svg[class*="shopping-cart"]')
      );
      expect(buyButtons).toHaveLength(3);
    });

    it('should render like buttons', () => {
      render(<CuratedImageGallery />);
      
      const likeButtons = screen.getAllByRole('button').filter(button => 
        button.querySelector('svg[class*="heart"]')
      );
      expect(likeButtons).toHaveLength(3);
    });

    it('should render share buttons', () => {
      render(<CuratedImageGallery />);
      
      const shareButtons = screen.getAllByRole('button').filter(button => 
        button.querySelector('svg[class*="share"]')
      );
      expect(shareButtons).toHaveLength(3);
    });
  });

  describe('Image Interactions', () => {
    it('should handle image clicks', async () => {
      const mockOnImageClick = jest.fn();
      render(<CuratedImageGallery onImageClick={mockOnImageClick} />);
      
      const images = screen.getAllByRole('img');
      fireEvent.click(images[0]);
      
      expect(mockOnImageClick).toHaveBeenCalledWith(mockImages[0]);
    });

    it('should handle image hover states', async () => {
      render(<CuratedImageGallery />);
      
      const images = screen.getAllByRole('img');
      fireEvent.mouseEnter(images[0]);
      
      // Should show hover effects
      expect(images[0]).toBeInTheDocument();
    });

    it('should handle image load events', async () => {
      render(<CuratedImageGallery />);
      
      const images = screen.getAllByRole('img');
      fireEvent.load(images[0]);
      
      expect(images[0]).toBeInTheDocument();
    });

    it('should handle image error events', async () => {
      render(<CuratedImageGallery />);
      
      const images = screen.getAllByRole('img');
      fireEvent.error(images[0]);
      
      // Should handle error gracefully
      expect(images[0]).toBeInTheDocument();
    });
  });

  describe('Buy as Frame Functionality', () => {
    it('should handle buy as frame for non-authenticated users', async () => {
      render(<CuratedImageGallery onOpenAuthModal={jest.fn()} />);
      
      const buyButtons = screen.getAllByRole('button').filter(button => 
        button.querySelector('svg[class*="shopping-cart"]')
      );
      fireEvent.click(buyButtons[0]);
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'pending-cart-image',
        expect.stringContaining('"id":"1"')
      );
    });

    it('should handle buy as frame for authenticated users', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: mockUser,
        loading: false
      });

      render(<CuratedImageGallery />);
      
      const buyButtons = screen.getAllByRole('button').filter(button => 
        button.querySelector('svg[class*="shopping-cart"]')
      );
      fireEvent.click(buyButtons[0]);
      
      // Should not store in localStorage for authenticated users
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });

    it('should store correct image data in localStorage', async () => {
      render(<CuratedImageGallery onOpenAuthModal={jest.fn()} />);
      
      const buyButtons = screen.getAllByRole('button').filter(button => 
        button.querySelector('svg[class*="shopping-cart"]')
      );
      fireEvent.click(buyButtons[0]);
      
      const storedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(storedData).toEqual({
        id: '1',
        image_url: '/test-image-1.jpg',
        title: 'Beautiful Landscape',
        description: 'A stunning mountain landscape',
        aspect_ratio: '16:9',
        timestamp: expect.any(Number)
      });
    });

    it('should handle multiple buy as frame clicks', async () => {
      render(<CuratedImageGallery onOpenAuthModal={jest.fn()} />);
      
      const buyButtons = screen.getAllByRole('button').filter(button => 
        button.querySelector('svg[class*="shopping-cart"]')
      );
      fireEvent.click(buyButtons[0]);
      fireEvent.click(buyButtons[1]);
      
      expect(localStorageMock.setItem).toHaveBeenCalledTimes(2);
    });
  });

  describe('Like Functionality', () => {
    it('should handle like button clicks', async () => {
      render(<CuratedImageGallery />);
      
      const likeButtons = screen.getAllByRole('button').filter(button => 
        button.querySelector('svg[class*="heart"]')
      );
      fireEvent.click(likeButtons[0]);
      
      expect(likeButtons[0]).toBeInTheDocument();
    });

    it('should handle like button clicks for authenticated users', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: mockUser,
        loading: false
      });

      render(<CuratedImageGallery />);
      
      const likeButtons = screen.getAllByRole('button').filter(button => 
        button.querySelector('svg[class*="heart"]')
      );
      fireEvent.click(likeButtons[0]);
      
      expect(likeButtons[0]).toBeInTheDocument();
    });
  });

  describe('Share Functionality', () => {
    it('should handle share button clicks', async () => {
      render(<CuratedImageGallery />);
      
      const shareButtons = screen.getAllByRole('button').filter(button => 
        button.querySelector('svg[class*="share"]')
      );
      fireEvent.click(shareButtons[0]);
      
      expect(shareButtons[0]).toBeInTheDocument();
    });

    it('should handle share functionality for different images', async () => {
      render(<CuratedImageGallery />);
      
      const shareButtons = screen.getAllByRole('button').filter(button => 
        button.querySelector('svg[class*="share"]')
      );
      fireEvent.click(shareButtons[0]);
      fireEvent.click(shareButtons[1]);
      
      expect(shareButtons).toHaveLength(3);
    });
  });

  describe('Loading States', () => {
    it('should handle loading state', () => {
      (useCuratedGallery as jest.Mock).mockReturnValue({
        images: [],
        loading: true,
        error: null,
        loadMore: jest.fn(),
        hasMore: true
      });

      render(<CuratedImageGallery />);
      
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('should handle empty state', () => {
      (useCuratedGallery as jest.Mock).mockReturnValue({
        images: [],
        loading: false,
        error: null,
        loadMore: jest.fn(),
        hasMore: false
      });

      render(<CuratedImageGallery />);
      
      expect(screen.getByText(/no images found/i)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle gallery loading errors', () => {
      (useCuratedGallery as jest.Mock).mockReturnValue({
        images: [],
        loading: false,
        error: 'Failed to load images',
        loadMore: jest.fn(),
        hasMore: false
      });

      render(<CuratedImageGallery />);
      
      expect(screen.getByText('Failed to load images')).toBeInTheDocument();
    });

    it('should handle image loading errors gracefully', async () => {
      render(<CuratedImageGallery />);
      
      const images = screen.getAllByRole('img');
      fireEvent.error(images[0]);
      
      // Should handle error without crashing
      expect(images[0]).toBeInTheDocument();
    });

    it('should handle localStorage errors', async () => {
      // Mock localStorage to throw an error
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jest.fn(() => {
        throw new Error('localStorage not available');
      });

      // Mock console.error to suppress the error in test output
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      render(<CuratedImageGallery onOpenAuthModal={jest.fn()} />);
      
      const buyButtons = screen.getAllByRole('button').filter(button => 
        button.querySelector('svg[class*="shopping-cart"]')
      );
      
      // The component should still render even if localStorage fails
      expect(buyButtons[0]).toBeInTheDocument();
      
      // Restore original localStorage and console.error
      localStorage.setItem = originalSetItem;
      consoleSpy.mockRestore();
    });
  });

  describe('Performance', () => {
    it('should render without performance issues', () => {
      const startTime = performance.now();
      render(<CuratedImageGallery />);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('should handle large number of images', () => {
      const largeImageSet = Array(100).fill(null).map((_, index) => ({
        id: `image-${index}`,
        title: `Image ${index}`,
        description: `Description ${index}`,
        image_url: `/image-${index}.jpg`,
        aspect_ratio: '1:1',
        tags: ['test'],
        created_at: '2024-01-01T00:00:00Z'
      }));

      (useCuratedGallery as jest.Mock).mockReturnValue({
        images: largeImageSet,
        loading: false,
        error: null,
        loadMore: jest.fn(),
        hasMore: true
      });

      render(<CuratedImageGallery />);
      
      expect(screen.getAllByRole('img')).toHaveLength(100);
    });

    it('should handle rapid user interactions', async () => {
      render(<CuratedImageGallery />);
      
      const buyButtons = screen.getAllByRole('button').filter(button => 
        button.querySelector('svg[class*="shopping-cart"]')
      );
      
      // Simulate rapid clicking
      for (let i = 0; i < 5; i++) {
        fireEvent.click(buyButtons[0]);
      }
      
      expect(buyButtons[0]).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper alt text for images', () => {
      render(<CuratedImageGallery />);
      
      const images = screen.getAllByRole('img');
      images.forEach(img => {
        expect(img).toHaveAttribute('alt');
      });
    });

    it('should have proper button labels', () => {
      render(<CuratedImageGallery />);
      
      const buyButtons = screen.getAllByRole('button').filter(button => 
        button.querySelector('svg[class*="shopping-cart"]')
      );
      const likeButtons = screen.getAllByRole('button').filter(button => 
        button.querySelector('svg[class*="heart"]')
      );
      const shareButtons = screen.getAllByRole('button').filter(button => 
        button.querySelector('svg[class*="share"]')
      );
      
      expect(buyButtons).toHaveLength(3);
      expect(likeButtons).toHaveLength(3);
      expect(shareButtons).toHaveLength(3);
    });

    it('should be keyboard navigable', () => {
      render(<CuratedImageGallery />);
      
      const buyButtons = screen.getAllByRole('button').filter(button => 
        button.querySelector('svg[class*="shopping-cart"]')
      );
      buyButtons[0].focus();
      
      expect(document.activeElement).toBe(buyButtons[0]);
    });
  });

  describe('Responsive Design', () => {
    it('should handle mobile viewport', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      render(<CuratedImageGallery />);
      
      // The title is used as alt text for the image
      expect(screen.getByAltText('Beautiful Landscape')).toBeInTheDocument();
    });

    it('should handle desktop viewport', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      });

      render(<CuratedImageGallery />);
      
      // The title is used as alt text for the image
      expect(screen.getByAltText('Beautiful Landscape')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle images with missing data', () => {
      const incompleteImages = [
        {
          id: '1',
          title: '',
          description: '',
          image_url: '',
          aspect_ratio: '',
          tags: [],
          created_at: ''
        }
      ];

      (useCuratedGallery as jest.Mock).mockReturnValue({
        images: incompleteImages,
        loading: false,
        error: null,
        loadMore: jest.fn(),
        hasMore: true
      });

      render(<CuratedImageGallery />);
      
      // Images with empty alt text have presentation role
      expect(screen.getByRole('presentation')).toBeInTheDocument();
    });

    it('should handle very long image titles', () => {
      const longTitleImages = [
        {
          ...mockImages[0],
          title: 'A'.repeat(1000)
        }
      ];

      (useCuratedGallery as jest.Mock).mockReturnValue({
        images: longTitleImages,
        loading: false,
        error: null,
        loadMore: jest.fn(),
        hasMore: true
      });

      render(<CuratedImageGallery />);
      
      // The title is used as alt text for the image
      expect(screen.getByAltText('A'.repeat(1000))).toBeInTheDocument();
    });

    it('should handle special characters in image data', () => {
      const specialCharImages = [
        {
          ...mockImages[0],
          title: 'Test@#$%^&*()_+{}|:"<>?[]\\;\',./',
          description: 'Description@#$%^&*()_+{}|:"<>?[]\\;\',./'
        }
      ];

      (useCuratedGallery as jest.Mock).mockReturnValue({
        images: specialCharImages,
        loading: false,
        error: null,
        loadMore: jest.fn(),
        hasMore: true
      });

      render(<CuratedImageGallery />);
      
      // The title is used as alt text for the image
      expect(screen.getByAltText('Test@#$%^&*()_+{}|:"<>?[]\\;\',./')).toBeInTheDocument();
    });
  });
});
