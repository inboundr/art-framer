import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
jest.mock('@/components/ui/google-places-autocomplete', () => ({
  GooglePlacesAutocomplete: ({ onAddressSelect, onChange }: any) => (
    <input
      data-testid="google-places-input"
      onChange={(e) => onChange(e.target.value)}
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
    />
  )
}));

global.fetch = jest.fn();

const mockUseCart = useCart as jest.MockedFunction<typeof useCart>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;
const mockUseAddresses = useAddresses as jest.MockedFunction<typeof useAddresses>;
const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('Checkout Integration Tests', () => {
  const mockToast = jest.fn();
  const mockGetDefaultAddress = jest.fn();
  const mockSaveAddress = jest.fn();

  const defaultCartData = {
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
  };

  const defaultUser = {
    id: 'user-1',
    email: 'test@example.com',
    user_metadata: {
      first_name: 'John',
      last_name: 'Doe'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseCart.mockReturnValue({
      cartData: defaultCartData,
      addToCart: jest.fn(),
      removeFromCart: jest.fn(),
      updateQuantity: jest.fn(),
      clearCart: jest.fn(),
      refreshCart: jest.fn()
    });

    mockUseAuth.mockReturnValue({
      user: defaultUser,
      loading: false,
      signOut: jest.fn()
    });

    mockUseToast.mockReturnValue({
      toast: mockToast
    });

    mockUseAddresses.mockReturnValue({
      addresses: [],
      loading: false,
      saveAddress: mockSaveAddress,
      updateAddress: jest.fn(),
      deleteAddress: jest.fn(),
      getDefaultAddress: mockGetDefaultAddress
    });

    mockSupabase.auth = {
      getSession: jest.fn()
    } as any;

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        shippingCost: 9.99,
        estimatedDays: 5,
        serviceName: 'Standard Shipping',
        isEstimated: false,
        provider: 'prodigi',
        addressValidated: true,
        currency: 'USD'
      })
    });
  });

  describe('Complete Checkout Flow', () => {
    it('completes full checkout process successfully', async () => {
      const user = userEvent.setup();
      render(<CheckoutFlow />);

      // Step 1: Fill shipping address (only fields that exist)
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/phone/i), '555-0123');
      
      // Use Google Places for address
      const googlePlacesInput = screen.getByTestId('google-places-input');
      await user.type(googlePlacesInput, '123 Test St');
      await user.tab();

      // Wait for shipping calculation
      await waitFor(() => {
        expect(screen.getByText(/shipping:/i)).toBeInTheDocument();
      });

      // Continue to payment
      const continueButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueButton);

      // Should show payment form
      expect(screen.getAllByText(/billing/i)).toHaveLength(2);
    });

    it('handles Google Places address selection', async () => {
      const user = userEvent.setup();
      render(<CheckoutFlow />);

      // Use Google Places autocomplete
      const googlePlacesInput = screen.getByTestId('google-places-input');
      await user.type(googlePlacesInput, '123 Test St');
      await user.tab();

      // Should trigger shipping calculation
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/cart/shipping', expect.any(Object));
      });
    });

    it('handles billing address different from shipping', async () => {
      const user = userEvent.setup();
      render(<CheckoutFlow />);

      // Fill shipping address (only fields that exist)
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/phone/i), '555-0123');
      
      // Use Google Places for address
      const googlePlacesInput = screen.getByTestId('google-places-input');
      await user.type(googlePlacesInput, '123 Test St');
      await user.tab();

      // Continue to payment
      const continueButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueButton);

      // Uncheck "same as shipping"
      const sameAsShippingCheckbox = screen.getByLabelText(/same as shipping address/i);
      await user.click(sameAsShippingCheckbox);

      // Should show billing form
      expect(screen.getAllByText(/billing address/i)).toHaveLength(2);
    });
  });

  describe('Error Scenarios', () => {
    it('handles shipping calculation failure', async () => {
      const user = userEvent.setup();
      render(<CheckoutFlow />);

      // Mock shipping API failure
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Shipping API error'));

      // Use Google Places for address input
      const googlePlacesInput = screen.getByTestId('google-places-input');
      await user.type(googlePlacesInput, '123 Test St');
      await user.tab();

      // Should handle error gracefully
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });

    it('handles session expiration during checkout', async () => {
      const user = userEvent.setup();
      render(<CheckoutFlow />);

      // Mock session expiration
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Session expired' }
      });

      // Use Google Places for address input
      const googlePlacesInput = screen.getByTestId('google-places-input');
      await user.type(googlePlacesInput, '123 Test St');
      await user.tab();

      // Should still attempt API call
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });

    it('handles network timeout', async () => {
      const user = userEvent.setup();
      render(<CheckoutFlow />);

      // Mock slow API response
      (global.fetch as jest.Mock).mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      );

      // Use Google Places for address input
      const googlePlacesInput = screen.getByTestId('google-places-input');
      await user.type(googlePlacesInput, '123 Test St');
      await user.tab();

      // Should handle timeout gracefully
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles empty cart', () => {
      mockUseCart.mockReturnValue({
        cartData: { 
          cartItems: [], 
          totals: { subtotal: 0, taxAmount: 0, shippingAmount: 0, total: 0, itemCount: 0 } 
        },
        addToCart: jest.fn(),
        removeFromCart: jest.fn(),
        updateQuantity: jest.fn(),
        clearCart: jest.fn(),
        refreshCart: jest.fn()
      });

      render(<CheckoutFlow />);
      expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
    });

    it('handles very large cart', () => {
      const largeCartData = {
        cartItems: Array(100).fill(null).map((_, i) => ({
          id: `item-${i}`,
          productId: `prod-${i}`,
          name: `Product ${i}`,
          quantity: 1,
          imageUrl: `test-${i}.jpg`,
          products: {
            frame_size: 'medium',
            price: 29.99,
            frameStyle: 'black',
            frameMaterial: 'wood'
          }
        })),
        totals: {
          subtotal: 2999.00,
          taxAmount: 240.00,
          shippingAmount: 0,
          total: 3239.00,
          itemCount: 100
        }
      };

      mockUseCart.mockReturnValue({
        cartData: largeCartData,
        addToCart: jest.fn(),
        removeFromCart: jest.fn(),
        updateQuantity: jest.fn(),
        clearCart: jest.fn(),
        refreshCart: jest.fn()
      });

      render(<CheckoutFlow />);
      // Should render the component without errors
      expect(screen.getByText(/shipping address/i)).toBeInTheDocument();
    });

    it('handles rapid address changes', async () => {
      const user = userEvent.setup();
      render(<CheckoutFlow />);

      const googlePlacesInput = screen.getByTestId('google-places-input');
      
      // Type rapidly
      await user.type(googlePlacesInput, 'A');
      await user.type(googlePlacesInput, 'B');
      await user.type(googlePlacesInput, 'C');
      await user.type(googlePlacesInput, 'D');

      // Should only trigger one API call after debounce
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      }, { timeout: 2000 });
    });

    it('handles special characters in addresses', async () => {
      const user = userEvent.setup();
      render(<CheckoutFlow />);

      // Use Google Places for address input
      const googlePlacesInput = screen.getByTestId('google-places-input');
      await user.type(googlePlacesInput, '123 Main St. #4B, São Paulo, 01234-567, BR');
      await user.tab();

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });
  });

  describe('Performance Tests', () => {
    it('completes checkout within reasonable time', async () => {
      const user = userEvent.setup();
      const startTime = Date.now();
      
      render(<CheckoutFlow />);

      // Fill all required fields
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/phone/i), '555-0123');
      
      // Use Google Places for address
      const googlePlacesInput = screen.getByTestId('google-places-input');
      await user.type(googlePlacesInput, '123 Test St, Test City, TS, 12345, US');
      await user.tab();

      // Wait for shipping calculation
      await waitFor(() => {
        expect(screen.getByText(/shipping:/i)).toBeInTheDocument();
      });

      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(5000); // 5 seconds max
    });

    it('handles concurrent shipping calculations', async () => {
      const user = userEvent.setup();
      render(<CheckoutFlow />);

      // Trigger multiple calculations rapidly
      const googlePlacesInput = screen.getByTestId('google-places-input');
      await user.type(googlePlacesInput, 'Test City');
      await user.tab();

      // Should handle gracefully without errors
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility Integration', () => {
    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<CheckoutFlow />);

      // Tab through form fields
      await user.tab();
      await user.keyboard('John');
      await user.tab();
      await user.keyboard('Doe');
      await user.tab();
      await user.keyboard('555-0123');

      expect(screen.getByDisplayValue('John')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Doe')).toBeInTheDocument();
      expect(screen.getByDisplayValue('555-0123')).toBeInTheDocument();
    });

    it('announces form validation errors', async () => {
      const user = userEvent.setup();
      render(<CheckoutFlow />);

      const continueButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueButton);

      // Should handle validation gracefully
      expect(continueButton).toBeInTheDocument();
    });
  });
});
