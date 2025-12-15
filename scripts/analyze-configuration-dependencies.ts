/**
 * Comprehensive Configuration Dependency Analysis
 * 
 * Tests all Prodigi configuration combinations and dependencies
 * to identify why some configurations don't work
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') });
config({ path: resolve(__dirname, '../.env') });

import { ProdigiClient } from '@/lib/prodigi-v2/client';
import { FacetService } from '@/lib/prodigi-v2/azure-search/facet-service';

interface ConfigurationTest {
  productType: string;
  frameStyle?: string;
  frameColor?: string;
  mount?: string;
  mountColor?: string;
  glaze?: string;
  paperType?: string;
  finish?: string;
  wrap?: string;
  edge?: string;
  size: string;
  destinationCountry: string;
}

interface TestResult {
  config: ConfigurationTest;
  success: boolean;
  error?: string;
  availableOptions?: any;
  validAttributes?: Record<string, string[]>;
  issues: string[];
}

const prodigiClient = new ProdigiClient({
  apiKey: process.env.PRODIGI_API_KEY!,
  environment: 'production' as const,
});

const facetService = new FacetService(prodigiClient);

/**
 * Test all product types
 */
const PRODUCT_TYPES = [
  'framed-print',
  'canvas',
  'framed-canvas',
  'acrylic',
  'metal',
  'poster',
] as const;

/**
 * Test configurations for each product type
 */
const TEST_CONFIGURATIONS: Record<string, ConfigurationTest[]> = {
  'framed-print': [
    {
      productType: 'framed-print',
      frameStyle: 'classic',
      frameColor: 'black',
      mount: '2.4mm',
      mountColor: 'white',
      glaze: 'acrylic',
      paperType: 'enhanced-matte',
      finish: 'matte',
      size: '16x20',
      destinationCountry: 'US',
    },
    {
      productType: 'framed-print',
      frameStyle: 'box',
      frameColor: 'black',
      mount: 'none',
      glaze: 'acrylic',
      paperType: 'lustre',
      finish: 'gloss',
      size: '24x32',
      destinationCountry: 'US',
    },
    {
      productType: 'framed-print',
      frameStyle: 'aluminium',
      frameColor: 'silver',
      mount: 'none',
      glaze: 'none',
      paperType: 'enhanced-matte',
      finish: 'matte',
      size: '20x30',
      destinationCountry: 'US',
    },
  ],
  'canvas': [
    {
      productType: 'canvas',
      wrap: 'Black',
      edge: '38mm',
      size: '16x20',
      destinationCountry: 'US',
    },
    {
      productType: 'canvas',
      wrap: 'White',
      edge: '19mm',
      size: '24x32',
      destinationCountry: 'US',
    },
  ],
  'framed-canvas': [
    {
      productType: 'framed-canvas',
      frameStyle: 'classic',
      frameColor: 'black',
      wrap: 'Black',
      size: '16x20',
      destinationCountry: 'US',
    },
  ],
  'acrylic': [
    {
      productType: 'acrylic',
      finish: 'gloss',
      size: '16x20',
      destinationCountry: 'US',
    },
  ],
  'metal': [
    {
      productType: 'metal',
      finish: 'gloss',
      size: '16x20',
      destinationCountry: 'US',
    },
  ],
  'poster': [
    {
      productType: 'poster',
      size: '16x20',
      destinationCountry: 'US',
    },
  ],
};

/**
 * Test a single configuration
 */
async function testConfiguration(testConfig: ConfigurationTest): Promise<TestResult> {
  const issues: string[] = [];
  
  try {
    // 1. Get available options from facets
    const availableOptions = await facetService.getAvailableOptions(
      testConfig.productType,
      testConfig.destinationCountry,
      {
        frameStyles: testConfig.frameStyle ? [testConfig.frameStyle] : undefined,
        sizes: [testConfig.size],
      }
    );
    
    // 2. Validate each configuration option
    if (testConfig.frameStyle && !availableOptions.frameStyles.includes(testConfig.frameStyle)) {
      issues.push(`Frame style "${testConfig.frameStyle}" not available for ${testConfig.productType}`);
    }
    
    if (testConfig.frameColor && !availableOptions.frameColors.includes(testConfig.frameColor)) {
      issues.push(`Frame color "${testConfig.frameColor}" not available`);
    }
    
    if (testConfig.mount && !availableOptions.mounts.includes(testConfig.mount)) {
      issues.push(`Mount "${testConfig.mount}" not available`);
    }
    
    if (testConfig.mountColor && !availableOptions.mountColors.includes(testConfig.mountColor)) {
      issues.push(`Mount color "${testConfig.mountColor}" not available`);
    }
    
    if (testConfig.glaze && !availableOptions.glazes.includes(testConfig.glaze)) {
      issues.push(`Glaze "${testConfig.glaze}" not available`);
    }
    
    if (testConfig.paperType && !availableOptions.paperTypes.includes(testConfig.paperType)) {
      issues.push(`Paper type "${testConfig.paperType}" not available`);
    }
    
    if (testConfig.finish && !availableOptions.finishes.includes(testConfig.finish)) {
      issues.push(`Finish "${testConfig.finish}" not available`);
    }
    
    if (testConfig.wrap && !availableOptions.wraps.includes(testConfig.wrap)) {
      issues.push(`Wrap "${testConfig.wrap}" not available`);
    }
    
    if (testConfig.edge && !availableOptions.edges.includes(testConfig.edge)) {
      issues.push(`Edge "${testConfig.edge}" not available`);
    }
    
    if (!availableOptions.sizes.includes(testConfig.size)) {
      issues.push(`Size "${testConfig.size}" not available`);
    }
    
    // 3. Try to find a matching SKU
    // This would require building attributes and searching for products
    // For now, we'll just validate options
    
    return {
      config: testConfig,
      success: issues.length === 0,
      availableOptions,
      issues,
    };
  } catch (error) {
    return {
      config: testConfig,
      success: false,
      error: error instanceof Error ? error.message : String(error),
      issues: [...issues, `Error: ${error instanceof Error ? error.message : String(error)}`],
    };
  }
}

