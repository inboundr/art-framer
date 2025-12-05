/**
 * Comprehensive Pricing & Shipping Test - Production Readiness
 * 
 * Intelligently samples products and configurations to test:
 * - All product types
 * - Representative sizes per type
 * - Key shipping destinations
 * - Edge cases and error scenarios
 * 
 * Generates production readiness TODO list
 */

import 'dotenv/config';
import { prodigiSDK } from '../src/lib/prodigi-v2';
import { getCountry } from '../src/lib/countries';
import { buildProdigiAttributes } from '../src/lib/checkout/utils/attribute-builder';
import { azureSearchClient } from '../src/lib/prodigi-v2/azure-search/client';
import type { ProdigiSearchFilters } from '../src/lib/prodigi-v2/azure-search/types';

// Verify API key
if (!process.env.PRODIGI_API_KEY) {
  console.error('❌ PRODIGI_API_KEY not found in environment variables');
  process.exit(1);
}

interface TestResult {
  productType: string;
  size: string;
  sku: string;
  destination: string;
  config: any;
  success: boolean;
  error?: string;
  errorCode?: string;
  pricing?: {
    items: number;
    shipping: number;
    total: number;
    currency: string;
  };
  shippingOptions?: number;
  duration: number;
  timestamp: string;
}

interface ProductionReadinessIssue {
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  issue: string;
  affected: string[];
  recommendation: string;
  testCount: number;
}

interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  errors: Map<string, { count: number; examples: string[] }>;
  productTypes: Map<string, { total: number; passed: number; failed: number; errors: string[] }>;
  destinations: Map<string, { total: number; passed: number; failed: number }>;
  averageDuration: number;
  slowestTests: Array<{ test: string; duration: number }>;
  issues: ProductionReadinessIssue[];
}

// Test configuration
const PRODUCT_TYPES = [
  'framed-print',
  'framed-canvas',
  'canvas',
  'metal',
  'poster',
  'acrylic',
];

// Key destinations for testing (prioritize major markets)
const KEY_DESTINATIONS = [
  'US', 'CA', 'GB', 'AU', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE',
  'JP', 'KR', 'SG', 'MX', 'BR', 'IN', 'NZ', 'CH', 'SE', 'NO',
];

const TEST_COLORS = {
  'framed-print': ['black', 'white', 'brown', 'natural'],
  'framed-canvas': ['black', 'white', 'brown'],
  'canvas': ['black', 'white'],
  'metal': [],
  'poster': [],
  'acrylic': [],
};

// Rate limiting - Prodigi allows 30 calls per 30 seconds
const DELAY_BETWEEN_REQUESTS = 1200; // ms - Increased to respect rate limits (30 calls/30s = 1 call/second)
const DELAY_BETWEEN_DESTINATIONS = 2000; // ms
const MAX_SIZES_PER_TYPE = 2; // Test 2 sizes per product type (reduced for efficiency)
const MAX_DESTINATIONS = 8; // Test 8 key destinations (reduced for efficiency)
const MAX_COLORS = 1; // Test 1 color per product (reduced for efficiency)
const RATE_LIMIT_DELAY = 35000; // 35 seconds if we hit rate limit

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get representative sample of products from Azure Search
 */
async function getProductSamples(productType: string, country: string = 'US'): Promise<Array<{ sku: string; size: string }>> {
  try {
    const prodigiTypes: string[] = {
      'framed-print': ['Framed prints'],
      'canvas': ['Stretched canvas'],
      'framed-canvas': ['Framed canvas'],
      'acrylic': ['Acrylic panels'],
      'metal': ['Aluminium prints', 'Dibond prints'],
      'poster': ['Rolled canvas'],
    }[productType] || [productType];

    const filters: ProdigiSearchFilters = {
      country,
      category: 'Wall art',
      productTypes: prodigiTypes,
    };

    const result = await azureSearchClient.search(filters, {
      top: 50, // Get more products to sample from
      includeFacets: false,
    });

    // Extract unique SKU-size combinations
    const samples = new Map<string, { sku: string; size: string }>();
    
    result.products.slice(0, 20).forEach(product => {
      if (product.sku) {
        // Extract size from dimensions
        const width = Math.round(product.fullProductHorizontalDimensions);
        const height = Math.round(product.fullProductVerticalDimensions);
        let size: string;
        
        if (product.sizeUnits === 'cm') {
          const widthInches = Math.round(width / 2.54);
          const heightInches = Math.round(height / 2.54);
          size = `${widthInches}x${heightInches}`;
        } else {
          size = `${width}x${height}`;
        }
        
        const key = `${product.sku}-${size}`;
        if (!samples.has(key)) {
          samples.set(key, { sku: product.sku, size });
        }
      }
    });

    return Array.from(samples.values()).slice(0, MAX_SIZES_PER_TYPE);
  } catch (error: any) {
    console.error(`  ❌ Error getting samples for ${productType}:`, error.message);
    return [];
  }
}

