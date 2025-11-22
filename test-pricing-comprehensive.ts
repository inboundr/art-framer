/**
 * Comprehensive Pricing & SKU Test Suite
 * Tests all product types, sizes, and configurations against Prodigi API
 * to achieve 100% success rate
 */

// Load environment variables
import { config } from 'dotenv';
config({ path: '.env.local' });

import { prodigiSDK } from './src/lib/prodigi-v2';
import { facetService } from './src/lib/prodigi-v2/azure-search/facet-service';

// Test configurations for each product type
const TEST_SCENARIOS = [
  // Framed Prints
  {
    name: 'Framed Print - 8x10',
    productType: 'framed-print',
    size: '8x10',
    config: {
      frameColor: 'black',
      frameStyle: 'minimal',
      glaze: 'acrylic',
      mount: 'none',
      mountColor: 'cream',
      paperType: 'enhanced-matte',
    },
  },
  {
    name: 'Framed Print - 8x10 with Mount',
    productType: 'framed-print',
    size: '8x10',
    config: {
      frameColor: 'white',
      frameStyle: 'minimal',
      glaze: 'acrylic',
      mount: '2.0mm',
      mountColor: 'Off White',
      paperType: 'enhanced-matte',
    },
  },
  {
    name: 'Framed Print - 16x20',
    productType: 'framed-print',
    size: '16x20',
    config: {
      frameColor: 'natural',
      frameStyle: 'minimal',
      glaze: 'Float Glass',
      mount: 'none',
      paperType: 'enhanced-matte',
    },
  },
  {
    name: 'Framed Print - 18x24',
    productType: 'framed-print',
    size: '18x24',
    config: {
      frameColor: 'black',
      glaze: 'Acrylic / Perspex',
      mount: 'none',
      paperType: 'enhanced-matte',
    },
  },
  
  // Canvas
  {
    name: 'Canvas - 12x16',
    productType: 'canvas',
    size: '12x16',
    config: {
      wrap: 'Black',
      finish: 'Matte',
    },
  },
  {
    name: 'Canvas - 16x20',
    productType: 'canvas',
    size: '16x20',
    config: {
      wrap: 'White',
      finish: 'Gloss',
    },
  },
  {
    name: 'Canvas - 18x24',
    productType: 'canvas',
    size: '18x24',
    config: {
      wrap: 'Black',
    },
  },
  
  // Framed Canvas
  {
    name: 'Framed Canvas - 16x20',
    productType: 'framed-canvas',
    size: '16x20',
    config: {
      frameColor: 'black',
      wrap: 'Black',
    },
  },
  {
    name: 'Framed Canvas - 18x24',
    productType: 'framed-canvas',
    size: '18x24',
    config: {
      frameColor: 'white',
      wrap: 'White',
    },
  },
  
  // Acrylic
  {
    name: 'Acrylic - 12x16',
    productType: 'acrylic',
    size: '12x16',
    config: {},
  },
  {
    name: 'Acrylic - 16x20',
    productType: 'acrylic',
    size: '16x20',
    config: {},
  },
  
  // Metal
  {
    name: 'Metal - 12x16',
    productType: 'metal',
    size: '12x16',
    config: {},
  },
  {
    name: 'Metal - 16x20',
    productType: 'metal',
    size: '16x20',
    config: {},
  },
];

interface TestResult {
  scenario: string;
  success: boolean;
  sku?: string;
  price?: number;
  error?: string;
  errorType?: string;
  validationErrors?: string[];
  productDetails?: any;
  sentAttributes?: any;
  recommendations?: string[];
}

const results: TestResult[] = [];

