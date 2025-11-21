/**
 * Comprehensive Prodigi API Testing - ALL Product Types
 * 
 * Tests all SKUs from catalog to discover attribute inconsistencies
 */

const PRODIGI_API_KEY = '11fc6ec8-855e-4b32-a36a-3a80db5d5ea6';
const BASE_URL = 'https://api.prodigi.com/v4.0';

// Sample SKUs from catalog representing different types
const TEST_SKUS = {
  // Stretched Canvas - 38mm
  CANVAS_38MM: [
    'global-can-10x10',
    'global-can-12x12',
    'global-can-24x48',
    'global-can-8x8',
  ],
  
  // Stretched Canvas - 19mm (Slim)
  CANVAS_19MM: [
    'global-slimcan-12x24',
    'global-slimcan-16x24',
    'global-slimcan-6x6',
  ],
  
  // Framed Canvas
  FRAMED_CANVAS: [
    'global-fra-can-12x18',
    'global-fra-can-10x10',
    'global-fra-can-28x42',
  ],
};

interface TestResult {
  sku: string;
  status: 'success' | 'error';
  attributes?: Record<string, string[]>;
  variants?: number;
  error?: string;
  attributeCasing?: 'lowercase' | 'capitalized' | 'mixed';
}

const results: TestResult[] = [];

