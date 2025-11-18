import { NextRequest, NextResponse } from 'next/server';
import { currencyService } from '@/lib/currency';

/**
 * GET /api/currency/rates
 * Returns current exchange rates and cache status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const refresh = searchParams.get('refresh') === 'true';
    
    if (refresh) {
      console.log('🔄 Manual refresh requested, clearing cache...');
      currencyService.clearCache();
    }
    
    const rates = await currencyService.getRates();
    const cacheStatus = currencyService.getCacheStatus();
    
    return NextResponse.json({
      success: true,
      rates,
      baseCurrency: 'USD',
      cache: cacheStatus,
      timestamp: new Date().toISOString(),
      sampleConversions: {
        '100_USD_to_CAD': await currencyService.convertFromUSD(100, 'CAD'),
        '100_USD_to_EUR': await currencyService.convertFromUSD(100, 'EUR'),
        '100_USD_to_GBP': await currencyService.convertFromUSD(100, 'GBP'),
      }
    });
    
  } catch (error) {
    console.error('❌ Error in currency rates API:', error);
    
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
    console.log('🔄 Manual cache refresh initiated...');
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

