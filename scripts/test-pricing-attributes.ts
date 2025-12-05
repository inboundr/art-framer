/**
 * Test Script: Verify All Attributes Are Handled in Pricing Endpoint
 * 
 * This script:
 * 1. Gets all products from Prodigi catalog (via Azure Search)
 * 2. Tests the /api/studio/pricing endpoint with each product
 * 3. Verifies all required attributes are handled
 * 4. Reports any missing or unhandled attributes
 */

import 'dotenv/config';
import { ProdigiClient } from '../src/lib/prodigi-v2/client';
import { azureSearchClient } from '../src/lib/prodigi-v2/azure-search/client';
import type { ProdigiSearchFilters } from '../src/lib/prodigi-v2/azure-search/types';

// Auth token from the curl command (extracted from cookie)
const AUTH_TOKEN = 'base64-eyJhY2Nlc3NfdG9rZW4iOiJleUpoYkdjaU9pSkZVekkxTmlJc0ltdHBaQ0k2SWpJNFlUVXpaRGxqTFRsaE1UVXROR1UzWmkwNE5EYzJMVFpqTm1FME16ZzFOREkwTVNJc0luUjVjQ0k2SWtwWFZDSjkuZXlKcGMzTWlPaUpvZEhSd2N6b3ZMMmx5ZFdkemFucHFjV1I0ZFd4c2FXOWlkWGQwTG5OMWNHRmlZWE5sTG1OdkwyRjFkR2d2ZGpFaUxDSnpkV0lpT2lJMU5qZ3haRFJoWWkxaVpqRm1MVFE1Wm1NdFlqVTBOQzAzWm1JelkyTmpNREl6T0RNaUxDSmhkV1FpT2lKaGRYUm9aVzUwYVdOaGRHVmtJaXdpWlhod0lqb3hOelkwT0RrNU5EUTNMQ0pwWVhRaU9qRTNOalE0T1RVNE5EY3NJbVZ0WVdsc0lqb2liV1ZrYUdGMFpXMHlRR2R0WVdsc0xtTnZiU0lzSW5Cb2IyNWxJam9pSWl3aVlYQndYMjFsZEdGa1lYUmhJanA3SW5CeWIzWnBaR1Z5SWpvaVpXMWhhV3dpTENKd2NtOTJhV1JsY25NaU9sc2laVzFoYVd3aVhYMHNJblZ6WlhKZmJXVjBZV1JoZEdFaU9uc2laVzFoYVd3aU9pSnRaV1JvWVhSbGJUSkFaMjFoYVd3dVkyOXRJaXdpWlcxaGFXeGZkbVZ5YVdacFpXUWlPblJ5ZFdVc0ltWjFiR3hmYm1GdFpTSTZJbUZ6WkNJc0luQm9iMjVsWDNabGNtbG1hV1ZrSWpwbVlXeHpaU3dpYzNWaUlqb2lOVFk0TVdRMFlXSXRZbVl4WmkwME9XWmpMV0kxTkRRdE4yWmlNMk5qWXpBeU16Z3pJaXdpZFhObGNtNWhiV1VpT2lKaGMyUWlmU3dpY205c1pTSTZJbUYxZEdobGJuUnBZMkYwWldRaUxDSmhZV3dpT2lKaFlXd3hJaXdpWVcxeUlqcGJleUp0WlhSb2IyUWlPaUp3WVhOemQyOXlaQ0lzSW5ScGJXVnpkR0Z0Y0NJNk1UYzJORGc1TlRZeU5IMWRMQ0p6WlhOemFXOXVYMmxrSWpvaU9HUmhZMkZrTkdJdFlUaGpPQzAwT1dFMUxXSTNPR0l0TkdFM1pXWTBNelJtWkRSbElpd2lhWE5mWVc1dmJubHRiM1Z6SWpwbVlXeHpaWDAuNnNzNTU2WFphTFpyNDNqSHdOUTNOWG9HSEJzc1NOWUdGRkNOVWNWUjhpV0wzRm0wWjQ0cnB4Y1lldGd3cFVLVHpsV1k4R2FldC1kZ0l6ckdEMHVlWHciLCJ0b2tlbl90eXBlIjoiYmVhcmVyIiwiZXhwaXJlc19pbiI6MzYwMCwiZXhwaXJlc19hdCI6MTc2NDg5OTQ0NywicmVmcmVzaF90b2tlbiI6ImY2NHRrZWJhbGlsZSIsInVzZXIiOnsiaWQiOiI1NjgxZDRhYi1iZjFmLTQ5ZmMtYjU0NC03ZmIzY2NjMDIzODMiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJlbWFpbCI6Im1lZGhhdGVtMkBnbWFpbC5jb20iLCJlbWFpbF9jb25maXJtZWRfYXQiOiIyMDI1LTA5LTE1VDAxOjE0OjIwLjA5ODc3NFoiLCJwaG9uZSI6IiIsImNvbmZpcm1lZF9hdCI6IjIwMjUtMDktMTVUMDE6MTQ6MjAuMDk4Nzc0WiIsImxhc3Rfc2lnbl9pbl9hdCI6IjIwMjUtMTItMDVUMDA6NDc6MDQuMTM5OTc2WiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7ImVtYWlsIjoibWVkaGF0ZW0yQGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJmdWxsX25hbWUiOiJhc2QiLCJwaG9uZV92ZXJpZmllZCI6ZmFsc2UsInN1YiI6IjU2ODFkNGFiLWJmMWYtNDlmYy1iNTQ0LTdmYjNjY2MwMjM4MyIsInVzZXJuYW1lIjoiYXNkIn0sImlkZW50aXRpZXMiOlt7ImlkZW50aXR5X2lkIjoiYTBjYzQwNzItZGM3NS00MjQwLWJjMWUtZjk1MDczZDg2ZTk5IiwiaWQiOiI1NjgxZDRhYi1iZjFmLTQ5ZmMtYjU0NC03ZmIzY2NjMDIzODMiLCJ1c2VyX2lkIjoiNTY4MWQ0YWItYmYxZi00OWZjLWI1NDQtN2ZiM2NjYzAyMzgzIiwiaWRlbnRpdHlfZGF0YSI6eyJlbWFpbCI6Im1lZGhhdGVtMkBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6ZmFsc2UsImZ1bGxfbmFtZSI6ImFzZCIsInBob25lX3ZlcmlmaWVkIjpmYWxzZSwic3ViIjoiNTY4MWQ0YWItYmYxZi00OWZjLWI1NDQtN2ZiM2NjYzAyMzgzIiwidXNlcm5hbWUiOiJhc2QifSwicHJvdmlkZXIiOiJlbWFpbCIsImxhc3Rfc2lnbl9pbl9hdCI6IjIwMjUtMDktMTVUMDE6MTQ6MjAuMDkzMjMxWiIsImNyZWF0ZWRfYXQiOiIyMDI1LTA5LTE1VDAxOjE0OjIwLjA5MzI5NFoiLCJ1cGRhdGVkX2F0IjoiMjAyNS0wOS0xNVQwMToxNDoyMC4wOTMyOTRaIiwiZW1haWwiOiJtZWRoYXRlbTJAZ21haWwuY29tIn1dLCJjcmVhdGVkX2F0IjoiMjAyNS0wOS0xNVQwMToxNDoyMC4wODY1NDVaIiwidXBkYXRlZF9hdCI6IjIwMjUtMTItMDVUMDA6NTA6NDcuNDM1ODgzWiIsImlzX2Fub255bW91cyI6ZmFsc2V9fQ';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const PRODUCT_TYPES = [
  'framed-print',
  'canvas',
  'framed-canvas',
  'acrylic',
  'metal',
  'poster',
] as const;

