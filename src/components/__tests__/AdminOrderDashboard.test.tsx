import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { AdminOrderDashboard } from '@/components/AdminOrderDashboard';
import { useToast } from '@/hooks/use-toast';

// Mock dependencies
jest.mock('@/hooks/use-toast');
jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
  },
}));

const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;

// Mock fetch
global.fetch = jest.fn();

describe('AdminOrderDashboard', () => {
  const mockToast = jest.fn();
  
  beforeEach(() => {
    mockUseToast.mockReturnValue({
      toast: mockToast,
    });
    
    (global.fetch as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should display paused status with correct styling', async () => {
    const mockOrdersData = {
        orders: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            order_number: 'ORD-123',
            customer_name: 'John Doe',
            status: 'paused',
            total_amount: 99.99,
            currency: 'USD',
            created_at: '2024-01-14T12:00:00Z',
            dropship_provider: 'prodigi',
          },
        ],
      pagination: {
        total: 1,
        hasMore: false,
      },
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockOrdersData,
    });

    render(<AdminOrderDashboard />);

    await waitFor(() => {
      expect(screen.getByText('ORD-123')).toBeInTheDocument();
    });

    // Check that paused status is displayed
    const statusElement = screen.getByText('paused');
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
      { status: 'shipped', expectedClass: 'bg-green-100 text-green-800' },
      { status: 'delivered', expectedClass: 'bg-green-100 text-green-800' },
      { status: 'cancelled', expectedClass: 'bg-red-100 text-red-800' },
    ];

    for (const test of statusTests) {
      const mockOrdersData = {
        orders: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            order_number: 'ORD-123',
            customer_name: 'John Doe',
            status: test.status,
            total_amount: 99.99,
            currency: 'USD',
            created_at: '2024-01-14T12:00:00Z',
            dropship_provider: 'prodigi',
          },
        ],
        pagination: {
          total: 1,
          hasMore: false,
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockOrdersData,
      });

      const { unmount } = render(<AdminOrderDashboard />);

      await waitFor(() => {
        expect(screen.getByText(test.status)).toBeInTheDocument();
      });

      const statusElement = screen.getByText(test.status);
      expect(statusElement).toHaveClass(...test.expectedClass.split(' '));
      
      unmount();
    }
  });
});