/**
 * Studio Pricing Display Component
 * Wrapper around unified PricingDisplay component
 * Adapts studio store data to unified component format
 */

'use client';

import { useStudioStore, useTotalPrice } from '@/store/studio';
import { PricingDisplay, type PricingData } from '@/components/shared/PricingDisplay';

export function StudioPricingDisplay() {
  const { config, isPricingLoading, shippingOptions } = useStudioStore();
  const totalPrice = useTotalPrice();

  // Transform studio store data to unified PricingData format
  // For studio we prefer to avoid overstating totals (shipping here is an estimate only).
  // Show items only; hide shipping + original conversions to prevent misleading numbers.
  const itemsSubtotal = config.price || 0;
  const pricingData: PricingData = {
    subtotal: itemsSubtotal,
    total: itemsSubtotal,
    shipping: undefined,
    shippingOptions: undefined,
    currency: config.currency || 'USD',
    originalCurrency: undefined,
    originalTotal: undefined,
    isPricingLoading,
    sla: undefined,
    productionCountry: undefined,
  };

  return (
    <PricingDisplay
      pricing={pricingData}
      showShippingInfo={false}
      showShippingDetails={false}
    />
  );
}

