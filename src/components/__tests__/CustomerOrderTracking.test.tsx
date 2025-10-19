import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { CustomerOrderTracking } from '@/components/CustomerOrderTracking';
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

describe('CustomerOrderTracking', () => {
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

  it('should display paused status correctly', async () => {
    const mockOrderData = {
      order: {
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
      },
      prodigiStatus: {
        status: 'paused',
        lastUpdated: '2024-01-14T12:30:00Z',
        editWindow: {
          duration: '2 hours',
          expiresAt: '2024-01-14T16:00:00Z',
          canEdit: true,
          canCancel: true,
          expired: false,
        },
        modifications: [],
      },
      statusHistory: [],
      orderLogs: [],
      dropshipOrders: [],
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockOrderData,
    });

    render(<CustomerOrderTracking orderId="123e4567-e89b-12d3-a456-426614174000" />);

    await waitFor(() => {
      expect(screen.getAllByText('Order Paused')[0]).toBeInTheDocument();
    });

    // Check that the paused status is displayed with correct styling
    const statusElements = screen.getAllByText('Order Paused');
    expect(statusElements.length).toBeGreaterThan(0);
    
    // Check that the description is shown
    expect(screen.getByText('Your order is paused for editing. You can modify or cancel it before production begins.')).toBeInTheDocument();
    
    // Check that Prodigi status is displayed
    expect(screen.getByText('Production Status')).toBeInTheDocument();
    expect(screen.getByText('paused')).toBeInTheDocument();
  });

  it('should handle different order statuses correctly', async () => {
    const statusTests = [
      {
        status: 'processing',
        expectedLabel: 'Processing',
        expectedDescription: 'Your order is being prepared for shipping.',
      },
      {
        status: 'shipped',
        expectedLabel: 'Shipped',
        expectedDescription: 'Your order is on its way to you.',
      },
      {
        status: 'delivered',
        expectedLabel: 'Delivered',
        expectedDescription: 'Your order has been delivered successfully.',
      },
      {
        status: 'cancelled',
        expectedLabel: 'Cancelled',
        expectedDescription: 'Your order has been cancelled.',
      },
    ];

    for (const test of statusTests) {
      const mockOrderData = {
        order: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          order_number: 'ORD-123',
          status: test.status,
          total_amount: 99.99,
          currency: 'USD',
          created_at: '2024-01-14T12:00:00Z',
        },
        prodigiStatus: {
          status: test.status,
          lastUpdated: '2024-01-14T12:30:00Z',
        },
        statusHistory: [],
        orderLogs: [],
        dropshipOrders: [],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockOrderData,
      });

      const { unmount } = render(<CustomerOrderTracking orderId="123e4567-e89b-12d3-a456-426614174000" />);

      await waitFor(() => {
        expect(screen.getAllByText(test.expectedLabel)[0]).toBeInTheDocument();
      });

      expect(screen.getByText(test.expectedDescription)).toBeInTheDocument();
      
      unmount();
    }
  });

  it('should handle Prodigi API errors gracefully', async () => {
    const mockOrderData = {
      order: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        order_number: 'ORD-123',
        status: 'processing',
        total_amount: 99.99,
        currency: 'USD',
        created_at: '2024-01-14T12:00:00Z',
      },
      prodigiStatus: {
        error: 'Failed to fetch latest status from Prodigi',
        lastAttempt: '2024-01-14T12:30:00Z',
      },
      statusHistory: [],
      orderLogs: [],
      dropshipOrders: [],
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockOrderData,
    });

    render(<CustomerOrderTracking orderId="123e4567-e89b-12d3-a456-426614174000" />);

    await waitFor(() => {
      expect(screen.getByText('Production Status')).toBeInTheDocument();
    });

    // Should still display the order even if Prodigi status fails
    expect(screen.getByText('ORD-123')).toBeInTheDocument();
  });
});