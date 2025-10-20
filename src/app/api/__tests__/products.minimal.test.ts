import { POST } from '../products/route';

// Mock Supabase client
const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn(),
  insert: jest.fn().mockReturnThis(),
  auth: {
    getUser: jest.fn()
  }
};

const mockServiceClient = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn(),
  insert: jest.fn().mockReturnThis()
};

jest.mock('@/lib/supabase/server', () => ({
  createClient: () => mockSupabase,
  createServiceClient: () => mockServiceClient
}));

// Mock Prodigi client
jest.mock('@/lib/prodigi', () => ({
  prodigiClient: {
    getProductDetails: jest.fn(),
    validateSku: jest.fn(),
    generateFrameSku: jest.fn().mockResolvedValue('TEST-SKU-001')
  }
}));

describe('/api/products - Minimal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 for unauthenticated user', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' }
    });

    const request = {
      json: () => Promise.resolve({
        imageId: '550e8400-e29b-41d4-a716-446655440001',
        frameSize: 'medium',
        frameStyle: 'black',
        price: 29.99
      }),
      headers: new Headers()
    } as any;

    const response = await POST(request);
    
    expect(response.status).toBe(401);
  });

  it('should return 400 for invalid request data', async () => {
    const mockUser = { id: 'user-1', email: 'test@example.com' };
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    });

    const request = {
      json: () => Promise.resolve({
        imageId: 'invalid-uuid',
        frameSize: 'invalid-size',
        price: -10
      }),
      headers: new Headers({
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      })
    } as any;

    const response = await POST(request);
    
    expect(response.status).toBe(400);
  });

  it('should return 404 for non-existent image', async () => {
    const mockUser = { id: 'user-1', email: 'test@example.com' };
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    });

    mockServiceClient.from().select().eq().eq().single.mockResolvedValue({
      data: null,
      error: { message: 'Image not found' }
    });

    const request = {
      json: () => Promise.resolve({
        imageId: '550e8400-e29b-41d4-a716-446655440001',
        frameSize: 'medium',
        frameStyle: 'black',
        price: 29.99
      }),
      headers: new Headers({
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      })
    } as any;

    const response = await POST(request);
    
    expect(response.status).toBe(404);
  });
});
