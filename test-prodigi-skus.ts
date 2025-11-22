/**
 * Test Script: Validate Prodigi SKUs
 * 
 * Run this to validate that all SKUs in the catalog are real and exist in Prodigi
 * 
 * Usage:
 *   npx tsx test-prodigi-skus.ts
 */

import { prodigiSDK } from './src/lib/prodigi-v2';

const TEST_SKUS = [
  // Framed Prints
  'GLOBAL-FPRI-8X10',
  'GLOBAL-FPRI-11X14',
  'GLOBAL-FPRI-16X20',
  'GLOBAL-FPRI-18X24',
  'GLOBAL-FPRI-24X36',
  
  // Canvas
  'GLOBAL-CAN-8X10',
  'GLOBAL-CAN-16X20',
  'GLOBAL-CAN-24X36',
  'GLOBAL-CAN-36X48',
  
  // Framed Canvas
  'GLOBAL-FC-16X20',
  'GLOBAL-FC-24X30',
  
  // Acrylic
  'GLOBAL-ACR-16X20',
  'GLOBAL-ACR-24X36',
  
  // Metal
  'GLOBAL-MET-8X12',
  'GLOBAL-MET-16X20',
  
  // Poster
  'GLOBAL-POS-16X20',
  'GLOBAL-POS-24X36',
];

async function testSKU(sku: string): Promise<boolean> {
  try {
    console.log(`Testing SKU: ${sku}...`);
    const product = await prodigiSDK.products.get(sku);
    
    if (product) {
      console.log(`  ✅ Valid: ${product.description || sku}`);
      console.log(`     Variants: ${product.variants.length}`);
      console.log(`     Ships to: ${product.variants[0]?.shipsTo.length || 0} countries`);
      return true;
    }
  } catch (error: any) {
    if (error.statusCode === 404) {
      console.log(`  ❌ NOT FOUND: ${sku} does not exist in Prodigi catalog`);
    } else {
      console.log(`  ⚠️  ERROR: ${error.message}`);
    }
    return false;
  }
  return false;
}

async function testAllSKUs() {
  console.log('🔍 Testing Prodigi SKUs...\n');
  console.log(`API Key: ${process.env.PRODIGI_API_KEY ? 'Set ✅' : 'Missing ❌'}`);
  console.log(`Environment: ${process.env.PRODIGI_ENVIRONMENT || 'sandbox'}\n`);
  
  const results = await Promise.all(TEST_SKUS.map(testSKU));
  
  const validCount = results.filter(Boolean).length;
  const totalCount = TEST_SKUS.length;
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Results: ${validCount}/${totalCount} SKUs are valid`);
  console.log(`${'='.repeat(60)}`);
  
  if (validCount < totalCount) {
    console.log('\n⚠️  Some SKUs are invalid. Update src/lib/prodigi-v2/catalog.ts');
    console.log('    with the correct SKUs from Prodigi dashboard.');
    process.exit(1);
  } else {
    console.log('\n✅ All SKUs are valid! Catalog is ready.');
    process.exit(0);
  }
}

testAllSKUs().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

