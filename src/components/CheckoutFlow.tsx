'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { 
  CreditCard, 
  Truck, 
  Shield, 
  CheckCircle, 
  ArrowLeft,
  Lock,
  Clock,
  Package,
  AlertTriangle
} from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useAddresses } from '@/hooks/useAddresses';
import { GooglePlacesAutocomplete } from '@/components/ui/google-places-autocomplete';
import { supabase } from '@/lib/supabase/client';
import type { ShippingAddress } from '@/lib/pricing';

interface CheckoutFlowProps {
  onSuccess?: (orderId: string) => void;
  onCancel?: () => void;
}

interface CheckoutShippingAddress {
  firstName: string;
  lastName: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone: string;
}

interface BillingAddress {
  firstName: string;
  lastName: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export function CheckoutFlow({ onCancel }: CheckoutFlowProps) {
  const { cartData } = useCart();
  const cartItems = cartData?.cartItems || [];
  const totals = cartData?.totals || { subtotal: 0, taxAmount: 0, shippingAmount: 0, total: 0, itemCount: 0 };
  const { user, session: contextSession } = useAuth();
  const { toast } = useToast();
  const { getDefaultAddress, saveAddress } = useAddresses();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [processing, setProcessing] = useState(false);
  const [sameAsShipping, setSameAsShipping] = useState(true);
  const [calculatedShipping, setCalculatedShipping] = useState<{
    cost: number;
    estimatedDays: number;
    estimatedDaysRange?: { min: number; max: number };  // NEW: Add range
    serviceName: string;
    isEstimated: boolean;
    provider: string;
    addressValidated: boolean;
    currency: string;
  } | null>(null);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [googlePlacesAddress, setGooglePlacesAddress] = useState('');
  
  const [shippingAddress, setShippingAddress] = useState<CheckoutShippingAddress>({
    firstName: '',
    lastName: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    zip: '',
    country: 'US',
    phone: '',
  });

  const [billingAddress, setBillingAddress] = useState<BillingAddress>({
    firstName: '',
    lastName: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    zip: '',
    country: 'US',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load default address when component mounts (without triggering shipping calculation)
  useEffect(() => {
    const defaultAddress = getDefaultAddress();
    if (defaultAddress) {
      console.log('📍 Loading default address from cache (ONCE):', defaultAddress);
      setShippingAddress(prev => ({
        ...prev,
        firstName: defaultAddress.firstName || '',
        lastName: defaultAddress.lastName || '',
        address1: defaultAddress.address1 || '',
        address2: defaultAddress.address2 || '',
        city: defaultAddress.city || '',
        state: defaultAddress.state || '',
        zip: defaultAddress.zip || '',
        country: defaultAddress.country || 'US',
        phone: defaultAddress.phone || '',
      }));
      // Note: We don't trigger shipping calculation here to avoid automatic calculation
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only ONCE on mount - don't add getDefaultAddress to deps (causes infinite loop)

  // Use a ref to track if we've already loaded user metadata
  const userMetadataLoadedRef = useRef(false);
  
  useEffect(() => {
    if ((user?.user_metadata?.first_name || user?.user_metadata?.last_name) && !userMetadataLoadedRef.current) {
      console.log('📍 Loading user metadata:', user.user_metadata);
      userMetadataLoadedRef.current = true;
      setShippingAddress(prev => {
        const newFirstName = user.user_metadata?.first_name || '';
        const newLastName = user.user_metadata?.last_name || '';
        
        // Only update if the values are different to prevent infinite loops
        if (prev.firstName !== newFirstName || prev.lastName !== newLastName) {
          return {
            ...prev,
            firstName: newFirstName,
            lastName: newLastName,
          };
        }
        return prev;
      });
      // Note: We don't trigger shipping calculation here to avoid automatic calculation
    }
  }, [user]);

  // Handle Google Places address selection with debounce
  const handleGoogleAddressSelect = useCallback((addressData: {
    address1: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    countryCode: string;
    lat: number;
    lng: number;
    formattedAddress: string;
  }) => {
    console.log('📍 Google Places address selected by user:', addressData);
    
    // Mark address as manually modified by user
    setAddressManuallyModified(true);
    
    setShippingAddress(prev => {
      const newAddress = {
        ...prev,
        address1: addressData.address1,
        city: addressData.city,
        state: addressData.state,
        zip: addressData.zip,
        country: addressData.countryCode,
      };
      
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Debounce the shipping calculation to prevent rapid successive calls
      timeoutRef.current = setTimeout(() => {
        calculateShipping(newAddress);
      }, 500); // 500ms debounce
      
      return newAddress;
    });
  }, []);

  // Get currency based on shipping address - moved before calculateShipping to fix initialization bug
  const getDisplayCurrency = useCallback(() => {
    if (!shippingAddress.country) return 'USD';
    
    const currencyMap: Record<string, string> = {
      'US': 'USD', 'CA': 'CAD', 'GB': 'GBP', 'AU': 'AUD', 'DE': 'EUR', 'FR': 'EUR',
      'IT': 'EUR', 'ES': 'EUR', 'NL': 'EUR', 'BE': 'EUR', 'AT': 'EUR', 'PT': 'EUR',
      'IE': 'EUR', 'FI': 'EUR', 'LU': 'EUR', 'JP': 'JPY', 'KR': 'KRW', 'SG': 'SGD',
      'HK': 'HKD', 'CH': 'CHF', 'SE': 'SEK', 'NO': 'NOK', 'DK': 'DKK', 'PL': 'PLN',
      'CZ': 'CZK', 'HU': 'HUF', 'MX': 'MXN', 'BR': 'BRL', 'IN': 'INR', 'NZ': 'NZD',
    };
    
    return currencyMap[shippingAddress.country.toUpperCase()] || 'USD';
  }, [shippingAddress.country]);

  // Enhanced shipping calculation with comprehensive error handling and retry mechanism
  const calculateShipping = useCallback(async (address: CheckoutShippingAddress, retryCount = 0) => {
    // Check if already calculating using ref - prevents race conditions
    if (isCalculatingRef.current) {
      console.log('📍 Shipping calculation already in progress, skipping');
      return;
    }
    
    // Mark as calculating and set loading state
    isCalculatingRef.current = true;
    setShippingLoading(true);
    console.log('📍 Starting shipping calculation...');
    
    // Add a small delay to prevent rapid successive calls
    await new Promise(resolve => setTimeout(resolve, 200));

    // Enhanced validation with proper error handling
    if (!address.country || !address.city || !address.zip) {
      console.log('📍 Address incomplete, clearing shipping calculation');
      setCalculatedShipping(null);
      isCalculatingRef.current = false;
      setShippingLoading(false);
      return;
    }

    // Additional validation for better address quality
    if (address.zip.length < 3 || address.city.length < 2) {
      console.log('📍 Address validation failed: insufficient data');
      setCalculatedShipping(null);
      isCalculatingRef.current = false;
      setShippingLoading(false);
      return;
    }
    
    try {
      console.log('🚚 Calculating shipping for address:', {
        country: address.country,
        city: address.city,
        zip: address.zip,
        state: address.state,
        retryCount
      });

      // Get JWT token from auth context (no need to call getSession() again!)
      console.log('🔑 Using JWT token from auth context...');
      
      console.log('🔍 Session from context:', {
        hasContextSession: !!contextSession,
        hasAccessToken: !!contextSession?.access_token,
        userId: contextSession?.user?.id,
      });
      
      const authToken = contextSession?.access_token;
      
      if (!authToken) {
        console.error('❌ No auth token available from context for shipping calculation');
        console.error('❌ Context session state:', { contextSession });
        toast({
          title: "Authentication Error",
          description: "Please sign in to calculate shipping costs.",
          variant: "destructive"
        });
        throw new Error('Please sign in to calculate shipping');
      }

      console.log('✅ Auth token obtained from context, token length:', authToken.length);
      console.log('🌐 Making API call to /api/cart/shipping (using JWT auth)...');
      const response = await fetch('/api/cart/shipping', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        credentials: 'include',
        body: JSON.stringify({
          countryCode: address.country,
          stateOrCounty: address.state,
          postalCode: address.zip,
          city: address.city,
        }),
      });

      console.log('📡 API Response received:', { 
        status: response.status, 
        statusText: response.statusText,
        ok: response.ok 
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📦 Shipping API response data:', JSON.stringify(data, null, 2));
        
        // Extract shipping cost - handle both possible field names and ensure it's a number
        const shippingCostRaw = data.shippingCost ?? data.cost ?? 0;
        const shippingCost = typeof shippingCostRaw === 'string' 
          ? parseFloat(shippingCostRaw) 
          : typeof shippingCostRaw === 'number' 
            ? shippingCostRaw 
            : 0;
        
        const estimatedDays = data.estimatedDays ?? data.estimated_days ?? 7;
        const estimatedDaysRange = data.estimatedDaysRange;  // Extract range if available
        const serviceName = data.serviceName ?? data.service ?? 'Standard Shipping';
        const currency = data.currency || getDisplayCurrency();
        
        console.log('💰 Extracted shipping values:', {
          shippingCostRaw,
          shippingCost,
          estimatedDays,
          estimatedDaysRange,
          serviceName,
          currency,
          rawData: data
        });
        
        // Validate shipping cost is a valid number
        if (isNaN(shippingCost) || shippingCost < 0) {
          console.error('❌ Invalid shipping cost received:', shippingCostRaw, 'Defaulting to 0');
        }
        
        // Use atomic state update to prevent race conditions
        setCalculatedShipping(prev => ({
          cost: shippingCost,
          estimatedDays: estimatedDays,
          estimatedDaysRange: estimatedDaysRange,  // Include range
          serviceName: serviceName,
          isEstimated: data.isEstimated || false,
          provider: data.provider || 'unknown',
          addressValidated: data.addressValidated || false,
          currency: currency,
        }));
        console.log('✅ Shipping calculated successfully:', {
          cost: shippingCost,
          estimatedDays,
          serviceName,
          currency
        });
      } else {
        console.error('❌ Failed to calculate shipping:', response.status, response.statusText);
        
        // Handle different error types
        if (response.status === 500) {
          toast({
            title: "Error calculating shipping",
            description: "Internal server error. Please try again.",
            variant: "destructive"
          });
        } else if (response.status === 400) {
          const errorData = await response.json();
          toast({
            title: "Error creating product",
            description: errorData.details,
            variant: "destructive"
          });
        } else {
          toast({
            title: "Error calculating shipping",
            description: "Please check your address and try again.",
            variant: "destructive"
          });
        }
        
        // Retry mechanism for failed requests with proper error handling
        if (retryCount < 2 && (response.status >= 500 || response.status === 429)) {
          console.log(`🔄 Retrying shipping calculation (attempt ${retryCount + 1}/2)`);
          // Use ref to store timeout ID for proper cleanup
          retryTimeoutRef.current = setTimeout(() => {
            calculateShipping(address, retryCount + 1);
          }, 1000 * (retryCount + 1)); // Exponential backoff
          return;
        }
        
        setCalculatedShipping(null);
      }
    } catch (error) {
      console.error('❌ Error calculating shipping:', error);
      console.error('❌ Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Show error toast
      toast({
        title: "Error calculating shipping",
        description: error instanceof Error ? error.message : "Network error occurred",
        variant: "destructive"
      });

      // Retry mechanism for network errors with proper error handling
      if (retryCount < 2) {
        console.log(`🔄 Retrying shipping calculation due to network error (attempt ${retryCount + 1}/2)`);
        retryTimeoutRef.current = setTimeout(() => {
          calculateShipping(address, retryCount + 1);
        }, 1000 * (retryCount + 1));
        return;
      }
      
      setCalculatedShipping(null);
    } finally {
      console.log('🏁 Shipping calculation completed, setting loading to false');
      isCalculatingRef.current = false;
      setShippingLoading(false);
    }
  }, [getDisplayCurrency, contextSession, toast]);

  // Track if address has been manually modified by user
  const [addressManuallyModified, setAddressManuallyModified] = useState(false);
  
  // Use refs to store timeout IDs for proper cleanup
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const calculateShippingRef = useRef<typeof calculateShipping | null>(null);
  const isCalculatingRef = useRef<boolean>(false);

  // Store the function in ref to avoid circular dependencies
  calculateShippingRef.current = calculateShipping;
  
  // Cleanup timeouts on component unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);
  
  // Enhanced address change detection - only trigger for user interactions
  useEffect(() => {
    console.log('📍 Address change detected, checking if should calculate shipping:', {
      addressManuallyModified,
      hasCountry: !!shippingAddress.country,
      hasCity: !!shippingAddress.city,
      hasZip: !!shippingAddress.zip,
      country: shippingAddress.country,
      city: shippingAddress.city,
      zip: shippingAddress.zip
    });
    
    // Only calculate shipping if user has manually modified the address
    if (!addressManuallyModified) {
      console.log('📍 Address not manually modified yet, skipping automatic shipping calculation');
      return;
    }

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      // Check if we have minimum required fields for shipping calculation
      const hasRequiredFields = shippingAddress.country && 
                               shippingAddress.city && 
                               shippingAddress.zip;
      
      if (hasRequiredFields) {
        console.log('✅ User-modified address complete, calculating shipping:', {
          country: shippingAddress.country,
          city: shippingAddress.city,
          zip: shippingAddress.zip,
          state: shippingAddress.state
        });
        calculateShippingRef.current?.(shippingAddress);
      } else {
        console.log('⚠️ Address still incomplete, clearing shipping calculation:', {
          hasCountry: !!shippingAddress.country,
          hasCity: !!shippingAddress.city,
          hasZip: !!shippingAddress.zip
        });
        setCalculatedShipping(null);
      }
    }, 1000); // Increased debounce to 1 second to prevent rapid calculations

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [
    shippingAddress.country, 
    shippingAddress.city, 
    shippingAddress.zip, 
    shippingAddress.state,
    addressManuallyModified
  ]);

  // Additional effect to handle Google Maps edge cases (only for user interactions)
  useEffect(() => {
    // This effect handles cases where Google Maps might not trigger the main effect
    const handleGoogleMapsEdgeCases = () => {
      // Only handle edge cases if user has manually modified the address
      if (!addressManuallyModified) {
        return;
      }
      
      if (shippingAddress.country && shippingAddress.city && shippingAddress.zip) {
        // Only calculate if we don't already have a valid shipping calculation AND we're not currently loading
        if (!calculatedShipping && !shippingLoading) {
          console.log('📍 Google Maps edge case detected, recalculating shipping');
          calculateShippingRef.current?.(shippingAddress);
        }
      }
    };

    // Set up a periodic check for Google Maps edge cases (only if no shipping calculation exists)
    const interval = setInterval(handleGoogleMapsEdgeCases, 5000); // Increased interval to 5 seconds
    
    return () => clearInterval(interval);
  }, [shippingAddress, calculatedShipping, addressManuallyModified, shippingLoading]);

  const formatPrice = (price: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(price);
  };


  const getFrameSizeLabel = (size: string) => {
    const labels = {
      small: 'Small',
      medium: 'Medium',
      large: 'Large',
      extra_large: 'Extra Large',
    };
    return labels[size as keyof typeof labels] || size;
  };

  const getFrameStyleLabel = (style: string) => {
    return style.charAt(0).toUpperCase() + style.slice(1);
  };

  const getFrameMaterialLabel = (material: string) => {
    return material.charAt(0).toUpperCase() + material.slice(1);
  };

  const validateShippingAddress = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!shippingAddress.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!shippingAddress.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!shippingAddress.address1.trim()) newErrors.address1 = 'Please select an address from the suggestions';
    if (!shippingAddress.phone.trim()) newErrors.phone = 'Phone number is required';

    setErrors(newErrors);
    
    // If validation passes, ensure shipping is calculated
    const isValid = Object.keys(newErrors).length === 0;
    if (isValid && !calculatedShipping && !shippingLoading) {
      console.log('✅ Shipping address validated, triggering shipping calculation');
      setAddressManuallyModified(true);
      calculateShipping(shippingAddress);
      
      // Show a toast to inform the user but allow them to continue
      toast({
        title: "Calculating Shipping",
        description: "Your shipping cost is being calculated...",
      });
    }
    
    return isValid;
  };

  const validateBillingAddress = (): boolean => {
    if (sameAsShipping) return true;

    const newErrors: Record<string, string> = {};

    if (!billingAddress.firstName.trim()) newErrors.billingFirstName = 'First name is required';
    if (!billingAddress.lastName.trim()) newErrors.billingLastName = 'Last name is required';
    if (!billingAddress.address1.trim()) newErrors.billingAddress1 = 'Please select an address from the suggestions';

    setErrors(prev => ({ ...prev, ...newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (validateShippingAddress()) {
        setCurrentStep(2);
      }
    } else if (currentStep === 2) {
      if (validateBillingAddress()) {
        setCurrentStep(3);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      onCancel?.();
    }
  };

  const handleCheckout = async () => {
    console.log('🔥🔥🔥 CheckoutFlow.handleCheckout CALLED 🔥🔥🔥');
    console.log('💳 CheckoutFlow: handleCheckout called', {
      hasUser: !!user,
      cartItemsCount: cartItems.length,
      hasCartItems: cartItems.length > 0
    });
    
    if (!user) {
      console.error('❌ CheckoutFlow: No user - STOPPING HERE');
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to complete your order.',
        variant: 'destructive',
      });
      return;
    }
    console.log('✅ CheckoutFlow: User check passed');

    if (cartItems.length === 0) {
      console.error('❌ CheckoutFlow: Cart is empty - STOPPING HERE');
      toast({
        title: 'Empty Cart',
        description: 'Your cart is empty.',
        variant: 'destructive',
      });
      return;
    }
    console.log('✅ CheckoutFlow: Cart check passed', { itemCount: cartItems.length });

    try {
      setProcessing(true);
      console.log('✅ CheckoutFlow: Processing state set to true');

      // Validate shipping address before proceeding
      console.log('🔍 CheckoutFlow: Validating shipping address...');
      const isValidAddress = validateShippingAddress();
      console.log('🔍 CheckoutFlow: Address validation result', { isValidAddress });
      
      if (!isValidAddress) {
        console.error('❌ CheckoutFlow: Address validation failed - STOPPING HERE');
        setProcessing(false);
        return;
      }
      console.log('✅ CheckoutFlow: Address validation passed');
      
      // Ensure shipping cost is calculated before proceeding
      if (!calculatedShipping && !shippingLoading) {
        console.log('⚠️ CheckoutFlow: Shipping not calculated yet, triggering calculation...');
        setAddressManuallyModified(true);
        await calculateShipping(shippingAddress);
        
        // Wait a bit for calculation to complete
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (!calculatedShipping) {
          console.error('❌ CheckoutFlow: Shipping calculation failed or incomplete');
          setProcessing(false);
          toast({
            title: 'Shipping Calculation Required',
            description: 'Please wait for shipping costs to be calculated, or click the "Calculate" button on the shipping address step.',
            variant: 'destructive',
          });
          return;
        }
      } else if (shippingLoading) {
        console.log('⏳ CheckoutFlow: Shipping is being calculated, waiting...');
        setProcessing(false);
        toast({
          title: 'Calculating Shipping',
          description: 'Please wait for shipping costs to be calculated before completing checkout.',
          variant: 'default',
        });
        return;
      }
      console.log('✅ CheckoutFlow: Shipping cost calculated', { cost: calculatedShipping?.cost, currency: calculatedShipping?.currency });

      // Use session from auth context instead of fetching again (to avoid hanging)
      console.log('🔍 CheckoutFlow: Checking session from auth context...', { 
        hasContextSession: !!contextSession,
        hasToken: !!contextSession?.access_token
      });
      
      let session = contextSession;
      
      if (!session) {
        console.error('❌ CheckoutFlow: No session in context, trying to get fresh session...');
        // Fallback: try to get session with short timeout
        try {
          const quickSessionPromise = supabase.auth.getSession();
          const quickTimeout = new Promise<never>((_, reject) => 
            setTimeout(() => {
              console.error('⏰ CheckoutFlow: Session retrieval timeout after 3 seconds');
              reject(new Error('Session timeout'));
            }, 3000)
          );
          
          console.log('🔄 CheckoutFlow: Racing session promise with 3s timeout...');
          const result = await Promise.race([quickSessionPromise, quickTimeout]);
          console.log('🔄 CheckoutFlow: Session race completed', { hasResult: !!result });
          
          session = result?.data?.session || null;
          
          if (!session) {
            console.error('❌ CheckoutFlow: No session available after retrieval attempt');
            setProcessing(false);
            toast({
              title: 'Authentication Required',
              description: 'Please sign in to complete your order.',
              variant: 'destructive',
            });
            return;
          }
          
          console.log('✅ CheckoutFlow: Got fresh session', { hasToken: !!session.access_token });
        } catch (sessionError) {
          console.error('❌ CheckoutFlow: Session retrieval failed', sessionError);
          setProcessing(false);
          toast({
            title: 'Authentication Error',
            description: 'Please sign in to complete your order.',
            variant: 'destructive',
          });
          return;
        }
      } else {
        console.log('✅ CheckoutFlow: Using session from context', { hasToken: !!session.access_token });
      }

      console.log('🚀 CheckoutFlow: MAKING FETCH REQUEST NOW to /api/checkout/create-session', {
        url: '/api/checkout/create-session',
        method: 'POST',
        hasToken: !!session.access_token,
        cartItemIds: cartItems.map(item => item.id),
        shippingAddress: {
          firstName: shippingAddress.firstName,
          lastName: shippingAddress.lastName,
          city: shippingAddress.city,
          state: shippingAddress.state,
          zip: shippingAddress.zip,
          country: shippingAddress.country
        }
      });
      
      // Test if fetch is available
      if (typeof fetch === 'undefined') {
        console.error('❌❌❌ FETCH IS NOT AVAILABLE! ❌❌❌');
        throw new Error('Fetch API is not available');
      }
      
      console.log('✅ Fetch is available, making request...');
      
      // Create checkout session with timeout protection
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.error('❌ CheckoutFlow: Request timeout after 30 seconds');
        setProcessing(false);
      }, 30000); // 30 second timeout

      // Create checkout session
      const response = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token && {
            'Authorization': `Bearer ${session.access_token}`
          })
        },
        credentials: 'include',
        body: JSON.stringify({
          cartItemIds: cartItems.map(item => item.id),
          shippingAddress: {
            firstName: shippingAddress.firstName,
            lastName: shippingAddress.lastName,
            address1: shippingAddress.address1,
            address2: shippingAddress.address2,
            city: shippingAddress.city,
            state: shippingAddress.state,
            zip: shippingAddress.zip,
            country: shippingAddress.country,
            phone: shippingAddress.phone,
            // Keep backward compatibility
            countryCode: shippingAddress.country,
            stateOrCounty: shippingAddress.state,
            postalCode: shippingAddress.zip,
          },
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId); // Clear timeout on success
      
      console.log('📡 CheckoutFlow: API Response received', { 
        status: response.status, 
        statusText: response.statusText,
        ok: response.ok 
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error || 'Failed to create checkout session';
        console.error('❌ CheckoutFlow: API error response', { status: response.status, error: errorMessage });
        setProcessing(false); // Reset processing state on API error
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('✅ CheckoutFlow: API response parsed', { hasUrl: !!data.url });

      // Save address for future use
      try {
        saveAddress({
          firstName: shippingAddress.firstName,
          lastName: shippingAddress.lastName,
          address1: shippingAddress.address1,
          address2: shippingAddress.address2,
          city: shippingAddress.city,
          state: shippingAddress.state,
          zip: shippingAddress.zip,
          country: shippingAddress.country,
          phone: shippingAddress.phone,
          isDefault: true,
        });
      } catch (error) {
        console.error('Error saving address:', error);
        // Don't fail checkout if address saving fails
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        console.log('✅ CheckoutFlow: Redirecting to Stripe checkout', { url: data.url });
        // Reset processing before redirect (though user won't see it)
        setProcessing(false);
        window.location.href = data.url;
      } else {
        console.error('❌ CheckoutFlow: No checkout URL in response', data);
        setProcessing(false);
        throw new Error('No checkout URL received from server');
      }
    } catch (error) {
      console.error('❌ CheckoutFlow: Checkout error:', error);
      console.error('❌ CheckoutFlow: Error stack', error instanceof Error ? error.stack : 'No stack');
      setProcessing(false); // Explicitly reset processing state on error
      toast({
        title: 'Checkout Failed',
        description: error instanceof Error ? error.message : 'An error occurred during checkout. Please try again.',
        variant: 'destructive',
      });
    } finally {
      // Always reset processing state, even if redirect happens
      console.log('✅ CheckoutFlow: Resetting processing state in finally block');
      setProcessing(false);
    }
  };

  const steps = [
    { number: 1, title: 'Shipping', icon: Truck },
    { number: 2, title: 'Billing', icon: CreditCard },
    { number: 3, title: 'Review', icon: CheckCircle },
  ];

  if (cartItems.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">Your cart is empty</h3>
        <p className="text-muted-foreground mb-4">Add some items to your cart before checking out.</p>
        <Button onClick={onCancel} variant="outline">
          Continue Shopping
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-center space-x-8">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = currentStep === step.number;
          const isCompleted = currentStep > step.number;
          
          return (
            <div key={step.number} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                isActive ? 'border-primary bg-primary text-white' :
                isCompleted ? 'border-green-500 bg-green-500 text-white' :
                'border-gray-300 bg-white text-gray-500'
              }`}>
                {isCompleted ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
              </div>
              <span className={`ml-2 text-sm font-medium ${
                isActive ? 'text-primary' :
                isCompleted ? 'text-green-600' :
                'text-gray-500'
              }`}>
                {step.title}
              </span>
              {index < steps.length - 1 && (
                <div className={`w-16 h-0.5 mx-4 ${
                  isCompleted ? 'bg-green-500' : 'bg-gray-300'
                }`} />
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Step 1: Shipping Address */}
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Shipping Address
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={shippingAddress.firstName}
                      onChange={(e) => setShippingAddress(prev => ({ ...prev, firstName: e.target.value }))}
                      className={errors.firstName ? 'border-red-500' : ''}
                    />
                    {errors.firstName && <p className="text-sm text-red-500 mt-1">{errors.firstName}</p>}
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={shippingAddress.lastName}
                      onChange={(e) => setShippingAddress(prev => ({ ...prev, lastName: e.target.value }))}
                      className={errors.lastName ? 'border-red-500' : ''}
                    />
                    {errors.lastName && <p className="text-sm text-red-500 mt-1">{errors.lastName}</p>}
                  </div>
                </div>

                <div>
                  <GooglePlacesAutocomplete
                    label="Shipping Address"
                    placeholder="Start typing your address..."
                    value={googlePlacesAddress}
                    onChange={(value) => setGooglePlacesAddress(value)}
                    onAddressSelect={handleGoogleAddressSelect}
                    required={true}
                    error={errors.address1}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Select your address from the suggestions for accurate shipping calculation
                  </p>
                  
                  {/* Shipping Calculation Status and Manual Trigger */}
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200 mt-2">
                    <div>
                      <h4 className="font-medium text-blue-900 text-sm">Shipping Status</h4>
                      <p className="text-xs text-blue-700">
                        {calculatedShipping ? 
                          `Shipping: ${formatPrice(calculatedShipping.cost, calculatedShipping.currency)}` : 
                          shippingLoading ? 'Calculating...' : 'Click to calculate shipping'
                        }
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (shippingAddress.country && shippingAddress.city && shippingAddress.zip) {
                          console.log('🔄 Manual shipping calculation triggered by user');
                          // Mark address as manually modified by user
                          setAddressManuallyModified(true);
                          calculateShipping(shippingAddress);
                        } else {
                          toast({
                            title: "Incomplete Address",
                            description: "Please select an address from the suggestions above.",
                            variant: "destructive",
                          });
                        }
                      }}
                      disabled={shippingLoading}
                      className="bg-blue-600 text-white hover:bg-blue-700 text-xs px-3 py-1"
                    >
                      {shippingLoading ? 'Calculating...' : 'Calculate'}
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="address2">Address Line 2 (Optional)</Label>
                  <Input
                    id="address2"
                    placeholder="Apartment, suite, unit, etc."
                    value={shippingAddress.address2}
                    onChange={(e) => setShippingAddress(prev => ({ ...prev, address2: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={shippingAddress.phone}
                    onChange={(e) => setShippingAddress(prev => ({ ...prev, phone: e.target.value }))}
                    className={errors.phone ? 'border-red-500' : ''}
                  />
                  {errors.phone && <p className="text-sm text-red-500 mt-1">{errors.phone}</p>}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Billing Address */}
          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Billing Address
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sameAsShipping"
                    checked={sameAsShipping}
                    onCheckedChange={(checked) => setSameAsShipping(checked === true)}
                  />
                  <Label htmlFor="sameAsShipping">Same as shipping address</Label>
                </div>

                {!sameAsShipping && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="billingFirstName">First Name *</Label>
                        <Input
                          id="billingFirstName"
                          value={billingAddress.firstName}
                          onChange={(e) => setBillingAddress(prev => ({ ...prev, firstName: e.target.value }))}
                          className={errors.billingFirstName ? 'border-red-500' : ''}
                        />
                        {errors.billingFirstName && <p className="text-sm text-red-500 mt-1">{errors.billingFirstName}</p>}
                      </div>
                      <div>
                        <Label htmlFor="billingLastName">Last Name *</Label>
                        <Input
                          id="billingLastName"
                          value={billingAddress.lastName}
                          onChange={(e) => setBillingAddress(prev => ({ ...prev, lastName: e.target.value }))}
                          className={errors.billingLastName ? 'border-red-500' : ''}
                        />
                        {errors.billingLastName && <p className="text-sm text-red-500 mt-1">{errors.billingLastName}</p>}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="billingAddress1">Billing Address *</Label>
                      <Input
                        id="billingAddress1"
                        placeholder="Street address"
                        value={billingAddress.address1}
                        onChange={(e) => setBillingAddress(prev => ({ ...prev, address1: e.target.value }))}
                        className={errors.billingAddress1 ? 'border-red-500' : ''}
                      />
                      {errors.billingAddress1 && <p className="text-sm text-red-500 mt-1">{errors.billingAddress1}</p>}
                    </div>

                    <div>
                      <Label htmlFor="billingAddress2">Address Line 2 (Optional)</Label>
                      <Input
                        id="billingAddress2"
                        placeholder="Apartment, suite, unit, etc."
                        value={billingAddress.address2}
                        onChange={(e) => setBillingAddress(prev => ({ ...prev, address2: e.target.value }))}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 3: Review & Payment */}
          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Review Your Order
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Order Items */}
                <div className="space-y-4">
                  <h4 className="font-medium">Order Items</h4>
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex gap-4 p-4 border rounded-lg">
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                        <img
                          src={item.products.images.thumbnail_url || item.products.images.image_url}
                          alt={item.products.images.prompt}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <h5 className="font-medium">
                          {getFrameSizeLabel(item.products.frame_size)} Frame
                        </h5>
                        <p className="text-sm text-gray-600">
                          {getFrameStyleLabel(item.products.frame_style)} {getFrameMaterialLabel(item.products.frame_material)}
                        </p>
                        <p className="text-sm text-gray-500 line-clamp-1">
                          &ldquo;{item.products.images.prompt}&rdquo;
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-sm">Qty: {item.quantity}</span>
                          <span className="font-medium">
                            {formatPrice(item.products.price * item.quantity)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Shipping Address */}
                <div>
                  <h4 className="font-medium mb-2">Shipping Address</h4>
                  <div className="p-4 border rounded-lg bg-gray-50">
                    <p className="text-gray-900">{shippingAddress.firstName} {shippingAddress.lastName}</p>
                    <p className="text-gray-900">{shippingAddress.address1}</p>
                    {shippingAddress.address2 && <p className="text-gray-900">{shippingAddress.address2}</p>}
                    <p className="text-gray-900">{shippingAddress.city}, {shippingAddress.state} {shippingAddress.zip}</p>
                    <p className="text-gray-900">{shippingAddress.phone}</p>
                  </div>
                </div>

                {/* Security Notice */}
                <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <Shield className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-800">Secure Checkout</p>
                    <p className="text-sm text-green-600">
                      Your payment information is encrypted and secure. We use Stripe for payment processing.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {currentStep === 1 ? 'Cancel' : 'Back'}
            </Button>
            
            {currentStep < 3 ? (
              <Button onClick={handleNext}>
                Continue
              </Button>
            ) : (
              <Button 
                onClick={async (e) => {
                  console.log('🔥🔥🔥 CHECKOUT BUTTON CLICKED - START 🔥🔥🔥');
                  e.preventDefault();
                  e.stopPropagation();
                  try {
                    console.log('💳 CheckoutFlow: Button clicked, calling handleCheckout...');
                    await handleCheckout(); // MUST await the async function!
                    console.log('✅ CheckoutFlow: handleCheckout completed');
                  } catch (error) {
                    console.error('🔥🔥🔥 ERROR IN CHECKOUT BUTTON CLICK HANDLER 🔥🔥🔥', error);
                    console.error('🔥🔥🔥 Error stack', error instanceof Error ? error.stack : 'No stack');
                  }
                  console.log('🔥🔥🔥 CHECKOUT BUTTON CLICKED - END 🔥🔥🔥');
                }}
                disabled={processing}
                className="min-w-32"
              >
                {processing ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Complete Order
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Order Summary Sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="line-clamp-1">
                      {getFrameSizeLabel(item.products.frame_size)} Frame × {item.quantity}
                    </span>
                    <span>{formatPrice(item.products.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              
              <Separator />
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">Subtotal</span>
                  <span className="font-semibold">{formatPrice(totals.subtotal, getDisplayCurrency())}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Tax</span>
                  <span className="font-semibold">{formatPrice(totals.taxAmount, getDisplayCurrency())}</span>
                </div>
                <div className="flex justify-between">
                  <span className="flex items-center gap-1 font-medium">
                    <Truck className="h-3 w-3" />
                    Shipping
                    {calculatedShipping && (
                      <>
                        <span className="text-xs text-muted-foreground">
                          {calculatedShipping.estimatedDaysRange ? (
                            `(${calculatedShipping.estimatedDaysRange.min}-${calculatedShipping.estimatedDaysRange.max} days)`
                          ) : (
                            `(${calculatedShipping.estimatedDays} days)`
                          )}
                        </span>
                        {calculatedShipping.isEstimated && (
                          <span className="text-xs text-amber-600 flex items-center gap-1" title="Estimated shipping cost">
                            <AlertTriangle className="h-2 w-2" />
                            Est.
                          </span>
                        )}
                        {calculatedShipping.addressValidated && (
                          <span className="text-xs text-green-600 flex items-center gap-1" title="Address verified">
                            <CheckCircle className="h-2 w-2" />
                            Verified
                          </span>
                        )}
                      </>
                    )}
                  </span>
                  <span>
                    {shippingLoading ? (
                      <span className="text-muted-foreground text-sm italic">Calculating...</span>
                    ) : calculatedShipping ? (
                      <div className="text-right">
                        <div className="font-semibold">{formatPrice(calculatedShipping.cost, calculatedShipping.currency || getDisplayCurrency())}</div>
                        {calculatedShipping.isEstimated && (
                          <div className="text-xs text-amber-600">Estimated</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm italic">Enter address</span>
                    )}
                  </span>
                </div>
              </div>
              
              <Separator />
              
              <div className="flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span>
                  {calculatedShipping ? 
                    formatPrice(totals.subtotal + totals.taxAmount + calculatedShipping.cost, getDisplayCurrency()) : 
                    formatPrice(totals.subtotal + totals.taxAmount, getDisplayCurrency())
                  }
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Shield className="h-3 w-3" />
                <span>Secure checkout powered by Stripe</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
