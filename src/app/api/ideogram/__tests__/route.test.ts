import { NextRequest } from 'next/server';
import { GET, POST } from '../[...path]/route';

// Mock fetch
global.fetch = jest.fn();

describe('/api/ideogram', () => {
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console methods to avoid noise in tests
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    
    // Set up environment variables
    process.env.IDEOGRAM_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /api/ideogram/[...path]', () => {
    it('should proxy GET request to Ideogram API successfully', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true, data: 'test data' })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const request = new NextRequest('http://localhost:3000/api/ideogram/test/endpoint?param=value');
      const response = await GET(request, { params: Promise.resolve({ path: ['test', 'endpoint'] }) });
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.ideogram.ai/test/endpoint?param=value',
        expect.objectContaining({
          headers: {
            'Api-Key': 'test-api-key',
            'Content-Type': 'application/json',
          },
        })
      );
    });

    it('should handle Ideogram API errors', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        text: jest.fn().mockResolvedValue('Bad Request')
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const request = new NextRequest('http://localhost:3000/api/ideogram/test/endpoint');
      const response = await GET(request, { params: Promise.resolve({ path: ['test', 'endpoint'] }) });
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(500);
      expect(responseData.error).toBe('Failed to fetch from Ideogram API');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const request = new NextRequest('http://localhost:3000/api/ideogram/test/endpoint');
      const response = await GET(request, { params: Promise.resolve({ path: ['test', 'endpoint'] }) });
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(500);
      expect(responseData.error).toBe('Failed to fetch from Ideogram API');
    });

    it('should log API calls and responses', async () => {
      // Restore console.log for this test
      jest.restoreAllMocks();
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const request = new NextRequest('http://localhost:3000/api/ideogram/test/endpoint');
      await GET(request, { params: Promise.resolve({ path: ['test', 'endpoint'] }) });

      expect(consoleSpy).toHaveBeenCalledWith('GET request to Ideogram API:');
      expect(consoleSpy).toHaveBeenCalledWith('- Path:', 'test/endpoint');
      expect(consoleSpy).toHaveBeenCalledWith('- Full URL:', 'https://api.ideogram.ai/test/endpoint');
      // Check that API key logging was called (order may vary)
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('API Key length:'), expect.any(Number));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('API Key prefix:'), expect.any(String));
    });
  });

  describe('POST /api/ideogram/[...path]', () => {
    it('should proxy POST request to Ideogram API successfully', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true, data: 'test data' })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const formData = new FormData();
      formData.append('prompt', 'test prompt');
      formData.append('style', 'photographic');

      const request = new NextRequest('http://localhost:3000/api/ideogram/test/endpoint', {
        method: 'POST',
        body: formData,
      });

      // Mock the formData method
      request.formData = jest.fn().mockResolvedValue(formData);

      const response = await POST(request, { params: Promise.resolve({ path: ['test', 'endpoint'] }) });
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.ideogram.ai/test/endpoint',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Api-Key': 'test-api-key',
          },
          body: expect.any(FormData),
        })
      );
    });

    it('should handle Ideogram API errors', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        text: jest.fn().mockResolvedValue('Bad Request')
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const formData = new FormData();
      formData.append('prompt', 'test prompt');

      const request = new NextRequest('http://localhost:3000/api/ideogram/test/endpoint', {
        method: 'POST',
        body: formData,
      });

      // Mock the formData method
      request.formData = jest.fn().mockResolvedValue(formData);

      const response = await POST(request, { params: Promise.resolve({ path: ['test', 'endpoint'] }) });
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(500);
      expect(responseData.error).toBe('Failed to post to Ideogram API');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const formData = new FormData();
      formData.append('prompt', 'test prompt');

      const request = new NextRequest('http://localhost:3000/api/ideogram/test/endpoint', {
        method: 'POST',
        body: formData,
      });

      // Mock the formData method
      request.formData = jest.fn().mockResolvedValue(formData);

      const response = await POST(request, { params: Promise.resolve({ path: ['test', 'endpoint'] }) });
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(500);
      expect(responseData.error).toBe('Failed to post to Ideogram API');
    });

    it('should log API calls and responses', async () => {
      // Restore console.log for this test
      jest.restoreAllMocks();
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true })
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      const formData = new FormData();
      formData.append('prompt', 'test prompt');
      formData.append('style', 'photographic');

      const request = new NextRequest('http://localhost:3000/api/ideogram/test/endpoint', {
        method: 'POST',
        body: formData,
      });

      // Mock the formData method
      request.formData = jest.fn().mockResolvedValue(formData);

      await POST(request, { params: Promise.resolve({ path: ['test', 'endpoint'] }) });

      expect(consoleSpy).toHaveBeenCalledWith('POST request to Ideogram API:');
      expect(consoleSpy).toHaveBeenCalledWith('- Path:', 'test/endpoint');
      expect(consoleSpy).toHaveBeenCalledWith('- Full URL:', 'https://api.ideogram.ai/test/endpoint');
      // Check that API key logging was called (order may vary)
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('API Key length:'), expect.any(Number));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('API Key prefix:'), expect.any(String));
      expect(consoleSpy).toHaveBeenCalledWith('- FormData entries:');
      expect(consoleSpy).toHaveBeenCalledWith('  - prompt: test prompt');
      expect(consoleSpy).toHaveBeenCalledWith('  - style: photographic');
    });
  });
});