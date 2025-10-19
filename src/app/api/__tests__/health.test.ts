import { NextRequest } from 'next/server';
import { GET } from '../health/route';

describe('Health API', () => {
  describe('GET /api/health', () => {
    it('should return healthy status with service information', async () => {
      const request = new NextRequest('http://localhost:3000/api/health', {
        method: 'GET',
      });

      const response = await GET(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(200);
      expect(responseData.status).toBe('healthy');
      expect(responseData.timestamp).toBeDefined();
      expect(responseData.uptime).toBeDefined();
      expect(responseData.environment).toBeDefined();
      expect(responseData.version).toBeDefined();
      expect(responseData.services).toBeDefined();
      expect(responseData.services.database).toBe('connected');
      expect(responseData.services.supabase).toBeDefined();
      expect(responseData.services.stripe).toBeDefined();
      expect(responseData.services.prodigi).toBeDefined();
    });

    it('should handle errors gracefully', async () => {
      // Mock process.uptime to throw an error
      const originalUptime = process.uptime;
      process.uptime = jest.fn().mockImplementation(() => {
        throw new Error('Uptime calculation failed');
      });

      const request = new NextRequest('http://localhost:3000/api/health', {
        method: 'GET',
      });

      const response = await GET(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(500);
      expect(responseData.status).toBe('unhealthy');
      expect(responseData.timestamp).toBeDefined();
      expect(responseData.error).toBe('Uptime calculation failed');

      // Restore original function
      process.uptime = originalUptime;
    });

    it('should include environment variables in service status', async () => {
      // Set some environment variables for testing
      const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const originalStripeKey = process.env.STRIPE_SECRET_KEY;
      const originalProdigiKey = process.env.PRODIGI_API_KEY;

      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.STRIPE_SECRET_KEY = 'sk_test_123';
      process.env.PRODIGI_API_KEY = 'prod_test_123';

      const request = new NextRequest('http://localhost:3000/api/health', {
        method: 'GET',
      });

      const response = await GET(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(200);
      expect(responseData.services.supabase).toBe('configured');
      expect(responseData.services.stripe).toBe('configured');
      expect(responseData.services.prodigi).toBe('configured');

      // Restore original environment variables
      process.env.NEXT_PUBLIC_SUPABASE_URL = originalSupabaseUrl;
      process.env.STRIPE_SECRET_KEY = originalStripeKey;
      process.env.PRODIGI_API_KEY = originalProdigiKey;
    });

    it('should show missing status for unconfigured services', async () => {
      // Clear environment variables
      const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const originalStripeKey = process.env.STRIPE_SECRET_KEY;
      const originalProdigiKey = process.env.PRODIGI_API_KEY;

      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.STRIPE_SECRET_KEY;
      delete process.env.PRODIGI_API_KEY;

      const request = new NextRequest('http://localhost:3000/api/health', {
        method: 'GET',
      });

      const response = await GET(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(200);
      expect(responseData.services.supabase).toBe('missing');
      expect(responseData.services.stripe).toBe('missing');
      expect(responseData.services.prodigi).toBe('missing');

      // Restore original environment variables
      process.env.NEXT_PUBLIC_SUPABASE_URL = originalSupabaseUrl;
      process.env.STRIPE_SECRET_KEY = originalStripeKey;
      process.env.PRODIGI_API_KEY = originalProdigiKey;
    });
  });
});