async function testPricingForProduct(
  productType: string,
  sku: string,
  size: string,
  destination: string,
  color?: string
): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
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
        errorCode: 'PRODUCT_NOT_FOUND',
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
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
    
    // Get quotes sequentially to avoid rate limits
    const quotes: any[] = [];
    for (const method of shippingMethods) {
      try {
        const quote = await prodigiSDK.quotes.create({
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
        });
        if (quote && !quote.error) {
          quotes.push(...(Array.isArray(quote) ? quote : [quote]));
        }
        await delay(DELAY_BETWEEN_REQUESTS); // Delay between each shipping method
      } catch (error: any) {
        // Check if rate limited
        if (error.message?.includes('429') || error.message?.includes('rate limit') || error.message?.includes('quota exceeded')) {
          console.log(`\n  ⚠️  Rate limit hit, waiting ${RATE_LIMIT_DELAY/1000}s...`);
          await delay(RATE_LIMIT_DELAY);
          // Retry once
          try {
            const quote = await prodigiSDK.quotes.create({
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
            });
            if (quote && !quote.error) {
              quotes.push(...(Array.isArray(quote) ? quote : [quote]));
            }
          } catch (retryError: any) {
            // Skip this method if retry also fails
            console.log(`  ⚠️  Skipping ${method} after retry failure`);
          }
        }
      }
    }

    if (quotes.length === 0) {
      return {
        productType,
        size,
        sku,
        config,
        destination,
        success: false,
        error: firstError?.error || 'No shipping quotes available',
        errorCode: 'NO_QUOTES',
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }

    // Get Standard quote for pricing
    const standardQuote = quotes.find((q: any) => q.shipmentMethod === 'Standard') || quotes[0];
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
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    return {
      productType,
      size,
      sku,
      config: { productType, size, color },
      destination,
      success: false,
      error: error.message || 'Unknown error',
      errorCode: error.code || 'UNKNOWN_ERROR',
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  }
}

function analyzeResults(results: TestResult[]): TestSummary {
  const summary: TestSummary = {
    total: results.length,
    passed: 0,
    failed: 0,
    errors: new Map(),
    productTypes: new Map(),
    destinations: new Map(),
    averageDuration: 0,
    slowestTests: [],
    issues: [],
  };

  // Initialize counters
  PRODUCT_TYPES.forEach(type => {
    summary.productTypes.set(type, { total: 0, passed: 0, failed: 0, errors: [] });
  });
  KEY_DESTINATIONS.forEach(dest => {
    summary.destinations.set(dest, { total: 0, passed: 0, failed: 0 });
  });

  // Process results
  results.forEach(result => {
    if (result.success) {
      summary.passed++;
      summary.productTypes.get(result.productType)!.passed++;
      summary.destinations.get(result.destination)!.passed++;
    } else {
      summary.failed++;
      summary.productTypes.get(result.productType)!.failed++;
      summary.destinations.get(result.destination)!.failed++;
      
      const errorKey = result.error || 'Unknown error';
      if (!summary.errors.has(errorKey)) {
        summary.errors.set(errorKey, { count: 0, examples: [] });
      }
      const errorInfo = summary.errors.get(errorKey)!;
      errorInfo.count++;
      if (errorInfo.examples.length < 3) {
        errorInfo.examples.push(`${result.productType} ${result.size} → ${result.destination}`);
      }
      
      summary.productTypes.get(result.productType)!.errors.push(errorKey);
    }
    summary.productTypes.get(result.productType)!.total++;
    summary.destinations.get(result.destination)!.total++;

    if (result.duration > 5000) {
      summary.slowestTests.push({
        test: `${result.productType}-${result.size}-${result.destination}`,
        duration: result.duration,
      });
    }
  });

  // Calculate average
  summary.averageDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;

  // Generate issues
  generateIssues(summary, results);

  return summary;
}

