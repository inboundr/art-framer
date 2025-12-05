/**
 * End-to-End Pricing & Shipping Test
 * 
 * Tests pricing and shipping across:
 * - Multiple product types
 * - Multiple configurations (colors, sizes, attributes)
 * - Multiple shipping destinations
 * - Edge cases and error handling
 * 
 * Goal: Ensure 100% production readiness
 */

import 'dotenv/config';
import * as path from 'path';
import { prodigiSDK } from '../src/lib/prodigi-v2';
import { getCountry } from '../src/lib/countries';
import { buildProdigiAttributes } from '../src/lib/checkout/utils/attribute-builder';

// Verify API key is loaded
if (!process.env.PRODIGI_API_KEY) {
  console.error('❌ PRODIGI_API_KEY not found in environment variables');
  console.error('   Please ensure .env.local exists and contains PRODIGI_API_KEY');
  process.exit(1);
}

interface TestResult {
  productType: string;
  size: string;
  sku: string;
  config: any;
  destination: string;
  success: boolean;
  error?: string;
  pricing?: {
    items: number;
    shipping: number;
    total: number;
    currency: string;
  };
  shippingOptions?: number;
  duration: number;
}

interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  errors: Map<string, number>;
  productTypes: Map<string, { total: number; passed: number; failed: number }>;
  destinations: Map<string, { total: number; passed: number; failed: number }>;
  averageDuration: number;
  slowestTests: Array<{ test: string; duration: number }>;
}

// Test configurations
const PRODUCT_TYPES = [
  'framed-print',
  'framed-canvas',
  'canvas',
  'metal',
  'poster',
  'acrylic',
];

const TEST_DESTINATIONS = [
  'US', 'CA', 'GB', 'AU', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE',
  'JP', 'KR', 'SG', 'HK', 'MX', 'BR', 'IN', 'NZ', 'CH', 'SE',
];

const TEST_COLORS = {
  'framed-print': ['black', 'white', 'brown', 'natural', 'gold', 'silver', 'dark grey', 'light grey'],
  'framed-canvas': ['black', 'white', 'brown', 'natural', 'gold', 'silver'],
  'canvas': ['black', 'white'], // wrap colors
  'metal': [], // no color attribute
  'poster': [], // no color attribute
  'acrylic': [], // no color attribute
};

// Test sizes - will be dynamically fetched per product type
const DEFAULT_TEST_SIZES = [
  '8x10', '11x14', '12x16', '12x18', '16x20', '18x24', '20x24', '20x30', '24x36', '30x40',
];

