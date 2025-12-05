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
  const pricingData: PricingData = {
    subtotal: config.price || 0,
    total: totalPrice,
    shipping: config.shippingCost,
    shippingOptions: shippingOptions?.map(option => ({
      method: option.method,
      cost: option.cost,
      delivery: option.delivery,
    })),
    currency: config.currency || 'USD',
    originalCurrency: config.originalCurrency,
    originalTotal: config.originalPrice,
    isPricingLoading,
    sla: config.sla,
    productionCountry: config.productionCountry,
  };

  return <PricingDisplay pricing={pricingData} />;
}