interface TestResult {
  sku: string;
  productType: string;
  success: boolean;
  error?: string;
  missingAttributes?: string[];
  handledAttributes?: string[];
  responseTime?: number;
}

interface AttributeCoverage {
  totalProducts: number;
  successful: number;
  failed: number;
  missingAttributes: Record<string, number>;
  allAttributes: Set<string>;
}

/**
 * Get sample products for each product type
 */
async function getSampleProducts(): Promise<Map<string, string[]>> {
  console.log('📦 Fetching sample products from Prodigi catalog...\n');
  
  const products = new Map<string, string[]>();
  
  for (const productType of PRODUCT_TYPES) {
    try {
      // Map our product types to Prodigi catalog types
      const prodigiTypes: string[] = {
        'framed-print': ['Framed prints'],
        'canvas': ['Stretched canvas'],
        'framed-canvas': ['Framed canvas'],
        'acrylic': ['Acrylic panels'],
        'metal': ['Aluminium prints', 'Dibond prints'],
        'poster': ['Rolled canvas'],
      }[productType] || [productType];

      // Search for products
      const filters: ProdigiSearchFilters = {
        country: 'US',
        category: 'Wall art',
        productTypes: prodigiTypes,
      };

      const result = await azureSearchClient.search(filters, {
        top: 10, // Get 10 samples per product type
      });

      const skus = result.products.map(p => p.sku).filter(Boolean);
      products.set(productType, skus);
      
      console.log(`   ✅ ${productType}: Found ${skus.length} products`);
    } catch (error) {
      console.error(`   ❌ ${productType}: Failed to fetch products`, error);
      products.set(productType, []);
    }
  }

  return products;
}

