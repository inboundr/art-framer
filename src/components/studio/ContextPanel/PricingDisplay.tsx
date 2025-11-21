/**
 * Pricing Display Component
 * Shows live pricing with breakdown
 */

'use client';

import { useState } from 'react';
import { useStudioStore, useTotalPrice } from '@/store/studio';

export function PricingDisplay() {
  const { config, isPricingLoading } = useStudioStore();
  const totalPrice = useTotalPrice();
  const [showBreakdown, setShowBreakdown] = useState(false);

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5 border border-gray-200">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-medium text-gray-700 mb-1">Total Price</p>
          <div className="flex items-baseline gap-2">
            {isPricingLoading ? (
              <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
            ) : (
              <>
                <span className="text-3xl font-bold text-gray-900">
                  ${totalPrice.toFixed(2)}
                </span>
                <span className="text-sm font-medium text-gray-600">{config.currency}</span>
              </>
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
      {showBreakdown && (
        <div className="space-y-2 pt-3 border-t border-gray-300">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-700 font-medium">Frame & Print</span>
            <span className="font-bold text-gray-900">
              ${config.price.toFixed(2)}
            </span>
          </div>

          {config.mount && config.mount !== 'none' && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-700 font-medium">Mount ({config.mount})</span>
              <span className="font-bold text-gray-900">$12.00</span>
            </div>
          )}

          {config.glaze && config.glaze !== 'none' && config.glaze !== 'acrylic' && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-700 font-medium">Premium {config.glaze} glaze</span>
              <span className="font-bold text-gray-900">$25.00</span>
            </div>
          )}

          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-700 font-medium">Shipping</span>
            <span className="font-bold text-gray-900">
              ${config.shippingCost.toFixed(2)}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-400 font-bold">
            <span className="text-gray-900">Total</span>
            <span className="text-gray-900">${totalPrice.toFixed(2)}</span>
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
    </div>
  );
}

