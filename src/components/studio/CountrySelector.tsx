/**
 * Country Selector Component
 * Allows users to select their shipping destination country
 */

'use client';

import { useEffect, useState } from 'react';
import { useStudioStore } from '@/store/studio';
import { COUNTRIES, getCountriesByRegion, formatCountry } from '@/lib/countries';
import { detectCountryFromBrowser } from '@/lib/location-detection';

export function CountrySelector() {
  const { config, updateConfig } = useStudioStore();
  const [detectedCountry, setDetectedCountry] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(true);
  const countriesByRegion = getCountriesByRegion();

  useEffect(() => {
    // Detect country on mount if not already set
    if (!config.destinationCountry) {
      detectCountryFromBrowser().then(country => {
        setDetectedCountry(country);
        updateConfig({ destinationCountry: country });
        setIsDetecting(false);
      });
    } else {
      setIsDetecting(false);
    }
  }, []);

  const currentCountry = config.destinationCountry || detectedCountry || 'US';

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        🌍 Shipping To
      </label>
      {isDetecting ? (
        <div className="h-10 bg-gray-100 rounded-md animate-pulse" />
      ) : (
        <select
          value={currentCountry}
          onChange={(e) => {
            updateConfig({ destinationCountry: e.target.value });
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 text-sm [&>option]:text-gray-900 [&>option]:bg-white"
          style={{ color: '#111827' }}
        >
          {Object.entries(countriesByRegion).map(([region, countries]) => (
            <optgroup key={region} label={region} className="text-gray-900 bg-white">
              {countries.map(country => (
                <option key={country.code} value={country.code} className="text-gray-900 bg-white">
                  {country.flag} {country.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      )}
      {currentCountry && (
        <p className="text-xs text-gray-500">
          Prices and shipping calculated for {formatCountry(currentCountry)}
        </p>
      )}
    </div>
  );
}

