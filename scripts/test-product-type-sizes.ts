/**
 * Test Script: Check Available Sizes for Each Product Type
 * 
 * This script queries Prodigi v2 API to determine if different product types
 * have different available sizes. If they do, we need to make size options dynamic.
 */

import 'dotenv/config';
import { ProdigiCatalogService } from '../src/lib/prodigi-v2/catalog';
import { ProdigiClient } from '../src/lib/prodigi-v2/client';

const PRODUCT_TYPES = [
  'framed-print',
  'canvas',
  'framed-canvas',
  'acrylic',
  'metal',
  'poster',
] as const;

async function testProductTypeSizes() {
  console.log('🧪 Testing Available Sizes for Each Product Type\n');
  console.log('=' .repeat(80));

  // Initialize Prodigi client
  const apiKey = process.env.PRODIGI_API_KEY;
  const environment = (process.env.PRODIGI_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox';

  if (!apiKey) {
    console.error('❌ PRODIGI_API_KEY environment variable is required');
    process.exit(1);
  }

  const client = new ProdigiClient({
    apiKey,
    environment,
  });

  const catalogService = new ProdigiCatalogService(client);

  const results: Record<string, string[]> = {};

  // Test each product type
  for (const productType of PRODUCT_TYPES) {
    try {
      console.log(`\n📦 Testing ${productType}...`);
      const sizes = await catalogService.getAvailableSizes(productType, 'US');
      results[productType] = sizes;
      console.log(`   ✅ Found ${sizes.length} sizes:`, sizes);
    } catch (error) {
      console.error(`   ❌ Error testing ${productType}:`, error);
      results[productType] = [];
    }
  }

  // Compare results
  console.log('\n' + '='.repeat(80));
  console.log('\n📊 Comparison Results:\n');

  // Get all unique sizes across all product types
  const allSizes = new Set<string>();
  Object.values(results).forEach(sizes => {
    sizes.forEach(size => allSizes.add(size));
  });

  const sortedAllSizes = Array.from(allSizes).sort((a, b) => {
    const [aw, ah] = a.split('x').map(Number);
    const [bw, bh] = b.split('x').map(Number);
    return (aw * ah) - (bw * bh);
  });

  console.log(`Total unique sizes found: ${sortedAllSizes.length}`);
  console.log(`All sizes: ${sortedAllSizes.join(', ')}\n`);

  // Check if all product types have the same sizes
  const firstProductType = PRODUCT_TYPES[0];
  const firstSizes = results[firstProductType];
  const allSame = PRODUCT_TYPES.every(type => {
    const sizes = results[type];
    if (sizes.length !== firstSizes.length) return false;
    return sizes.every(size => firstSizes.includes(size));
  });

  if (allSame) {
    console.log('✅ All product types have the SAME sizes!');
    console.log(`   Using static FRAME_SIZES array is correct.\n`);
  } else {
    console.log('⚠️  Product types have DIFFERENT sizes!');
    console.log('   Size options should be dynamic based on product type.\n');

    // Show differences
    console.log('📋 Size availability by product type:');
    console.log('─'.repeat(80));
    
    // Create a matrix
    const header = ['Size', ...PRODUCT_TYPES].map(h => h.padEnd(15)).join(' | ');
    console.log(header);
    console.log('─'.repeat(80));

    sortedAllSizes.forEach(size => {
      const row = [
        size,
        ...PRODUCT_TYPES.map(type => {
          const hasSize = results[type].includes(size);
          return hasSize ? '✅' : '❌';
        })
      ].map(cell => cell.padEnd(15)).join(' | ');
      console.log(row);
    });

    console.log('─'.repeat(80));
  }

  // Summary
  console.log('\n📝 Summary:');
  PRODUCT_TYPES.forEach(type => {
    const sizes = results[type];
    console.log(`   ${type.padEnd(20)}: ${sizes.length} sizes`);
  });

  // Recommendations
  console.log('\n💡 Recommendations:');
  if (allSame) {
    console.log('   ✅ Keep using static FRAME_SIZES array');
    console.log('   ✅ No changes needed to size dropdown');
  } else {
    console.log('   ⚠️  Make size options dynamic based on productType');
    console.log('   ⚠️  Update ConfigurationSummary to fetch sizes from Prodigi');
    console.log('   ⚠️  Cache sizes per product type for performance');
  }

  return { allSame, results };
}

// Run the test
testProductTypeSizes()
  .then(({ allSame, results }) => {
    console.log('\n✅ Test completed successfully');
    process.exit(allSame ? 0 : 1); // Exit with error if sizes differ
  })
  .catch(error => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });

