const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  displayName: 'Checkout Tests',
      testMatch: [
        '<rootDir>/src/components/__tests__/CheckoutFlow.test.tsx',
        '<rootDir>/src/components/__tests__/shipping-calculation.test.ts',
        '<rootDir>/src/components/__tests__/google-places-integration.test.tsx',
        '<rootDir>/src/components/__tests__/address-validation.test.ts',
        '<rootDir>/src/components/__tests__/checkout-integration.test.tsx',
        '<rootDir>/src/components/__tests__/checkout-performance.test.tsx',
        '<rootDir>/src/components/__tests__/checkout-simple.test.tsx',
        '<rootDir>/src/components/__tests__/shipping-calculation-robust.test.ts',
        '<rootDir>/src/components/__tests__/checkout-flow-robust.test.tsx',
        '<rootDir>/src/components/__tests__/home-page.test.tsx',
        '<rootDir>/src/components/__tests__/home-page-simple.test.tsx',
        '<rootDir>/src/components/__tests__/search-bar.test.tsx',
        '<rootDir>/src/components/__tests__/curated-image-gallery.test.tsx',
        '<rootDir>/src/components/__tests__/notification-bar.test.tsx'
      ],
  setupFilesAfterEnv: ['<rootDir>/src/components/__tests__/setup.ts'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  collectCoverageFrom: [
    'src/components/CheckoutFlow.tsx',
    'src/components/ui/google-places-autocomplete.tsx',
    'src/hooks/useAddresses.ts',
    'src/contexts/CartContext.tsx'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  testTimeout: 10000,
  verbose: true
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)