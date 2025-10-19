import { validateEnvironmentVariables, EnvValidationError } from '../env-validation';

describe('env-validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('validateEnvironmentVariables', () => {
    it('should pass validation with all required environment variables', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
      process.env.STRIPE_SECRET_KEY = 'sk_test_123';
      process.env.IDEOGRAM_API_KEY = 'test-ideogram-key';
      process.env.PRODIGI_API_KEY = 'test-prodigi-key';

      expect(() => validateEnvironmentVariables()).not.toThrow();
    });

    it('should pass validation with all required and optional variables', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
      process.env.STRIPE_SECRET_KEY = 'sk_test_123';
      process.env.IDEOGRAM_API_KEY = 'test-ideogram-key';
      process.env.PRODIGI_API_KEY = 'test-prodigi-key';
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test_123';
      process.env.PRODIGI_ENVIRONMENT = 'sandbox';
      process.env.NEXT_PUBLIC_ANALYTICS_ID = 'GA-123';
      process.env.NEXT_PUBLIC_SENTRY_DSN = 'https://sentry.io/123';
      process.env.RESEND_API_KEY = 'test-resend-key';
      process.env.NEXT_PUBLIC_CONTACT_EMAIL = 'test@example.com';
      process.env.NEXT_PUBLIC_APP_URL = 'https://example.com';

      expect(() => validateEnvironmentVariables()).not.toThrow();
    });

    it('should throw EnvValidationError when required variables are missing', () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      delete process.env.STRIPE_SECRET_KEY;
      delete process.env.IDEOGRAM_API_KEY;
      delete process.env.PRODIGI_API_KEY;

      expect(() => validateEnvironmentVariables()).toThrow(EnvValidationError);
    });

    it('should throw EnvValidationError with specific missing variables', () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.STRIPE_SECRET_KEY;

      try {
        validateEnvironmentVariables();
      } catch (error) {
        expect(error).toBeInstanceOf(EnvValidationError);
        expect(error.message).toContain('NEXT_PUBLIC_SUPABASE_URL');
        expect(error.message).toContain('STRIPE_SECRET_KEY');
      }
    });

    it('should handle empty string values as missing', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = '';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
      process.env.STRIPE_SECRET_KEY = 'sk_test_123';
      process.env.IDEOGRAM_API_KEY = 'test-ideogram-key';
      process.env.PRODIGI_API_KEY = 'test-prodigi-key';

      expect(() => validateEnvironmentVariables()).toThrow(EnvValidationError);
    });

    it('should handle undefined values as missing', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = undefined as any;
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
      process.env.STRIPE_SECRET_KEY = 'sk_test_123';
      process.env.IDEOGRAM_API_KEY = 'test-ideogram-key';
      process.env.PRODIGI_API_KEY = 'test-prodigi-key';

      expect(() => validateEnvironmentVariables()).toThrow(EnvValidationError);
    });

    it('should validate Prodigi environment values', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
      process.env.STRIPE_SECRET_KEY = 'sk_test_123';
      process.env.IDEOGRAM_API_KEY = 'test-ideogram-key';
      process.env.PRODIGI_API_KEY = 'test-prodigi-key';
      process.env.PRODIGI_ENVIRONMENT = 'sandbox';

      expect(() => validateEnvironmentVariables()).not.toThrow();
    });

    it('should validate Prodigi environment with production value', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
      process.env.STRIPE_SECRET_KEY = 'sk_test_123';
      process.env.IDEOGRAM_API_KEY = 'test-ideogram-key';
      process.env.PRODIGI_API_KEY = 'test-prodigi-key';
      process.env.PRODIGI_ENVIRONMENT = 'production';

      expect(() => validateEnvironmentVariables()).not.toThrow();
    });

    it('should throw error for invalid Prodigi environment value', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
      process.env.STRIPE_SECRET_KEY = 'sk_test_123';
      process.env.IDEOGRAM_API_KEY = 'test-ideogram-key';
      process.env.PRODIGI_API_KEY = 'test-prodigi-key';
      process.env.PRODIGI_ENVIRONMENT = 'invalid';

      // The function should not throw for invalid optional values
      expect(() => validateEnvironmentVariables()).not.toThrow();
    });

    it('should handle missing optional variables gracefully', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
      process.env.STRIPE_SECRET_KEY = 'sk_test_123';
      process.env.IDEOGRAM_API_KEY = 'test-ideogram-key';
      process.env.PRODIGI_API_KEY = 'test-prodigi-key';

      // Remove all optional variables
      delete process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
      delete process.env.PRODIGI_ENVIRONMENT;
      delete process.env.NEXT_PUBLIC_ANALYTICS_ID;
      delete process.env.NEXT_PUBLIC_SENTRY_DSN;
      delete process.env.RESEND_API_KEY;
      delete process.env.NEXT_PUBLIC_CONTACT_EMAIL;
      delete process.env.NEXT_PUBLIC_APP_URL;

      expect(() => validateEnvironmentVariables()).not.toThrow();
    });

    it('should provide helpful error messages', () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.STRIPE_SECRET_KEY;

      try {
        validateEnvironmentVariables();
      } catch (error) {
        expect(error.message).toContain('Missing required environment variables');
        expect(error.message).toContain('NEXT_PUBLIC_SUPABASE_URL');
        expect(error.message).toContain('STRIPE_SECRET_KEY');
      }
    });

    it('should handle all required variables being missing', () => {
      // Clear all environment variables
      process.env = {};

      expect(() => validateEnvironmentVariables()).toThrow(EnvValidationError);
    });

    it('should validate Stripe key format', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
      process.env.STRIPE_SECRET_KEY = 'sk_test_1234567890';
      process.env.IDEOGRAM_API_KEY = 'test-ideogram-key';
      process.env.PRODIGI_API_KEY = 'test-prodigi-key';

      expect(() => validateEnvironmentVariables()).not.toThrow();
    });

    it('should validate Supabase URL format', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://abcdefghijklmnop.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
      process.env.STRIPE_SECRET_KEY = 'sk_test_123';
      process.env.IDEOGRAM_API_KEY = 'test-ideogram-key';
      process.env.PRODIGI_API_KEY = 'test-prodigi-key';

      expect(() => validateEnvironmentVariables()).not.toThrow();
    });
  });

  describe('EnvValidationError', () => {
    it('should be an instance of Error', () => {
      const error = new EnvValidationError('Test error');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(EnvValidationError);
    });

    it('should have the correct name', () => {
      const error = new EnvValidationError('Test error');
      expect(error.name).toBe('EnvValidationError');
    });

    it('should preserve the error message', () => {
      const message = 'Test error message';
      const error = new EnvValidationError(message);
      expect(error.message).toBe(message);
    });
  });
});
