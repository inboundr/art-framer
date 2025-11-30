/**
 * Shipping Method Selector Component
 * Shows all available shipping methods with costs and delivery times
 */

'use client';

import { useStudioStore } from '@/store/studio';
import { formatPrice } from '@/lib/prodigi-v2/utils';

export function ShippingMethodSelector() {
  const { config, shippingOptions, updateConfig, updatePricingAsync } = useStudioStore();

  if (!shippingOptions || shippingOptions.length === 0) {
    return null;
  }

  const selectedMethod = config.shippingMethod || 'Standard';

  const handleMethodChange = async (method: 'Budget' | 'Standard' | 'Express' | 'Overnight') => {
    updateConfig({ shippingMethod: method });
    // Trigger pricing update with new method
    await updatePricingAsync();
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

