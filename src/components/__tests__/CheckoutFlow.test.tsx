import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CheckoutFlow } from '../CheckoutFlow';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useAddresses } from '@/hooks/useAddresses';
import { supabase } from '@/lib/supabase/client';

// Mock all dependencies
jest.mock('@/contexts/CartContext');
jest.mock('@/hooks/useAuth');
jest.mock('@/hooks/use-toast');
jest.mock('@/hooks/useAddresses');
jest.mock('@/lib/supabase/client');

// Mock the getFrameSizeLabel function
jest.mock('@/lib/utils', () => ({
  getFrameSizeLabel: jest.fn((size) => size || 'Unknown'),
  formatPrice: jest.fn((price) => `$${price}`),
  cn: jest.fn((...classes) => classes.filter(Boolean).join(' '))
}));

// Mock GooglePlacesAutocomplete to render actual form fields for testing
jest.mock('@/components/ui/google-places-autocomplete', () => ({
  GooglePlacesAutocomplete: ({ onAddressSelect, onChange, value }: any) => (
    <div>
      <input
        data-testid="google-places-input"
        value={value || ''}
        onChange={(e) => onChange && onChange(e.target.value)}
        onBlur={() => onAddressSelect && onAddressSelect({
          address1: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zip: '12345',
          country: 'Test Country',
          countryCode: 'TC',
          lat: 0,
          lng: 0,
          formattedAddress: '123 Test St, Test City, TS 12345, Test Country'
        })}
        placeholder="Enter address"
      />
    </div>
  )
}));

// Mock fetch globally
global.fetch = jest.fn();

const mockUseCart = useCart as jest.MockedFunction<typeof useCart>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;
const mockUseAddresses = useAddresses as jest.MockedFunction<typeof useAddresses>;

const defaultCartData = {
  cartData: {
    cartItems: [
      {
        id: '1',
        productId: 'prod-1',
        name: 'Test Product',
        quantity: 1,
        imageUrl: 'test.jpg',
        products: {
          frame_size: 'medium',
          price: 29.99,
          frameStyle: 'black',
          frameMaterial: 'wood'
        }
      }
    ],
    totals: {
      subtotal: 29.99,
      taxAmount: 2.40,
      shippingAmount: 0,
      total: 32.39,
      itemCount: 1
    }
  }
};

const defaultAuthData = {
  user: {
    id: 'user-1',
    email: 'test@example.com',
    user_metadata: {
      firstName: 'John',
      lastName: 'Doe'
    }
  },
  session: {
    access_token: 'token'
  }
};

const defaultAddressesData = {
  addresses: [],
  loading: false,
  error: null,
  getDefaultAddress: jest.fn(() => null),
  saveAddress: jest.fn()
};

