import { NextRequest, NextResponse } from 'next/server';
import { currencyService } from '@/lib/currency';

/**
 * GET /api/currency/rates
 * Returns current exchange rates
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const refresh = searchParams.get('refresh') === 'true';
    
    if (refresh) {
      console.log('🔄 Manually refreshing currency rates...');
      currencyService.clearCache();
    }
    
    const rates = await currencyService.getRates();
    
    return NextResponse.json({
      success: true,
      rates,
      baseCurrency: 'USD',
      lastUpdated: new Date().toISOString(),
      sampleConversions: {
        '100 USD to CAD': await currencyService.convertFromUSD(100, 'CAD'),
        '100 USD to EUR': await currencyService.convertFromUSD(100, 'EUR'),
        '100 USD to GBP': await currencyService.convertFromUSD(100, 'GBP'),
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching currency rates:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch currency rates'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/currency/rates
 * Manually refresh currency rates cache
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Clearing currency rates cache...');
    currencyService.clearCache();
    
    console.log('📥 Fetching fresh rates...');
    const rates = await currencyService.getRates();
    
    return NextResponse.json({
      success: true,
      message: 'Currency rates refreshed successfully',
      rates,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error refreshing currency rates:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to refresh currency rates'
      },
      { status: 500 }
    );
  }
}

