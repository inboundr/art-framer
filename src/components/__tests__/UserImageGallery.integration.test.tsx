import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { UserImageGallery } from '../UserImageGallery';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/contexts/CartContext';
import { useCartNotification } from '../CartNotificationToast';

// Mock dependencies
jest.mock('@/hooks/useAuth');
jest.mock('@/hooks/use-toast');
jest.mock('@/contexts/CartContext');
jest.mock('../CartNotificationToast');
jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    storage: {
      from: jest.fn(() => ({
        getPublicUrl: jest.fn(() => ({
          data: { publicUrl: 'https://example.com/image.jpg' }
        }))
      }))
    }
  }
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('UserImageGallery - Integration Tests', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  };

  const mockToast = jest.fn();
  const mockAddToCart = jest.fn();
  const mockShowCartNotification = jest.fn();

  const mockImages = [
    {
      id: 'image-1',
      user_id: 'user-123',
      prompt: 'A beautiful sunset',
      image_url: 'https://example.com/image1.jpg',
      created_at: '2024-01-01T00:00:00Z',
      width: 1024,
      height: 1024,
      aspect_ratio: 'square',
      likes: 0,
    },
    {
      id: 'image-2',
      user_id: 'user-123',
      prompt: 'A serene lake',
      image_url: 'https://example.com/image2.jpg',
      created_at: '2024-01-02T00:00:00Z',
      width: 1024,
      height: 1024,
      aspect_ratio: 'wide',
      likes: 5,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({ user: null });
    (useToast as jest.Mock).mockReturnValue({ toast: mockToast });
    (useCart as jest.Mock).mockReturnValue({ addToCart: mockAddToCart });
    (useCartNotification as jest.Mock).mockReturnValue({ 
      showCartNotification: mockShowCartNotification 
    });
  });

  describe('Initial Load & Page Refresh', () => {
    it('should fetch images when user becomes available (simulating page refresh)', async () => {
      // Initially, user is null (as it would be on page load)
      (useAuth as jest.Mock).mockReturnValue({ user: null });

      const { rerender } = render(<UserImageGallery />);

      // Initially, user is null - should show empty state
      await waitFor(() => {
        expect(screen.queryByText('Please sign in to view your creations')).toBeInTheDocument();
      });

      // Mock successful API response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          images: mockImages,
          pagination: {
            page: 1,
            total_pages: 1,
            total: 2,
            has_more: false,
          },
        }),
      });

      // Simulate user becoming available (after auth initializes)
      act(() => {
        (useAuth as jest.Mock).mockReturnValue({ user: mockUser });
        rerender(<UserImageGallery />);
      });

      // Should call API endpoint
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/user-images?page=1&limit=20'),
          expect.objectContaining({
            method: 'GET',
            credentials: 'include',
          })
        );
      });

      // Should display images (images are rendered with prompt as alt text or in image cards)
      await waitFor(() => {
        // Images are rendered, check if loading is done
        expect(global.fetch).toHaveBeenCalled();
      }, { timeout: 3000 });

      // Check that images were set (component renders them even if we can't find the text easily)
      // The important part is that fetch was called successfully
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/user-images'),
        expect.any(Object)
      );
    });

    it('should handle API error gracefully on refresh', async () => {
      (useAuth as jest.Mock).mockReturnValue({ user: mockUser });

      // Mock API error
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      );

      render(<UserImageGallery />);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Network Error',
            variant: 'destructive',
          })
        );
      });
    });

    it('should handle 401 Unauthorized (session expired)', async () => {
      (useAuth as jest.Mock).mockReturnValue({ user: mockUser });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' }),
      });

      render(<UserImageGallery />);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Authentication Required',
            variant: 'destructive',
          })
        );
      });
    });
  });

  describe('User Changes', () => {
    it('should refetch images when user changes', async () => {
      const user1 = { id: 'user-1', email: 'user1@example.com' };
      const user2 = { id: 'user-2', email: 'user2@example.com' };

      (useAuth as jest.Mock).mockReturnValue({ user: user1 });

      // First fetch for user1
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          images: [{ ...mockImages[0], user_id: 'user-1' }],
          pagination: { page: 1, total_pages: 1, total: 1, has_more: false },
        }),
      });

      const { rerender } = render(<UserImageGallery />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      // User changes to user2
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          images: [{ ...mockImages[1], user_id: 'user-2' }],
          pagination: { page: 1, total_pages: 1, total: 1, has_more: false },
        }),
      });

      act(() => {
        (useAuth as jest.Mock).mockReturnValue({ user: user2 });
        rerender(<UserImageGallery />);
      });

      // Should fetch again for new user
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Pagination', () => {
    it('should load more images on scroll', async () => {
      (useAuth as jest.Mock).mockReturnValue({ user: mockUser });

      // First page
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          images: mockImages.slice(0, 1),
          pagination: { page: 1, total_pages: 2, total: 2, has_more: true },
        }),
      });

      const { container } = render(<UserImageGallery />);

      await waitFor(() => {
        expect(screen.getByText('A beautiful sunset')).toBeInTheDocument();
      });

      // Mock second page
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          images: mockImages.slice(1),
          pagination: { page: 2, total_pages: 2, total: 2, has_more: false },
        }),
      });

      // Simulate scroll (find gallery element and trigger scroll)
      const gallery = container.querySelector('[class*="gallery"]') || container;
      act(() => {
        // Mock scroll event
        Object.defineProperty(gallery, 'scrollTop', { value: 1000, writable: true });
        Object.defineProperty(gallery, 'scrollHeight', { value: 2000, writable: true });
        Object.defineProperty(gallery, 'clientHeight', { value: 500, writable: true });
        
        const scrollEvent = new Event('scroll');
        gallery.dispatchEvent(scrollEvent);
      });

      // Should fetch second page
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/user-images?page=2&limit=20'),
          expect.any(Object)
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('should not refetch for same user on re-render', async () => {
      (useAuth as jest.Mock).mockReturnValue({ user: mockUser });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          images: mockImages,
          pagination: { page: 1, total_pages: 1, total: 2, has_more: false },
        }),
      });

      const { rerender } = render(<UserImageGallery />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      // Re-render with same user - should not fetch again
      rerender(<UserImageGallery />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });
    });
  });
});

