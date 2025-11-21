/**
 * Prodigi V2 API Route - Single Order
 * 
 * GET /api/prodigi-v2/orders/[orderId] - Get order details
 */

import { NextRequest, NextResponse } from 'next/server';
import { prodigiSDK } from '@/lib/prodigi-v2';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/prodigi-v2/orders/[orderId]
 * Get order by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const { orderId } = params;
    
    const order = await prodigiSDK.orders.get(orderId);
    
    return NextResponse.json({
      success: true,
      order,
    });
  } catch (error) {
    console.error('[Prodigi V2] Get order error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get order',
    }, { status: 500 });
  }
}

