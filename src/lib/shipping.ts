/**
 * Enhanced shipping service with robust error handling, validation, and testing support
 */

import { z } from 'zod';
import { prodigiClient } from './prodigi';
import { ShippingAddress, ShippingResult, ShippingCalculationError } from './pricing';

// Validation schemas
export const ShippingItemSchema = z.object({
  sku: z.string().min(1),
  quantity: z.number().int().min(1),
  price: z.number().min(0).optional(), // Product price for subtotal calculation
  weight: z.number().min(0).optional(),
  attributes: z.record(z.string(), z.string()).optional(), // Prodigi attributes like color, wrap
  dimensions: z.object({
    length: z.number().min(0),
    width: z.number().min(0),
    height: z.number().min(0),
  }).optional(),
});

export const ShippingOptionsSchema = z.object({
  expedited: z.boolean().optional().default(false),
  insurance: z.boolean().optional().default(false),
  signature: z.boolean().optional().default(false),
  trackingRequired: z.boolean().optional().default(true),
});

// Types
export type ShippingItem = z.infer<typeof ShippingItemSchema>;
export type ShippingOptions = z.infer<typeof ShippingOptionsSchema>;

export interface ShippingQuote {
  carrier: string;
  service: string;
  cost: number;
  currency: string;
  estimatedDays: number;  // Keep for backward compatibility
  estimatedDaysRange?: { min: number; max: number };  // NEW: Add range
  trackingAvailable: boolean;
  insuranceIncluded: boolean;
  signatureRequired: boolean;
}

// Currency conversion rates (approximate, should be updated regularly or fetched from API)
const CURRENCY_RATES: Record<string, number> = {
  'USD': 1.0,      // Base currency
  'CAD': 1.35,     // Canadian Dollar
  'EUR': 0.85,     // Euro  
  'GBP': 0.73,     // British Pound
  'AUD': 1.50,     // Australian Dollar
  'JPY': 150,      // Japanese Yen
  'CHF': 0.88,     // Swiss Franc
  'SEK': 10.5,     // Swedish Krona
  'NOK': 10.8,     // Norwegian Krone
  'DKK': 6.8,      // Danish Krone
  'PLN': 4.0,      // Polish Zloty
  'CZK': 22.5,     // Czech Koruna
  'HUF': 360,      // Hungarian Forint
  'SGD': 1.35,     // Singapore Dollar
  'HKD': 7.8,      // Hong Kong Dollar
  'KRW': 1300,     // South Korean Won
  'MXN': 17.5,     // Mexican Peso
  'BRL': 5.0,      // Brazilian Real
  'INR': 83,       // Indian Rupee
  'NZD': 1.65,     // New Zealand Dollar
};

// Convert amount from USD to target currency
function convertCurrency(amountUSD: number, targetCurrency: string): number {
  const rate = CURRENCY_RATES[targetCurrency.toUpperCase()] || 1.0;
  return Math.round((amountUSD * rate) * 100) / 100; // Round to 2 decimal places
}

// Get currency for country code
function getCurrencyForCountry(countryCode: string): string {
  const currencyMap: Record<string, string> = {
    'US': 'USD', 'CA': 'CAD', 'GB': 'GBP', 'AU': 'AUD', 'DE': 'EUR', 'FR': 'EUR',
    'IT': 'EUR', 'ES': 'EUR', 'NL': 'EUR', 'BE': 'EUR', 'AT': 'EUR', 'PT': 'EUR',
    'IE': 'EUR', 'FI': 'EUR', 'LU': 'EUR', 'JP': 'JPY', 'KR': 'KRW', 'SG': 'SGD',
    'HK': 'HKD', 'CH': 'CHF', 'SE': 'SEK', 'NO': 'NOK', 'DK': 'DKK', 'PL': 'PLN',
    'CZ': 'CZK', 'HU': 'HUF', 'MX': 'MXN', 'BR': 'BRL', 'IN': 'INR', 'NZ': 'NZD',
  };
  return currencyMap[countryCode.toUpperCase()] || 'USD';
}

export interface ShippingCalculationResult {
  quotes: ShippingQuote[];
  recommended: ShippingQuote;
  freeShippingAvailable: boolean;
  freeShippingThreshold?: number;
  calculatedAt: Date;
  isEstimated: boolean; // True if using fallback/estimated pricing
  provider: string; // Which provider was used
  addressValidated: boolean; // True if address was validated with Google
}

