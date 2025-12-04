// Client shipping calculation should rely on cookie-based auth only.

export interface ShippingAddress {
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

export interface ShippingResult {
  cost: number;
  currency: string;
  estimatedDays: number;
  method: string;
  isEstimated?: boolean;
  addressValidated?: boolean;
}

export const calculateShipping = async (address: ShippingAddress, retryCount = 0): Promise<ShippingResult | null> => {
  // Enhanced validation with proper error handling
  if (!address.country || !address.city || !address.zip || address.zip.length < 3) {
    console.log('❌ Address validation failed: missing required fields');
    return null;
  }

  // Validate address quality with proper bounds checking
  if (address.city.length < 2 || address.state.length < 2) {
    console.log('❌ Address validation failed: poor quality address');
    return null;
  }

  // Prevent infinite recursion
  if (retryCount > 3) {
    console.error('❌ Maximum retry attempts exceeded');
    return null;
  }

  try {
    console.log('🚚 Calculating shipping for address:', {
      country: address.country,
      city: address.city,
      zip: address.zip,
      state: address.state,
      retryCount
    });

    // Get JWT token for authentication
    const { supabase } = await import('@/lib/supabase/client');
    const { data: { session } } = await supabase.auth.getSession();
    const authToken = session?.access_token;
    
    if (!authToken) {
      console.error('❌ No auth token available for shipping calculation');
      return null;
    }
    
    console.log('🌐 Making API call to /api/v2/checkout/shipping (with JWT auth)...');
    
    // Note: This utility function needs cart items to work with v2 API
    // For now, return null as this function signature doesn't include items
    // Components should use the v2 API directly with cart items
    console.warn('⚠️ shipping-calculation.ts: v2 API requires cart items. Use v2 API directly from components.');
    return null;

    console.log('📡 API Response received:', { 
      status: response.status, 
      statusText: response.statusText,
      ok: response.ok 
    });

    if (!response.ok) {
      if (response.status === 401) {
        console.warn('❌ Unauthorized: user must be logged in to calculate shipping');
        return null;
      }
      // Handle retry logic for server errors with proper error handling
      if (response.status >= 500 && retryCount < 2) {
        console.log(`🔄 Server error, retrying... (attempt ${retryCount + 1}/2)`);
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
        return calculateShipping(address, retryCount + 1);
      }
      
      // Handle retry logic for network errors with proper error handling
      if (response.status === 0 && retryCount < 2) {
        console.log(`🔄 Network error, retrying... (attempt ${retryCount + 1}/2)`);
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
        return calculateShipping(address, retryCount + 1);
      }
      
      console.error('❌ API request failed:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();
    console.log('✅ Shipping calculation successful:', data);

    // Validate response data structure
    if (!data || typeof data !== 'object') {
      console.error('❌ Invalid response data structure');
      return null;
    }

    return {
      cost: typeof data.cost === 'number' ? data.cost : 0,
      currency: typeof data.currency === 'string' ? data.currency : 'USD',
      estimatedDays: typeof data.estimatedDays === 'number' ? data.estimatedDays : 5,
      method: typeof data.method === 'string' ? data.method : 'Standard',
      isEstimated: typeof data.isEstimated === 'boolean' ? data.isEstimated : false,
      addressValidated: typeof data.addressValidated === 'boolean' ? data.addressValidated : false
    };

  } catch (error) {
    console.error('❌ Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });

    // Handle retry logic for network errors with proper error handling
    if (retryCount < 2) {
      console.log(`🔄 Network error, retrying... (attempt ${retryCount + 1}/2)`);
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
      return calculateShipping(address, retryCount + 1);
    }

    console.error('❌ Shipping calculation failed after retries');
    return null;
  }
};