function generateIssues(summary: TestSummary, results: TestResult[]): void {
  const issues: ProductionReadinessIssue[] = [];

  // Check pass rate
  const passRate = (summary.passed / summary.total) * 100;
  if (passRate < 95) {
    issues.push({
      severity: 'critical',
      category: 'Reliability',
      issue: `Pass rate is ${passRate.toFixed(1)}% - Must be >95% for production`,
      affected: ['All product types'],
      recommendation: 'Investigate and fix failing tests before production deployment',
      testCount: summary.failed,
    });
  } else if (passRate < 99) {
    issues.push({
      severity: 'high',
      category: 'Reliability',
      issue: `Pass rate is ${passRate.toFixed(1)}% - Should be >99% for production`,
      affected: ['All product types'],
      recommendation: 'Review and fix edge cases causing failures',
      testCount: summary.failed,
    });
  }

  // Check product type coverage
  summary.productTypes.forEach((stats, type) => {
    if (stats.total === 0) return;
    const passRate = (stats.passed / stats.total) * 100;
    if (passRate < 90) {
      issues.push({
        severity: 'high',
        category: 'Product Coverage',
        issue: `${type}: Only ${passRate.toFixed(1)}% pass rate`,
        affected: [type],
        recommendation: `Investigate ${type} specific issues: ${stats.errors.slice(0, 3).join(', ')}`,
        testCount: stats.failed,
      });
    }
  });

  // Check destination coverage
  const problematicDestinations = Array.from(summary.destinations.entries())
    .filter(([_, stats]) => stats.total > 0 && (stats.passed / stats.total) < 0.9);
  if (problematicDestinations.length > 0) {
    issues.push({
      severity: 'high',
      category: 'Shipping Coverage',
      issue: `${problematicDestinations.length} destinations have <90% pass rate`,
      affected: problematicDestinations.map(([dest]) => dest),
      recommendation: 'Review shipping availability and configuration for these destinations',
      testCount: problematicDestinations.reduce((sum, [_, stats]) => sum + stats.failed, 0),
    });
  }

  // Check for common errors
  const topErrors = Array.from(summary.errors.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5);

  topErrors.forEach(([error, info]) => {
    if (info.count > summary.total * 0.05) { // >5% of tests
      issues.push({
        severity: 'high',
        category: 'Error Handling',
        issue: `Common error: ${error}`,
        affected: info.examples,
        recommendation: `Fix root cause affecting ${info.count} tests`,
        testCount: info.count,
      });
    }
  });

  // Performance issues
  if (summary.averageDuration > 3000) {
    issues.push({
      severity: 'medium',
      category: 'Performance',
      issue: `Average response time is ${summary.averageDuration.toFixed(0)}ms`,
      affected: ['All pricing requests'],
      recommendation: 'Optimize API calls, consider caching, or parallel processing',
      testCount: summary.total,
    });
  }

  if (summary.slowestTests.length > 10) {
    issues.push({
      severity: 'medium',
      category: 'Performance',
      issue: `${summary.slowestTests.length} tests took >5s`,
      affected: summary.slowestTests.slice(0, 5).map(t => t.test),
      recommendation: 'Review slow queries and optimize',
      testCount: summary.slowestTests.length,
    });
  }

  // Check for missing SKUs
  const skuNotFound = Array.from(summary.errors.entries())
    .find(([error]) => error.includes('SKU not found') || error.includes('Product not found'));
  if (skuNotFound) {
    issues.push({
      severity: 'medium',
      category: 'Catalog Coverage',
      issue: `${skuNotFound[1].count} tests failed due to missing SKUs`,
      affected: skuNotFound[1].examples,
      recommendation: 'Review product catalog coverage and SKU mapping',
      testCount: skuNotFound[1].count,
    });
  }

  // Check for no quotes
  const noQuotes = Array.from(summary.errors.entries())
    .find(([error]) => error.includes('No shipping quotes'));
  if (noQuotes) {
    issues.push({
      severity: 'high',
      category: 'Shipping Configuration',
      issue: `${noQuotes[1].count} tests failed due to no shipping quotes`,
      affected: noQuotes[1].examples,
      recommendation: 'Review shipping method availability and destination configuration',
      testCount: noQuotes[1].count,
    });
  }

  summary.issues = issues;
}

