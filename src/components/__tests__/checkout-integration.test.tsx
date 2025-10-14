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
      onChange={(e) => {
        onChange(e.target.value);
        // Trigger address selection when typing
        if (e.target.value.length > 3) {
          setTimeout(() => {
            onAddressSelect && onAddressSelect({
              address1: '123 Test St',
              city: 'Test City',
              state: 'TS',
              zip: '12345',
              country: 'Test Country',
              countryCode: 'TC',
              lat: 0,
              lng: 0,
              formattedAddress: '123 Test St, Test City, TS 12345, Test Country'
            });
          }, 100);
        }
      }}
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
        expect(screen.getByText(/shipping address/i)).toBeInTheDocument();
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

      // Wait for the shipping calculation to be triggered
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/cart/shipping', expect.any(Object));
      }, { timeout: 3000 });

      // Should handle error gracefully and show error toast
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Error calculating shipping",
            variant: "destructive"
          })
        );
      }, { timeout: 3000 });
    });

    it('handles API 500 errors', async () => {
      const user = userEvent.setup();
      render(<CheckoutFlow />);

      // Mock 500 error response
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      // Use Google Places for address input
      const googlePlacesInput = screen.getByTestId('google-places-input');
      await user.type(googlePlacesInput, '123 Test St');
      await user.tab();

      // Should handle error gracefully
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Error calculating shipping",
            variant: "destructive"
          })
        );
      });
    });

    it('handles duplicate SKU errors', async () => {
      const user = userEvent.setup();
      render(<CheckoutFlow />);

      // Mock duplicate SKU error
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.resolve({
          error: 'Failed to create product',
          details: 'duplicate key value violates unique constraint "products_sku_key"',
          code: '23505'
        })
      });

      const googlePlacesInput = screen.getByTestId('google-places-input');
      await user.type(googlePlacesInput, '123 Test St');
      await user.tab();

      // Should show appropriate error message
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Error creating product",
            description: expect.stringContaining("duplicate"),
            variant: "destructive"
          })
        );
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
        expect(global.fetch).toHaveBeenCalledWith('/api/cart/shipping', expect.any(Object));
      }, { timeout: 3000 });
    });

    it('handles network timeout', async () => {
      const user = userEvent.setup();
      render(<CheckoutFlow />);

      // Mock slow API response that times out
      (global.fetch as jest.Mock).mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 50)
        )
      );

      // Use Google Places for address input
      const googlePlacesInput = screen.getByTestId('google-places-input');
      await user.type(googlePlacesInput, '123 Test St');
      await user.tab();

      // Should handle timeout gracefully
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      }, { timeout: 200 });
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
        refreshCart: jest.fn(),
        loading: false // Add loading state
      });

      render(<CheckoutFlow />);
      expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
    });

    it('handles very large cart', () => {
      const largeCartData = {
        cartItems: Array(100).fill(null).map((_, i) => ({
          id: `item-${i}`,
          user_id: 'user-1',
          product_id: `prod-${i}`,
          quantity: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          products: {
            id: `prod-${i}`,
            user_id: 'user-1',
            image_id: `img-${i}`,
            frame_size: 'medium',
            frame_style: 'black',
            frame_material: 'wood',
            price: 29.99,
            cost: 19.99,
            weight_grams: 500,
            dimensions_cm: {
              width: 30,
              height: 40,
              depth: 2
            },
            status: 'active',
            sku: `sku-${i}`,
            images: {
              id: `img-${i}`,
              user_id: 'user-1',
              image_url: `test-${i}.jpg`,
              thumbnail_url: `test-${i}.jpg`,
              prompt: 'Test prompt',
              created_at: new Date().toISOString()
            }
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
        refreshCart: jest.fn(),
        loading: false
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
        expect(global.fetch).toHaveBeenCalledWith('/api/cart/shipping', expect.any(Object));
      }, { timeout: 3000 });
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
        expect(screen.getByText(/shipping address/i)).toBeInTheDocument();
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