/**
 * Test pricing endpoint with a product
 */
async function testPricingEndpoint(
  sku: string,
  productType: string
): Promise<TestResult> {
  const startTime = Date.now();
  
  // Build a minimal config based on product type
  const baseConfig: any = {
    imageUrl: 'https://irugsjzjqdxulliobuwt.supabase.co/storage/v1/object/public/curated-images/images/G0KkLR5XYAAlRt0.jpg',
    imageId: '8ea63bea-d6ba-4e01-b108-71032a9b4e8a',
    productType,
    sku,
    size: '16x20', // Default size
    shippingMethod: 'Standard',
    destinationCountry: 'US',
  };

  // Add product-type-specific defaults
  if (productType === 'canvas' || productType === 'framed-canvas') {
    baseConfig.wrap = 'ImageWrap';
  }
  if (productType === 'framed-print' || productType === 'framed-canvas') {
    baseConfig.frameColor = 'black';
  }
  if (productType === 'metal' || productType === 'acrylic') {
    baseConfig.finish = 'high gloss';
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/studio/pricing`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sb-irugsjzjqdxulliobuwt-auth-token=${AUTH_TOKEN}`,
      },
      body: JSON.stringify({
        config: baseConfig,
        country: 'US',
      }),
    });

    const responseTime = Date.now() - startTime;
    const data = await response.json();

    if (!response.ok) {
      // Check if it's a missing attribute error
      const errorMessage = data.message || data.error || JSON.stringify(data);
      const missingAttributes: string[] = [];
      
      // Try to extract missing attributes from error message
      if (errorMessage.includes('MissingRequiredAttributes') || 
          errorMessage.includes('missingItems') ||
          errorMessage.includes('missing')) {
        // Parse error to find missing attributes
        const missingMatch = errorMessage.match(/missingItems[^}]*attributes[^}]*\[([^\]]+)\]/);
        if (missingMatch) {
          missingAttributes.push(...missingMatch[1].split(',').map((a: string) => a.trim().replace(/['"]/g, '')));
        }
      }

      return {
        sku,
        productType,
        success: false,
        error: errorMessage,
        missingAttributes: missingAttributes.length > 0 ? missingAttributes : undefined,
        responseTime,
      };
    }

    // Success - extract handled attributes from response
    const handledAttributes: string[] = [];
    if (data.attributes) {
      handledAttributes.push(...Object.keys(data.attributes));
    }

    return {
      sku,
      productType,
      success: true,
      handledAttributes,
      responseTime,
    };
  } catch (error: any) {
    return {
      sku,
      productType,
      success: false,
      error: error.message || String(error),
      responseTime: Date.now() - startTime,
    };
  }
}

/**
 * Get product details from Prodigi API to check required attributes
 */