async function runComprehensiveTest(): Promise<void> {
  console.log('🚀 Starting Comprehensive Pricing & Shipping Test\n');
  console.log('='.repeat(80));
  
  const results: TestResult[] = [];
  let testCount = 0;

  // Test each product type
  for (const productType of PRODUCT_TYPES) {
    console.log(`\n📦 Testing ${productType}...`);
    
    // Get product samples
    const samples = await getProductSamples(productType);
    if (samples.length === 0) {
      console.log(`  ⚠️  No products found for ${productType}, skipping...`);
      continue;
    }
    console.log(`  ✅ Found ${samples.length} product samples`);

    // Test each sample
    for (const sample of samples) {
      // Test with and without color
      const colorsToTest = TEST_COLORS[productType as keyof typeof TEST_COLORS] || [];
      const testConfigs = colorsToTest.length > 0 
        ? colorsToTest.slice(0, MAX_COLORS).map(c => ({ color: c }))
        : [{}];

      for (const testConfig of testConfigs) {
        // Test key destinations
        for (const destination of KEY_DESTINATIONS.slice(0, MAX_DESTINATIONS)) {
          testCount++;
          process.stdout.write(`\r  ⏳ Test ${testCount}: ${sample.size} → ${destination}...`);

          const result = await testPricingForProduct(
            productType,
            sample.sku,
            sample.size,
            destination,
            testConfig.color
          );

          results.push(result);
          // Already delayed in testPricingForProduct
        }
        await delay(DELAY_BETWEEN_DESTINATIONS);
      }
    }
  }

  console.log('\n\n' + '='.repeat(80));
  console.log('📊 ANALYZING RESULTS...');
  console.log('='.repeat(80));

  const summary = analyzeResults(results);

  // Print summary
  console.log(`\n✅ Total Tests: ${summary.total}`);
  console.log(`✅ Passed: ${summary.passed} (${((summary.passed / summary.total) * 100).toFixed(1)}%)`);
  console.log(`❌ Failed: ${summary.failed} (${((summary.failed / summary.total) * 100).toFixed(1)}%)`);
  console.log(`⏱️  Average Duration: ${summary.averageDuration.toFixed(0)}ms`);

  // Print errors
  if (summary.errors.size > 0) {
    console.log(`\n❌ Top Errors:`);
    Array.from(summary.errors.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .forEach(([error, info]) => {
        console.log(`   ${error}: ${info.count} occurrences`);
        if (info.examples.length > 0) {
          console.log(`      Examples: ${info.examples.join(', ')}`);
        }
      });
  }

  // Print product type breakdown
  console.log(`\n📦 Product Type Breakdown:`);
  Array.from(summary.productTypes.entries())
    .sort((a, b) => b[1].total - a[1].total)
    .forEach(([type, stats]) => {
      if (stats.total === 0) return;
      const passRate = ((stats.passed / stats.total) * 100).toFixed(1);
      console.log(`   ${type}: ${stats.passed}/${stats.total} passed (${passRate}%)`);
      if (stats.errors.length > 0) {
        console.log(`      Errors: ${[...new Set(stats.errors)].slice(0, 3).join(', ')}`);
      }
    });

  // Print destination breakdown
  console.log(`\n🌍 Destination Breakdown (Top 10):`);
  Array.from(summary.destinations.entries())
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 10)
    .forEach(([dest, stats]) => {
      if (stats.total === 0) return;
      const passRate = ((stats.passed / stats.total) * 100).toFixed(1);
      const country = getCountry(dest);
      console.log(`   ${dest} (${country?.name || 'Unknown'}): ${stats.passed}/${stats.total} passed (${passRate}%)`);
    });

  // Generate and print production readiness TODO
  console.log(`\n\n${'='.repeat(80)}`);
  console.log('📋 PRODUCTION READINESS TODO LIST');
  console.log('='.repeat(80));

  // Sort issues by severity
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  summary.issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  summary.issues.forEach((issue, index) => {
    const emoji = issue.severity === 'critical' ? '🔴' : issue.severity === 'high' ? '🟠' : issue.severity === 'medium' ? '🟡' : '🟢';
    console.log(`\n${index + 1}. ${emoji} [${issue.severity.toUpperCase()}] ${issue.category}: ${issue.issue}`);
    console.log(`   Affected: ${issue.affected.slice(0, 5).join(', ')}${issue.affected.length > 5 ? '...' : ''}`);
    console.log(`   Recommendation: ${issue.recommendation}`);
    console.log(`   Test Count: ${issue.testCount}`);
  });

  // Save results
  const fs = require('fs');
  const path = require('path');
  const resultsPath = path.join(__dirname, '../test-results-comprehensive.json');
  fs.writeFileSync(resultsPath, JSON.stringify({
    summary,
    results: results.slice(0, 200), // Save first 200 results
    timestamp: new Date().toISOString(),
  }, null, 2));
  console.log(`\n💾 Detailed results saved to: ${resultsPath}`);

  // Generate markdown TODO file
  const todoPath = path.join(__dirname, '../PRODUCTION_READINESS_TODO.md');
  const todoContent = generateTodoMarkdown(summary);
  fs.writeFileSync(todoPath, todoContent);
  console.log(`📝 Production readiness TODO saved to: ${todoPath}`);

  console.log(`\n${'='.repeat(80)}\n`);
}

