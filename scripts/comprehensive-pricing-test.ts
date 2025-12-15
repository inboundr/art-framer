/**
 * Comprehensive Pricing and Shipping Test Suite
 * 
 * Tests all attribute combinations and verifies pricing/shipping accuracy
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

// Initialize Prodigi client
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

interface TestResult {
  name: string;
  passed: boolean;
  errors: string[];
  warnings: string[];
  details: any;
}

const results: TestResult[] = [];

function logResult(result: TestResult) {
  results.push(result);
  const icon = result.passed ? '✅' : '❌';
  console.log(`\n${icon} ${result.name}`);
  if (result.errors.length > 0) {
    console.log('   Errors:');
    result.errors.forEach(err => console.log(`     - ${err}`));
  }
  if (result.warnings.length > 0) {
    console.log('   Warnings:');
    result.warnings.forEach(warn => console.log(`     - ${warn}`));
  }
}

// Test 1: Verify attribute normalization consistency
async function testAttributeNormalization() {
  const result: TestResult = {
    name: 'Attribute Normalization Consistency',
    passed: true,
    errors: [],
    warnings: [],
    details: {},
  };

  try {
    // Test that same attributes produce same quote keys
    const { normalizeAttributesForMatching, generateQuoteKey } = await import('@/lib/checkout/utils/attribute-normalizer');
    
    const attrs1 = { wrap: 'Black', edge: '38mm', paperType: 'Standard canvas (SC)' };
    const attrs2 = { wrap: 'black', edge: '38mm', paperType: 'standard canvas (sc)' };
    const attrs3 = { edge: '38mm', wrap: 'Black', paperType: 'Standard canvas (SC)' }; // Different order
    
    const key1 = generateQuoteKey('test-sku', attrs1);
    const key2 = generateQuoteKey('test-sku', attrs2);
    const key3 = generateQuoteKey('test-sku', attrs3);
    
    if (key1 !== key2 || key1 !== key3) {
      result.passed = false;
      result.errors.push(`Attribute normalization inconsistent: ${key1} vs ${key2} vs ${key3}`);
    }
    
    result.details = { key1, key2, key3, allMatch: key1 === key2 && key1 === key3 };
  } catch (error: any) {
    result.passed = false;
    result.errors.push(`Test failed: ${error.message}`);
  }
  
  logResult(result);
}

// Test 2: Test pricing with various product types
async function testPricingAccuracy() {
  const testCases = [
    {
      name: 'Canvas Product - 8x20',
      item: {
        id: 'test-1',
        productId: 'test-1',
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
      } as CartItem,
      destinationCountry: 'US',
    },
    {
      name: 'Framed Product with Mount',
      item: {
        id: 'test-2',
        productId: 'test-2',
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
      } as CartItem,
      destinationCountry: 'US',
    },
    {
      name: 'Multiple Same Items',
      item: {
        id: 'test-3',
        productId: 'test-3',
        sku: 'global-can-8x20-test1234',
        name: '8x20 Canvas',
        imageUrl: '',
        quantity: 2,
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
      } as CartItem,
      destinationCountry: 'US',
    },
  ];

  for (const testCase of testCases) {
    const result: TestResult = {
      name: `Pricing: ${testCase.name}`,
      passed: true,
      errors: [],
      warnings: [],
      details: {},
    };

    try {
      const items = [testCase.item];
      const pricing = await pricingService.calculatePricing(
        items,
        testCase.destinationCountry,
        'Standard'
      );

      result.details = {
        subtotal: pricing.subtotal,
        shipping: pricing.shipping,
        tax: pricing.tax,
        total: pricing.total,
        currency: pricing.currency,
        itemPrices: pricing.itemPrices ? Array.from(pricing.itemPrices.entries()) : [],
      };

      // Verify per-item prices match subtotal
      if (pricing.itemPrices && pricing.itemPrices.size > 0) {
        let totalFromItems = 0;
        pricing.itemPrices.forEach((price, index) => {
          totalFromItems += price * items[index].quantity;
        });
        
        const diff = Math.abs(totalFromItems - pricing.subtotal);
        if (diff > 0.01) {
          result.passed = false;
          result.errors.push(
            `Per-item total ($${totalFromItems.toFixed(2)}) doesn't match subtotal ($${pricing.subtotal.toFixed(2)}), diff: $${diff.toFixed(2)}`
          );
        }
      }

      // Verify prices are positive
      if (pricing.subtotal <= 0) {
        result.passed = false;
        result.errors.push(`Subtotal is $${pricing.subtotal}, should be positive`);
      }

      if (pricing.shipping < 0) {
        result.passed = false;
        result.errors.push(`Shipping is $${pricing.shipping}, should not be negative`);
      }

      if (pricing.total <= 0) {
        result.passed = false;
        result.errors.push(`Total is $${pricing.total}, should be positive`);
      }

    } catch (error: any) {
      result.passed = false;
      result.errors.push(`Test failed: ${error.message}`);
      if (error.details) {
        result.details.errorDetails = error.details;
      }
    }

    logResult(result);
  }
}

// Test 3: Test shipping accuracy
async function testShippingAccuracy() {
  const testCases = [
    {
      name: 'Single Item - US',
      items: [{
        id: 'test-1',
        productId: 'test-1',
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
      } as CartItem],
      address: {
        address1: '123 Test St',
        city: 'New York',
        state: 'NY',
        zip: '10001',
        country: 'US',
      },
    },
    {
      name: 'Multiple Items - Canada',
      items: [
        {
          id: 'test-2a',
          productId: 'test-2',
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
        } as CartItem,
        {
          id: 'test-2b',
          productId: 'test-2',
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
        } as CartItem,
      ],
      address: {
        address1: '198 B Chemin Freeman',
        city: 'Gatineau',
        state: 'QC',
        zip: 'J8Z 2B5',
        country: 'CA',
      },
    },
  ];

  for (const testCase of testCases) {
    const result: TestResult = {
      name: `Shipping: ${testCase.name}`,
      passed: true,
      errors: [],
      warnings: [],
      details: {},
    };

    try {
      const shippingOptions = await shippingService.calculateShipping(
        testCase.items,
        testCase.address
      );

      if (Array.isArray(shippingOptions)) {
        result.details = {
          optionsCount: shippingOptions.length,
          options: shippingOptions.map(opt => ({
            method: opt.method,
            cost: opt.cost,
            currency: opt.currency,
            estimatedDays: opt.estimatedDays,
          })),
        };

        // Verify all methods have valid costs
        for (const option of shippingOptions) {
          if (option.cost < 0) {
            result.passed = false;
            result.errors.push(`Shipping cost for ${option.method} is negative: $${option.cost}`);
          }
          if (option.estimatedDays < 0) {
            result.warnings.push(`Estimated days for ${option.method} is negative: ${option.estimatedDays}`);
          }
        }

        if (shippingOptions.length === 0) {
          result.passed = false;
          result.errors.push('No shipping options returned');
        }
      } else {
        result.details = {
          method: shippingOptions.method,
          cost: shippingOptions.cost,
          currency: shippingOptions.currency,
          estimatedDays: shippingOptions.estimatedDays,
        };

        if (shippingOptions.cost < 0) {
          result.passed = false;
          result.errors.push(`Shipping cost is negative: $${shippingOptions.cost}`);
        }
      }

    } catch (error: any) {
      result.passed = false;
      result.errors.push(`Test failed: ${error.message}`);
      if (error.details) {
        result.details.errorDetails = error.details;
      }
    }

    logResult(result);
  }
}

// Test 4: Verify pricing and shipping use same attributes
async function testAttributeConsistency() {
  const result: TestResult = {
    name: 'Pricing and Shipping Attribute Consistency',
    passed: true,
    errors: [],
    warnings: [],
    details: {},
  };

  try {
    const item: CartItem = {
      id: 'test-consistency',
      productId: 'test-consistency',
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
    };

    // Get pricing
    const pricing = await pricingService.calculatePricing([item], 'US', 'Standard');
    
    // Get shipping
    const shipping = await shippingService.calculateShipping(
      [item],
      {
        address1: '123 Test St',
        city: 'New York',
        state: 'NY',
        zip: '10001',
        country: 'US',
      },
      'Standard'
    );

    result.details = {
      pricingSubtotal: pricing.subtotal,
      shippingCost: Array.isArray(shipping) ? shipping.find(s => s.method === 'Standard')?.cost : shipping.cost,
    };

    // Both should succeed with same attributes
    if (pricing.subtotal <= 0) {
      result.passed = false;
      result.errors.push('Pricing returned invalid subtotal');
    }

    const shippingCost = Array.isArray(shipping) 
      ? shipping.find(s => s.method === 'Standard')?.cost 
      : shipping.cost;
    
    if (!shippingCost || shippingCost < 0) {
      result.passed = false;
      result.errors.push('Shipping returned invalid cost');
    }

  } catch (error: any) {
    result.passed = false;
    result.errors.push(`Test failed: ${error.message}`);
  }

  logResult(result);
}

// Run all tests
async function runAllTests() {
  console.log('🧪 Starting Comprehensive Pricing and Shipping Tests...\n');
  console.log('=' .repeat(80));

  await testAttributeNormalization();
  await testPricingAccuracy();
  await testShippingAccuracy();
  await testAttributeConsistency();

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('\n📊 Test Summary:');
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  console.log(`   ✅ Passed: ${passed}/${total}`);
  console.log(`   ❌ Failed: ${failed}/${total}`);

  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`   - ${r.name}`);
      r.errors.forEach(err => console.log(`     Error: ${err}`));
    });
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed!');
  }
}

runAllTests().catch(error => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});

