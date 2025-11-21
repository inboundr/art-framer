/**
 * Room Analysis API
 * Analyzes room photos and detects walls for frame placement
 */

import { NextRequest, NextResponse } from 'next/server';
import { detectWallsInRoom } from '@/lib/studio/openai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { roomImageUrl } = await request.json();

    if (!roomImageUrl) {
      return NextResponse.json(
        { error: 'Room image URL is required' },
        { status: 400 }
      );
    }

    // Detect walls using OpenAI Vision
    const detection = await detectWallsInRoom(roomImageUrl);

    // Process and validate wall data
    const walls = (detection.walls || []).map((wall: any, index: number) => ({
      id: `wall-${index}`,
      bounds: wall.bounds || { x1: 20, y1: 20, x2: 80, y2: 80 },
      center: wall.center || { x: 50, y: 50 },
      dimensions: wall.dimensions,
      perspectiveAngle: wall.perspectiveAngle || 0,
      suitabilityScore: wall.suitabilityScore || 0.8,
    }));

    // Sort by suitability
    walls.sort((a: any, b: any) => b.suitabilityScore - a.suitabilityScore);

    return NextResponse.json({
      walls,
      roomInfo: {
        style: detection.roomStyle || 'modern',
        wallColor: detection.wallColor || 'white',
        lighting: detection.lighting || 'natural',
      },
    });
  } catch (error) {
    console.error('Error analyzing room:', error);
    return NextResponse.json(
      {
        error: 'Failed to analyze room',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