// Constants
export const SHIPPING_PROVIDERS = ['prodigi', 'fedex', 'ups', 'usps'] as const;
export const MAX_RETRY_ATTEMPTS = 3;
export const RETRY_DELAY_MS = 1000;
export const SHIPPING_TIMEOUT_MS = 30000;
export const FREE_SHIPPING_THRESHOLD = 100.00;

// Error classes
export class ShippingServiceError extends ShippingCalculationError {
  constructor(message: string, public provider: string, details?: any) {
    super(message, details);
    this.name = 'ShippingServiceError';
  }
}

export class ShippingTimeoutError extends ShippingServiceError {
  constructor(provider: string, timeoutMs: number) {
    super(`Shipping calculation timed out after ${timeoutMs}ms`, provider, { timeoutMs });
    this.name = 'ShippingTimeoutError';
  }
}

export class ShippingValidationError extends ShippingServiceError {
  constructor(message: string, details?: any) {
    super(message, 'validation', details);
    this.name = 'ShippingValidationError';
  }
}

/**
 * Enhanced shipping service with multiple providers and robust error handling
 */
export class ShippingService {
  private retryAttempts: number;
  private retryDelay: number;
  private timeout: number;

  constructor(
    retryAttempts: number = MAX_RETRY_ATTEMPTS,
    retryDelay: number = RETRY_DELAY_MS,
    timeout: number = SHIPPING_TIMEOUT_MS
  ) {
    this.retryAttempts = retryAttempts;
    this.retryDelay = retryDelay;
    this.timeout = timeout;
  }

  /**
   * GUARANTEED shipping calculation - Always returns a result
   * Uses multiple providers and intelligent fallbacks
   */
  async calculateShippingGuaranteed(
    items: ShippingItem[],
    address: ShippingAddress,
    options: ShippingOptions = {
      expedited: false,
      insurance: false,
      signature: false,
      trackingRequired: true,
    },
    addressValidated: boolean = false
  ): Promise<ShippingCalculationResult> {
    try {
      // First attempt: Use primary provider (Prodigi)
      const result = await this.calculateShipping(items, address, options);
      return {
        ...result,
        provider: 'prodigi',
        addressValidated,
        isEstimated: false,
      };
    } catch (error) {
      console.warn('Primary shipping calculation failed, using intelligent fallback:', error);
      
      // Fallback: Use intelligent estimation based on address and items
      const fallbackResult = this.calculateIntelligentFallback(items, address, options);
      return {
        ...fallbackResult,
        provider: 'intelligent_fallback',
        addressValidated,
        isEstimated: true,
      };
    }
  }