// Rate limiting and test limits
const DELAY_BETWEEN_REQUESTS = 200; // ms - increased to avoid rate limits
const DELAY_BETWEEN_DESTINATIONS = 1000; // ms
const MAX_SIZES_PER_TYPE = 5; // Limit sizes per product type
const MAX_DESTINATIONS = 15; // Limit destinations to test
const MAX_COLORS_PER_PRODUCT = 2; // Limit color variations
const MAX_TESTS_TOTAL = 500; // Hard limit to prevent timeout

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testPricingForProduct(
  productType: string,
  size: string,
  destination: string,
  color?: string
): Promise<TestResult> {
  const startTime = Date.now();
  const testId = `${productType}-${size}-${destination}${color ? `-${color}` : ''}`;
  
  try {
    // Get SKU
    const sku = await prodigiSDK.catalog.getSKU(productType, size, destination);
    if (!sku) {
      return {
        productType,
        size,
        sku: 'N/A',
        config: { productType, size, color },
        destination,
        success: false,
        error: `SKU not found for ${productType} ${size} in ${destination}`,
        duration: Date.now() - startTime,
      };
    }

    // Get product details
    const product = await prodigiSDK.products.get(sku);
    if (!product) {
      return {
        productType,
        size,
        sku,
        config: { productType, size, color },
        destination,
        success: false,
        error: `Product not found: ${sku}`,
        duration: Date.now() - startTime,
      };
    }

    // Build config
    const config: any = {
      productType,
      frameColor: color,
      frameStyle: color || 'classic',
      size,
    };

    // Add product-specific attributes
    if (productType === 'canvas' || productType === 'framed-canvas') {
      config.wrap = 'ImageWrap';
    }
    if (productType === 'metal') {
      config.finish = 'high gloss';
    }

    // Build attributes
    const attributes = buildProdigiAttributes(config, {
      validAttributes: product.attributes,
      sku,
    });

    // Get quotes for all shipping methods
    const shippingMethods: Array<'Budget' | 'Standard' | 'Express' | 'Overnight'> = 
      ['Budget', 'Standard', 'Express', 'Overnight'];
    
    const quotePromises = shippingMethods.map(method =>
      prodigiSDK.quotes.create({
        destinationCountryCode: destination,
        shippingMethod: method,
        items: [
          {
            sku,
            copies: 1,
            ...(Object.keys(attributes).length > 0 && { attributes }),
            assets: [{ printArea: 'default' }],
          },
        ],
      }).catch(error => {
        console.warn(`[Test] Failed to get quote for ${method}:`, error.message);
        return [];
      })
    );

    const quoteResults = await Promise.all(quotePromises);
    const quotes = quoteResults.flat().filter(Boolean);

    if (quotes.length === 0) {
      return {
        productType,
        size,
        sku,
        config,
        destination,
        success: false,
        error: 'No shipping quotes available',
        duration: Date.now() - startTime,
      };
    }

    // Get Standard quote for pricing
    const standardQuote = quotes.find(q => q.shipmentMethod === 'Standard') || quotes[0];
    const itemsCost = Number(standardQuote.costSummary.items?.amount) || 0;
    const shippingCost = Number(standardQuote.costSummary.shipping?.amount) || 0;
    const totalCost = Number(standardQuote.costSummary.totalCost?.amount) || 0;
    const currency = standardQuote.costSummary.items?.currency || 'USD';

    return {
      productType,
      size,
      sku,
      config,
      destination,
      success: true,
      pricing: {
        items: itemsCost,
        shipping: shippingCost,
        total: totalCost,
        currency,
      },
      shippingOptions: quotes.length,
      duration: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      productType,
      size,
      sku: 'N/A',
      config: { productType, size, color },
      destination,
      success: false,
      error: error.message || 'Unknown error',
      duration: Date.now() - startTime,
    };
  }
}

