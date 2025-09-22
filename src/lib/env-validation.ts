/**
 * Environment Variables Validation
 * Ensures all required environment variables are set before the application starts
 */

interface EnvConfig {
  // Supabase (Required)
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  
  // Stripe (Required for payments)
  STRIPE_SECRET_KEY: string;
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?: string;
  
  // Ideogram AI (Required for image generation)
  IDEOGRAM_API_KEY: string;
  
  // Prodigi (Required for print fulfillment)
  PRODIGI_API_KEY: string;
  PRODIGI_ENVIRONMENT?: 'sandbox' | 'production';
  
  // Optional
  NEXT_PUBLIC_ANALYTICS_ID?: string;
  NEXT_PUBLIC_SENTRY_DSN?: string;
  RESEND_API_KEY?: string;
  NEXT_PUBLIC_CONTACT_EMAIL?: string;
  NEXT_PUBLIC_APP_URL?: string;
}

const requiredEnvVars: (keyof EnvConfig)[] = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'STRIPE_SECRET_KEY',
  'IDEOGRAM_API_KEY',
  'PRODIGI_API_KEY',
];

const optionalEnvVars: (keyof EnvConfig)[] = [
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'PRODIGI_ENVIRONMENT',
  'NEXT_PUBLIC_ANALYTICS_ID',
  'NEXT_PUBLIC_SENTRY_DSN',
  'RESEND_API_KEY',
  'NEXT_PUBLIC_CONTACT_EMAIL',
  'NEXT_PUBLIC_APP_URL',
];

export class EnvValidationError extends Error {
  constructor(message: string, public missingVars: string[]) {
    super(message);
    this.name = 'EnvValidationError';
  }
}

/**
 * Validates that all required environment variables are set
 * @param throwOnMissing - Whether to throw an error if variables are missing
 * @returns Object with validation results
 */
export function validateEnvironmentVariables(throwOnMissing: boolean = true): {
  isValid: boolean;
  missing: string[];
  warnings: string[];
  config: Partial<EnvConfig>;
} {
  const missing: string[] = [];
  const warnings: string[] = [];
  const config: Partial<EnvConfig> = {};

  // Check required variables
  for (const varName of requiredEnvVars) {
    const value = process.env[varName];
    if (!value || value.trim() === '' || value === `your_${varName.toLowerCase()}`) {
      missing.push(varName);
    } else {
      (config as any)[varName] = value;
    }
  }

  // Check optional variables and set defaults
  for (const varName of optionalEnvVars) {
    const value = process.env[varName];
    if (value && value.trim() !== '' && value !== `your_${varName.toLowerCase()}`) {
      (config as any)[varName] = value;
    } else {
      // Set sensible defaults for optional vars
      switch (varName) {
        case 'PRODIGI_ENVIRONMENT':
          (config as any)[varName] = 'sandbox';
          break;
        case 'NEXT_PUBLIC_APP_URL':
          (config as any)[varName] = process.env.NODE_ENV === 'production' 
            ? 'https://your-domain.com' 
            : 'http://localhost:3000';
          break;
        case 'NEXT_PUBLIC_CONTACT_EMAIL':
          (config as any)[varName] = 'support@artframer.com';
          break;
      }
    }
  }

  // Generate warnings for common issues
  if (config.STRIPE_SECRET_KEY?.startsWith('sk_live_') && process.env.NODE_ENV !== 'production') {
    warnings.push('Using live Stripe keys in non-production environment');
  }

  if (config.PRODIGI_ENVIRONMENT === 'production' && process.env.NODE_ENV !== 'production') {
    warnings.push('Using production Prodigi environment in non-production mode');
  }

  const isValid = missing.length === 0;

  if (!isValid && throwOnMissing) {
    const errorMessage = `Missing required environment variables: ${missing.join(', ')}\n\n` +
      `Please check your .env.local file and ensure all required variables are set.\n` +
      `You can copy env.template to .env.local as a starting point.\n\n` +
      `Required variables:\n${requiredEnvVars.map(v => `  - ${v}`).join('\n')}`;
    
    throw new EnvValidationError(errorMessage, missing);
  }

  return {
    isValid,
    missing,
    warnings,
    config,
  };
}

/**
 * Gets a validated environment configuration
 * Throws an error if required variables are missing
 */
export function getEnvConfig(): EnvConfig {
  const { config } = validateEnvironmentVariables(true);
  return config as EnvConfig;
}

/**
 * Safely gets an environment variable with a default value
 */
export function getEnvVar(name: string, defaultValue: string = ''): string {
  return process.env[name] || defaultValue;
}

/**
 * Checks if we're in development mode
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Checks if we're in production mode
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Gets the app URL based on environment
 */
export function getAppUrl(): string {
  return getEnvVar('NEXT_PUBLIC_APP_URL', 
    isProduction() ? 'https://your-domain.com' : 'http://localhost:3000'
  );
}

// Validate environment variables on module load (server-side only)
if (typeof window === 'undefined') {
  try {
    const validation = validateEnvironmentVariables(false);
    
    if (!validation.isValid) {
      console.error('❌ Environment Validation Failed!');
      console.error('Missing required variables:', validation.missing);
      console.error('\nPlease check your .env.local file and ensure all required variables are set.');
      console.error('You can copy env.template to .env.local as a starting point.\n');
    } else {
      console.log('✅ Environment variables validated successfully');
      
      if (validation.warnings.length > 0) {
        console.warn('⚠️  Environment warnings:');
        validation.warnings.forEach(warning => console.warn(`  - ${warning}`));
      }
    }
  } catch (error) {
    console.error('❌ Environment validation error:', error);
  }
}