  /**
   * Intelligent fallback shipping calculation
   * Uses location-based and weight-based estimation
   */
  private calculateIntelligentFallback(
    items: ShippingItem[],
    address: ShippingAddress,
    options: ShippingOptions
  ): ShippingCalculationResult {
    const targetCurrency = getCurrencyForCountry(address.countryCode);
    const subtotal = this.calculateSubtotal(items);
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    
    // Base shipping cost calculation
    let baseCost = 8.99; // Standard base rate
    
    // Country-based adjustments
    const countryMultipliers = {
      'US': 1.0,
      'CA': 1.3,
      'GB': 1.8,
      'AU': 2.2,
      'DE': 1.9,
      'FR': 1.9,
      'IT': 2.0,
      'ES': 1.9,
    };
    
    const countryMultiplier = countryMultipliers[address.countryCode as keyof typeof countryMultipliers] || 2.5;
    baseCost *= countryMultiplier;
    
    // Quantity-based adjustments
    if (totalQuantity > 1) {
      baseCost += (totalQuantity - 1) * 3.99; // Additional items
    }
    
    // Size-based adjustments (estimate from SKU if available)
    const hasLargeItems = items.some(item => 
      item.sku.includes('large') || item.sku.includes('extra_large')
    );
    if (hasLargeItems) {
      baseCost += 5.99;
    }
    
    // Expedited shipping
    if (options.expedited) {
      baseCost *= 1.8;
    }
    
    // Insurance
    if (options.insurance) {
      baseCost += Math.max(2.99, subtotal * 0.02);
    }
    
    // Estimate delivery days with ranges (minimum 4 days)
    let estimatedDaysRange: { min: number; max: number };
    if (address.countryCode === 'US') {
      estimatedDaysRange = options.expedited ? { min: 4, max: 6 } : { min: 5, max: 8 };
    } else if (['CA', 'GB'].includes(address.countryCode)) {
      estimatedDaysRange = options.expedited ? { min: 5, max: 7 } : { min: 7, max: 12 };
    } else {
      estimatedDaysRange = options.expedited ? { min: 7, max: 10 } : { min: 10, max: 15 };
    }
    
    // Ensure minimum is always at least 4 days
    estimatedDaysRange = {
      min: Math.max(estimatedDaysRange.min, 4),
      max: Math.max(estimatedDaysRange.max, estimatedDaysRange.min + 1)
    };
    
    const estimatedDays = estimatedDaysRange.max; // Use max for backward compatibility
    
    // Convert to target currency
    const convertedBaseCost = convertCurrency(baseCost, targetCurrency);
    const convertedExpressCost = convertCurrency(baseCost * 1.6, targetCurrency);
    
    // Create shipping quotes
    const standardQuote: ShippingQuote = {
      carrier: 'Estimated',
      service: options.expedited ? 'Express Shipping' : 'Standard Shipping',
      cost: convertedBaseCost,
      currency: targetCurrency,
      estimatedDays,
      estimatedDaysRange,
      trackingAvailable: true,
      insuranceIncluded: options.insurance || false,
      signatureRequired: options.signature || false,
    };
    
    // Create alternative quote (slightly more expensive, faster)
    const expressRange = {
      min: Math.max(4, Math.floor(estimatedDaysRange.min * 0.6)),
      max: Math.max(5, Math.floor(estimatedDaysRange.max * 0.6))
    };
    const expressQuote: ShippingQuote = {
      carrier: 'Estimated',
      service: 'Express Shipping',
      cost: convertedExpressCost,
      currency: targetCurrency,
      estimatedDays: expressRange.max,
      estimatedDaysRange: expressRange,
      trackingAvailable: true,
      insuranceIncluded: true,
      signatureRequired: options.signature || false,
    };
    
    const quotes = options.expedited ? [expressQuote, standardQuote] : [standardQuote, expressQuote];
    
    // Check free shipping
    const freeShippingAvailable = subtotal >= FREE_SHIPPING_THRESHOLD;
    
    // If free shipping is available, set shipping cost to 0
    if (freeShippingAvailable) {
      const freeShippingQuotes = quotes.map(quote => ({
        ...quote,
        cost: 0,
        service: `Free ${quote.service}`,
      }));
      
      return {
        quotes: freeShippingQuotes,
        recommended: freeShippingQuotes[0],
        freeShippingAvailable: true,
        freeShippingThreshold: undefined,
        calculatedAt: new Date(),
        isEstimated: true,
        provider: 'intelligent_fallback',
        addressValidated: false,
      };
    }
    
    return {
      quotes,
      recommended: quotes[0],
      freeShippingAvailable: false,
      freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
      calculatedAt: new Date(),
      isEstimated: true,
      provider: 'intelligent_fallback',
      addressValidated: false,
    };
  }

  /**
   * Calculate shipping costs with multiple providers and fallbacks
   */
  async calculateShipping(
    items: ShippingItem[],
    address: ShippingAddress,
    options: ShippingOptions = {
      expedited: false,
      insurance: false,
      signature: false,
      trackingRequired: true,
    }
  ): Promise<ShippingCalculationResult> {
    try {
      // Validate inputs
      this.validateShippingRequest(items, address, options);

      // Get quotes from available providers
      const quotes = await this.getShippingQuotes(items, address, options);

      if (quotes.length === 0) {
        throw new ShippingServiceError(
          'No shipping quotes available',
          'all_providers',
          { items, address, options }
        );
      }

      // Find recommended quote (cheapest with reasonable delivery time)
      const recommended = this.selectRecommendedQuote(quotes);

      // Check if free shipping is available (but don't automatically apply it)
      // Free shipping should be a business decision, not automatic
      const subtotal = this.calculateSubtotal(items);
      const freeShippingAvailable = subtotal >= FREE_SHIPPING_THRESHOLD;

      // Note: We're not automatically applying free shipping here
      // The actual shipping cost from Prodigi should always be returned
      // Free shipping can be applied at checkout/payment time if the business offers it

      return {
        quotes: quotes.sort((a, b) => a.cost - b.cost), // Sort by cost
        recommended,
        freeShippingAvailable: false,
        freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
        calculatedAt: new Date(),
        isEstimated: false,
        provider: 'prodigi',
        addressValidated: false,
      };
    } catch (error) {
      if (error instanceof ShippingServiceError) {
        throw error;
      }
      throw new ShippingServiceError(
        'Failed to calculate shipping',
        'unknown',
        { error: error instanceof Error ? error.message : error, items, address, options }
      );
    }
  }

