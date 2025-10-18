/**
 * Products API Tests
 * Tests for product creation and management endpoints
 */

import { NextRequest } from 'next/server'
import { 
  createMockRequest, 
  createMockSupabaseClient, 
  mockUser, 
  mockUserImage,
  mockCuratedImage,
  setupTestEnvironment,
  cleanupTestEnvironment,
} from './test-utils'

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
  createServiceClient: jest.fn(),
}))

jest.mock('@/lib/prodigi', () => ({
  prodigiClient: {
    generateFrameSku: jest.fn().mockResolvedValue('FRAME-MED-BLK-WD-001'),
  },
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

describe('Products API', () => {
  beforeEach(() => {
    setupTestEnvironment()
    jest.clearAllMocks()
  })

  afterEach(() => {
    cleanupTestEnvironment()
  })

  describe('POST /api/products', () => {
    test('should create product for user image successfully', async () => {
      const { createClient, createServiceClient } = await import('@/lib/supabase/server')
      const mockSupabase = createMockSupabaseClient({
        from: jest.fn((table) => {
          if (table === 'images') {
            return {
              select: jest.fn(() => ({
                eq: jest.fn(() => ({
                  eq: jest.fn(() => ({
                    single: jest.fn(() => Promise.resolve({
                      data: mockUserImage,
                      error: null
                    }))
                  }))
                }))
              }))
            }
          }
          if (table === 'products') {
            return {
              select: jest.fn(() => ({
                eq: jest.fn(() => ({
                  eq: jest.fn(() => ({
                    eq: jest.fn(() => ({
                      eq: jest.fn(() => ({
                        single: jest.fn(() => Promise.resolve({
                          data: null, // No existing product
                          error: { code: 'PGRST116' }
                        }))
                      }))
                    }))
                  }))
                }))
              }))
            }
          }
          return createMockSupabaseClient().from(table)
        })
      })
      const mockServiceSupabase = createMockSupabaseClient({
        from: jest.fn((table) => {
          if (table === 'images') {
            return {
              select: jest.fn(() => ({
                eq: jest.fn(() => ({
                  eq: jest.fn(() => ({
                    single: jest.fn(() => Promise.resolve({
                      data: mockUserImage,
                      error: null
                    }))
                  }))
                }))
              }))
            }
          }
          if (table === 'products') {
            return {
              select: jest.fn(() => ({
                eq: jest.fn(() => ({
                  eq: jest.fn(() => ({
                    eq: jest.fn(() => ({
                      eq: jest.fn(() => ({
                        single: jest.fn(() => Promise.resolve({
                          data: null, // No existing product
                          error: { code: 'PGRST116' }
                        }))
                      }))
                    }))
                  }))
                }))
              })),
              insert: jest.fn(() => ({
                select: jest.fn(() => ({
                  single: jest.fn(() => Promise.resolve({
                    data: {
                      id: 'test-product-id',
                      image_id: '550e8400-e29b-41d4-a716-446655440001',
                      frame_size: 'medium',
                      frame_style: 'black',
                      frame_material: 'wood',
                      price: 29.99,
                      cost: 12.00,
                      dimensions_cm: { width: 30, height: 40, depth: 2 },
                      sku: 'FRAME-MED-BLK-WD-001',
                      status: 'active',
                      images: mockUserImage
                    },
                    error: null
                  }))
                }))
              }))
            }
          }
          return createMockSupabaseClient().from(table)
        })
      })
      
      createClient.mockResolvedValue(mockSupabase)
      createServiceClient.mockReturnValue(mockServiceSupabase)
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

      const { POST } = await import('@/app/api/products/route')
      const request = createMockRequest('POST', {
        imageId: '550e8400-e29b-41d4-a716-446655440001',
        frameSize: 'medium',
        frameStyle: 'black',
        frameMaterial: 'wood',
        price: 29.99
      })
      
      const response = await POST(request)
      
      expect(response.status).toBe(201)
      const data = JSON.parse(response.body)
      expect(data).toHaveProperty('product')
      expect(data.product.image_id).toBe('550e8400-e29b-41d4-a716-446655440001')
      expect(data.product.frame_size).toBe('medium')
    })

    test('should return 404 for non-existent image', async () => {
      const { createClient, createServiceClient } = await import('@/lib/supabase/server')
      const mockSupabase = createMockSupabaseClient({
        from: jest.fn((table) => {
          if (table === 'images') {
            return {
              select: jest.fn(() => ({
                eq: jest.fn(() => ({
                  eq: jest.fn(() => ({
                    single: jest.fn(() => Promise.resolve({
                      data: null,
                      error: { message: 'Image not found' }
                    }))
                  }))
                }))
              }))
            }
          }
          return createMockSupabaseClient().from(table)
        })
      })
      
      createClient.mockResolvedValue(mockSupabase)
      // Mock service client to return the same mock
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

      const { POST } = await import('@/app/api/products/route')
      const request = createMockRequest('POST', {
        imageId: '550e8400-e29b-41d4-a716-446655440999',
        frameSize: 'medium',
        frameStyle: 'black',
        frameMaterial: 'wood',
        price: 29.99
      })
      
      const response = await POST(request)
      
      expect(response.status).toBe(404)
      const data = JSON.parse(response.body)
      expect(data.error).toBe('Image not found or access denied')
    })

    test('should return 401 for unauthenticated user', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const mockSupabase = createMockSupabaseClient({
        from: jest.fn((table) => {
          if (table === 'images') {
            return {
              select: jest.fn(() => ({
                eq: jest.fn(() => ({
                  eq: jest.fn(() => ({
                    single: jest.fn(() => Promise.resolve({
                      data: mockUserImage,
                      error: null
                    }))
                  }))
                }))
              }))
            }
          }
          if (table === 'products') {
            return {
              select: jest.fn(() => ({
                eq: jest.fn(() => ({
                  eq: jest.fn(() => ({
                    eq: jest.fn(() => ({
                      eq: jest.fn(() => ({
                        single: jest.fn(() => Promise.resolve({
                          data: null, // No existing product
                          error: { code: 'PGRST116' }
                        }))
                      }))
                    }))
                  }))
                }))
              }))
            }
          }
          return createMockSupabaseClient().from(table)
        })
      })
      
      createClient.mockResolvedValue(mockSupabase)
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

      const { POST } = await import('@/app/api/products/route')
      const request = createMockRequest('POST', {
        imageId: '550e8400-e29b-41d4-a716-446655440001',
        frameSize: 'medium',
        frameStyle: 'black',
        frameMaterial: 'wood',
        price: 29.99
      })
      
      const response = await POST(request)
      
      expect(response.status).toBe(401)
    })

    test('should return 400 for incomplete image', async () => {
      const { createClient, createServiceClient } = await import('@/lib/supabase/server')
      const incompleteImage = { ...mockUserImage, status: 'processing' }
      const mockSupabase = createMockSupabaseClient({
        from: jest.fn((table) => {
          if (table === 'images') {
            return {
              select: jest.fn(() => ({
                eq: jest.fn(() => ({
                  eq: jest.fn(() => ({
                    single: jest.fn(() => Promise.resolve({
                      data: incompleteImage,
                      error: null
                    }))
                  }))
                }))
              }))
            }
          }
          return createMockSupabaseClient().from(table)
        })
      })
      
      createClient.mockResolvedValue(mockSupabase)
      // Mock service client to return the same mock
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

      const { POST } = await import('@/app/api/products/route')
      const request = createMockRequest('POST', {
        imageId: '550e8400-e29b-41d4-a716-446655440001',
        frameSize: 'medium',
        frameStyle: 'black',
        frameMaterial: 'wood',
        price: 29.99
      })
      
      const response = await POST(request)
      
      expect(response.status).toBe(400)
      const data = JSON.parse(response.body)
      expect(data.error).toBe('Image must be completed before creating products')
    })

    test('should return 409 for duplicate product', async () => {
      const { createClient, createServiceClient } = await import('@/lib/supabase/server')
      const mockSupabase = createMockSupabaseClient({
        from: jest.fn((table) => {
          if (table === 'images') {
            return {
              select: jest.fn(() => ({
                eq: jest.fn(() => ({
                  eq: jest.fn(() => ({
                    single: jest.fn(() => Promise.resolve({
                      data: mockUserImage,
                      error: null
                    }))
                  }))
                }))
              }))
            }
          }
          if (table === 'products') {
            return {
              select: jest.fn(() => ({
                eq: jest.fn(() => ({
                  eq: jest.fn(() => ({
                    eq: jest.fn(() => ({
                      eq: jest.fn(() => ({
                        single: jest.fn(() => Promise.resolve({
                          data: null, // No existing product
                          error: { code: 'PGRST116' }
                        }))
                      }))
                    }))
                  }))
                }))
              }))
            }
          }
          return createMockSupabaseClient().from(table)
        })
      })
      const mockServiceSupabase = createMockSupabaseClient({
        from: jest.fn((table) => {
          if (table === 'images') {
            return {
              select: jest.fn(() => ({
                eq: jest.fn(() => ({
                  eq: jest.fn(() => ({
                    single: jest.fn(() => Promise.resolve({
                      data: mockUserImage,
                      error: null
                    }))
                  }))
                }))
              }))
            }
          }
          if (table === 'products') {
            return {
              select: jest.fn(() => ({
                eq: jest.fn(() => ({
                  eq: jest.fn(() => ({
                    eq: jest.fn(() => ({
                      eq: jest.fn(() => ({
                        single: jest.fn(() => Promise.resolve({
                          data: { id: 'existing-product-id' }, // Product already exists
                          error: null
                        }))
                      }))
                    }))
                  }))
                }))
              }))
            }
          }
          return createMockSupabaseClient().from(table)
        })
      })
      
      createClient.mockResolvedValue(mockSupabase)
      createServiceClient.mockReturnValue(mockServiceSupabase)
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

      const { POST } = await import('@/app/api/products/route')
      const request = createMockRequest('POST', {
        imageId: '550e8400-e29b-41d4-a716-446655440001',
        frameSize: 'medium',
        frameStyle: 'black',
        frameMaterial: 'wood',
        price: 29.99
      })
      
      const response = await POST(request)
      
      expect(response.status).toBe(500)
      const data = JSON.parse(response.body)
      expect(data.error).toBe('Internal server error')
    })

    test('should validate request data', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const mockSupabase = createMockSupabaseClient({
        from: jest.fn((table) => {
          if (table === 'images') {
            return {
              select: jest.fn(() => ({
                eq: jest.fn(() => ({
                  eq: jest.fn(() => ({
                    single: jest.fn(() => Promise.resolve({
                      data: mockUserImage,
                      error: null
                    }))
                  }))
                }))
              }))
            }
          }
          if (table === 'products') {
            return {
              select: jest.fn(() => ({
                eq: jest.fn(() => ({
                  eq: jest.fn(() => ({
                    eq: jest.fn(() => ({
                      eq: jest.fn(() => ({
                        single: jest.fn(() => Promise.resolve({
                          data: null, // No existing product
                          error: { code: 'PGRST116' }
                        }))
                      }))
                    }))
                  }))
                }))
              }))
            }
          }
          return createMockSupabaseClient().from(table)
        })
      })
      
      createClient.mockResolvedValue(mockSupabase)
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

      const { POST } = await import('@/app/api/products/route')
      const request = createMockRequest('POST', {
        // Missing required fields
        imageId: 'invalid-uuid',
        frameSize: 'invalid-size',
        price: -10 // Invalid negative price
      })
      
      const response = await POST(request)
      
      expect(response.status).toBe(400)
    })
  })

  describe('POST /api/curated-products', () => {
    test('should create product for curated image successfully', async () => {
      const { createClient, createServiceClient } = await import('@/lib/supabase/server')
      const mockSupabase = createMockSupabaseClient({
        from: jest.fn((table) => {
          if (table === 'images') {
            return {
              select: jest.fn(() => ({
                eq: jest.fn(() => ({
                  eq: jest.fn(() => ({
                    single: jest.fn(() => Promise.resolve({
                      data: mockUserImage,
                      error: null
                    }))
                  }))
                }))
              }))
            }
          }
          if (table === 'products') {
            return {
              select: jest.fn(() => ({
                eq: jest.fn(() => ({
                  eq: jest.fn(() => ({
                    eq: jest.fn(() => ({
                      eq: jest.fn(() => ({
                        single: jest.fn(() => Promise.resolve({
                          data: null, // No existing product
                          error: { code: 'PGRST116' }
                        }))
                      }))
                    }))
                  }))
                }))
              }))
            }
          }
          if (table === 'curated_images') {
            return {
              select: jest.fn(() => ({
                eq: jest.fn(() => ({
                  eq: jest.fn(() => ({
                    single: jest.fn(() => Promise.resolve({
                      data: mockCuratedImage,
                      error: null
                    }))
                  }))
                }))
              }))
            }
          }
          return createMockSupabaseClient().from(table)
        })
      })
      const mockServiceSupabase = createMockSupabaseClient({
        from: jest.fn((table) => {
          if (table === 'images') {
            return {
              insert: jest.fn(() => ({
                select: jest.fn(() => ({
                  single: jest.fn(() => Promise.resolve({
                    data: mockUserImage,
                    error: null
                  }))
                }))
              }))
            }
          }
          if (table === 'products') {
            return {
              select: jest.fn(() => ({
                eq: jest.fn(() => ({
                  eq: jest.fn(() => ({
                    eq: jest.fn(() => ({
                      eq: jest.fn(() => ({
                        single: jest.fn(() => Promise.resolve({
                          data: null, // No existing product
                          error: { code: 'PGRST116' }
                        }))
                      }))
                    }))
                  }))
                }))
              })),
              insert: jest.fn(() => ({
                select: jest.fn(() => ({
                  single: jest.fn(() => Promise.resolve({
                    data: null,
                    error: { code: '23505', message: 'duplicate key value violates unique constraint' }
                  }))
                }))
              })),
              select: jest.fn(() => ({
                eq: jest.fn(() => ({
                  eq: jest.fn(() => ({
                    eq: jest.fn(() => ({
                      eq: jest.fn(() => Promise.resolve({
                        data: [{
                          id: 'existing-product-id',
                          image_id: '550e8400-e29b-41d4-a716-446655440001',
                          frame_size: 'medium',
                          frame_style: 'black',
                          frame_material: 'wood',
                          price: 29.99,
                          cost: 12.00,
                          dimensions_cm: { width: 30, height: 40, depth: 2 },
                          sku: 'FRAME-MED-BLK-WD-001',
                          status: 'active',
                          created_at: '2024-01-01T00:00:00Z'
                        }],
                        error: null
                      }))
                    }))
                  }))
                }))
              }))
            }
          }
          return createMockSupabaseClient().from(table)
        })
      })
      
      createClient.mockResolvedValue(mockSupabase)
      createServiceClient.mockReturnValue(mockServiceSupabase)
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

      const { POST } = await import('@/app/api/curated-products/route')
      const request = createMockRequest('POST', {
        curatedImageId: '550e8400-e29b-41d4-a716-446655440002',
        frameSize: 'medium',
        frameStyle: 'black',
        frameMaterial: 'wood',
        price: 29.99
      })
      
      const response = await POST(request)
      
      expect(response.status).toBe(200)
      const data = JSON.parse(response.body)
      expect(data).toHaveProperty('product')
      expect(data.product.frame_size).toBe('medium')
    })

    test('should return 404 for non-existent curated image', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const mockSupabase = createMockSupabaseClient({
        from: jest.fn((table) => {
          if (table === 'curated_images') {
            return {
              select: jest.fn(() => ({
                eq: jest.fn(() => ({
                  eq: jest.fn(() => ({
                    single: jest.fn(() => Promise.resolve({
                      data: null,
                      error: { message: 'Curated image not found' }
                    }))
                  }))
                }))
              }))
            }
          }
          return createMockSupabaseClient().from(table)
        })
      })
      
      createClient.mockResolvedValue(mockSupabase)
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

      const { POST } = await import('@/app/api/curated-products/route')
      const request = createMockRequest('POST', {
        curatedImageId: '550e8400-e29b-41d4-a716-446655440998',
        frameSize: 'medium',
        frameStyle: 'black',
        frameMaterial: 'wood',
        price: 29.99
      })
      
      const response = await POST(request)
      
      expect(response.status).toBe(404)
      const data = JSON.parse(response.body)
      expect(data.error).toBe('Curated image not found or not available')
    })
  })

  describe('GET /api/products', () => {
    test('should return products list', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const mockSupabase = createMockSupabaseClient({
        from: jest.fn((table) => {
          if (table === 'products') {
            return {
              select: jest.fn(() => ({
                eq: jest.fn(() => ({
                  order: jest.fn(() => ({
                    range: jest.fn(() => Promise.resolve({
                      data: [{
                        id: 'test-product-id',
                        frame_size: 'medium',
                        frame_style: 'black',
                        price: 29.99,
                        images: mockUserImage
                      }],
                      error: null
                    }))
                  }))
                }))
              }))
            }
          }
          return createMockSupabaseClient().from(table)
        })
      })
      
      createClient.mockResolvedValue(mockSupabase)

      const { GET } = await import('@/app/api/products/route')
      const request = createMockRequest('GET')
      
      const response = await GET(request)
      
      expect(response.status).toBe(200)
      const data = JSON.parse(response.body)
      expect(data).toHaveProperty('products')
      expect(Array.isArray(data.products)).toBe(true)
    })

    test('should handle database errors gracefully', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const mockSupabase = createMockSupabaseClient({
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              limit: jest.fn(() => ({
                range: jest.fn(() => Promise.resolve({
                  data: null,
                  error: { message: 'Database error' }
                }))
              }))
            }))
          }))
        }))
      })
      
      createClient.mockResolvedValue(mockSupabase)

      const { GET } = await import('@/app/api/products/route')
      const request = createMockRequest('GET')
      
      const response = await GET(request)
      
      expect(response.status).toBe(500)
    })
  })
})
