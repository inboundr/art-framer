/**
 * Unified Pricing Display Component
 * Works for both Studio (country-only) and Cart (full address)
 * 
 * Features:
 * - Shows real-time Prodigi pricing
 * - Handles country-only or full address scenarios
 * - Displays shipping range when address not available
 * - Shows exact shipping when address is available
 * - Uses same libraries as studio (formatPrice, currencyService)
 */

'use client';

import { useState, useMemo } from 'react';
import { formatPrice } from '@/lib/prodigi-v2/utils';
import { Info, AlertCircle } from 'lucide-react';

export interface PricingData {
  // Item pricing
  subtotal: number; // Items cost (frame & print)
  tax?: number;
  total: number;
  
  // Shipping
  shipping?: number; // Exact shipping cost (when address available)
  shippingRange?: { min: number; max: number }; // Shipping range (when only country available)
  shippingOptions?: Array<{
    method: string;
    cost: {
      items: number;
      shipping: number;
      total: number;
      currency: string;
    };
    delivery: {
      min: number;
      max: number;
      formatted: string;
    };
  }>;
  
  // Currency
  currency: string;
  originalCurrency?: string;
  originalTotal?: number;
  
  // Metadata
  isPricingLoading?: boolean;
  sla?: number;
  productionCountry?: string;
  estimatedDays?: number;
  estimatedDaysRange?: { min: number; max: number };
  
  // Error handling
  error?: {
    title: string;
    message: string;
    action?: string;
    retryable?: boolean;
  };
}

export interface PricingDisplayProps {
  pricing: PricingData;
  showBreakdown?: boolean;
  showShippingInfo?: boolean;
  /** Toggle all shipping-related UI (breakdown line, range, disclaimers) */
  showShippingDetails?: boolean;
  className?: string;
}

export function PricingDisplay({
  pricing,
  showBreakdown: defaultShowBreakdown = false,
  showShippingInfo = true,
  showShippingDetails = true,
  className = '',
}: PricingDisplayProps) {
  const [showBreakdown, setShowBreakdown] = useState(defaultShowBreakdown);

  // Calculate shipping cost range from all available options
  const shippingRange = useMemo(() => {
    // If we have shipping options, calculate range from them
    if (pricing.shippingOptions && pricing.shippingOptions.length > 0) {
      const costs = pricing.shippingOptions
        .map(option => option.cost.shipping)
        .filter(cost => cost > 0);
      
      if (costs.length > 0) {
        const min = Math.min(...costs);
        const max = Math.max(...costs);
        return { min, max, currency: pricing.currency };
      }
    }
    
    // If we have explicit shipping range, use it
    if (pricing.shippingRange) {
      return {
        ...pricing.shippingRange,
        currency: pricing.currency,
      };
    }
    
    // If we have exact shipping cost, use it as both min and max
    if (pricing.shipping !== undefined && pricing.shipping > 0) {
      return {
        min: pricing.shipping,
        max: pricing.shipping,
        currency: pricing.currency,
      };
    }
    
    return null;
  }, [pricing.shippingOptions, pricing.shippingRange, pricing.shipping, pricing.currency]);

  // Determine if we should show shipping range vs exact cost
  const hasShippingRange = shippingRange && shippingRange.min !== shippingRange.max;
  const hasExactShipping = pricing.shipping !== undefined && pricing.shipping > 0 && !hasShippingRange;

  // Show error if present
  if (pricing.error) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-semibold text-red-900 mb-1">{pricing.error.title}</h4>
              <p className="text-sm text-red-700 mb-2">{pricing.error.message}</p>
              {pricing.error.action && (
                <p className="text-xs text-red-600 italic">{pricing.error.action}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5 border border-gray-200 ${className}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-medium text-gray-700 mb-1">Total Price</p>
          <div className="flex items-baseline gap-2">
            {pricing.isPricingLoading ? (
              <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
            ) : pricing.total > 0 ? (
              <>
                <span className="text-3xl font-bold text-gray-900">
                  {formatPrice(pricing.total, pricing.currency)}
                </span>
                {pricing.originalCurrency && pricing.originalCurrency !== pricing.currency && (
                  <span className="text-xs text-gray-500">
                    (was {formatPrice(pricing.originalTotal || pricing.total, pricing.originalCurrency)})
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
      {showBreakdown && pricing.total > 0 && (
        <div className="space-y-2 pt-3 border-t border-gray-300">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-700 font-medium">Items</span>
            <span className="font-bold text-gray-900">
              {formatPrice(pricing.subtotal, pricing.currency)}
            </span>
          </div>

          {pricing.tax !== undefined && pricing.tax > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-700 font-medium">Tax</span>
              <span className="font-bold text-gray-900">
                {formatPrice(pricing.tax, pricing.currency)}
              </span>
            </div>
          )}

          {showShippingDetails && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-700 font-medium flex items-center gap-1">
                Shipping
                {hasShippingRange && (
                  <span className="text-xs text-amber-600 flex items-center gap-0.5" title="Shipping cost may vary">
                    <Info className="h-3 w-3" />
                  </span>
                )}
              </span>
              <span className="font-bold text-gray-900">
                {hasShippingRange ? (
                  <span className="text-xs">
                    {formatPrice(shippingRange.min, pricing.currency)} - {formatPrice(shippingRange.max, pricing.currency)}
                  </span>
                ) : hasExactShipping ? (
                  formatPrice(pricing.shipping!, pricing.currency)
                ) : (
                  <span className="text-gray-500 italic text-xs">Calculated at checkout</span>
                )}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-400 font-bold">
            <span className="text-gray-900">Total</span>
            <span className="text-gray-900">{formatPrice(pricing.total, pricing.currency)}</span>
          </div>
        </div>
      )}

      {/* Shipping Info */}
      {showShippingDetails && showShippingInfo && (pricing.sla || pricing.productionCountry) && (
        <div className="mt-3 pt-3 border-t border-gray-300 flex items-center justify-between text-sm">
          {pricing.sla && (
            <div className="flex items-center gap-2 font-medium text-gray-700">
              <span>📦</span>
              <span>Ships in {pricing.sla} days</span>
            </div>
          )}
          {pricing.productionCountry && (
            <div className="flex items-center gap-2 font-medium text-gray-700">
              <span>🌍</span>
              <span>From {pricing.productionCountry}</span>
            </div>
          )}
        </div>
      )}

      {/* Shipping Estimate Range */}
      {showShippingDetails && hasShippingRange && (
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
              {hasShippingRange ? (
                <>
                  Pricing shown is for <span className="font-semibold">this item only</span>. Final pricing with accurate shipping costs 
                  will be calculated at checkout based on your complete order and shipping address. 
                  <span className="text-amber-700 font-medium"> Prices may vary</span> when multiple items are combined.
                </>
              ) : (
                <>
                  Final pricing with accurate shipping costs will be calculated at checkout based on your complete order and shipping address.
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

