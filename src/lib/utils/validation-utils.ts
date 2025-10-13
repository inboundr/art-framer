// Validation utility functions for testing

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface Address {
  firstName: string;
  lastName: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone?: string;
  email?: string;
}

export function validateShippingAddress(address: Address): ValidationResult {
  const errors: string[] = [];

  if (!address.firstName?.trim()) {
    errors.push('First name is required');
  }
  if (!address.lastName?.trim()) {
    errors.push('Last name is required');
  }
  if (!address.address1?.trim()) {
    errors.push('Address is required');
  }
  if (!address.city?.trim()) {
    errors.push('City is required');
  }
  if (!address.state?.trim()) {
    errors.push('State is required');
  }
  if (!address.zip?.trim()) {
    errors.push('ZIP code is required');
  }
  if (!address.country?.trim()) {
    errors.push('Country is required');
  }
  if (!address.phone?.trim()) {
    errors.push('Phone number is required');
  }

  // Email validation
  if (address.email && !validateEmail(address.email)) {
    errors.push('Invalid email format');
  }

  // Phone validation
  if (address.phone && !validatePhone(address.phone)) {
    errors.push('Invalid phone number format');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateBillingAddress(address: Omit<Address, 'phone' | 'email'>): ValidationResult {
  const errors: string[] = [];

  if (!address.firstName?.trim()) {
    errors.push('First name is required');
  }
  if (!address.lastName?.trim()) {
    errors.push('Last name is required');
  }
  if (!address.address1?.trim()) {
    errors.push('Address is required');
  }
  if (!address.city?.trim()) {
    errors.push('City is required');
  }
  if (!address.state?.trim()) {
    errors.push('State is required');
  }
  if (!address.zip?.trim()) {
    errors.push('ZIP code is required');
  }
  if (!address.country?.trim()) {
    errors.push('Country is required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateEmail(email: string): boolean {
  if (!email?.trim()) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePhone(phone: string): boolean {
  if (!phone?.trim()) return false;
  // Allow various phone formats
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  return phoneRegex.test(cleanPhone) && cleanPhone.length >= 7;
}