/**
 * Analyze configuration dependencies
 */
function analyzeDependencies(results: TestResult[]): void {
  console.log('\n📊 Configuration Dependency Analysis\n');
  console.log('=' .repeat(80));
  
  // Group by product type
  const byProductType: Record<string, TestResult[]> = {};
  results.forEach(result => {
    const productType = result.config.productType;
    if (!byProductType[productType]) {
      byProductType[productType] = [];
    }
    byProductType[productType].push(result);
  });
  
  // Analyze each product type
  Object.entries(byProductType).forEach(([productType, productResults]) => {
    console.log(`\n🏷️  Product Type: ${productType}`);
    console.log('-'.repeat(80));
    
    const successful = productResults.filter(r => r.success);
    const failed = productResults.filter(r => !r.success);
    
    console.log(`✅ Successful: ${successful.length}/${productResults.length}`);
    console.log(`❌ Failed: ${failed.length}/${productResults.length}`);
    
    if (failed.length > 0) {
      console.log('\n❌ Failed Configurations:');
      failed.forEach(result => {
        console.log(`\n  Configuration:`);
        console.log(`    ${JSON.stringify(result.config, null, 2)}`);
        if (result.error) {
          console.log(`    Error: ${result.error}`);
        }
        if (result.issues.length > 0) {
          console.log(`    Issues:`);
          result.issues.forEach(issue => console.log(`      - ${issue}`));
        }
      });
    }
    
    // Find common patterns
    if (productResults.length > 0 && productResults[0].availableOptions) {
      const options = productResults[0].availableOptions;
      console.log('\n📋 Available Options:');
      console.log(`    Frame Styles: ${options.frameStyles?.length || 0} options`);
      console.log(`    Frame Colors: ${options.frameColors?.length || 0} options`);
      console.log(`    Mounts: ${options.mounts?.length || 0} options`);
      console.log(`    Mount Colors: ${options.mountColors?.length || 0} options`);
      console.log(`    Glazes: ${options.glazes?.length || 0} options`);
      console.log(`    Paper Types: ${options.paperTypes?.length || 0} options`);
      console.log(`    Finishes: ${options.finishes?.length || 0} options`);
      console.log(`    Wraps: ${options.wraps?.length || 0} options`);
      console.log(`    Edges: ${options.edges?.length || 0} options`);
      console.log(`    Sizes: ${options.sizes?.length || 0} options`);
    }
  });
  
  // Find cross-product dependencies
  console.log('\n\n🔗 Cross-Product Dependencies\n');
  console.log('='.repeat(80));
  
  const allIssues = results.flatMap(r => r.issues);
  const uniqueIssues = [...new Set(allIssues)];
  
  if (uniqueIssues.length > 0) {
    console.log('\nCommon Issues:');
    uniqueIssues.forEach(issue => {
      const count = allIssues.filter(i => i === issue).length;
      console.log(`  - ${issue} (${count} occurrences)`);
    });
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log('🧪 Prodigi Configuration Dependency Analysis\n');
  console.log('='.repeat(80));
  
  const allResults: TestResult[] = [];
  
  // Test each product type
  for (const productType of PRODUCT_TYPES) {
    const configs = TEST_CONFIGURATIONS[productType] || [];
    
    console.log(`\n📦 Testing ${productType} (${configs.length} configurations)...`);
    
    for (const config of configs) {
      const result = await testConfiguration(config);
      allResults.push(result);
      
      if (result.success) {
        console.log(`  ✅ ${JSON.stringify(config)}`);
      } else {
        console.log(`  ❌ ${JSON.stringify(config)}`);
        if (result.error) {
          console.log(`     Error: ${result.error}`);
        }
        result.issues.forEach(issue => {
          console.log(`     - ${issue}`);
        });
      }
    }
  }
  
  // Analyze results
  analyzeDependencies(allResults);
  
  // Summary
  console.log('\n\n📈 Summary\n');
  console.log('='.repeat(80));
  const total = allResults.length;
  const successful = allResults.filter(r => r.success).length;
  const failed = total - successful;
  
  console.log(`Total Tests: ${total}`);
  console.log(`✅ Successful: ${successful} (${((successful / total) * 100).toFixed(1)}%)`);
  console.log(`❌ Failed: ${failed} (${((failed / total) * 100).toFixed(1)}%)`);
}

// Run tests
runTests().catch(console.error);