async function makeRequest(endpoint: string, options: RequestInit = {}) {
  const url = `${BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'X-API-Key': PRODIGI_API_KEY,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;

    return {
      status: response.status,
      ok: response.ok,
      data,
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function detectAttributeCasing(attributes: Record<string, string[]>): 'lowercase' | 'capitalized' | 'mixed' {
  const wrapValues = attributes.wrap || [];
  
  if (wrapValues.length === 0) return 'mixed';
  
  const hasLowercase = wrapValues.some(v => v === v.toLowerCase());
  const hasCapitalized = wrapValues.some(v => v !== v.toLowerCase() && v[0] === v[0].toUpperCase());
  
  if (hasLowercase && !hasCapitalized) return 'lowercase';
  if (hasCapitalized && !hasLowercase) return 'capitalized';
  return 'mixed';
}

async function testProductDetails() {
  console.log('\n=== TESTING ALL PRODUCT TYPES ===\n');

  const allSkus = Object.values(TEST_SKUS).flat();
  
  for (const sku of allSkus) {
    console.log(`Testing: ${sku}`);
    
    const response = await makeRequest(`/products/${sku}`, { method: 'GET' });
    
    if (response.ok) {
      const product = response.data.product;
      const attributes = product.attributes || {};
      const casing = detectAttributeCasing(attributes);
      
      console.log(`  ✅ Status: ${response.status}`);
      console.log(`  📦 Attributes:`, JSON.stringify(attributes, null, 2));
      console.log(`  🎨 Attribute Casing: ${casing}`);
      console.log(`  🔢 Variants: ${product.variants?.length || 0}`);
      
      results.push({
        sku,
        status: 'success',
        attributes,
        variants: product.variants?.length || 0,
        attributeCasing: casing,
      });
    } else {
      console.log(`  ❌ Status: ${response.status}`);
      console.log(`  Error:`, response.data);
      
      results.push({
        sku,
        status: 'error',
        error: JSON.stringify(response.data),
      });
    }
    
    console.log('---\n');
  }
}

async function testAttributeValueVariations() {
  console.log('\n=== TESTING ATTRIBUTE VALUE VARIATIONS ===\n');
  
  const sku = 'global-can-10x10';
  
  // Test different wrap value casings
  const wrapVariations = [
    'Black',      // Capitalized (from official API)
    'black',      // Lowercase (from catalog API)
    'ImageWrap',  // CamelCase (from official API)
    'imagewrap',  // Lowercase (from catalog API)
  ];
  
  for (const wrap of wrapVariations) {
    console.log(`\nTesting wrap value: "${wrap}"`);
    
    const orderData = {
      merchantReference: `TEST-WRAP-${wrap}-${Date.now()}`,
      shippingMethod: 'Standard',
      recipient: {
        name: 'Test User',
        address: {
          line1: '123 Test St',
          postalOrZipCode: '12345',
          countryCode: 'US',
          townOrCity: 'New York',
        },
      },
      items: [{
        sku,
        copies: 1,
        sizing: 'fillPrintArea',
        attributes: { wrap },
        assets: [{
          printArea: 'default',
          url: 'https://pwintyimages.blob.core.windows.net/samples/stars/test-sample-grey.png',
        }],
      }],
    };
    
    const response = await makeRequest('/Orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
    
    if (response.ok) {
      console.log(`  ✅ wrap="${wrap}" - Order created: ${response.data.order?.id}`);
    } else {
      console.log(`  ❌ wrap="${wrap}" - Status: ${response.status}`);
      console.log(`  Error:`, JSON.stringify(response.data, null, 2));
    }
  }
}

async function testFramedCanvasColors() {
  console.log('\n=== TESTING FRAMED CANVAS COLOR VARIATIONS ===\n');
  
  const sku = 'global-fra-can-10x10';
  
  // Catalog shows: "frameColour": ["brown", "silver", "gold", "natural", "white", "black"]
  // But official API might use different casing
  
  const colorVariations = [
    { color: 'black', wrap: 'Black' },
    { color: 'black', wrap: 'black' },
    { color: 'black', wrap: 'ImageWrap' },
    { color: 'black', wrap: 'imagewrap' },
  ];
  
  for (const attrs of colorVariations) {
    console.log(`\nTesting: color="${attrs.color}", wrap="${attrs.wrap}"`);
    
    const orderData = {
      merchantReference: `TEST-FRAME-${Date.now()}`,
      shippingMethod: 'Standard',
      recipient: {
        name: 'Test User',
        address: {
          line1: '123 Test St',
          postalOrZipCode: '12345',
          countryCode: 'US',
          townOrCity: 'New York',
        },
      },
      items: [{
        sku,
        copies: 1,
        sizing: 'fillPrintArea',
        attributes: attrs,
        assets: [{
          printArea: 'default',
          url: 'https://pwintyimages.blob.core.windows.net/samples/stars/test-sample-grey.png',
        }],
      }],
    };
    
    const response = await makeRequest('/Orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
    
    if (response.ok) {
      console.log(`  ✅ Order created: ${response.data.order?.id}`);
    } else {
      console.log(`  ❌ Status: ${response.status}`);
      console.log(`  Error:`, JSON.stringify(response.data, null, 2));
    }
  }
}

async function generateComparisonReport() {
  console.log('\n\n=== ATTRIBUTE CASING ANALYSIS ===\n');
  
  const successfulResults = results.filter(r => r.status === 'success');
  
  const byCategory = {
    '38mm Canvas': successfulResults.filter(r => r.sku.includes('can-') && !r.sku.includes('slimcan') && !r.sku.includes('fra')),
    '19mm Canvas': successfulResults.filter(r => r.sku.includes('slimcan')),
    'Framed Canvas': successfulResults.filter(r => r.sku.includes('fra-can')),
  };
  
  for (const [category, products] of Object.entries(byCategory)) {
    console.log(`\n${category}:`);
    
    products.forEach(p => {
      console.log(`  ${p.sku}:`);
      console.log(`    Casing: ${p.attributeCasing}`);
      console.log(`    Variants: ${p.variants}`);
      
      if (p.attributes?.wrap) {
        console.log(`    Wrap values: ${p.attributes.wrap.join(', ')}`);
      }
      if (p.attributes?.frameColour || p.attributes?.color) {
        const colors = p.attributes.frameColour || p.attributes.color || [];
        console.log(`    Color values: ${colors.join(', ')}`);
      }
    });
  }
}

async function runAllTests() {
  console.log('🚀 Comprehensive Prodigi API Testing');
  console.log('Testing all product types from catalog\n');
  console.log('API Key:', PRODIGI_API_KEY);
  console.log('Environment: PRODUCTION (orders blocked)\n');

  try {
    await testProductDetails();
    await testAttributeValueVariations();
    await testFramedCanvasColors();
    await generateComparisonReport();

    console.log('\n\n=== SUMMARY ===\n');
    console.log(`Total products tested: ${results.length}`);
    console.log(`Successful: ${results.filter(r => r.status === 'success').length}`);
    console.log(`Failed: ${results.filter(r => r.status === 'error').length}`);
    
  } catch (error) {
    console.error('❌ Test suite error:', error);
  }
}

runAllTests().then(() => {
  console.log('\n✅ All tests complete!');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