  /**
   * Get shipping quotes from multiple providers with retry logic
   */
  private async getShippingQuotes(
    items: ShippingItem[],
    address: ShippingAddress,
    options: ShippingOptions
  ): Promise<ShippingQuote[]> {
    const quotes: ShippingQuote[] = [];
    const errors: Array<{ provider: string; error: any }> = [];

    // Try Prodigi first (primary provider)
    try {
      const prodigiQuote = await this.getProdigiQuote(items, address, options);
      quotes.push(prodigiQuote);
    } catch (error) {
      console.warn('Prodigi shipping calculation failed:', error);
      errors.push({ provider: 'prodigi', error });
    }

    // Add fallback providers here if needed
    // try {
    //   const fedexQuote = await this.getFedExQuote(items, address, options);
    //   quotes.push(fedexQuote);
    // } catch (error) {
    //   errors.push({ provider: 'fedex', error });
    // }

    // If no quotes were obtained, throw error with details
    if (quotes.length === 0) {
      throw new ShippingServiceError(
        'All shipping providers failed',
        'all_providers',
        { errors, items, address, options }
      );
    }

    return quotes;
  }

  /**
   * Get shipping quote from Prodigi with retry logic
   */
  private async getProdigiQuote(
    items: ShippingItem[],
    address: ShippingAddress,
    options: ShippingOptions
  ): Promise<ShippingQuote> {
    const prodigiItems = items.map(item => ({
      sku: item.sku,
      quantity: item.quantity,
      attributes: item.attributes || {},
    }));

    const result = await this.withRetry(
      () => this.callProdigiWithTimeout(prodigiItems, address),
      'prodigi'
    );

    // Validate response data
    if (typeof result.cost !== 'number' || isNaN(result.cost) || result.cost < 0) {
      throw new ShippingValidationError('Invalid cost in shipping response');
    }
    
    if (!result.currency || typeof result.currency !== 'string') {
      throw new ShippingValidationError('Invalid currency in shipping response');
    }
    
    if (typeof result.estimatedDays !== 'number' || isNaN(result.estimatedDays) || result.estimatedDays < 0) {
      throw new ShippingValidationError('Invalid estimated days in shipping response');
    }

    return {
      carrier: 'Prodigi',
      service: result.serviceName,
      cost: result.cost,
      currency: result.currency,
      estimatedDays: result.estimatedDays,
      estimatedDaysRange: result.estimatedDaysRange,  // Pass through the range
      trackingAvailable: result.trackingAvailable || true,
      insuranceIncluded: options.insurance || false,
      signatureRequired: options.signature || false,
    };
  }

