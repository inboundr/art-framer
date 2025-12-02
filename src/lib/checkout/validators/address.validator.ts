/**
 * Address Validation
 */

import { z } from 'zod';
import { AddressError } from '../types/errors';
import type { ShippingAddress } from '../types/order.types';

export const ShippingAddressSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  address1: z.string().min(3, 'Street address is required'),
  address2: z.string().optional(),
  city: z.string().min(2, 'City is required'),
  state: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().length(2, 'Country code must be 2 characters'),
  phone: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  formattedAddress: z.string().optional(),
});

export function validateShippingAddress(address: unknown): ShippingAddress {
  try {
    return ShippingAddressSchema.parse(address);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new AddressError('Invalid shipping address', {
        issues: error.issues,
      });
    }
    throw error;
  }
}

export function validateAddressForShipping(address: ShippingAddress): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!address.address1 || address.address1.trim().length < 3) {
    errors.push('Street address is required');
  }

  if (!address.city || address.city.trim().length < 2) {
    errors.push('City is required');
  }

  if (!address.country || address.country.length !== 2) {
    errors.push('Country code is required (2 characters)');
  }

  // ZIP code validation for countries that require it
  const countriesRequiringZip = ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'IT', 'ES'];
  if (countriesRequiringZip.includes(address.country.toUpperCase())) {
    if (!address.zip || address.zip.trim().length < 3) {
      errors.push('ZIP/Postal code is required for this country');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

