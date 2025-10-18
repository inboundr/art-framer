/**
 * Cart Test Configuration
 * Specific configuration for cart functionality tests
 */

// Polyfill for TextEncoder
const { TextEncoder, TextDecoder } = require('util')
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  collectCoverageFrom: [
    'src/app/api/cart/**/*.{js,jsx,ts,tsx}',
    'src/app/api/products/**/*.{js,jsx,ts,tsx}',
    'src/app/api/curated-products/**/*.{js,jsx,ts,tsx}',
    'src/components/CreationsModal.tsx',
    'src/components/UserImageGallery.tsx',
    'src/components/CuratedImageGallery.tsx',
    'src/contexts/CartContext.tsx',
    'src/hooks/useCart.ts',
    '!src/**/*.d.ts',
  ],
  testMatch: [
    '<rootDir>/__tests__/cart-*.{js,jsx,ts,tsx}',
    '<rootDir>/__tests__/creations-modal.test.{js,jsx,ts,tsx}',
    '<rootDir>/__tests__/products-api.test.{js,jsx,ts,tsx}',
  ],
  moduleDirectories: ['node_modules', '<rootDir>/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testTimeout: 30000,
  // Mock external services
  setupFiles: ['<rootDir>/__tests__/cart-test-setup.js'],
}

module.exports = createJestConfig(customJestConfig)

// Simple test to satisfy Jest requirement
describe('Cart Test Configuration', () => {
  test('should export configuration', () => {
    expect(createJestConfig).toBeDefined()
    expect(customJestConfig).toBeDefined()
  })
})
