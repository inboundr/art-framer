/**
 * Prodigi V2 API Route - Order Actions
 * 
 * GET  /api/prodigi-v2/orders/[orderId]/actions - Get available actions
 * POST /api/prodigi-v2/orders/[orderId]/actions - Perform action
 */

import { NextRequest, NextResponse } from 'next/server';
import { prodigiSDK } from '@/lib/prodigi-v2';
import type { UpdateMetadataRequest, UpdateRecipientRequest, ShippingMethod } from '@/lib/prodigi-v2';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/prodigi-v2/orders/[orderId]/actions
 * Get available actions
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const { orderId } = params;
    
    const actions = await prodigiSDK.orderActions.getActions(orderId);
    
    return NextResponse.json({
      success: true,
      actions,
    });
  } catch (error) {
    console.error('[Prodigi V2] Get actions error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get actions',
    }, { status: 500 });
  }
}

/**
 * POST /api/prodigi-v2/orders/[orderId]/actions
 * Perform an action
 * 
 * Body: { action: 'cancel' | 'updateMetadata' | 'updateRecipient' | 'updateShippingMethod', data: any }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const { orderId } = params;
    const body = await request.json();
    const { action, data } = body;
    
    let order;
    
    switch (action) {
      case 'cancel':
        order = await prodigiSDK.orderActions.cancel(orderId);
        break;
        
      case 'updateMetadata':
        order = await prodigiSDK.orderActions.updateMetadata(orderId, data as UpdateMetadataRequest['metadata']);
        break;
        
      case 'updateRecipient':
        order = await prodigiSDK.orderActions.updateRecipient(orderId, data as UpdateRecipientRequest);
        break;
        
      case 'updateShippingMethod':
        order = await prodigiSDK.orderActions.updateShippingMethod(orderId, data as ShippingMethod);
        break;
        
      default:
        return NextResponse.json({
          success: false,
          error: `Invalid action: ${action}`,
        }, { status: 400 });
    }
    
    return NextResponse.json({
      success: true,
      order,
    });
  } catch (error) {
    console.error('[Prodigi V2] Perform action error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to perform action',
    }, { status: 500 });
  }
}

