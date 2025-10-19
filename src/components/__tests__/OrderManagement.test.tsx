import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { OrderManagement } from '@/components/OrderManagement';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

// Mock dependencies
jest.mock('@/hooks/useAuth');
jest.mock('@/hooks/use-toast');
jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: { access_token: 'mock-token' } },
        error: null,
      }),
    },
  },
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;

// Mock fetch
global.fetch = jest.fn();

describe('OrderManagement', () => {
  const mockToast = jest.fn();
  const mockUser = { id: 'user-123' };
  
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
    });
    
    mockUseToast.mockReturnValue({
      toast: mockToast,
    });
    
    (global.fetch as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should display paused status with correct styling', async () => {
    const mockOrders = [
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        order_number: 'ORD-123',
        status: 'paused',
        total_amount: 99.99,
        currency: 'USD',
        created_at: '2024-01-14T12:00:00Z',
        shipping_address: {
          line1: '123 Main St',
          city: 'New York',
          state: 'NY',
          postal_code: '10001',
          country: 'US',
        },
        order_items: [
          {
            id: 'item-123',
            product_name: 'Test Product',
            quantity: 1,
            unit_price: 99.99,
            frame_size: 'medium',
            frame_style: 'modern',
            frame_material: 'wood',
            products: {
              id: 'product-123',
              frame_size: 'medium',
              frame_style: 'modern',
              frame_material: 'wood',
              price: 99.99,
              images: {
                id: 'image-123',
                prompt: 'Test image prompt',
                image_url: 'https://example.com/image.jpg',
                thumbnail_url: 'https://example.com/thumbnail.jpg',
              },
            },
          },
        ],
        dropship_orders: [],
      },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ orders: mockOrders }),
    });

    render(<OrderManagement userId="user-123" />);

    await waitFor(() => {
      expect(screen.getByText((content, element) => {
        return element?.textContent === 'Order #ORD-123';
      })).toBeInTheDocument();
    });

    // Check that paused status is displayed
    const statusElement = screen.getByText('Paused');
    expect(statusElement).toBeInTheDocument();
    
    // Check that the status has the correct styling (orange color)
    expect(statusElement).toHaveClass('bg-orange-100', 'text-orange-800');
  });

  it('should handle different order statuses correctly', async () => {
    const statusTests = [
      { status: 'pending', expectedClass: 'bg-yellow-100 text-yellow-800' },
      { status: 'paid', expectedClass: 'bg-blue-100 text-blue-800' },
      { status: 'processing', expectedClass: 'bg-purple-100 text-purple-800' },
      { status: 'paused', expectedClass: 'bg-orange-100 text-orange-800' },
      { status: 'shipped', expectedClass: 'bg-indigo-100 text-indigo-800' },
      { status: 'delivered', expectedClass: 'bg-green-100 text-green-800' },
      { status: 'cancelled', expectedClass: 'bg-red-100 text-red-800' },
      { status: 'refunded', expectedClass: 'bg-gray-100 text-gray-800' },
    ];

    for (const test of statusTests) {
      const mockOrders = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          order_number: 'ORD-123',
          status: test.status,
          total_amount: 99.99,
          currency: 'USD',
          created_at: '2024-01-14T12:00:00Z',
          shipping_address: {
            line1: '123 Main St',
            city: 'New York',
            state: 'NY',
            postal_code: '10001',
            country: 'US',
          },
          order_items: [],
          dropship_orders: [],
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ orders: mockOrders }),
      });

      const { unmount } = render(<OrderManagement userId="user-123" />);

      await waitFor(() => {
        expect(screen.getByText(test.status.charAt(0).toUpperCase() + test.status.slice(1))).toBeInTheDocument();
      });

      const statusElement = screen.getByText(test.status.charAt(0).toUpperCase() + test.status.slice(1));
      expect(statusElement).toHaveClass(...test.expectedClass.split(' '));
      
      unmount();
    }
  });

  it('should handle empty orders list', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ orders: [] }),
    });

    render(<OrderManagement userId="user-123" />);

    await waitFor(() => {
      expect(screen.getByText('No Orders Found')).toBeInTheDocument();
    });
  });
});