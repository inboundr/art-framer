import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Protect AI Studio routes if feature flag is disabled
  if (pathname.startsWith('/studio')) {
    const isAIStudioEnabled = process.env.NEXT_PUBLIC_AI_STUDIO_ENABLED === 'true';
    
    if (!isAIStudioEnabled) {
      // Redirect to 404 or main app
      return NextResponse.redirect(new URL('/', request.url));
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/studio/:path*',
  ],
};