async function runComprehensiveTest(): Promise<void> {
  console.log('🚀 Starting End-to-End Pricing & Shipping Test\n');
  console.log('=' .repeat(80));
  
  const results: TestResult[] = [];
  const summary: TestSummary = {
    total: 0,
    passed: 0,
    failed: 0,
    errors: new Map(),
    productTypes: new Map(),
    destinations: new Map(),
    averageDuration: 0,
    slowestTests: [],
  };

  // Initialize counters
  PRODUCT_TYPES.forEach(type => {
    summary.productTypes.set(type, { total: 0, passed: 0, failed: 0 });
  });
  TEST_DESTINATIONS.forEach(dest => {
    summary.destinations.set(dest, { total: 0, passed: 0, failed: 0 });
  });

  let testCount = 0;
  let totalTests = 0; // Will be calculated dynamically
  console.log(`📊 Starting comprehensive test...\n`);

  // Test each product type
  for (const productType of PRODUCT_TYPES) {
    console.log(`\n📦 Testing ${productType}...`);
    
    // Get available sizes for this product type
    let availableSizes: string[] = [];
    try {
      availableSizes = await prodigiSDK.catalog.getAvailableSizes(productType, 'US');
      if (availableSizes.length === 0) {
        console.log(`  ⚠️  No sizes available for ${productType}, skipping...`);
        continue;
      }
      // Limit to first N sizes to avoid timeout
      availableSizes = availableSizes.slice(0, Math.min(availableSizes.length, MAX_SIZES_PER_TYPE));
      console.log(`  ✅ Found ${availableSizes.length} sizes: ${availableSizes.join(', ')}`);
      
      // Update total test estimate
      const colorsToTest = TEST_COLORS[productType as keyof typeof TEST_COLORS] || [];
      const colorCount = colorsToTest.length > 0 ? Math.min(colorsToTest.length, MAX_COLORS_PER_PRODUCT) : 1;
      totalTests += availableSizes.length * MAX_DESTINATIONS * colorCount;
    } catch (error: any) {
      console.log(`  ❌ Error getting sizes for ${productType}: ${error.message}`);
      continue;
    }

    // Test each size
    for (const size of availableSizes) {
      // Test with and without color (if applicable)
      const colorsToTest = TEST_COLORS[productType as keyof typeof TEST_COLORS] || [];
      const testConfigs = colorsToTest.length > 0 
        ? colorsToTest.slice(0, 2).map(c => ({ color: c })) // Limit to 2 colors per product
        : [{}]; // No color attribute

      for (const testConfig of testConfigs) {
        // Test each destination (limited)
        const destinationsToTest = TEST_DESTINATIONS.slice(0, MAX_DESTINATIONS);
        for (const destination of destinationsToTest) {
          // Hard limit check
          if (testCount >= MAX_TESTS_TOTAL) {
            console.log(`\n  ⚠️  Reached maximum test limit (${MAX_TESTS_TOTAL}), stopping...`);
            break;
          }
          
          testCount++;
          const progress = totalTests > 0 ? ((testCount / totalTests) * 100).toFixed(1) : '?';
          process.stdout.write(`\r  ⏳ Progress: ${progress}% (${testCount}${totalTests > 0 ? `/${totalTests}` : ''}) - Testing ${size} → ${destination}...`);

          const result = await testPricingForProduct(
            productType,
            size,
            destination,
            testConfig.color
          );

          results.push(result);
          summary.total++;

          // Update counters
          if (result.success) {
            summary.passed++;
            summary.productTypes.get(productType)!.passed++;
            summary.destinations.get(destination)!.passed++;
          } else {
            summary.failed++;
            summary.productTypes.get(productType)!.failed++;
            summary.destinations.get(destination)!.failed++;
            
            const errorKey = result.error || 'Unknown error';
            summary.errors.set(errorKey, (summary.errors.get(errorKey) || 0) + 1);
          }
          summary.productTypes.get(productType)!.total++;
          summary.destinations.get(destination)!.total++;

          // Track slowest tests
          if (result.duration > 5000) {
            summary.slowestTests.push({
              test: `${productType}-${size}-${destination}`,
              duration: result.duration,
            });
          }

          await delay(DELAY_BETWEEN_REQUESTS);
        }
        await delay(DELAY_BETWEEN_DESTINATIONS);
      }
    }
  }

  console.log('\n\n' + '='.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(80));

  // Calculate average duration
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  summary.averageDuration = totalDuration / results.length;

  // Print summary
  console.log(`\n✅ Total Tests: ${summary.total}`);
  console.log(`✅ Passed: ${summary.passed} (${((summary.passed / summary.total) * 100).toFixed(1)}%)`);
  console.log(`❌ Failed: ${summary.failed} (${((summary.failed / summary.total) * 100).toFixed(1)}%)`);
  console.log(`⏱️  Average Duration: ${summary.averageDuration.toFixed(0)}ms`);

  // Print errors
  if (summary.errors.size > 0) {
    console.log(`\n❌ Error Breakdown:`);
    const sortedErrors = Array.from(summary.errors.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    sortedErrors.forEach(([error, count]) => {
      console.log(`   ${error}: ${count} occurrences`);
    });
  }

  // Print product type breakdown
  console.log(`\n📦 Product Type Breakdown:`);
  Array.from(summary.productTypes.entries())
    .sort((a, b) => b[1].total - a[1].total)
    .forEach(([type, stats]) => {
      const passRate = ((stats.passed / stats.total) * 100).toFixed(1);
      console.log(`   ${type}: ${stats.passed}/${stats.total} passed (${passRate}%)`);
    });

  // Print destination breakdown
  console.log(`\n🌍 Destination Breakdown:`);
  Array.from(summary.destinations.entries())
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 10)
    .forEach(([dest, stats]) => {
      const passRate = ((stats.passed / stats.total) * 100).toFixed(1);
      const country = getCountry(dest);
      console.log(`   ${dest} (${country?.name || 'Unknown'}): ${stats.passed}/${stats.total} passed (${passRate}%)`);
    });

  // Print slowest tests
  if (summary.slowestTests.length > 0) {
    console.log(`\n🐌 Slowest Tests (>5s):`);
    summary.slowestTests
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10)
      .forEach(({ test, duration }) => {
        console.log(`   ${test}: ${duration}ms`);
      });
  }

  // Print failed tests details
  const failedTests = results.filter(r => !r.success);
  if (failedTests.length > 0) {
    console.log(`\n❌ Failed Tests Details (first 20):`);
    failedTests.slice(0, 20).forEach((test, index) => {
      console.log(`\n   ${index + 1}. ${test.productType} ${test.size} → ${test.destination}`);
      console.log(`      Error: ${test.error}`);
      console.log(`      SKU: ${test.sku}`);
    });
  }

  // Generate TODO list
  console.log(`\n\n${'='.repeat(80)}`);
  console.log('📋 PRODUCTION READINESS TODO LIST');
  console.log('='.repeat(80));

  const todos: string[] = [];

  // Check pass rate
  const passRate = (summary.passed / summary.total) * 100;
  if (passRate < 95) {
    todos.push(`❌ CRITICAL: Pass rate is ${passRate.toFixed(1)}% - Must be >95% for production`);
  } else if (passRate < 99) {
    todos.push(`⚠️  WARNING: Pass rate is ${passRate.toFixed(1)}% - Should be >99% for production`);
  } else {
    todos.push(`✅ Pass rate is ${passRate.toFixed(1)}% - Excellent!`);
  }

  // Check for common errors
  const skuNotFound = summary.errors.get('SKU not found') || 0;
  if (skuNotFound > 0) {
    todos.push(`⚠️  ${skuNotFound} tests failed due to missing SKUs - Review product catalog coverage`);
  }

  const noQuotes = summary.errors.get('No shipping quotes available') || 0;
  if (noQuotes > 0) {
    todos.push(`⚠️  ${noQuotes} tests failed due to no shipping quotes - Review shipping configuration`);
  }

  // Check product type coverage
  summary.productTypes.forEach((stats, type) => {
    const passRate = (stats.passed / stats.total) * 100;
    if (passRate < 90) {
      todos.push(`⚠️  ${type}: Only ${passRate.toFixed(1)}% pass rate - Needs investigation`);
    }
  });

  // Check destination coverage
  const problematicDestinations = Array.from(summary.destinations.entries())
    .filter(([_, stats]) => stats.total > 0 && (stats.passed / stats.total) < 0.9);
  if (problematicDestinations.length > 0) {
    todos.push(`⚠️  ${problematicDestinations.length} destinations have <90% pass rate - Review shipping availability`);
  }

  // Performance checks
  if (summary.averageDuration > 3000) {
    todos.push(`⚠️  Average response time is ${summary.averageDuration.toFixed(0)}ms - Consider optimization`);
  }

  if (summary.slowestTests.length > 10) {
    todos.push(`⚠️  ${summary.slowestTests.length} tests took >5s - Review performance bottlenecks`);
  }

  // Print TODO list
  todos.forEach((todo, index) => {
    console.log(`\n${index + 1}. ${todo}`);
  });

  // Save detailed results
  const fs = require('fs');
  const resultsPath = path.join(__dirname, '../test-results-end-to-end.json');
  fs.writeFileSync(resultsPath, JSON.stringify({
    summary,
    results: results.slice(0, 100), // Save first 100 results
    timestamp: new Date().toISOString(),
  }, null, 2));
  console.log(`\n💾 Detailed results saved to: ${resultsPath}`);

  console.log(`\n${'='.repeat(80)}\n`);
}

// Run the test
runComprehensiveTest().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});

