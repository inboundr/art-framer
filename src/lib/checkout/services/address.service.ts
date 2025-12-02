/**
 * Address Service for V2 Checkout
 * 
 * Handles address validation, normalization, and storage
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { AddressError } from '../types/errors';
import type { ShippingAddress, SavedAddress } from '../types/order.types';
import { validateShippingAddress } from '../validators/address.validator';

export class AddressService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Validate address with Google Maps (if available)
   * In production, this would integrate with Google Maps API
   */
  async validateAddress(address: ShippingAddress): Promise<{
    valid: boolean;
    address?: ShippingAddress;
    errors: string[];
  }> {
    try {
      // Basic validation
      const validated = validateShippingAddress(address);

      // Additional validation
      if (!validated.address1 || validated.address1.trim().length < 3) {
        return {
          valid: false,
          errors: ['Street address is required'],
        };
      }

      if (!validated.city || validated.city.trim().length < 2) {
        return {
          valid: false,
          errors: ['City is required'],
        };
      }

      if (!validated.country || validated.country.length !== 2) {
        return {
          valid: false,
          errors: ['Country code is required (2 characters)'],
        };
      }

      return {
        valid: true,
        address: validated,
        errors: [],
      };
    } catch (error) {
      if (error instanceof AddressError) {
        return {
          valid: false,
          errors: [error.message],
        };
      }
      throw new AddressError('Failed to validate address', {
        originalError: error,
      });
    }
  }

  /**
   * Normalize address format
   */
  normalizeAddress(address: ShippingAddress): ShippingAddress {
    return {
      ...address,
      address1: address.address1?.trim() || '',
      address2: address.address2?.trim() || undefined,
      city: address.city?.trim() || '',
      state: address.state?.trim() || undefined,
      zip: address.zip?.trim() || undefined,
      country: address.country?.toUpperCase().trim() || '',
      phone: address.phone?.trim() || undefined,
    };
  }

  /**
   * Save address to user profile
   */
  async saveAddress(
    userId: string,
    address: ShippingAddress,
    label?: string,
    isDefault: boolean = false
  ): Promise<SavedAddress> {
    try {
      const normalized = this.normalizeAddress(address);

      // If this is set as default, unset other defaults
      if (isDefault) {
        await this.supabase
          .from('user_addresses')
          .update({ is_default: false })
          .eq('user_id', userId);
      }

      const { data, error } = await this.supabase
        .from('user_addresses')
        .insert({
          user_id: userId,
          label: label || 'Home',
          address: normalized,
          is_default: isDefault,
        })
        .select()
        .single();

      if (error || !data) {
        throw new AddressError('Failed to save address', { error });
      }

      return {
        id: data.id,
        userId: data.user_id,
        label: data.label,
        address: data.address as ShippingAddress,
        isDefault: data.is_default,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at || data.created_at),
      };
    } catch (error) {
      if (error instanceof AddressError) {
        throw error;
      }
      throw new AddressError('Failed to save address', {
        originalError: error,
      });
    }
  }

  /**
   * Get saved addresses for user
   */
  async getSavedAddresses(userId: string): Promise<SavedAddress[]> {
    try {
      const { data, error } = await this.supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', userId)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        throw new AddressError('Failed to fetch addresses', { error });
      }

      return (data || []).map((addr: any) => ({
        id: addr.id,
        userId: addr.user_id,
        label: addr.label,
        address: addr.address as ShippingAddress,
        isDefault: addr.is_default,
        createdAt: new Date(addr.created_at),
        updatedAt: new Date(addr.updated_at || addr.created_at),
      }));
    } catch (error) {
      if (error instanceof AddressError) {
        throw error;
      }
      throw new AddressError('Failed to get saved addresses', {
        originalError: error,
      });
    }
  }

  /**
   * Get default address for user
   */
  async getDefaultAddress(userId: string): Promise<SavedAddress | null> {
    try {
      const { data, error } = await this.supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', userId)
        .eq('is_default', true)
        .single();

      if (error || !data) {
        return null;
      }

      return {
        id: data.id,
        userId: data.user_id,
        label: data.label,
        address: data.address as ShippingAddress,
        isDefault: data.is_default,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at || data.created_at),
      };
    } catch (error) {
      return null;
    }
  }
}




