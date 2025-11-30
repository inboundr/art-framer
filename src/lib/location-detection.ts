/**
 * Location Detection Utility
 * 
 * Detects user's country with multiple fallback strategies for maximum accuracy
 */

import type { NextRequest } from 'next/server';
import { getCountry } from './countries';

export interface LocationDetectionResult {
  country: string;
  confidence: 'high' | 'medium' | 'low';
  source:
    | 'user-selection'
    | 'request-param'
    | 'ip-geolocation'
    | 'browser-locale'
    | 'default';
}

/**
 * Detect user's country from multiple sources (server-side)
 * 
 * Priority order:
 * 1. User selection (explicit)
 * 2. Request parameter
 * 3. IP geolocation (Vercel headers)
 * 4. Default to 'US'
 */
export async function detectUserLocation(
  request?: NextRequest,
  userSelection?: string
): Promise<LocationDetectionResult> {
  // Priority 1: User selection (highest confidence)
  if (userSelection && getCountry(userSelection)) {
    return {
      country: userSelection,
      confidence: 'high',
      source: 'user-selection',
    };
  }

  // Priority 2: Request parameter
  if (request) {
    const requestCountry = request.headers.get('x-user-country');
    if (requestCountry && getCountry(requestCountry)) {
      return {
        country: requestCountry,
        confidence: 'high',
        source: 'request-param',
      };
    }
  }

  // Priority 3: IP Geolocation (Vercel)
  if (request) {
    const vercelCountry = request.headers.get('x-vercel-ip-country');
    if (vercelCountry && getCountry(vercelCountry)) {
      return {
        country: vercelCountry,
        confidence: 'medium',
        source: 'ip-geolocation',
      };
    }
  }

  // Priority 4: Default
  return {
    country: 'US',
    confidence: 'low',
    source: 'default',
  };
}

/**
 * Detect user's country from browser (client-side)
 * 
 * Uses browser locale and timezone as hints
 */
export async function detectCountryFromBrowser(): Promise<string> {
  try {
    // Try to get from browser's locale
    const locale = navigator.language || 'en-US';
    const countryFromLocale = locale.split('-')[1]?.toUpperCase();
    
    if (countryFromLocale && getCountry(countryFromLocale)) {
      return countryFromLocale;
    }
    
    // Try timezone as hint (not perfect but better than nothing)
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const timezoneHints: Record<string, string> = {
      'America/New_York': 'US',
      'America/Los_Angeles': 'US',
      'America/Chicago': 'US',
      'America/Toronto': 'CA',
      'America/Vancouver': 'CA',
      'Europe/London': 'GB',
      'Europe/Paris': 'FR',
      'Europe/Berlin': 'DE',
      'Europe/Rome': 'IT',
      'Europe/Madrid': 'ES',
      'Europe/Amsterdam': 'NL',
      'Europe/Brussels': 'BE',
      'Europe/Stockholm': 'SE',
      'Europe/Copenhagen': 'DK',
      'Europe/Oslo': 'NO',
      'Europe/Helsinki': 'FI',
      'Europe/Vienna': 'AT',
      'Europe/Zurich': 'CH',
      'Europe/Dublin': 'IE',
      'Europe/Lisbon': 'PT',
      'Europe/Warsaw': 'PL',
      'Australia/Sydney': 'AU',
      'Australia/Melbourne': 'AU',
      'Pacific/Auckland': 'NZ',
      'Asia/Tokyo': 'JP',
      'Asia/Singapore': 'SG',
      'Asia/Hong_Kong': 'HK',
    };
    
    const countryFromTimezone = timezoneHints[timezone];
    if (countryFromTimezone && getCountry(countryFromTimezone)) {
      return countryFromTimezone;
    }
    
    // Fallback to US
    return 'US';
  } catch (error) {
    console.error('Failed to detect country from browser:', error);
    return 'US';
  }
}

/**
 * Validate country code
 */
export function isValidCountryCode(code: string): boolean {
  return getCountry(code) !== undefined;
}