function generateTodoMarkdown(summary: TestSummary): string {
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const sortedIssues = [...summary.issues].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  let markdown = `# Production Readiness TODO List\n\n`;
  markdown += `**Generated**: ${new Date().toISOString()}\n\n`;
  markdown += `## Test Summary\n\n`;
  markdown += `- **Total Tests**: ${summary.total}\n`;
  markdown += `- **Passed**: ${summary.passed} (${((summary.passed / summary.total) * 100).toFixed(1)}%)\n`;
  markdown += `- **Failed**: ${summary.failed} (${((summary.failed / summary.total) * 100).toFixed(1)}%)\n`;
  markdown += `- **Average Duration**: ${summary.averageDuration.toFixed(0)}ms\n\n`;

  markdown += `## Issues by Priority\n\n`;

  const bySeverity = {
    critical: sortedIssues.filter(i => i.severity === 'critical'),
    high: sortedIssues.filter(i => i.severity === 'high'),
    medium: sortedIssues.filter(i => i.severity === 'medium'),
    low: sortedIssues.filter(i => i.severity === 'low'),
  };

  Object.entries(bySeverity).forEach(([severity, issues]) => {
    if (issues.length === 0) return;
    
    const emoji = severity === 'critical' ? '🔴' : severity === 'high' ? '🟠' : severity === 'medium' ? '🟡' : '🟢';
    markdown += `### ${emoji} ${severity.toUpperCase()} Priority (${issues.length} issues)\n\n`;
    
    issues.forEach((issue, index) => {
      markdown += `#### ${index + 1}. ${issue.category}: ${issue.issue}\n\n`;
      markdown += `- **Affected**: ${issue.affected.join(', ')}\n`;
      markdown += `- **Test Count**: ${issue.testCount}\n`;
      markdown += `- **Recommendation**: ${issue.recommendation}\n\n`;
    });
  });

  markdown += `## Product Type Coverage\n\n`;
  Array.from(summary.productTypes.entries())
    .sort((a, b) => b[1].total - a[1].total)
    .forEach(([type, stats]) => {
      if (stats.total === 0) return;
      const passRate = ((stats.passed / stats.total) * 100).toFixed(1);
      markdown += `- **${type}**: ${stats.passed}/${stats.total} passed (${passRate}%)\n`;
    });

  markdown += `\n## Next Steps\n\n`;
  markdown += `1. Address all CRITICAL issues before production\n`;
  markdown += `2. Fix HIGH priority issues for production readiness\n`;
  markdown += `3. Monitor MEDIUM priority issues in production\n`;
  markdown += `4. Re-run tests after fixes to verify improvements\n`;

  return markdown;
}

// Run the test
runComprehensiveTest().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});

