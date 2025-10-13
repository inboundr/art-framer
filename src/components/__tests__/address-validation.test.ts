import { validateShippingAddress, validateBillingAddress, validateEmail, validatePhone } from '../../lib/utils/validation-utils';

describe('Address Validation', () => {
  describe('validateShippingAddress', () => {
    it('validates required fields', () => {
      const incompleteAddress = {
        firstName: '',
        lastName: '',
        address1: '',
        city: '',
        state: '',
        zip: '',
        country: '',
        phone: ''
      };

      const result = validateShippingAddress(incompleteAddress);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('First name is required');
      expect(result.errors).toContain('Last name is required');
      expect(result.errors).toContain('Address is required');
      expect(result.errors).toContain('City is required');
      expect(result.errors).toContain('State is required');
      expect(result.errors).toContain('ZIP code is required');
      expect(result.errors).toContain('Country is required');
      expect(result.errors).toContain('Phone number is required');
    });

    it('validates email format', () => {
      const addressWithInvalidEmail = {
        firstName: 'John',
        lastName: 'Doe',
        address1: '123 Test St',
        city: 'Test City',
        state: 'TS',
        zip: '12345',
        country: 'US',
        phone: '555-0123',
        email: 'invalid-email'
      };

      const result = validateShippingAddress(addressWithInvalidEmail);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid email format');
    });

    it('validates phone number format', () => {
      const addressWithInvalidPhone = {
        firstName: 'John',
        lastName: 'Doe',
        address1: '123 Test St',
        city: 'Test City',
        state: 'TS',
        zip: '12345',
        country: 'US',
        phone: 'invalid-phone',
        email: 'test@example.com'
      };

      const result = validateShippingAddress(addressWithInvalidPhone);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid phone number format');
    });

    it('accepts valid address', () => {
      const validAddress = {
        firstName: 'John',
        lastName: 'Doe',
        address1: '123 Test St',
        city: 'Test City',
        state: 'TS',
        zip: '12345',
        country: 'US',
        phone: '555-0123',
        email: 'test@example.com'
      };

      const result = validateShippingAddress(validAddress);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('validates international addresses', () => {
      const internationalAddress = {
        firstName: 'Jean',
        lastName: 'Dupont',
        address1: '123 Rue de la Paix',
        city: 'Paris',
        state: 'Île-de-France',
        zip: '75001',
        country: 'FR',
        phone: '+33 1 23 45 67 89',
        email: 'jean@example.fr'
      };

      const result = validateShippingAddress(internationalAddress);
      expect(result.isValid).toBe(true);
    });

    it('handles special characters in names', () => {
      const addressWithSpecialChars = {
        firstName: 'José',
        lastName: 'García-López',
        address1: '123 Calle Mayor',
        city: 'Madrid',
        state: 'Madrid',
        zip: '28001',
        country: 'ES',
        phone: '+34 91 123 45 67',
        email: 'jose@example.es'
      };

      const result = validateShippingAddress(addressWithSpecialChars);
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateBillingAddress', () => {
    it('validates required fields', () => {
      const incompleteBilling = {
        firstName: '',
        lastName: '',
        address1: '',
        city: '',
        state: '',
        zip: '',
        country: ''
      };

      const result = validateBillingAddress(incompleteBilling);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('accepts valid billing address', () => {
      const validBilling = {
        firstName: 'John',
        lastName: 'Doe',
        address1: '123 Test St',
        city: 'Test City',
        state: 'TS',
        zip: '12345',
        country: 'US'
      };

      const result = validateBillingAddress(validBilling);
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateEmail', () => {
    it('validates email format', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.co.uk')).toBe(true);
      expect(validateEmail('invalid-email')).toBe(false);
      expect(validateEmail('@domain.com')).toBe(false);
      expect(validateEmail('user@')).toBe(false);
      expect(validateEmail('')).toBe(false);
    });

    it('handles edge cases', () => {
      expect(validateEmail('test+tag@example.com')).toBe(true);
      expect(validateEmail('test@sub.domain.com')).toBe(true);
      expect(validateEmail('test@domain')).toBe(false);
    });
  });

  describe('validatePhone', () => {
    it('validates phone number format', () => {
      expect(validatePhone('555-0123')).toBe(true);
      expect(validatePhone('(555) 012-3456')).toBe(true);
      expect(validatePhone('+1 555 012 3456')).toBe(true);
      expect(validatePhone('+33 1 23 45 67 89')).toBe(true);
      expect(validatePhone('invalid-phone')).toBe(false);
      expect(validatePhone('123')).toBe(false);
      expect(validatePhone('')).toBe(false);
    });

    it('handles international formats', () => {
      expect(validatePhone('+44 20 7946 0958')).toBe(true);
      expect(validatePhone('+49 30 12345678')).toBe(true);
      expect(validatePhone('+81 3 1234 5678')).toBe(true);
    });
  });
});