async function getProductAttributes(sku: string): Promise<Record<string, string[]> | null> {
  const apiKey = process.env.PRODIGI_API_KEY;
  if (!apiKey) return null;

  try {
    const client = new ProdigiClient({
      apiKey,
      environment: 'production',
    });

    const { ProductsAPI } = await import('../src/lib/prodigi-v2/products');
    const productsAPI = new ProductsAPI(client);
    const product = await productsAPI.get(sku);
    return product?.attributes || null;
  } catch (error) {
    console.warn(`   ⚠️  Could not fetch attributes for ${sku}:`, error);
    return null;
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log('🧪 Testing Pricing Endpoint Attribute Coverage\n');
  console.log('='.repeat(80));
  console.log(`API Base URL: ${API_BASE_URL}\n`);

  // Get sample products
  const products = await getSampleProducts();
  
  const coverage: AttributeCoverage = {
    totalProducts: 0,
    successful: 0,
    failed: 0,
    missingAttributes: {},
    allAttributes: new Set(),
  };

  const results: TestResult[] = [];

  // Test each product
  for (const [productType, skus] of products.entries()) {
    if (skus.length === 0) continue;

    console.log(`\n📦 Testing ${productType} products...`);
    
    for (const sku of skus.slice(0, 3)) { // Test first 3 products per type
      coverage.totalProducts++;
      
      console.log(`   Testing ${sku}...`);
      const result = await testPricingEndpoint(sku, productType);
      results.push(result);

      if (result.success) {
        coverage.successful++;
        if (result.handledAttributes) {
          result.handledAttributes.forEach(attr => coverage.allAttributes.add(attr));
        }
        
        // Also fetch product attributes from Prodigi to verify coverage
        const prodAttributes = await getProductAttributes(sku);
        if (prodAttributes) {
          Object.keys(prodAttributes).forEach(attr => coverage.allAttributes.add(attr));
          console.log(`      ✅ Success (${result.responseTime}ms) - Product has ${Object.keys(prodAttributes).length} attributes`);
        } else {
          console.log(`      ✅ Success (${result.responseTime}ms)`);
        }
      } else {
        coverage.failed++;
        if (result.missingAttributes && result.missingAttributes.length > 0) {
          result.missingAttributes.forEach(attr => {
            coverage.missingAttributes[attr] = (coverage.missingAttributes[attr] || 0) + 1;
          });
          console.log(`      ❌ Failed: Missing attributes: ${result.missingAttributes.join(', ')}`);
        } else {
          console.log(`      ❌ Failed: ${result.error?.substring(0, 100)}`);
        }
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // Print summary
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 TEST SUMMARY\n');
  console.log(`Total Products Tested: ${coverage.totalProducts}`);
  console.log(`✅ Successful: ${coverage.successful}`);
  console.log(`❌ Failed: ${coverage.failed}`);
  console.log(`Success Rate: ${((coverage.successful / coverage.totalProducts) * 100).toFixed(1)}%\n`);

  if (Object.keys(coverage.missingAttributes).length > 0) {
    console.log('⚠️  MISSING ATTRIBUTES DETECTED:\n');
    for (const [attr, count] of Object.entries(coverage.missingAttributes)) {
      console.log(`   - ${attr}: Missing in ${count} product(s)`);
    }
    console.log('\n');
  }

  if (coverage.allAttributes.size > 0) {
    console.log('✅ HANDLED ATTRIBUTES:\n');
    const sortedAttrs = Array.from(coverage.allAttributes).sort();
    for (const attr of sortedAttrs) {
      console.log(`   - ${attr}`);
    }
    console.log('\n');
  }

  // Detailed results for failed tests
  const failedResults = results.filter(r => !r.success);
  if (failedResults.length > 0) {
    console.log('📋 DETAILED FAILURE REPORT:\n');
    for (const result of failedResults) {
      console.log(`   SKU: ${result.sku}`);
      console.log(`   Product Type: ${result.productType}`);
      if (result.missingAttributes) {
        console.log(`   Missing Attributes: ${result.missingAttributes.join(', ')}`);
      }
      console.log(`   Error: ${result.error?.substring(0, 200)}`);
      console.log('');
    }
  }

  // Check if we need to handle any new attributes
  const knownAttributes = [
    'wrap', 'color', 'finish', 'mount', 'mountColor', 
    'paperType', 'edge', 'frame', 'glaze', 'style'
  ];
  const unknownAttributes = Array.from(coverage.allAttributes).filter(
    attr => !knownAttributes.includes(attr)
  );

  if (unknownAttributes.length > 0) {
    console.log('🔍 NEW ATTRIBUTES FOUND (may need handling):\n');
    for (const attr of unknownAttributes) {
      console.log(`   - ${attr}`);
    }
    console.log('\n');
  }

  console.log('='.repeat(80));
}

// Run tests
runTests().catch(error => {
  console.error('❌ Test script failed:', error);
  process.exit(1);
});

