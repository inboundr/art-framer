/**
 * Currency conversion service with live rates
 * Caches rates to avoid excessive API calls
 */

interface ExchangeRates {
  [currency: string]: number;
}

interface CachedRates {
  rates: ExchangeRates;
  timestamp: number;
  baseCurrency: string;
}

// Cache rates in memory (consider Redis for production)
let ratesCache: CachedRates | null = null;
const CACHE_DURATION = 12 * 60 * 60 * 1000; // 12 hours

// Fallback rates in case API fails
const FALLBACK_RATES: ExchangeRates = {
  'USD': 1.0,
  'CAD': 1.35,
  'GBP': 0.79,
  'AUD': 1.52,
  'EUR': 0.92,
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
  private apiKey?: string;

  constructor() {
    // Option 1: ExchangeRate-API (Free, no key needed)
    this.apiUrl = 'https://api.exchangerate-api.com/v4/latest/USD';
    
    // Option 2: Open Exchange Rates (Requires API key, more features)
    // this.apiKey = process.env.OPEN_EXCHANGE_RATES_API_KEY;
    // this.apiUrl = `https://openexchangerates.org/api/latest.json?app_id=${this.apiKey}`;
    
    // Option 3: Fixer.io (Requires API key)
    // this.apiKey = process.env.FIXER_API_KEY;
    // this.apiUrl = `https://api.fixer.io/latest?access_key=${this.apiKey}`;
  }

  /**
   * Fetch live exchange rates from API
   */
  async fetchLiveRates(): Promise<ExchangeRates> {
    try {
      console.log('💱 Fetching live currency rates...');
      
      const response = await fetch(this.apiUrl, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      
      // Handle different API response formats
      let rates: ExchangeRates;
      
      if (data.rates) {
        // ExchangeRate-API and Open Exchange Rates format
        rates = data.rates;
      } else if (data.conversion_rates) {
        // Alternative API format
        rates = data.conversion_rates;
      } else {
        throw new Error('Unexpected API response format');
      }

      console.log('✅ Live currency rates fetched successfully');
      console.log('📊 Sample rates:', {
        CAD: rates.CAD,
        EUR: rates.EUR,
        GBP: rates.GBP,
      });

      return rates;
    } catch (error) {
      console.error('❌ Failed to fetch live currency rates:', error);
      console.log('⚠️ Falling back to hardcoded rates');
      return FALLBACK_RATES;
    }
  }

  /**
   * Get exchange rates (from cache or fetch new ones)
   */
  async getRates(): Promise<ExchangeRates> {
    const now = Date.now();
    
    // Check if cache is valid
    if (ratesCache && (now - ratesCache.timestamp) < CACHE_DURATION) {
      console.log('✅ Using cached currency rates', {
        age: Math.round((now - ratesCache.timestamp) / 1000 / 60) + ' minutes',
      });
      return ratesCache.rates;
    }

    // Fetch new rates
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
    const rate = rates[currency] || 1.0;
    
    if (!rates[currency]) {
      console.warn(`⚠️ Currency ${currency} not found in rates, using 1.0`);
    }
    
    const converted = amountUSD * rate;
    
    // Round to 2 decimal places for most currencies
    // For zero-decimal currencies like JPY, KRW, round to nearest whole number
    const zeroDecimalCurrencies = ['JPY', 'KRW', 'VND', 'CLP'];
    if (zeroDecimalCurrencies.includes(currency)) {
      return Math.round(converted);
    }
    
    return Math.round(converted * 100) / 100;
  }

  /**
   * Convert between any two currencies
   */
  async convert(amount: number, fromCurrency: string, toCurrency: string): Promise<number> {
    const rates = await this.getRates();
    const from = fromCurrency.toUpperCase();
    const to = toCurrency.toUpperCase();
    
    // If base currency is USD, direct conversion
    if (from === 'USD') {
      return this.convertFromUSD(amount, to);
    }
    
    // If converting to USD
    if (to === 'USD') {
      const rate = rates[from] || 1.0;
      return Math.round((amount / rate) * 100) / 100;
    }
    
    // Convert through USD (from -> USD -> to)
    const amountInUSD = amount / (rates[from] || 1.0);
    return this.convertFromUSD(amountInUSD, to);
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
   * Format amount with currency symbol
   */
  formatCurrency(amount: number, currency: string): string {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency.toUpperCase(),
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch (error) {
      // Fallback formatting
      return `${currency.toUpperCase()} ${amount.toFixed(2)}`;
    }
  }
}

// Singleton instance
export const currencyService = new CurrencyService();

// Helper functions for easy use
export async function convertUSD(amountUSD: number, targetCurrency: string): Promise<number> {
  return currencyService.convertFromUSD(amountUSD, targetCurrency);
}

export async function convertCurrency(amount: number, from: string, to: string): Promise<number> {
  return currencyService.convert(amount, from, to);
}

export async function getExchangeRate(from: string, to: string): Promise<number> {
  return currencyService.getRate(from, to);
}

export function formatMoney(amount: number, currency: string): string {
  return currencyService.formatCurrency(amount, currency);
}

