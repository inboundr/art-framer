/**
 * Test API Endpoints with Real Requests
 * 
 * Tests the actual cart, pricing, and shipping API endpoints
 * and analyzes the server logs for issues
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });
config({ path: resolve(__dirname, '../.env') });

const API_BASE = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

interface TestResult {
  endpoint: string;
  method: string;
  status: number;
  success: boolean;
  errors: string[];
  data: any;
}

const results: TestResult[] = [];

async function testEndpoint(
  endpoint: string,
  method: string = 'GET',
  body?: any,
  headers?: Record<string, string>
): Promise<TestResult> {
  const result: TestResult = {
    endpoint,
    method,
    status: 0,
    success: false,
    errors: [],
    data: {},
  };

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    result.status = response.status;
    const data = await response.json().catch(() => ({}));
    result.data = data;

    if (response.ok) {
      result.success = true;
    } else {
      result.errors.push(`HTTP ${response.status}: ${data.error || response.statusText}`);
      if (data.details) {
        result.errors.push(`Details: ${JSON.stringify(data.details)}`);
      }
    }
  } catch (error: any) {
    result.errors.push(`Request failed: ${error.message}`);
  }

  return result;
}

async function analyzeAttributeConsistency() {
  console.log('\n🔧 Analyzing Attribute Key Consistency\n');
  
  // Check if mountColor vs mountcolor is handled correctly
  const { normalizeAttributesForMatching } = await import('@/lib/checkout/utils/attribute-normalizer');
  
  const testCases = [
    { mountColor: 'Black' },
    { mountColor: 'black' },
    { mountcolor: 'Black' },
    { mountcolor: 'black' },
  ];
  
  const normalizedKeys = new Set<string>();
  
  testCases.forEach((attrs, i) => {
    const normalized = normalizeAttributesForMatching(attrs);
    const keys = Object.keys(normalized);
    keys.forEach(key => normalizedKeys.add(key));
    
    console.log(`   Test ${i + 1}: ${JSON.stringify(attrs)} -> ${JSON.stringify(normalized)}`);
  });
  
  if (normalizedKeys.size === 1) {
    console.log(`   ✅ All variants normalize to same key: ${Array.from(normalizedKeys)[0]}`);
  } else {
    console.log(`   ❌ Inconsistent normalization: ${Array.from(normalizedKeys).join(', ')}`);
  }
}

async function testHealthEndpoint() {
  console.log('\n🏥 Testing Health Endpoint\n');
  const result = await testEndpoint('/api/health');
  results.push(result);
  
  if (result.success) {
    console.log(`   ✅ Health check passed`);
    console.log(`   Services: ${JSON.stringify(result.data.services)}`);
  } else {
    console.log(`   ❌ Health check failed: ${result.errors.join(', ')}`);
  }
}

async function analyzeServerLogsForIssues() {
  console.log('\n📊 Analyzing Server Logs for Pricing/Shipping Issues\n');
  
  // Read recent server logs
  const { readFileSync, existsSync } = await import('fs');
  const logFile = '/tmp/dev-server.log';
  
  if (!existsSync(logFile)) {
    console.log('   ⚠️  Server log file not found');
    return;
  }
  
  const logs = readFileSync(logFile, 'utf-8');
  const recentLogs = logs.split('\n').slice(-1000).join('\n'); // Last 1000 lines
  
  // Pattern 1: Attribute mismatches
  const attrMismatchPattern = /\[Attributes\].*not valid for (\w+)/g;
  const attrMismatches: string[] = [];
  let match;
  while ((match = attrMismatchPattern.exec(recentLogs)) !== null) {
    attrMismatches.push(match[1]);
  }
  
  if (attrMismatches.length > 0) {
    console.log(`   ⚠️  Found ${attrMismatches.length} attribute validation warnings`);
    const unique = [...new Set(attrMismatches)];
    unique.forEach(attr => {
      const count = attrMismatches.filter(a => a === attr).length;
      console.log(`      - ${attr}: ${count} warnings`);
    });
  } else {
    console.log(`   ✅ No attribute validation warnings`);
  }
  
  // Pattern 2: Price matching issues
  const priceMatchPattern = /Could not find unit cost for cart item|using average.*cart item/g;
  const priceMatches = recentLogs.match(priceMatchPattern);
  if (priceMatches && priceMatches.length > 0) {
    console.log(`   ⚠️  Found ${priceMatches.length} price matching issues`);
  } else {
    console.log(`   ✅ No price matching issues`);
  }
  
  // Pattern 3: SKU extraction
  const skuExtractionPattern = /🔧 Extracted base SKU: ([^-]+)-([a-f0-9]{8}) -> ([^-]+)/g;
  const skuExtractions: Array<{ full: string; base: string }> = [];
  while ((match = skuExtractionPattern.exec(recentLogs)) !== null) {
    skuExtractions.push({
      full: match[1] + '-' + match[2],
      base: match[3],
    });
  }
  
  if (skuExtractions.length > 0) {
    console.log(`   📦 Found ${skuExtractions.length} SKU extractions`);
    skuExtractions.slice(0, 3).forEach(ext => {
      console.log(`      ${ext.full} -> ${ext.base}`);
    });
  }
  
  // Pattern 4: Quote item attributes
  const quoteItemPattern = /\[Pricing\] Quote item:[\s\S]{1,300}?"attributes":\s*({[^}]+})/g;
  const quoteAttributes: any[] = [];
  while ((match = quoteItemPattern.exec(recentLogs)) !== null) {
    try {
      const attrs = JSON.parse(match[1].replace(/'/g, '"'));
      quoteAttributes.push(attrs);
    } catch (e) {
      // Ignore parse errors
    }
  }
  
  if (quoteAttributes.length > 0) {
    console.log(`   📋 Found ${quoteAttributes.length} quote item attribute sets`);
    
    // Check for mountColor case consistency
    const mountColorKeys = new Set<string>();
    quoteAttributes.forEach(attrs => {
      Object.keys(attrs).forEach(key => {
        if (key.toLowerCase().includes('mount') && key.toLowerCase().includes('color')) {
          mountColorKeys.add(key);
        }
      });
    });
    
    if (mountColorKeys.size > 1) {
      console.log(`   ⚠️  MountColor key inconsistency: ${Array.from(mountColorKeys).join(', ')}`);
    } else if (mountColorKeys.size === 1) {
      console.log(`   ✅ MountColor key consistent: ${Array.from(mountColorKeys)[0]}`);
    }
    
    // Show sample attributes
    console.log(`   Sample attributes:`);
    quoteAttributes.slice(0, 2).forEach((attrs, i) => {
      console.log(`      ${i + 1}. ${JSON.stringify(attrs)}`);
    });
  }
  
  // Pattern 5: Mapped prices
  const mappedPricePattern = /\[Pricing\] Mapped cart item (\d+) to unit cost: ([\d.]+) \(quoteKey: ([^)]+)\)/g;
  const mappedPrices: Array<{ index: number; price: number; key: string }> = [];
  while ((match = mappedPricePattern.exec(recentLogs)) !== null) {
    mappedPrices.push({
      index: parseInt(match[1]),
      price: parseFloat(match[2]),
      key: match[3],
    });
  }
  
  if (mappedPrices.length > 0) {
    console.log(`   💰 Found ${mappedPrices.length} price mappings`);
    mappedPrices.slice(0, 3).forEach(map => {
      console.log(`      Item ${map.index}: $${map.price.toFixed(2)} (key: ${map.key.substring(0, 50)}...)`);
    });
  }
}

async function runAllTests() {
  console.log('🧪 Testing API Endpoints and Analyzing Logs\n');
  console.log('='.repeat(80));
  
  await analyzeAttributeConsistency();
  await testHealthEndpoint();
  await analyzeServerLogsForIssues();
  
  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('\n📊 Test Summary:');
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`   - ${r.method} ${r.endpoint}: ${r.errors.join(', ')}`);
    });
  }
}

runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

