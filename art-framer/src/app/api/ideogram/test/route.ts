import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.IDEOGRAM_API_KEY;
  const hasApiKey = !!apiKey;
  
  return NextResponse.json({
    hasApiKey,
    apiKeyLength: apiKey ? apiKey.length : 0,
    apiKeyPreview: apiKey ? `${apiKey.substring(0, 10)}...` : 'none',
    timestamp: new Date().toISOString(),
  });
}
