/**
 * Shipping Method Selector Component
 * Shows all available shipping methods with costs and delivery times
 */

'use client';

import { useEffect, useRef } from 'react';
import { useStudioStore } from '@/store/studio';
import { formatPrice } from '@/lib/prodigi-v2/utils';

export function ShippingMethodSelector() {
  const { config, shippingOptions, updateConfig, updatePricingAsync, isPricingLoading } = useStudioStore();
  const hasTriggeredPricing = useRef<string | null>(null);

  // Sync shipping method to localStorage whenever it changes
  useEffect(() => {
    if (config.shippingMethod && typeof window !== 'undefined') {
      localStorage.setItem('cartShippingMethod', config.shippingMethod);
    }
  }, [config.shippingMethod]);

  // Trigger pricing update when image is present but shipping options are not loaded
  useEffect(() => {
    // Only trigger if:
    // 1. Image is present
    // 2. Shipping options are not loaded
    // 3. Not currently loading
    // 4. We haven't already triggered for this image
    if (
      config.imageUrl && 
      (!shippingOptions || shippingOptions.length === 0) && 
      !isPricingLoading &&
      hasTriggeredPricing.current !== config.imageUrl
    ) {
      console.log('ShippingMethodSelector: Triggering pricing update to load shipping options');
      hasTriggeredPricing.current = config.imageUrl;
      updatePricingAsync();
    }
    
    // Reset trigger tracking if image changes
    if (config.imageUrl && hasTriggeredPricing.current && hasTriggeredPricing.current !== config.imageUrl) {
      hasTriggeredPricing.current = null;
    }
  }, [config.imageUrl, shippingOptions, isPricingLoading]);

  // Show loading state while pricing is being fetched
  if (config.imageUrl && (!shippingOptions || shippingOptions.length === 0)) {
    return (
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          🚚 Shipping Method
        </label>
        <div className="h-32 bg-gray-100 rounded-lg animate-pulse flex items-center justify-center">
          <p className="text-sm text-gray-500">Loading shipping options...</p>
        </div>
      </div>
    );
  }

  if (!shippingOptions || shippingOptions.length === 0) {
    return null;
  }

  const selectedMethod = config.shippingMethod || 'Standard';

  const handleMethodChange = async (method: 'Budget' | 'Standard' | 'Express' | 'Overnight') => {
    // Find the selected shipping option
    const selectedOption = shippingOptions?.find(opt => opt.method === method);
    
    if (selectedOption) {
      // Update pricing immediately from the selected option (no API call needed)
      // This provides instant feedback to the user
      updateConfig({
        shippingMethod: method,
        shippingCost: selectedOption.cost.shipping,
        price: selectedOption.cost.items, // Frame & print cost (items)
        currency: selectedOption.cost.currency,
        originalCurrency: selectedOption.originalCost?.currency || selectedOption.cost.currency,
        originalPrice: selectedOption.originalCost?.total || selectedOption.cost.total,
        sla: selectedOption.delivery.max, // Use max days for safety
        productionCountry: selectedOption.productionCountry,
      });
    } else {
      // Fallback: update config and trigger API call if option not found
      updateConfig({ shippingMethod: method });
      await updatePricingAsync();
    }
    
    // Sync to localStorage for cart
    if (typeof window !== 'undefined') {
      localStorage.setItem('cartShippingMethod', method);
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        🚚 Shipping Method
      </label>
      <div className="space-y-2">
        {shippingOptions.map(option => {
          const isSelected = option.method === selectedMethod;
          const currency = option.cost.currency;
          
          return (
            <label
              key={option.method}
              className={`flex items-start p-3 border-2 rounded-lg cursor-pointer transition-all ${
                isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <input
                type="radio"
                name="shipping-method"
                value={option.method}
                checked={isSelected}
                onChange={() => handleMethodChange(option.method)}
                className="mt-1 mr-3"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">{option.method}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      {option.delivery.formatted}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">
                      {formatPrice(option.cost.shipping, currency)}
                    </div>
                    <div className="text-xs text-gray-500">
                      Total: {formatPrice(option.cost.total, currency)}
                    </div>
                  </div>
                </div>
                {option.delivery.note && (
                  <div className="text-xs text-gray-500 mt-1">
                    {option.delivery.note}
                  </div>
                )}
                {option.productionCountry && (
                  <div className="text-xs text-gray-400 mt-1">
                    Produced in {option.productionCountry}
                  </div>
                )}
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}

