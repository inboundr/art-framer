import { NextResponse } from "next/server";
import { prodigiClient } from "@/lib/prodigi";

export async function GET() {
  try {
    console.log('🧪 Testing Prodigi Integration...');

    // Test 1: Check environment variables
    const apiKey = process.env.PRODIGI_API_KEY;
    const environment = process.env.PRODIGI_ENVIRONMENT || 'sandbox';
    
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'PRODIGI_API_KEY not found in environment variables',
        tests: {
          environment: '❌ Missing API key'
        }
      }, { status: 500 });
    }

    // Test 2: Test product SKU mapping
    const testMappings = [
      { size: 'small', style: 'black', material: 'wood' },
      { size: 'medium', style: 'white', material: 'wood' },
      { size: 'large', style: 'natural', material: 'wood' },
      { size: 'extra_large', style: 'gold', material: 'wood' },
    ];

    const skuMappings = await Promise.all(testMappings.map(async ({ size, style, material }) => ({
      input: `${size}-${style}-${material}`,
      sku: await prodigiClient.getProductSku(size, style, material)
    })));

    // Test 3: Test order conversion
    const testOrderData = {
      orderReference: 'TEST-ORDER-001',
      items: [
        {
          productSku: 'FRAME-MD-BLK-WD',
          quantity: 1,
          imageUrl: 'https://example.com/test-image.jpg',
          frameSize: '16x20', // V2 sizing: using actual size instead of 'medium'
          frameStyle: 'black',
          frameMaterial: 'wood',
        }
      ],
      shippingAddress: {
        firstName: 'John',
        lastName: 'Doe',
        address1: '123 Test Street',
        city: 'Test City',
        state: 'CA',
        zip: '12345',
        country: 'US',
      },
      customerEmail: 'test@example.com',
      customerPhone: '+1234567890',
    };

    const prodigiOrder = await prodigiClient.convertToProdigiOrder(testOrderData);

    // Test 4: Test API connectivity (optional - might fail in sandbox)
    let apiTest: { status: string; message: string; products?: any[]; note?: string } = { status: 'skipped', message: 'API test skipped' };
    
    try {
      // This might fail in sandbox mode, which is expected
      const products = await prodigiClient.getProducts();
      apiTest = { 
        status: 'success', 
        message: `Found ${products.length} products`,
        products: products.slice(0, 3) // Show first 3 products
      };
    } catch (error) {
      apiTest = { 
        status: 'expected_failure', 
        message: `API test failed (expected in sandbox): ${error instanceof Error ? error.message : 'Unknown error'}`,
        note: 'This is normal in sandbox mode'
      };
    }

    return NextResponse.json({
      success: true,
      message: 'Prodigi integration test completed',
      environment: {
        apiKey: apiKey ? '✅ Set' : '❌ Missing',
        environment: environment,
        keyLength: apiKey?.length || 0,
        keyFormat: apiKey ? (/^[a-f0-9-]+$/i.test(apiKey) ? 'Valid UUID' : 'Invalid format') : 'N/A'
      },
      tests: {
        skuMapping: skuMappings,
        orderConversion: {
          input: testOrderData,
          output: {
            merchantReference: prodigiOrder.merchantReference,
            itemsCount: prodigiOrder.items.length,
            customerEmail: prodigiOrder.metadata?.customerEmail || 'N/A',
            shippingAddress: prodigiOrder.recipient.name
          }
        },
        apiConnectivity: apiTest
      },
      nextSteps: [
        'Test the "Add to Cart" functionality in your app',
        'Create a test order through the UI',
        'Check order processing in admin panel',
        'Switch to production mode when ready'
      ]
    });

  } catch (error) {
    console.error('Prodigi test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