async function testScenario(scenario: typeof TEST_SCENARIOS[0]): Promise<TestResult> {
  const result: TestResult = {
    scenario: scenario.name,
    success: false,
    recommendations: [],
  };

  try {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Testing: ${scenario.name}`);
    console.log(`${'='.repeat(60)}`);
    
    // Step 1: Get facets for validation
    console.log('Step 1: Fetching available options...');
    const availableOptions = await facetService.getAvailableOptions(
      scenario.productType as any,
      'US'
    );
    console.log('Available options:', {
      hasFrameColor: availableOptions.hasFrameColor,
      hasGlaze: availableOptions.hasGlaze,
      hasMount: availableOptions.hasMount,
      hasWrap: availableOptions.hasWrap,
      frameColors: availableOptions.frameColors.length,
      glazes: availableOptions.glazes.length,
      mounts: availableOptions.mounts.length,
      wraps: availableOptions.wraps.length,
    });
    
    // Step 2: Validate configuration
    console.log('Step 2: Validating configuration...');
    const validation = facetService.validateConfiguration(
      scenario.config,
      availableOptions
    );
    
    if (!validation.isValid) {
      result.error = 'Configuration validation failed';
      result.validationErrors = validation.errors;
      console.log('❌ Validation failed:', validation.errors);
      result.recommendations?.push('Update config to use only available options from facets');
      return result;
    }
    console.log('✅ Configuration is valid');
    
    // Step 3: Get SKU from catalog
    console.log('Step 3: Looking up SKU...');
    const sku = await prodigiSDK.catalog.getSKU(
      scenario.productType,
      scenario.size,
      'US'
    );
    
    if (!sku) {
      result.error = 'No SKU found for this product type and size';
      console.log('❌ No SKU found');
      result.recommendations?.push(`Check if size ${scenario.size} is available for ${scenario.productType}`);
      result.recommendations?.push('Try expanding aspect ratio tolerance in inchesToSearchParams');
      return result;
    }
    
    result.sku = sku;
    console.log(`✅ Found SKU: ${sku}`);
    
    // Step 4: Get product details
    console.log('Step 4: Fetching product details...');
    const productDetails = await prodigiSDK.products.get(sku);
    result.productDetails = {
      description: productDetails.description,
      attributes: Object.keys(productDetails.attributes),
    };
    console.log('Product attributes:', Object.keys(productDetails.attributes));
    
    // Step 5: Build attributes for quote
    console.log('Step 5: Building attributes...');
    const validAttributes = productDetails.attributes;
    const attributes: Record<string, string> = {};
    
    // Helper to check if attribute is valid for this product
    const isValidAttribute = (key: string) => validAttributes.hasOwnProperty(key);
    
    // Helper to add attribute if valid
    const addIfValid = (key: string, value: any) => {
      if (!value || value === 'none') return;
      if (isValidAttribute(key)) {
        const validOptions = validAttributes[key];
        const matchingOption = validOptions.find(
          (opt: string) => opt.toLowerCase() === value.toLowerCase()
        );
        if (matchingOption) {
          attributes[key] = matchingOption;
        } else {
          console.warn(`⚠️  Value "${value}" not valid for ${key}. Valid:`, validOptions);
          result.recommendations?.push(`For ${key}: use one of ${validOptions.join(', ')}`);
        }
      }
    };
    
    // Map config to Prodigi attributes
    addIfValid('color', scenario.config.frameColor);
    addIfValid('glaze', scenario.config.glaze === 'acrylic' ? 'Acrylic / Perspex' : scenario.config.glaze);
    addIfValid('frame', scenario.config.frameStyle);
    addIfValid('finish', scenario.config.finish);
    addIfValid('paperType', scenario.config.paperType);
    
    // Handle mount
    if (scenario.config.mount && scenario.config.mount !== 'none') {
      addIfValid('mount', scenario.config.mount);
      addIfValid('mountColor', scenario.config.mountColor);
    } else if (isValidAttribute('mount') && validAttributes['mount'].length > 0) {
      // Product has mount but config doesn't specify - use first option
      const defaultMount = validAttributes['mount'][0];
      console.log(`Using default mount: ${defaultMount}`);
      attributes['mount'] = defaultMount;
      if (scenario.config.mountColor) {
        addIfValid('mountColor', scenario.config.mountColor);
      }
    }
    
    // Handle wrap (canvas-specific, lowercase)
    if (scenario.config.wrap) {
      if (isValidAttribute('wrap')) {
        const validOptions = validAttributes['wrap'];
        const matchingOption = validOptions.find(
          (opt: string) => opt.toLowerCase() === scenario.config.wrap!.toLowerCase()
        );
        if (matchingOption) {
          attributes['wrap'] = matchingOption.toLowerCase();
        }
      }
    }
    
    result.sentAttributes = attributes;
    console.log('Attributes to send:', attributes);
    
    // Step 6: Request quote
    console.log('Step 6: Requesting quote...');
    const quotes = await prodigiSDK.quotes.create({
      destinationCountryCode: 'US',
      shippingMethod: 'Standard',
      items: [{
        sku,
        copies: 1,
        attributes,
        assets: [{
          url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5',
        }],
      }],
    });
    
    if (!quotes || quotes.length === 0) {
      result.error = 'No quotes returned';
      console.log('❌ No quotes returned');
      return result;
    }
    
    const quote = quotes[0];
    const itemCost = parseFloat(quote.items?.[0]?.itemCosts?.total || '0');
    const shippingCost = parseFloat(quote.shipments?.[0]?.cost?.amount || '0');
    const totalCost = itemCost + shippingCost;
    
    result.price = totalCost;
    result.success = true;
    
    console.log('✅ Quote received:');
    console.log(`   Item cost: $${itemCost.toFixed(2)}`);
    console.log(`   Shipping: $${shippingCost.toFixed(2)}`);
    console.log(`   Total: $${totalCost.toFixed(2)}`);
    
  } catch (error: any) {
    result.error = error.message;
    result.errorType = error.name;
    
    if (error.validationErrors) {
      result.validationErrors = error.validationErrors;
    }
    
    console.log('❌ Error:', error.message);
    if (error.validationErrors) {
      console.log('   Validation errors:', error.validationErrors);
    }
    
    // Provide recommendations based on error
    if (error.message.includes('Bad Request') || error.message.includes('validation')) {
      result.recommendations?.push('Check that all sent attributes are valid for this SKU');
      result.recommendations?.push('Verify attribute values match Prodigi\'s expected values exactly');
    }
    if (error.message.includes('Not Found')) {
      result.recommendations?.push('SKU may not be available in the destination country');
    }
  }
  
  return result;
}

async function runAllTests() {
  console.log('\n' + '█'.repeat(70));
  console.log('  COMPREHENSIVE PRICING & SKU TEST SUITE');
  console.log('█'.repeat(70));
  console.log(`\nTesting ${TEST_SCENARIOS.length} scenarios...\n`);
  
  for (const scenario of TEST_SCENARIOS) {
    const result = await testScenario(scenario);
    results.push(result);
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Generate summary report
  console.log('\n\n' + '█'.repeat(70));
  console.log('  TEST SUMMARY');
  console.log('█'.repeat(70));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`\n✅ Successful: ${successful.length}/${results.length}`);
  console.log(`❌ Failed: ${failed.length}/${results.length}`);
  console.log(`📊 Success Rate: ${((successful.length / results.length) * 100).toFixed(1)}%`);
  
  if (failed.length > 0) {
    console.log('\n\n' + '='.repeat(70));
    console.log('  FAILED TESTS');
    console.log('='.repeat(70));
    
    failed.forEach(result => {
      console.log(`\n❌ ${result.scenario}`);
      console.log(`   Error: ${result.error}`);
      if (result.sku) console.log(`   SKU: ${result.sku}`);
      if (result.validationErrors && result.validationErrors.length > 0) {
        console.log(`   Validation Errors:`);
        result.validationErrors.forEach(err => console.log(`     - ${err}`));
      }
      if (result.sentAttributes) {
        console.log(`   Sent Attributes:`, result.sentAttributes);
      }
      if (result.recommendations && result.recommendations.length > 0) {
        console.log(`   Recommendations:`);
        result.recommendations.forEach(rec => console.log(`     💡 ${rec}`));
      }
    });
  }
  
  if (successful.length > 0) {
    console.log('\n\n' + '='.repeat(70));
    console.log('  SUCCESSFUL TESTS');
    console.log('='.repeat(70));
    
    successful.forEach(result => {
      console.log(`\n✅ ${result.scenario}`);
      console.log(`   SKU: ${result.sku}`);
      console.log(`   Price: $${result.price?.toFixed(2)}`);
      console.log(`   Attributes:`, result.sentAttributes);
    });
  }
  
  // Generate recommendations for algorithm improvements
  console.log('\n\n' + '█'.repeat(70));
  console.log('  ALGORITHM IMPROVEMENT RECOMMENDATIONS');
  console.log('█'.repeat(70));
  
  const errorTypes = new Map<string, number>();
  failed.forEach(result => {
    const key = result.error || 'Unknown';
    errorTypes.set(key, (errorTypes.get(key) || 0) + 1);
  });
  
  if (errorTypes.size > 0) {
    console.log('\nMost common errors:');
    Array.from(errorTypes.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([error, count]) => {
        console.log(`  ${count}x ${error}`);
      });
  }
  
  // Specific recommendations
  const recommendations = new Set<string>();
  failed.forEach(result => {
    result.recommendations?.forEach(rec => recommendations.add(rec));
  });
  
  if (recommendations.size > 0) {
    console.log('\nRecommended fixes:');
    Array.from(recommendations).forEach((rec, i) => {
      console.log(`  ${i + 1}. ${rec}`);
    });
  }
  
  console.log('\n' + '█'.repeat(70) + '\n');
  
  // Save detailed results to JSON
  const fs = require('fs');
  fs.writeFileSync(
    './test-results.json',
    JSON.stringify(results, null, 2)
  );
  console.log('📄 Detailed results saved to test-results.json\n');
}

// Run tests
runAllTests().catch(console.error);

