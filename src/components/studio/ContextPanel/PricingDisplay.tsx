/**
 * Pricing Display Component
 * Shows live pricing with breakdown
 */

'use client';

import { useState, useMemo } from 'react';
import { useStudioStore, useTotalPrice } from '@/store/studio';
import { formatPrice } from '@/lib/prodigi-v2/utils';
import { Info } from 'lucide-react';

export function PricingDisplay() {
  const { config, isPricingLoading, shippingOptions } = useStudioStore();
  const totalPrice = useTotalPrice();
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Calculate shipping cost range from all available options
  const shippingRange = useMemo(() => {
    if (!shippingOptions || shippingOptions.length === 0) {
      return null;
    }
    
    const costs = shippingOptions
      .map(option => option.cost.shipping)
      .filter(cost => cost > 0);
    
    if (costs.length === 0) {
      return null;
    }
    
    const min = Math.min(...costs);
    const max = Math.max(...costs);
    
    return { min, max, currency: config.currency };
  }, [shippingOptions, config.currency]);

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5 border border-gray-200">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-medium text-gray-700 mb-1">Total Price</p>
          <div className="flex items-baseline gap-2">
            {isPricingLoading ? (
              <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
            ) : totalPrice > 0 ? (
              <>
                <span className="text-3xl font-bold text-gray-900">
                  {formatPrice(totalPrice, config.currency)}
                </span>
                {config.originalCurrency && config.originalCurrency !== config.currency && (
                  <span className="text-xs text-gray-500">
                    (was {formatPrice(config.originalPrice || totalPrice, config.originalCurrency)})
                  </span>
                )}
              </>
            ) : (
              <span className="text-sm font-medium text-gray-500 italic">
                Calculating...
              </span>
            )}
          </div>
        </div>

        <button
          onClick={() => setShowBreakdown(!showBreakdown)}
          className="text-xs font-semibold text-gray-700 hover:text-gray-900 underline hover:no-underline transition-colors"
        >
          {showBreakdown ? 'Hide' : 'Show'} breakdown
        </button>
      </div>

      {/* Breakdown */}
      {showBreakdown && totalPrice > 0 && (
        <div className="space-y-2 pt-3 border-t border-gray-300">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-700 font-medium">Frame & Print</span>
            <span className="font-bold text-gray-900">
              {formatPrice(config.price || 0, config.currency)}
            </span>
          </div>

          {config.mount && config.mount !== 'none' && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-700 font-medium">Mount ({config.mount})</span>
              <span className="font-bold text-gray-900">{formatPrice(12, config.currency)}</span>
            </div>
          )}

          {config.glaze && config.glaze !== 'none' && config.glaze !== 'acrylic' && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-700 font-medium">Premium {config.glaze} glaze</span>
              <span className="font-bold text-gray-900">{formatPrice(25, config.currency)}</span>
            </div>
          )}

          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-700 font-medium flex items-center gap-1">
              Shipping
              {shippingRange && shippingRange.min !== shippingRange.max && (
                <span className="text-xs text-amber-600 flex items-center gap-0.5" title="Shipping cost may vary">
                  <Info className="h-3 w-3" />
                </span>
              )}
            </span>
            <span className="font-bold text-gray-900">
              {shippingRange && shippingRange.min !== shippingRange.max ? (
                <span className="text-xs">
                  {formatPrice(shippingRange.min, config.currency)} - {formatPrice(shippingRange.max, config.currency)}
                </span>
              ) : (
                formatPrice(config.shippingCost || 0, config.currency)
              )}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-400 font-bold">
            <span className="text-gray-900">Total</span>
            <span className="text-gray-900">{formatPrice(totalPrice, config.currency)}</span>
          </div>
        </div>
      )}

      {/* Shipping Info */}
      <div className="mt-3 pt-3 border-t border-gray-300 flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 font-medium text-gray-700">
          <span>📦</span>
          <span>Ships in {config.sla || 5} days</span>
        </div>
        <div className="flex items-center gap-2 font-medium text-gray-700">
          <span>🌍</span>
          <span>From {config.productionCountry || 'US'}</span>
        </div>
      </div>

      {/* Shipping Estimate Range */}
      {shippingRange && shippingRange.min !== shippingRange.max && (
        <div className="mt-3 pt-3 border-t border-gray-300">
          <div className="flex items-start gap-2 text-xs text-gray-600">
            <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-gray-700 mb-1">Shipping Estimate Range:</p>
              <p className="leading-relaxed">
                Shipping costs range from <span className="font-semibold">{formatPrice(shippingRange.min, shippingRange.currency)}</span> to{' '}
                <span className="font-semibold">{formatPrice(shippingRange.max, shippingRange.currency)}</span> depending on your selected 
                shipping method and destination. Final shipping cost will be calculated at checkout.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Pricing Disclaimer */}
      <div className="mt-3 pt-3 border-t border-gray-300">
        <div className="flex items-start gap-2 text-xs text-gray-600">
          <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-gray-700 mb-1">Pricing Information:</p>
            <p className="leading-relaxed">
              Pricing shown is for <span className="font-semibold">this item only</span>. Final pricing with accurate shipping costs 
              will be calculated at checkout based on your complete order and shipping address. 
              <span className="text-amber-700 font-medium"> Prices may vary</span> when multiple items are combined.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

