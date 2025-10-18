/**
 * Cart Test Setup
 * Additional setup for cart functionality tests
 */

// Mock external services
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
  createServiceClient: jest.fn(),
}))

jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
          limit: jest.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        limit: jest.fn(() => Promise.resolve({ data: [], error: null })),
        order: jest.fn(() => Promise.resolve({ data: [], error: null })),
        range: jest.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
      update: jest.fn(() => Promise.resolve({ data: null, error: null })),
      delete: jest.fn(() => Promise.resolve({ data: null, error: null })),
      upsert: jest.fn(() => Promise.resolve({ data: null, error: null })),
    })),
    auth: {
      getUser: jest.fn(() => Promise.resolve({ 
        data: { user: null }, 
        error: null 
      })),
      getSession: jest.fn(() => Promise.resolve({ 
        data: { session: null }, 
        error: null 
      })),
    },
  },
}))

jest.mock('@/lib/prodigi', () => ({
  prodigiClient: {
    generateFrameSku: jest.fn().mockResolvedValue('FRAME-MED-BLK-WD-001'),
    getProducts: jest.fn(() => Promise.resolve([])),
    getProductDetails: jest.fn(() => Promise.resolve({})),
    searchProducts: jest.fn(() => Promise.resolve([])),
    getProductSku: jest.fn(() => Promise.resolve('test-sku')),
  },
}))

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: jest.fn(() => Promise.resolve({ 
          id: 'cs_test_123', 
          url: 'https://checkout.stripe.com' 
        })),
      },
    },
  }))
})

// Mock fetch globally
global.fetch = jest.fn()

// Mock localStorage and sessionStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}

const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
})

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() { return null }
  disconnect() { return null }
  unobserve() { return null }
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() { return null }
  disconnect() { return null }
  unobserve() { return null }
}

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks()
  if (global.fetch && global.fetch.mockClear) {
    global.fetch.mockClear()
  }
  if (typeof window !== 'undefined') {
    window.localStorage.clear()
    window.sessionStorage.clear()
  }
})

// Simple test to satisfy Jest requirement
describe('Cart Test Setup', () => {
  test('should setup mocks correctly', () => {
    expect(global.fetch).toBeDefined()
    expect(window.localStorage).toBeDefined()
    expect(window.sessionStorage).toBeDefined()
  })
})
