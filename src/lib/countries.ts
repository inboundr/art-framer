/**
 * Country utilities for international pricing
 */

export interface Country {
  code: string;
  name: string;
  flag: string;
  currency: string;
  region: 'North America' | 'Europe' | 'Asia-Pacific' | 'Other';
}

/**
 * Supported countries for Prodigi fulfillment
 * Organized by region for better UX
 */
export const COUNTRIES: Country[] = [
  // North America
  { code: 'US', name: 'United States', flag: '🇺🇸', currency: 'USD', region: 'North America' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', currency: 'CAD', region: 'North America' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽', currency: 'MXN', region: 'North America' },
  
  // Europe
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', currency: 'GBP', region: 'Europe' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', currency: 'EUR', region: 'Europe' },
  { code: 'FR', name: 'France', flag: '🇫🇷', currency: 'EUR', region: 'Europe' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹', currency: 'EUR', region: 'Europe' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸', currency: 'EUR', region: 'Europe' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱', currency: 'EUR', region: 'Europe' },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪', currency: 'EUR', region: 'Europe' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪', currency: 'SEK', region: 'Europe' },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰', currency: 'DKK', region: 'Europe' },
  { code: 'NO', name: 'Norway', flag: '🇳🇴', currency: 'NOK', region: 'Europe' },
  { code: 'FI', name: 'Finland', flag: '🇫🇮', currency: 'EUR', region: 'Europe' },
  { code: 'AT', name: 'Austria', flag: '🇦🇹', currency: 'EUR', region: 'Europe' },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭', currency: 'CHF', region: 'Europe' },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪', currency: 'EUR', region: 'Europe' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', currency: 'EUR', region: 'Europe' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱', currency: 'PLN', region: 'Europe' },
  
  // Asia-Pacific
  { code: 'AU', name: 'Australia', flag: '🇦🇺', currency: 'AUD', region: 'Asia-Pacific' },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿', currency: 'NZD', region: 'Asia-Pacific' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵', currency: 'JPY', region: 'Asia-Pacific' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬', currency: 'SGD', region: 'Asia-Pacific' },
  { code: 'HK', name: 'Hong Kong', flag: '🇭🇰', currency: 'HKD', region: 'Asia-Pacific' },
  { code: 'BD', name: 'Bangladesh', flag: '🇧🇩', currency: 'BDT', region: 'Asia-Pacific' },
  { code: 'IN', name: 'India', flag: '🇮🇳', currency: 'INR', region: 'Asia-Pacific' },
  { code: 'PK', name: 'Pakistan', flag: '🇵🇰', currency: 'PKR', region: 'Asia-Pacific' },
];

/**
 * Get country by code
 */
export function getCountry(code: string): Country | undefined {
  return COUNTRIES.find(c => c.code === code);
}

/**
 * Get countries grouped by region
 */
export function getCountriesByRegion(): Record<string, Country[]> {
  return COUNTRIES.reduce((acc, country) => {
    if (!acc[country.region]) {
      acc[country.region] = [];
    }
    acc[country.region].push(country);
    return acc;
  }, {} as Record<string, Country[]>);
}

/**
 * Detect user's country from browser/IP
 * This is a client-side utility - for server-side, use request headers
 */
export async function detectUserCountry(): Promise<string> {
  try {
    // Try to get from browser's timezone/locale
    const locale = navigator.language || 'en-US';
    const countryFromLocale = locale.split('-')[1];
    
    if (countryFromLocale && getCountry(countryFromLocale)) {
      return countryFromLocale;
    }
    
    // Fallback: Try IP geolocation service (if available)
    // You can use services like ipapi.co, geoip-lite, etc.
    // For now, just return US as default
    return 'US';
  } catch (error) {
    console.error('Failed to detect country:', error);
    return 'US'; // Safe default
  }
}

/**
 * Format country for display
 */
export function formatCountry(code: string): string {
  const country = getCountry(code);
  return country ? `${country.flag} ${country.name}` : code;
}

