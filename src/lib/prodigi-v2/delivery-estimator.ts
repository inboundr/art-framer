/**
 * Prodigi Delivery Time Estimator
 * 
 * Provides accurate delivery time estimates based on Prodigi's documented SLAs
 * Reference: https://support.prodigi.com/hc/en-us/articles/13169433163676
 */

import { ShippingMethod } from './types';

export interface DeliveryEstimate {
  productionDays: { min: number; max: number };
  shippingDays: { min: number; max: number };
  totalDays: { min: number; max: number };
  note?: string;
}

/**
 * Production times by product category
 * Wall art typically: 24-48 hours (1-2 business days)
 * Other products may vary
 */
const PRODUCTION_TIMES: Record<string, { min: number; max: number }> = {
  'wall-art': { min: 1, max: 2 },  // Fast-moving global products
  'photobooks': { min: 2, max: 4 },
  'apparel': { min: 2, max: 4 },
  'homeware': { min: 2, max: 4 },
  'default': { min: 1, max: 4 },
};

/**
 * Standard shipping times by route (in business days, AFTER dispatch)
 * Source: Prodigi's official shipping estimates
 */
const STANDARD_SHIPPING_TIMES: Record<string, Record<string, { min: number; max: number }>> = {
  // UK routes
  'GB': {
    'GB': { min: 2, max: 3 },   // UK to UK
    'EU': { min: 5, max: 7 },   // UK to EU
    'US': { min: 8, max: 12 },  // UK to US
    'CA': { min: 8, max: 12 },  // UK to Canada
    'AU': { min: 10, max: 15 }, // UK to Australia
    'NZ': { min: 10, max: 15 }, // UK to New Zealand
    'INTL': { min: 10, max: 20 }, // UK to other international
  },
  
  // US routes
  'US': {
    'US': { min: 4, max: 6 },   // US to US
    'CA': { min: 6, max: 8 },   // US to Canada
    'MX': { min: 6, max: 10 },  // US to Mexico
    'GB': { min: 8, max: 12 },  // US to UK
    'EU': { min: 8, max: 14 },  // US to EU
    'AU': { min: 10, max: 15 }, // US to Australia
    'INTL': { min: 10, max: 20 }, // US to other international
  },
  
  // EU routes
  'EU': {
    'EU': { min: 5, max: 7 },   // EU to EU
    'GB': { min: 6, max: 8 },   // EU to UK
    'US': { min: 8, max: 14 },  // EU to US
    'CA': { min: 8, max: 14 },  // EU to Canada
    'AU': { min: 12, max: 18 }, // EU to Australia
    'INTL': { min: 10, max: 20 }, // EU to other international
  },
  
  // Australia routes
  'AU': {
    'AU': { min: 2, max: 5 },   // Australia to Australia
    'NZ': { min: 5, max: 7 },   // Australia to New Zealand
    'US': { min: 10, max: 15 }, // Australia to US
    'GB': { min: 10, max: 15 }, // Australia to UK
    'EU': { min: 12, max: 18 }, // Australia to EU
    'INTL': { min: 10, max: 20 }, // Australia to other international
  },
};

/**
 * Shipping method modifiers (multipliers for different shipping speeds)
 */
const SHIPPING_METHOD_MODIFIERS: Record<ShippingMethod, { factor: number; note: string }> = {
  'Budget': { 
    factor: 1.5, 
    note: 'Slowest but most economical option'
  },
  'Standard': { 
    factor: 1.0, 
    note: 'Balanced speed and cost'
  },
  'Express': { 
    factor: 0.6, 
    note: 'Faster delivery for time-sensitive orders'
  },
  'Overnight': { 
    factor: 0.3, 
    note: 'Next business day after dispatch (domestic only)'
  },
};

/**
 * Map country code to shipping region
 */
function getShippingRegion(countryCode: string): string {
  // EU countries
  const euCountries = [
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
    'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
    'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
  ];
  
  if (countryCode === 'GB') return 'GB';
  if (countryCode === 'US') return 'US';
  if (countryCode === 'AU') return 'AU';
  if (euCountries.includes(countryCode)) return 'EU';
  
  return 'INTL';
}

/**
 * Get destination region key for lookup
 */
function getDestinationKey(destinationCountry: string): string {
  const region = getShippingRegion(destinationCountry);
  
  // For specific countries, return the country code
  if (['GB', 'US', 'CA', 'MX', 'AU', 'NZ'].includes(destinationCountry)) {
    return destinationCountry;
  }
  
  // For regions, return the region
  return region;
}

/**
 * Estimate delivery time based on production location, destination, and shipping method
 * 
 * @param productionCountry - Country code where product will be produced (from Prodigi's fulfillmentLocation)
 * @param destinationCountry - Country code where product will be shipped
 * @param shippingMethod - Shipping method (Budget, Standard, Express, Overnight)
 * @param productCategory - Product category (default: 'wall-art' for our use case)
 * @returns Delivery estimate with min/max days
 */
export function estimateDeliveryTime(
  productionCountry: string,
  destinationCountry: string,
  shippingMethod: ShippingMethod = 'Standard',
  productCategory: string = 'wall-art'
): DeliveryEstimate {
  // 1. Get production time
  const productionDays = PRODUCTION_TIMES[productCategory] || PRODUCTION_TIMES['default'];
  
  // 2. Get shipping region for production country
  const originRegion = getShippingRegion(productionCountry);
  const destinationKey = getDestinationKey(destinationCountry);
  
  // 3. Get base shipping time from lookup table
  const shippingTable = STANDARD_SHIPPING_TIMES[originRegion] || STANDARD_SHIPPING_TIMES['US'];
  const baseShippingDays = shippingTable[destinationKey] || shippingTable['INTL'];
  
  // 4. Apply shipping method modifier
  const modifier = SHIPPING_METHOD_MODIFIERS[shippingMethod];
  const adjustedShippingDays = {
    min: Math.ceil(baseShippingDays.min * modifier.factor),
    max: Math.ceil(baseShippingDays.max * modifier.factor),
  };
  
  // 5. Calculate total delivery time
  const totalDays = {
    min: productionDays.min + adjustedShippingDays.min,
    max: productionDays.max + adjustedShippingDays.max,
  };
  
  // 6. Add note for international shipments
  let note = modifier.note;
  if (originRegion !== getShippingRegion(destinationCountry)) {
    note += '. International orders may experience customs delays.';
  }
  
  return {
    productionDays,
    shippingDays: adjustedShippingDays,
    totalDays,
    note,
  };
}

/**
 * Format delivery estimate as a human-readable string
 */
export function formatDeliveryEstimate(estimate: DeliveryEstimate): string {
  const { totalDays } = estimate;
  
  if (totalDays.min === totalDays.max) {
    return `${totalDays.min} business days`;
  }
  
  return `${totalDays.min}-${totalDays.max} business days`;
}

/**
 * Get detailed delivery breakdown for display to user
 */
export function getDeliveryBreakdown(
  productionCountry: string,
  destinationCountry: string,
  shippingMethod: ShippingMethod = 'Standard'
): {
  estimate: DeliveryEstimate;
  formatted: string;
  breakdown: string;
} {
  const estimate = estimateDeliveryTime(productionCountry, destinationCountry, shippingMethod);
  const formatted = formatDeliveryEstimate(estimate);
  
  const breakdown = [
    `Production: ${estimate.productionDays.min}-${estimate.productionDays.max} days`,
    `Shipping: ${estimate.shippingDays.min}-${estimate.shippingDays.max} days`,
    `Total: ${formatted}`,
  ].join(' • ');
  
  return {
    estimate,
    formatted,
    breakdown,
  };
}