  /**
   * Call Prodigi API with timeout protection
   */
  private async callProdigiWithTimeout(
    items: Array<{ sku: string; quantity: number; attributes?: Record<string, string> }>,
    address: ShippingAddress
  ): Promise<ShippingResult> {
    return new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new ShippingTimeoutError('prodigi', this.timeout));
      }, this.timeout);

      try {
        const result = await prodigiClient.calculateShippingCost(items, address);
        clearTimeout(timeoutId);
        
        // Enhance result with additional properties
        const enhancedResult: ShippingResult = {
          ...result,
          carrier: 'Prodigi',
          trackingAvailable: true,
        };
        
        resolve(enhancedResult);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  /**
   * Execute function with retry logic
   */
  private async withRetry<T>(
    fn: () => Promise<T>,
    provider: string,
    attempt: number = 1
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= this.retryAttempts) {
        throw new ShippingServiceError(
          `Failed after ${this.retryAttempts} attempts`,
          provider,
          { error: error instanceof Error ? error.message : error, attempts: attempt }
        );
      }

      // Wait before retrying (exponential backoff)
      const delay = this.retryDelay * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));

      return this.withRetry(fn, provider, attempt + 1);
    }
  }

  /**
   * Select the best shipping quote based on cost and delivery time
   */
  private selectRecommendedQuote(quotes: ShippingQuote[]): ShippingQuote {
    if (quotes.length === 1) {
      return quotes[0];
    }

    // Score each quote based on cost and delivery time
    const scoredQuotes = quotes.map(quote => ({
      quote,
      score: this.calculateQuoteScore(quote),
    }));

    // Return the quote with the best score
    scoredQuotes.sort((a, b) => b.score - a.score);
    return scoredQuotes[0].quote;
  }

  /**
   * Calculate a score for a shipping quote (higher is better)
   */
  private calculateQuoteScore(quote: ShippingQuote): number {
    // Normalize cost (lower is better, so invert)
    const costScore = Math.max(0, 100 - quote.cost);
    
    // Normalize delivery time (lower is better, so invert)
    const speedScore = Math.max(0, 20 - quote.estimatedDays) * 2;
    
    // Bonus for tracking and insurance
    const featuresScore = (quote.trackingAvailable ? 10 : 0) + (quote.insuranceIncluded ? 5 : 0);
    
    return costScore + speedScore + featuresScore;
  }

  /**
   * Validate shipping request inputs
   */
  private validateShippingRequest(
    items: ShippingItem[],
    address: ShippingAddress,
    options: ShippingOptions
  ): void {
    // Validate items
    if (!items || items.length === 0) {
      throw new ShippingValidationError('Items array cannot be empty');
    }

    items.forEach((item, index) => {
      try {
        ShippingItemSchema.parse(item);
      } catch (error) {
        throw new ShippingValidationError(
          `Invalid item at index ${index}`,
          { item, error: error instanceof Error ? error.message : error }
        );
      }
    });

    // Validate address
    if (!address) {
      throw new ShippingValidationError('Shipping address is required');
    }

    // Additional business logic validation
    if (address.countryCode === 'US' && !address.postalCode) {
      throw new ShippingValidationError('Postal code is required for US addresses', { address });
    }

    // Validate options
    try {
      ShippingOptionsSchema.parse(options);
    } catch (error) {
      throw new ShippingValidationError(
        'Invalid shipping options',
        { options, error: error instanceof Error ? error.message : error }
      );
    }
  }

  /**
   * Calculate subtotal for free shipping determination
   */
  private calculateSubtotal(items: ShippingItem[]): number {
    return items.reduce((sum, item) => {
      const itemPrice = item.price || 35; // Use actual price or fallback to $35
      return sum + (item.quantity * itemPrice);
    }, 0);
  }

  /**
   * Check if address is valid for shipping
   */
  async validateShippingAddress(address: ShippingAddress): Promise<boolean> {
    try {
      // Validate address format
      if (!address.countryCode || address.countryCode.length !== 2) {
        throw new ShippingValidationError('Country code must be 2 characters');
      }
      
      if (!address.postalCode || address.postalCode.length < 3) {
        throw new ShippingValidationError('Postal code is required and must be at least 3 characters');
      }
      
      if (!address.city || address.city.length < 2) {
        throw new ShippingValidationError('City is required and must be at least 2 characters');
      }
      
      this.validateShippingRequest([{ sku: 'TEST', quantity: 1 }], address, {
        expedited: false,
        insurance: false,
        signature: false,
        trackingRequired: true,
      });
      
      // Additional validation could include:
      // - Address verification API calls
      // - Postal code format validation
      // - Restricted shipping zones
      
      return true;
    } catch (error) {
      if (error instanceof ShippingValidationError) {
        throw error;
      }
      return false;
    }
  }

  /**
   * Get supported shipping countries
   */
  getSupportedCountries(): string[] {
    return [
      'US', 'CA', 'GB', 'AU', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE',
      'AT', 'CH', 'SE', 'NO', 'DK', 'FI', 'IE', 'PT', 'LU', 'JP'
    ];
  }

  /**
   * Check if shipping is available to a country
   */
  isShippingAvailable(countryCode: string): boolean {
    return this.getSupportedCountries().includes(countryCode.toUpperCase());
  }

  /**
   * Get estimated delivery date
   */
  getEstimatedDeliveryDate(quote: ShippingQuote, orderDate: Date = new Date()): Date {
    const deliveryDate = new Date(orderDate);
    deliveryDate.setDate(deliveryDate.getDate() + quote.estimatedDays);
    
    // Skip weekends for business days calculation
    while (deliveryDate.getDay() === 0 || deliveryDate.getDay() === 6) {
      deliveryDate.setDate(deliveryDate.getDate() + 1);
    }
    
    return deliveryDate;
  }

  /**
   * Format shipping cost for display
   */
  formatShippingCost(quote: ShippingQuote): string {
    if (quote.cost === 0) {
      return 'FREE';
    }
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: quote.currency,
    }).format(quote.cost);
  }
}

// Default singleton instance
export const defaultShippingService = new ShippingService();

// Utility functions
export function createShippingService(
  retryAttempts?: number,
  retryDelay?: number,
  timeout?: number
): ShippingService {
  return new ShippingService(retryAttempts, retryDelay, timeout);
}

export function isValidShippingItem(item: any): item is ShippingItem {
  try {
    ShippingItemSchema.parse(item);
    return true;
  } catch {
    return false;
  }
}

export function isValidShippingOptions(options: any): options is ShippingOptions {
  try {
    ShippingOptionsSchema.parse(options);
    return true;
  } catch {
    return false;
  }
}
