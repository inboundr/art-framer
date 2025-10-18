/**
 * Simple Cart POST Tests
 * Focused tests for cart POST functionality
 */

import { NextRequest } from 'next/server'
import { 
  createMockRequest, 
  createMockSupabaseClient, 
  mockUser, 
  mockProduct, 
  mockCartItem,
  setupTestEnvironment,
  cleanupTestEnvironment,
} from './test-utils'

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
  createServiceClient: jest.fn(),
}))

// Mock pricing module
jest.mock('@/lib/pricing', () => ({
  defaultPricingCalculator: {
    calculateTotal: jest.fn((items) => ({
      subtotal: items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0),
      taxAmount: 0,
      total: items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0),
    }))
  }
}))

// Mock NextRequest
jest.mock('next/server', () => ({
  NextRequest: jest.fn().mockImplementation((url, init) => ({
    url,
    method: init?.method || 'GET',
    headers: new Map(Object.entries(init?.headers || {})),
    json: jest.fn().mockResolvedValue(JSON.parse(init?.body || '{}')),
    cookies: {
      getAll: jest.fn().mockReturnValue([])
    }
  })),
  NextResponse: {
    json: jest.fn().mockImplementation((data, init) => ({
      status: init?.status || 200,
      body: JSON.stringify(data),
      json: jest.fn().mockResolvedValue(data)
    }))
  }
}))

describe('Cart POST Simple Tests', () => {
  beforeEach(() => {
    setupTestEnvironment()
    jest.clearAllMocks()
  })

  afterEach(() => {
    cleanupTestEnvironment()
  })

  describe('POST /api/cart', () => {
    test('should return 401 for unauthenticated user', async () => {
      const { createClient, createServiceClient } = await import('@/lib/supabase/server')
      const mockSupabase = createMockSupabaseClient()
      
      createClient.mockResolvedValue(mockSupabase)
      createServiceClient.mockReturnValue(mockSupabase)
      
      // Mock all authentication methods to fail
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' }
      })
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'No session' }
      })
      mockSupabase.auth.refreshSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Refresh failed' }
      })

      const { POST } = await import('@/app/api/cart/route')
      const request = createMockRequest('POST', {
        productId: '550e8400-e29b-41d4-a716-446655440000',
        quantity: 1
      })
      
      const response = await POST(request)
      
      expect(response.status).toBe(401)
    })

    test('should return 400 for invalid request body', async () => {
      const { createClient, createServiceClient } = await import('@/lib/supabase/server')
      const mockSupabase = createMockSupabaseClient()
      
      createClient.mockResolvedValue(mockSupabase)
      createServiceClient.mockReturnValue(mockSupabase)
      
      // Mock all authentication methods to succeed
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: mockUser } },
        error: null
      })
      mockSupabase.auth.refreshSession.mockResolvedValue({
        data: { session: { user: mockUser } },
        error: null
      })

      const { POST } = await import('@/app/api/cart/route')
      const request = createMockRequest('POST', {
        productId: 'invalid-id', // Not a valid UUID
        quantity: 1
      })
      
      const response = await POST(request)
      
      expect(response.status).toBe(400)
    })

    test('should return 400 for invalid quantity', async () => {
      const { createClient, createServiceClient } = await import('@/lib/supabase/server')
      const mockSupabase = createMockSupabaseClient()
      
      createClient.mockResolvedValue(mockSupabase)
      createServiceClient.mockReturnValue(mockSupabase)
      
      // Mock all authentication methods to succeed
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: mockUser } },
        error: null
      })
      mockSupabase.auth.refreshSession.mockResolvedValue({
        data: { session: { user: mockUser } },
        error: null
      })

      const { POST } = await import('@/app/api/cart/route')
      const request = createMockRequest('POST', {
        productId: '550e8400-e29b-41d4-a716-446655440000',
        quantity: 15 // Exceeds maximum of 10
      })
      
      const response = await POST(request)
      
      expect(response.status).toBe(400)
    })
  })
})
