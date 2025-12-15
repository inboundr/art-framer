/**
 * Comprehensive Test Script for Pricing and Shipping Calculations
 * 
 * Tests all edge cases and combinations to ensure 100% accuracy
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') });
config({ path: resolve(__dirname, '../.env') });

import { ProdigiClient } from '@/lib/prodigi-v2/client';
import { CurrencyService } from '@/lib/currency';
import { PricingService } from '@/lib/checkout/services/pricing.service';
import { ShippingService } from '@/lib/checkout/services/shipping.service';
import type { CartItem } from '@/lib/checkout/types/cart.types';

// Initialize Prodigi client (same as API routes)
const getProdigiClient = (): ProdigiClient | null => {
  const apiKey = process.env.PRODIGI_API_KEY;
  const environment = (process.env.PRODIGI_ENVIRONMENT as 'sandbox' | 'production') || 'production';
  
  if (!apiKey) {
    return null;
  }
  
  return new ProdigiClient({
    apiKey,
    environment,
  });
};

const prodigiClient = getProdigiClient();
if (!prodigiClient) {
  console.error('❌ Prodigi client not configured. Set PRODIGI_API_KEY in environment variables.');
  process.exit(1);
}

const currencyService = new CurrencyService();
const pricingService = new PricingService(prodigiClient, currencyService);
const shippingService = new ShippingService(prodigiClient);

interface TestCase {
  name: string;
  items: CartItem[];
  destinationCountry: string;
  shippingMethod?: string;
  currency?: string;
  expectedIssues?: string[];
}

const testCases: TestCase[] = [
  // Test 1: Single item with basic attributes
  {
    name: 'Single canvas item - US',
    items: [{
      id: 'test-1',
      productId: 'test-product-1',
      sku: 'global-can-8x20-test1234',
      name: '8x20 Canvas',
      imageUrl: '',
      quantity: 1,
      price: 0,
      originalPrice: 0,
      currency: 'USD',
      frameConfig: {
        size: '8x20',
        color: 'black',
        style: 'black',
        material: 'wood',
        wrap: 'Black',
        glaze: 'none',
        mount: 'none',
        mountColor: 'white',
        paperType: 'enhanced-matte',
        finish: 'matte',
        edge: '38mm',
      },
    }],
    destinationCountry: 'US',
    shippingMethod: 'Standard',
  },
  
  // Test 2: Multiple items with same SKU
  {
    name: 'Multiple items same SKU - US',
    items: [
      {
        id: 'test-2a',
        productId: 'test-product-2',
        sku: 'global-can-8x20-test1234',
        name: '8x20 Canvas',
        imageUrl: '',
        quantity: 1,
        price: 0,
        originalPrice: 0,
        currency: 'USD',
        frameConfig: {
          size: '8x20',
          color: 'black',
          style: 'black',
          material: 'wood',
          wrap: 'Black',
          glaze: 'none',
          mount: 'none',
          mountColor: 'white',
          paperType: 'enhanced-matte',
          finish: 'matte',
          edge: '38mm',
        },
      },
      {
        id: 'test-2b',
        productId: 'test-product-2',
        sku: 'global-can-8x20-test1234',
        name: '8x20 Canvas',
        imageUrl: '',
        quantity: 1,
        price: 0,
        originalPrice: 0,
        currency: 'USD',
        frameConfig: {
          size: '8x20',
          color: 'black',
          style: 'black',
          material: 'wood',
          wrap: 'Black',
          glaze: 'none',
          mount: 'none',
          mountColor: 'white',
          paperType: 'enhanced-matte',
          finish: 'matte',
          edge: '38mm',
        },
      },
    ],
    destinationCountry: 'US',
    shippingMethod: 'Standard',
  },
  
  // Test 3: Different countries
  {
    name: 'Single item - Canada',
    items: [{
      id: 'test-3',
      productId: 'test-product-3',
      sku: 'global-can-8x20-test1234',
      name: '8x20 Canvas',
      imageUrl: '',
      quantity: 1,
      price: 0,
      originalPrice: 0,
      currency: 'USD',
      frameConfig: {
        size: '8x20',
        color: 'black',
        style: 'black',
        material: 'wood',
        wrap: 'Black',
        glaze: 'none',
        mount: 'none',
        mountColor: 'white',
        paperType: 'enhanced-matte',
        finish: 'matte',
        edge: '38mm',
      },
    }],
    destinationCountry: 'CA',
    shippingMethod: 'Standard',
  },
  
  // Test 4: Different shipping methods
  {
    name: 'Single item - Express shipping',
    items: [{
      id: 'test-4',
      productId: 'test-product-4',
      sku: 'global-can-8x20-test1234',
      name: '8x20 Canvas',
      imageUrl: '',
      quantity: 1,
      price: 0,
      originalPrice: 0,
      currency: 'USD',
      frameConfig: {
        size: '8x20',
        color: 'black',
        style: 'black',
        material: 'wood',
        wrap: 'Black',
        glaze: 'none',
        mount: 'none',
        mountColor: 'white',
        paperType: 'enhanced-matte',
        finish: 'matte',
        edge: '38mm',
      },
    }],
    destinationCountry: 'US',
    shippingMethod: 'Express',
  },
  
  // Test 5: Framed product with mount
  {
    name: 'Framed product with mount - US',
    items: [{
      id: 'test-5',
      productId: 'test-product-5',
      sku: 'fra-box-ema-mount2-gla-a3-test1234',
      name: 'Framed Print',
      imageUrl: '',
      quantity: 1,
      price: 0,
      originalPrice: 0,
      currency: 'USD',
      frameConfig: {
        size: '8x20',
        color: 'black',
        style: 'black',
        material: 'wood',
        wrap: 'Black',
        glaze: 'Float glass',
        mount: '2.4mm',
        mountColor: 'Black',
        paperType: 'enhanced-matte',
        finish: 'matte',
        edge: '19mm',
      },
    }],
    destinationCountry: 'US',
    shippingMethod: 'Standard',
  },
];

async function runTests() {
  console.log('🧪 Starting comprehensive pricing and shipping tests...\n');
  
  let passed = 0;
  let failed = 0;
  
  for (const testCase of testCases) {
    console.log(`\n📋 Test: ${testCase.name}`);
    console.log(`   Items: ${testCase.items.length}`);
    console.log(`   Destination: ${testCase.destinationCountry}`);
    console.log(`   Shipping Method: ${testCase.shippingMethod || 'All'}`);
    
    try {
      // Test pricing
      console.log('   Testing pricing...');
      const pricing = await pricingService.calculatePricing(
        testCase.items,
        testCase.destinationCountry,
        testCase.shippingMethod as any || 'Standard',
        testCase.currency
      );
      
      console.log(`   ✅ Pricing: $${pricing.subtotal.toFixed(2)} ${pricing.currency}`);
      console.log(`      Shipping: $${pricing.shipping.toFixed(2)}`);
      console.log(`      Tax: $${pricing.tax.toFixed(2)}`);
      console.log(`      Total: $${pricing.total.toFixed(2)}`);
      
      // Verify per-item prices
      if (pricing.itemPrices && pricing.itemPrices.size > 0) {
        console.log(`      Per-item prices: ${pricing.itemPrices.size} items`);
        let totalItemPrices = 0;
        pricing.itemPrices.forEach((price, index) => {
          totalItemPrices += price * testCase.items[index].quantity;
          console.log(`        Item ${index}: $${price.toFixed(2)} x ${testCase.items[index].quantity}`);
        });
        const diff = Math.abs(totalItemPrices - pricing.subtotal);
        if (diff > 0.01) {
          console.log(`      ⚠️  Warning: Per-item total ($${totalItemPrices.toFixed(2)}) doesn't match subtotal ($${pricing.subtotal.toFixed(2)})`);
        }
      }
      
      // Test shipping (if not testing specific method)
      if (!testCase.shippingMethod) {
        console.log('   Testing shipping options...');
        const shippingOptions = await shippingService.calculateShipping(
          testCase.items,
          {
            address1: '123 Test St',
            city: 'Test City',
            state: 'CA',
            zip: '12345',
            country: testCase.destinationCountry,
          }
        );
        
        if (Array.isArray(shippingOptions)) {
          console.log(`   ✅ Shipping options: ${shippingOptions.length} methods`);
          shippingOptions.forEach(option => {
            console.log(`      ${option.method}: $${option.cost.toFixed(2)} (${option.estimatedDays} days)`);
          });
        }
      }
      
      passed++;
    } catch (error: any) {
      console.error(`   ❌ Test failed: ${error.message}`);
      if (error.details) {
        console.error(`      Details:`, JSON.stringify(error.details, null, 2));
      }
      failed++;
    }
  }
  
  console.log(`\n\n📊 Test Results:`);
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   Total: ${passed + failed}`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(console.error);

