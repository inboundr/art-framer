/**
 * Integration test for /api/user-images endpoint
 * Tests authentication, database queries, and response format
 */

import { NextRequest } from 'next/server';
import { GET } from '../route';
import { createClient } from '@/lib/supabase/server';

// Mock Supabase server client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

describe('/api/user-images - Integration Test', () => {
  let mockSupabase: any;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  };

  const mockImages = [
    {
      id: 'image-1',
      user_id: 'user-123',
      prompt: 'A beautiful sunset',
      image_url: 'https://example.com/image1.jpg',
      created_at: '2024-01-01T00:00:00Z',
      width: 1024,
      height: 1024,
      aspect_ratio: 'square',
      likes: 0,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Supabase client with proper chain
    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn(),
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  const setupMockQuery = (data: any[], count: number, error: any = null) => {
    const rangeMock = jest.fn().mockResolvedValue({ data, error, count });
    const orderMock = jest.fn().mockReturnValue({ range: rangeMock });
    const eqMock = jest.fn().mockReturnValue({ order: orderMock });
    const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
    mockSupabase.from.mockReturnValue({ select: selectMock });
    return { selectMock, eqMock, orderMock, rangeMock };
  };

  describe('Successful Flow', () => {
    it('should return user images with correct pagination', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      setupMockQuery(mockImages, 25);

      const request = new NextRequest('http://localhost:3000/api/user-images?page=1&limit=20');
      const response = await GET(request);
      
      expect(response).toBeInstanceOf(Response);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.images).toHaveLength(1);
      expect(data.pagination).toEqual({
        page: 1,
        total_pages: 2,
        total: 25,
        has_more: true,
      });
    });

    it('should handle pagination correctly', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const { rangeMock } = setupMockQuery(mockImages, 25);

      const request = new NextRequest('http://localhost:3000/api/user-images?page=2&limit=20');
      await GET(request);

      // Should call range with correct offset (page 2: from 20, to 39)
      expect(rangeMock).toHaveBeenCalledWith(20, 39);
    });
  });

  describe('Authentication', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      const request = new NextRequest('http://localhost:3000/api/user-images');
      const response = await GET(request);
      
      expect(response).toBeInstanceOf(Response);
      expect(response.status).toBe(401);
      
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should use cookies for authentication', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      setupMockQuery([], 0);

      const request = new NextRequest('http://localhost:3000/api/user-images');
      await GET(request);

      expect(createClient).toHaveBeenCalled();
      expect(mockSupabase.auth.getUser).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should return 500 on database error', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      setupMockQuery(null, null, { message: 'Database error' });

      const request = new NextRequest('http://localhost:3000/api/user-images');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch images');
    });

    it('should handle invalid page parameter', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      setupMockQuery([], 0);

      const request = new NextRequest('http://localhost:3000/api/user-images?page=invalid&limit=20');
      const response = await GET(request);
      const data = await response.json();

      // Should default to page 1
      expect(data.pagination.page).toBe(1);
    });
  });
});
