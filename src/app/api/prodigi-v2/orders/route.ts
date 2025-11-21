/**
 * Prodigi V2 API Route - Orders
 * 
 * POST /api/prodigi-v2/orders - Create order
 * GET  /api/prodigi-v2/orders - List orders (with pagination)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prodigiSDK } from '@/lib/prodigi-v2';
import type { CreateOrderRequest, GetOrdersParams } from '@/lib/prodigi-v2';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/prodigi-v2/orders
 * Create a new order
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as CreateOrderRequest;
    
    // Create order
    const order = await prodigiSDK.orders.create(body);
    
    return NextResponse.json({
      success: true,
      order,
    }, { status: 201 });
  } catch (error) {
    console.error('[Prodigi V2] Create order error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create order',
    }, { status: 500 });
  }
}

/**
 * GET /api/prodigi-v2/orders
 * List orders with pagination
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const params: GetOrdersParams = {
      top: searchParams.get('top') ? parseInt(searchParams.get('top')!) : undefined,
      skip: searchParams.get('skip') ? parseInt(searchParams.get('skip')!) : undefined,
      status: searchParams.get('status') as any,
      merchantReference: searchParams.get('merchantReference') || undefined,
    };
    
    const result = await prodigiSDK.orders.list(params);
    
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('[Prodigi V2] List orders error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list orders',
    }, { status: 500 });
  }
}

