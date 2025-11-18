/**
 * Currency conversion service with live exchange rates
 * Uses ExchangeRate-API (free, no API key required)
 */

interface ExchangeRates {
  [currency: string]: number;
}

interface CachedRates {
  rates: ExchangeRates;
  timestamp: number;
  baseCurrency: string;
}

// In-memory cache (consider Redis for production with multiple servers)
let ratesCache: CachedRates | null = null;
const CACHE_DURATION = 12 * 60 * 60 * 1000; // 12 hours in milliseconds

// Fallback rates in case API is unavailable
const FALLBACK_RATES: ExchangeRates = {
  'USD': 1.0,
  'CAD': 1.35,
  'EUR': 0.92,
  'GBP': 0.79,
  'AUD': 1.52,
  'JPY': 149.50,
  'KRW': 1320.00,
  'SGD': 1.34,
  'HKD': 7.80,
  'CHF': 0.88,
  'SEK': 10.50,
  'NOK': 10.75,
  'DKK': 6.90,
  'PLN': 4.05,
  'CZK': 23.00,
  'HUF': 360.00,
  'MXN': 17.50,
  'BRL': 5.00,
  'INR': 83.00,
  'NZD': 1.62,
};

export class CurrencyService {
  private apiUrl: string;

  constructor() {
    // Using ExchangeRate-API (Free, no API key needed, 1500 requests/month)
    this.apiUrl = 'https://api.exchangerate-api.com/v4/latest/USD';
  }

  /**
   * Fetch live exchange rates from API
   */
  async fetchLiveRates(): Promise<ExchangeRates> {
    try {
      console.log('💱 Fetching live currency rates from API...');
      
      const response = await fetch(this.apiUrl, {
        headers: {
          'Accept': 'application/json',
        },
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.rates) {
        throw new Error('Invalid API response format');
      }

      console.log('✅ Live currency rates fetched successfully');
      console.log('📊 Sample rates:', {
        CAD: data.rates.CAD?.toFixed(4),
        EUR: data.rates.EUR?.toFixed(4),
        GBP: data.rates.GBP?.toFixed(4),
      });

      return data.rates as ExchangeRates;
    } catch (error) {
      console.error('❌ Failed to fetch live currency rates:', error);
      console.log('⚠️ Using fallback exchange rates');
      return FALLBACK_RATES;
    }
  }

  /**
   * Get exchange rates (from cache or fetch new)
   */
  async getRates(): Promise<ExchangeRates> {
    const now = Date.now();
    
    // Check if cache is still valid
    if (ratesCache && (now - ratesCache.timestamp) < CACHE_DURATION) {
      const ageMinutes = Math.round((now - ratesCache.timestamp) / 1000 / 60);
      console.log(`✅ Using cached currency rates (age: ${ageMinutes} minutes)`);
      return ratesCache.rates;
    }

    // Cache expired or doesn't exist, fetch new rates
    console.log('🔄 Currency cache expired or empty, fetching fresh rates...');
    const rates = await this.fetchLiveRates();
    
    // Update cache
    ratesCache = {
      rates,
      timestamp: now,
      baseCurrency: 'USD',
    };

    return rates;
  }

  /**
   * Convert amount from USD to target currency
   */
  async convertFromUSD(amountUSD: number, targetCurrency: string): Promise<number> {
    const rates = await this.getRates();
    const currency = targetCurrency.toUpperCase();
    
    // Get conversion rate
    const rate = rates[currency];
    
    if (!rate) {
      console.warn(`⚠️ Currency ${currency} not found, using 1.0 (no conversion)`);
      return amountUSD;
    }
    
    const converted = amountUSD * rate;
    
    // Handle zero-decimal currencies (currencies without cents)
    const zeroDecimalCurrencies = ['JPY', 'KRW', 'VND', 'CLP', 'PYG', 'UGX'];
    if (zeroDecimalCurrencies.includes(currency)) {
      return Math.round(converted);
    }
    
    // Round to 2 decimal places for normal currencies
    return Math.round(converted * 100) / 100;
  }

  /**
   * Convert between any two currencies
   */
  async convert(amount: number, fromCurrency: string, toCurrency: string): Promise<number> {
    const rates = await this.getRates();
    const from = fromCurrency.toUpperCase();
    const to = toCurrency.toUpperCase();
    
    // If converting from USD, use direct rate
    if (from === 'USD') {
      return this.convertFromUSD(amount, to);
    }
    
    // If converting to USD, inverse the rate
    if (to === 'USD') {
      const rate = rates[from] || 1.0;
      return Math.round((amount / rate) * 100) / 100;
    }
    
    // For other currency pairs, convert through USD
    const fromRate = rates[from] || 1.0;
    const toRate = rates[to] || 1.0;
    const amountInUSD = amount / fromRate;
    const converted = amountInUSD * toRate;
    
    return Math.round(converted * 100) / 100;
  }

  /**
   * Get exchange rate between two currencies
   */
  async getRate(fromCurrency: string, toCurrency: string): Promise<number> {
    const rates = await this.getRates();
    const from = fromCurrency.toUpperCase();
    const to = toCurrency.toUpperCase();
    
    if (from === 'USD') {
      return rates[to] || 1.0;
    }
    
    if (to === 'USD') {
      return 1 / (rates[from] || 1.0);
    }
    
    // Calculate cross rate through USD
    const fromRate = rates[from] || 1.0;
    const toRate = rates[to] || 1.0;
    return toRate / fromRate;
  }

  /**
   * Clear the cache (useful for manual refresh)
   */
  clearCache(): void {
    ratesCache = null;
    console.log('🗑️ Currency rates cache cleared');
  }

  /**
   * Get cache status
   */
  getCacheStatus(): { cached: boolean; age?: number; expiresIn?: number } {
    if (!ratesCache) {
      return { cached: false };
    }
    
    const now = Date.now();
    const age = now - ratesCache.timestamp;
    const expiresIn = CACHE_DURATION - age;
    
    return {
      cached: true,
      age: Math.round(age / 1000 / 60), // age in minutes
      expiresIn: Math.round(expiresIn / 1000 / 60), // expires in minutes
    };
  }
}

// Singleton instance
export const currencyService = new CurrencyService();

// Helper functions for convenient usage
export async function convertUSD(amountUSD: number, targetCurrency: string): Promise<number> {
  return currencyService.convertFromUSD(amountUSD, targetCurrency);
}

export async function convertCurrency(amount: number, from: string, to: string): Promise<number> {
  return currencyService.convert(amount, from, to);
}

export async function getExchangeRate(from: string, to: string): Promise<number> {
  return currencyService.getRate(from, to);
}

