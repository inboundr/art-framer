'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  const { user } = useAuth();
  const { toast } = useToast();
  const { getDefaultAddress, saveAddress } = useAddresses();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [processing, setProcessing] = useState(false);
  const [sameAsShipping, setSameAsShipping] = useState(true);
  const [calculatedShipping, setCalculatedShipping] = useState<{
    cost: number;
    estimatedDays: number;
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
      console.log('📍 Loading default address from cache:', defaultAddress);
      setShippingAddress({
        firstName: defaultAddress.firstName,
        lastName: defaultAddress.lastName,
        address1: defaultAddress.address1,
        address2: defaultAddress.address2 || '',
        city: defaultAddress.city,
        state: defaultAddress.state,
        zip: defaultAddress.zip,
        country: defaultAddress.country,
        phone: defaultAddress.phone,
      });
      // Note: We don't trigger shipping calculation here to avoid automatic calculation
    }
  }, [getDefaultAddress]);

  useEffect(() => {
    if (user) {
      console.log('📍 Loading user metadata:', user.user_metadata);
      setShippingAddress(prev => ({
        ...prev,
        firstName: user.user_metadata?.first_name || '',
        lastName: user.user_metadata?.last_name || '',
      }));
      // Note: We don't trigger shipping calculation here to avoid automatic calculation
    }
  }, [user]);

  // Handle Google Places address selection
  const handleGoogleAddressSelect = (addressData: {
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
    
    const newAddress = {
      ...shippingAddress,
      address1: addressData.address1,
      city: addressData.city,
      state: addressData.state,
      zip: addressData.zip,
      country: addressData.countryCode,
    };
    
    setShippingAddress(newAddress);
    
    // Immediately calculate shipping for the new address
    calculateShipping(newAddress);
  };

  // Enhanced shipping calculation with comprehensive error handling and retry mechanism
  const calculateShipping = useCallback(async (address: CheckoutShippingAddress, retryCount = 0) => {
    // Prevent multiple simultaneous calculations
    if (shippingLoading) {
      console.log('📍 Shipping calculation already in progress, skipping');
      return;
    }

    // Enhanced validation
    if (!address.country || !address.city || !address.zip) {
      console.log('📍 Address incomplete, clearing shipping calculation');
      setCalculatedShipping(null);
      return;
    }

    // Additional validation for better address quality
    if (address.zip.length < 3 || address.city.length < 2) {
      console.log('📍 Address validation failed: insufficient data');
      setCalculatedShipping(null);
      return;
    }

    setShippingLoading(true);
    try {
      console.log('🚚 Calculating shipping for address:', {
        country: address.country,
        city: address.city,
        zip: address.zip,
        state: address.state,
        retryCount
      });

      // Get the session to access the token for authentication
      const { data: { session } } = await supabase.auth.getSession();
      console.log('🔐 Session status:', { hasSession: !!session, hasToken: !!session?.access_token });
      
      console.log('🌐 Making API call to /api/cart/shipping...');
      const response = await fetch('/api/cart/shipping', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token && {
            'Authorization': `Bearer ${session.access_token}`
          })
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
        setCalculatedShipping({
          cost: data.shippingCost || 0,
          estimatedDays: data.estimatedDays || 7,
          serviceName: data.serviceName || 'Standard Shipping',
          isEstimated: data.isEstimated || false,
          provider: data.provider || 'unknown',
          addressValidated: data.addressValidated || false,
          currency: data.currency || getDisplayCurrency(),
        });
        console.log('✅ Shipping calculated successfully:', data);
      } else {
        console.error('❌ Failed to calculate shipping:', response.status, response.statusText);
        
        // Retry mechanism for failed requests
        if (retryCount < 2 && (response.status >= 500 || response.status === 429)) {
          console.log(`🔄 Retrying shipping calculation (attempt ${retryCount + 1}/2)`);
          setTimeout(() => {
            calculateShipping(address, retryCount + 1);
          }, 1000 * (retryCount + 1)); // Exponential backoff
          return;
        }
        
        setCalculatedShipping(null);
      }
    } catch (error) {
      console.error('❌ Error calculating shipping:', error);
      console.error('❌ Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      // Retry mechanism for network errors
      if (retryCount < 2) {
        console.log(`🔄 Retrying shipping calculation due to network error (attempt ${retryCount + 1}/2)`);
        setTimeout(() => {
          calculateShipping(address, retryCount + 1);
        }, 1000 * (retryCount + 1));
        return;
      }
      
      setCalculatedShipping(null);
    } finally {
      console.log('🏁 Shipping calculation completed, setting loading to false');
      setShippingLoading(false);
    }
  }, []);

  // Track if address has been manually modified by user
  const [addressManuallyModified, setAddressManuallyModified] = useState(false);
  
  // Debounce mechanism to prevent rapid-fire calculations
  const [calculationTimeout, setCalculationTimeout] = useState<NodeJS.Timeout | null>(null);

  // Enhanced address change detection - only trigger for user interactions
  useEffect(() => {
    // Only calculate shipping if user has manually modified the address
    if (!addressManuallyModified) {
      console.log('📍 Address loaded from cache, skipping automatic shipping calculation');
      return;
    }

    // Clear any existing timeout
    if (calculationTimeout) {
      clearTimeout(calculationTimeout);
    }

    const timer = setTimeout(() => {
      // Check if we have minimum required fields for shipping calculation
      const hasRequiredFields = shippingAddress.country && 
                               shippingAddress.city && 
                               shippingAddress.zip;
      
      if (hasRequiredFields) {
        console.log('📍 User-modified address detected, calculating shipping:', {
          country: shippingAddress.country,
          city: shippingAddress.city,
          zip: shippingAddress.zip,
          state: shippingAddress.state
        });
        calculateShipping(shippingAddress);
      } else {
        console.log('📍 Address incomplete, clearing shipping calculation');
        setCalculatedShipping(null);
      }
    }, 1000); // Increased debounce to 1 second to prevent rapid calculations

    setCalculationTimeout(timer);

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [
    shippingAddress.country, 
    shippingAddress.city, 
    shippingAddress.zip, 
    shippingAddress.state,
    calculateShipping,
    addressManuallyModified,
    calculationTimeout
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
          calculateShipping(shippingAddress);
        }
      }
    };

    // Set up a periodic check for Google Maps edge cases (only if no shipping calculation exists)
    const interval = setInterval(handleGoogleMapsEdgeCases, 5000); // Increased interval to 5 seconds
    
    return () => clearInterval(interval);
  }, [shippingAddress, calculatedShipping, calculateShipping, addressManuallyModified, shippingLoading]);

  const formatPrice = (price: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(price);
  };

  // Get currency based on shipping address
  const getDisplayCurrency = () => {
    if (!shippingAddress.country) return 'USD';
    
    const currencyMap: Record<string, string> = {
      'US': 'USD', 'CA': 'CAD', 'GB': 'GBP', 'AU': 'AUD', 'DE': 'EUR', 'FR': 'EUR',
      'IT': 'EUR', 'ES': 'EUR', 'NL': 'EUR', 'BE': 'EUR', 'AT': 'EUR', 'PT': 'EUR',
      'IE': 'EUR', 'FI': 'EUR', 'LU': 'EUR', 'JP': 'JPY', 'KR': 'KRW', 'SG': 'SGD',
      'HK': 'HKD', 'CH': 'CHF', 'SE': 'SEK', 'NO': 'NOK', 'DK': 'DKK', 'PL': 'PLN',
      'CZ': 'CZK', 'HU': 'HUF', 'MX': 'MXN', 'BR': 'BRL', 'IN': 'INR', 'NZ': 'NZD',
    };
    
    return currencyMap[shippingAddress.country.toUpperCase()] || 'USD';
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
    return Object.keys(newErrors).length === 0;
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
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to complete your order.',
        variant: 'destructive',
      });
      return;
    }

    if (cartItems.length === 0) {
      toast({
        title: 'Empty Cart',
        description: 'Your cart is empty.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setProcessing(true);

      // Validate shipping address before proceeding
      if (!validateShippingAddress()) {
        setProcessing(false);
        return;
      }

      // Get the session to access the token for authentication
      const { data: { session } } = await supabase.auth.getSession();

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
            countryCode: shippingAddress.country,
            stateOrCounty: shippingAddress.state,
            postalCode: shippingAddress.zip,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const data = await response.json();

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
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        title: 'Checkout Failed',
        description: error instanceof Error ? error.message : 'An error occurred during checkout.',
        variant: 'destructive',
      });
    } finally {
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
                    <p>{shippingAddress.firstName} {shippingAddress.lastName}</p>
                    <p>{shippingAddress.address1}</p>
                    {shippingAddress.address2 && <p>{shippingAddress.address2}</p>}
                    <p>{shippingAddress.city}, {shippingAddress.state} {shippingAddress.zip}</p>
                    <p>{shippingAddress.phone}</p>
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
                onClick={handleCheckout}
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
                  <span>Subtotal</span>
                  <span>{formatPrice(totals.subtotal, getDisplayCurrency())}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax</span>
                  <span>{formatPrice(totals.taxAmount, getDisplayCurrency())}</span>
                </div>
                <div className="flex justify-between">
                  <span className="flex items-center gap-1">
                    <Truck className="h-3 w-3" />
                    Shipping
                    {calculatedShipping && (
                      <>
                        <span className="text-xs text-muted-foreground">
                          ({calculatedShipping.estimatedDays} days)
                        </span>
                        {calculatedShipping.isEstimated && (
                          <span className="text-xs text-amber-600 flex items-center gap-1">
                            <AlertTriangle className="h-2 w-2" />
                            Est.
                          </span>
                        )}
                        {calculatedShipping.addressValidated && (
                          <span className="text-xs text-green-600 flex items-center gap-1">
                            <CheckCircle className="h-2 w-2" />
                            Verified
                          </span>
                        )}
                      </>
                    )}
                  </span>
                  <span>
                    {shippingLoading ? (
                      <span className="text-muted-foreground text-sm">Calculating...</span>
                    ) : calculatedShipping ? (
                      <div className="text-right">
                        <div>{formatPrice(calculatedShipping.cost, calculatedShipping.currency || getDisplayCurrency())}</div>
                        {calculatedShipping.isEstimated && (
                          <div className="text-xs text-amber-600">Estimated</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">Enter address</span>
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