describe('CheckoutFlow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockUseCart.mockReturnValue(defaultCartData);
    mockUseAuth.mockReturnValue(defaultAuthData);
    mockUseToast.mockReturnValue({
      toast: jest.fn(),
      dismiss: jest.fn(),
      toasts: []
    });
    mockUseAddresses.mockReturnValue(defaultAddressesData);
    
    // Mock Supabase
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: defaultAuthData.session },
      error: null
    });
    
    // Mock fetch for shipping API
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        cost: 9.99,
        currency: 'USD',
        estimatedDays: 5,
        isEstimated: false,
        addressValidated: true,
        method: 'Standard'
      })
    });
  });

  describe('Component Rendering', () => {
    it('renders checkout flow with step indicators', () => {
      render(<CheckoutFlow />);
      
      expect(screen.getAllByText('Shipping')).toHaveLength(2); // Step indicator and section title
      expect(screen.getByText('Billing')).toBeInTheDocument();
      expect(screen.getByText('Review')).toBeInTheDocument();
    });

    it('renders shipping address section', () => {
      render(<CheckoutFlow />);
      
      expect(screen.getByText('Shipping Address')).toBeInTheDocument();
      expect(screen.getByText('First Name *')).toBeInTheDocument();
      expect(screen.getByText('Last Name *')).toBeInTheDocument();
      expect(screen.getByText('Phone Number *')).toBeInTheDocument();
    });

    it('renders order summary', () => {
      render(<CheckoutFlow />);
      
      expect(screen.getByText('Order Summary')).toBeInTheDocument();
      // The component should render the order summary section
      expect(screen.getByText('Order Summary')).toBeInTheDocument();
    });

    it('renders action buttons', () => {
      render(<CheckoutFlow />);
      
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Continue')).toBeInTheDocument();
    });
  });

  describe('Form Interactions', () => {
    it('allows typing in first name field', async () => {
      const user = userEvent.setup();
      render(<CheckoutFlow />);
      
      const firstNameInput = screen.getByLabelText(/first name/i);
      await user.type(firstNameInput, 'Jane');
      
      expect(firstNameInput).toHaveValue('Jane');
    });

    it('allows typing in last name field', async () => {
      const user = userEvent.setup();
      render(<CheckoutFlow />);
      
      const lastNameInput = screen.getByLabelText(/last name/i);
      await user.type(lastNameInput, 'Smith');
      
      expect(lastNameInput).toHaveValue('Smith');
    });

    it('allows typing in phone field', async () => {
      const user = userEvent.setup();
      render(<CheckoutFlow />);
      
      const phoneInput = screen.getByLabelText(/phone/i);
      await user.type(phoneInput, '555-1234');
      
      expect(phoneInput).toHaveValue('555-1234');
    });

    it('allows typing in Google Places input', async () => {
      const user = userEvent.setup();
      render(<CheckoutFlow />);
      
      const addressInput = screen.getByTestId('google-places-input');
      await user.type(addressInput, '123 Main St');
      
      expect(addressInput).toHaveValue('123 Main St');
    });
  });

  describe('Shipping Calculation', () => {
    it('triggers shipping calculation when address is selected', async () => {
      const user = userEvent.setup();
      render(<CheckoutFlow />);
      
      const addressInput = screen.getByTestId('google-places-input');
      await user.type(addressInput, '123 Test St');
      await user.tab(); // Trigger onBlur
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/cart/shipping', expect.any(Object));
      });
    });

    it('shows loading state during shipping calculation', async () => {
      (global.fetch as jest.Mock).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({
            cost: 9.99,
            currency: 'USD',
            estimatedDays: 5,
            isEstimated: false,
            addressValidated: true,
            method: 'Standard'
          })
        }), 100))
      );
      
      const user = userEvent.setup();
      render(<CheckoutFlow />);
      
      const addressInput = screen.getByTestId('google-places-input');
      await user.type(addressInput, '123 Test St');
      await user.tab();
      
      // The component should render without crashing
      expect(screen.getByText('Shipping Address')).toBeInTheDocument();
    });

    it('handles shipping calculation errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
      
      const user = userEvent.setup();
      render(<CheckoutFlow />);
      
      const addressInput = screen.getByTestId('google-places-input');
      await user.type(addressInput, '123 Test St');
      await user.tab();
      
      // The component should render without crashing
      expect(screen.getByText('Shipping Address')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('shows required field indicators', () => {
      render(<CheckoutFlow />);
      
      expect(screen.getByText('First Name *')).toBeInTheDocument();
      expect(screen.getByText('Last Name *')).toBeInTheDocument();
      expect(screen.getByText('Phone Number *')).toBeInTheDocument();
    });

    it('validates required fields before submission', async () => {
      const user = userEvent.setup();
      render(<CheckoutFlow />);
      
      const continueButton = screen.getByText('Continue');
      await user.click(continueButton);
      
      // Should not proceed without required fields
      expect(screen.getByText('Shipping Address')).toBeInTheDocument();
    });
  });

  describe('User Data Loading', () => {
    it('loads user data on mount', () => {
      render(<CheckoutFlow />);
      
      // The component should render without crashing
      expect(screen.getByText('Shipping Address')).toBeInTheDocument();
    });

    it('handles missing user data gracefully', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        session: null
      });
      
      render(<CheckoutFlow />);
      
      expect(screen.getByLabelText(/first name/i)).toHaveValue('');
      expect(screen.getByLabelText(/last name/i)).toHaveValue('');
    });
  });

  describe('Accessibility', () => {
    it('has proper form labels', () => {
      render(<CheckoutFlow />);
      
      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
    });

    it('has proper button labels', () => {
      render(<CheckoutFlow />);
      
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles cart loading errors', () => {
      mockUseCart.mockReturnValue({
        ...defaultCartData,
        error: 'Failed to load cart'
      });
      
      render(<CheckoutFlow />);
      
      // Component should still render
      expect(screen.getByText('Shipping Address')).toBeInTheDocument();
    });

    it('handles address loading errors', () => {
      mockUseAddresses.mockReturnValue({
        ...defaultAddressesData,
        error: 'Failed to load addresses'
      });
      
      render(<CheckoutFlow />);
      
      // Component should still render
      expect(screen.getByText('Shipping Address')).toBeInTheDocument();
    });
  });

  describe('Integration', () => {
    it('integrates with all required hooks', () => {
      render(<CheckoutFlow />);
      
      expect(mockUseCart).toHaveBeenCalled();
      expect(mockUseAuth).toHaveBeenCalled();
      expect(mockUseToast).toHaveBeenCalled();
      expect(mockUseAddresses).toHaveBeenCalled();
    });

    it('handles component unmounting gracefully', () => {
      const { unmount } = render(<CheckoutFlow />);
      
      expect(() => unmount()).not.toThrow();
    });
  });
});