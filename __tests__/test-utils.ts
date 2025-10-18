/**
 * Test Utilities for Art Framer
 * Common utilities and mocks for testing
 */

import { NextRequest } from 'next/server'
import { User } from '@supabase/supabase-js'

// Mock user data
export const mockUser: User = {
  id: 'test-user-id',
  email: 'test@example.com',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  aud: 'authenticated',
  role: 'authenticated',
  app_metadata: {},
  user_metadata: {},
  identities: [],
  factors: [],
  email_confirmed_at: '2024-01-01T00:00:00Z',
  last_sign_in_at: '2024-01-01T00:00:00Z',
  phone: '',
  confirmed_at: '2024-01-01T00:00:00Z',
  recovery_sent_at: '2024-01-01T00:00:00Z',
  new_email: '',
  invited_at: '',
  action_link: '',
  email_change_sent_at: '',
  new_phone: '',
  phone_change_sent_at: '',
  reauthentication_sent_at: '',
  reauthentication_token: '',
  is_anonymous: false,
}

// Mock image data
export const mockUserImage = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  user_id: 'test-user-id',
  prompt: 'A beautiful sunset over mountains',
  image_url: 'https://example.com/image.jpg',
  thumbnail_url: 'https://example.com/thumb.jpg',
  status: 'completed',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  width: 1024,
  height: 1024,
  aspect_ratio: '1:1',
  likes: 0,
  is_public: true,
}

// Mock curated image data
export const mockCuratedImage = {
  id: '550e8400-e29b-41d4-a716-446655440002',
  title: 'Abstract Art',
  description: 'Beautiful abstract artwork',
  category: 'art',
  tags: ['abstract', 'modern'],
  image_url: 'https://example.com/curated.jpg',
  thumbnail_url: 'https://example.com/curated-thumb.jpg',
  width: 800,
  height: 600,
  aspect_ratio: '4:3',
  display_order: 0,
  is_featured: false,
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

// Mock product data
export const mockProduct = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  image_id: '550e8400-e29b-41d4-a716-446655440001',
  frame_size: 'medium',
  frame_style: 'black',
  frame_material: 'wood',
  price: 29.99,
  cost: 12.00,
  weight_grams: 500,
  dimensions_cm: { width: 30, height: 40, depth: 2 },
  status: 'active',
  sku: 'FRAME-MED-BLK-WD-001',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

// Mock cart item data
export const mockCartItem = {
  id: 'test-cart-item-id',
  user_id: 'test-user-id',
  product_id: '550e8400-e29b-41d4-a716-446655440000',
  quantity: 1,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  products: mockProduct,
}

// Mock Supabase client
export const createMockSupabaseClient = (overrides = {}) => ({
  from: jest.fn((table) => ({
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
      data: { user: mockUser }, 
      error: null 
    })),
    getSession: jest.fn(() => Promise.resolve({ 
      data: { 
        session: { 
          access_token: 'test-token',
          user: mockUser 
        } 
      }, 
      error: null 
    })),
    refreshSession: jest.fn(() => Promise.resolve({ 
      data: { 
        session: { 
          access_token: 'test-token',
          user: mockUser 
        } 
      }, 
      error: null 
    })),
  },
  ...overrides,
})

// Mock NextRequest helper
export const createMockRequest = (
  method: string, 
  body?: any, 
  searchParams?: Record<string, string>,
  headers?: Record<string, string>
) => {
  const url = new URL('http://localhost:3000/api/test')
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })
  }
  
  return new NextRequest(url, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
  })
}

// Mock fetch responses
export const mockFetch = (response: any, status = 200) => {
  return jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(response),
    text: jest.fn().mockResolvedValue(JSON.stringify(response)),
  })
}

// Test data factories
export const createTestUser = (overrides = {}) => ({
  ...mockUser,
  ...overrides,
})

export const createTestImage = (overrides = {}) => ({
  ...mockUserImage,
  ...overrides,
})

export const createTestCuratedImage = (overrides = {}) => ({
  ...mockCuratedImage,
  ...overrides,
})

export const createTestProduct = (overrides = {}) => ({
  ...mockProduct,
  ...overrides,
})

export const createTestCartItem = (overrides = {}) => ({
  ...mockCartItem,
  ...overrides,
})

// Mock authentication helpers
export const mockAuthenticatedUser = () => ({
  data: { user: mockUser },
  error: null,
})

export const mockUnauthenticatedUser = () => ({
  data: { user: null },
  error: { message: 'Not authenticated' },
})

// Mock Supabase responses
export const mockSupabaseSuccess = (data: any) => ({
  data,
  error: null,
})

export const mockSupabaseError = (message: string) => ({
  data: null,
  error: { message },
})

// Mock API responses
export const mockApiSuccess = (data: any, status = 200) => ({
  ok: true,
  status,
  json: jest.fn().mockResolvedValue(data),
})

export const mockApiError = (message: string, status = 400) => ({
  ok: false,
  status,
  json: jest.fn().mockResolvedValue({ error: message }),
})

// Test environment setup
export const setupTestEnvironment = () => {
  // Mock environment variables
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
  process.env.STRIPE_SECRET_KEY = 'sk_test_123'
  process.env.PRODIGI_API_KEY = 'test-prodigi-key'
  
  // Mock fetch globally
  global.fetch = jest.fn()
  
  // Mock localStorage
  const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  }
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
  })
  
  // Mock sessionStorage
  const sessionStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  }
  Object.defineProperty(window, 'sessionStorage', {
    value: sessionStorageMock,
  })
}

// Clean up after tests
export const cleanupTestEnvironment = () => {
  jest.clearAllMocks()
  if (global.fetch && global.fetch.mockClear) {
    global.fetch.mockClear()
  }
  if (typeof window !== 'undefined') {
    window.localStorage.clear()
    window.sessionStorage.clear()
  }
}

// Simple test to satisfy Jest requirement
describe('Test Utils', () => {
  test('should export mock data', () => {
    expect(mockUser).toBeDefined()
    expect(mockUserImage).toBeDefined()
    expect(mockCuratedImage).toBeDefined()
    expect(mockProduct).toBeDefined()
    expect(mockCartItem).toBeDefined()
  })
})
