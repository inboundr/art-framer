'use client';

import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

export interface SavedAddress {
  id: string;
  firstName: string;
  lastName: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone: string;
  isDefault?: boolean;
  createdAt: string;
}

export function useAddresses() {
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  // Load saved addresses from localStorage
  useEffect(() => {
    if (user) {
      const savedAddresses = localStorage.getItem(`addresses_${user.id}`);
      if (savedAddresses) {
        try {
          setAddresses(JSON.parse(savedAddresses));
        } catch (error) {
          console.error('Error loading saved addresses:', error);
        }
      }
    }
  }, [user]);

  const saveAddress = (address: Omit<SavedAddress, 'id' | 'createdAt'>) => {
    if (!user) return;

    const newAddress: SavedAddress = {
      ...address,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };

    const updatedAddresses = [...addresses, newAddress];
    setAddresses(updatedAddresses);
    
    // Save to localStorage
    localStorage.setItem(`addresses_${user.id}`, JSON.stringify(updatedAddresses));
  };

  const updateAddress = (id: string, updates: Partial<SavedAddress>) => {
    if (!user) return;

    const updatedAddresses = addresses.map(addr => 
      addr.id === id ? { ...addr, ...updates } : addr
    );
    setAddresses(updatedAddresses);
    
    // Save to localStorage
    localStorage.setItem(`addresses_${user.id}`, JSON.stringify(updatedAddresses));
  };

  const deleteAddress = (id: string) => {
    if (!user) return;

    const updatedAddresses = addresses.filter(addr => addr.id !== id);
    setAddresses(updatedAddresses);
    
    // Save to localStorage
    localStorage.setItem(`addresses_${user.id}`, JSON.stringify(updatedAddresses));
  };

  const getDefaultAddress = (): SavedAddress | null => {
    return addresses.find(addr => addr.isDefault) || addresses[0] || null;
  };

  return {
    addresses,
    loading,
    saveAddress,
    updateAddress,
    deleteAddress,
    getDefaultAddress,
  };
}
