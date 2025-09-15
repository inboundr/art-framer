import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    const pathString = path.join('/');
    const searchParams = request.nextUrl.searchParams;
    const url = new URL(`https://api.ideogram.ai/${pathString}`);
    
    // Copy search parameters
    searchParams.forEach((value, key) => {
      url.searchParams.append(key, value);
    });

    // Debug: Log the API key and request details
    const apiKey = process.env.IDEOGRAM_API_KEY;
    console.log('GET request to Ideogram API:');
    console.log('- Path:', pathString);
    console.log('- Full URL:', url.toString());
    console.log('- API Key length:', apiKey ? apiKey.length : 'undefined');
    console.log('- API Key prefix:', apiKey ? apiKey.substring(0, 10) + '...' : 'undefined');

    const response = await fetch(url.toString(), {
      headers: {
        'Api-Key': apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Ideogram API error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Ideogram API proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch from Ideogram API' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    const pathString = path.join('/');
    
    // Get the request body as FormData
    const formData = await request.formData();
    
    // Debug: Log the API key and request details
    const apiKey = process.env.IDEOGRAM_API_KEY;
    console.log('POST request to Ideogram API:');
    console.log('- Path:', pathString);
    console.log('- Full URL:', `https://api.ideogram.ai/${pathString}`);
    console.log('- API Key length:', apiKey ? apiKey.length : 'undefined');
    console.log('- API Key prefix:', apiKey ? apiKey.substring(0, 10) + '...' : 'undefined');
    console.log('- FormData entries:');
    for (const [key, value] of formData.entries()) {
      console.log(`  - ${key}: ${value}`);
    }
    
    const response = await fetch(`https://api.ideogram.ai/${pathString}`, {
      method: 'POST',
      headers: {
        'Api-Key': apiKey,
        // Don't set Content-Type for FormData - let fetch handle it with boundary
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log('Ideogram API error response:', errorText);
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      throw new Error(`Ideogram API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Ideogram API proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to post to Ideogram API' },
      { status: 500 }
    );
  }
}
