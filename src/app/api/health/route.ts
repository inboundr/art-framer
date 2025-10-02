import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Basic health check
    const healthCheck = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      services: {
        database: 'connected', // You can add actual DB health check here
        supabase: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'configured' : 'missing',
        stripe: process.env.STRIPE_SECRET_KEY ? 'configured' : 'missing',
        prodigi: process.env.PRODIGI_API_KEY ? 'configured' : 'missing',
      }
    };

    return NextResponse.json(healthCheck, { status: 200 });
  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
