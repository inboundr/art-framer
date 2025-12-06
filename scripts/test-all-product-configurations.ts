/**
 * Comprehensive Product Configuration Discovery
 * 
 * Tests all product types and sizes to discover special configurations
 * like slim canvas, eco canvas, different edge depths, etc.
 */

import 'dotenv/config';
import { ProdigiClient } from '../src/lib/prodigi-v2/client';
import { ProdigiCatalogService } from '../src/lib/prodigi-v2/catalog';
import { azureSearchClient } from '../src/lib/prodigi-v2/azure-search/client';

const PRODIGI_API_KEY = process.env.PRODIGI_API_KEY;
if (!PRODIGI_API_KEY) {
  console.error('❌ PRODIGI_API_KEY not found in environment variables');
  process.exit(1);
}

interface ConfigurationVariant {
  sku: string;
  productType: string;
  size: string;
  edge?: string;
  description: string;
  attributes: Record<string, string[]>;
  specialFeatures: string[];
}

interface ProductTypeConfig {
  productType: string;
  variants: ConfigurationVariant[];
  specialConfigurations: string[];
}

const results: Map<string, ProductTypeConfig> = new Map();

async function discoverConfigurations() {
  console.log('🔍 Starting comprehensive product configuration discovery...\n');

  const client = new ProdigiClient({
    apiKey: PRODIGI_API_KEY,
    environment: 'production',
  });

  const catalogService = new ProdigiCatalogService(client);

  // Test all product types with various sizes
  const productTypes = ['framed-print', 'canvas', 'framed-canvas', 'acrylic', 'metal', 'poster'];
  const testSizes = ['8x10', '12x16', '16x20', '18x24', '24x36', '30x40'];

  for (const productType of productTypes) {
    console.log(`\n📦 Testing ${productType}...`);
    const config: ProductTypeConfig = {
      productType,
      variants: [],
      specialConfigurations: [],
    };

    const variants = new Map<string, ConfigurationVariant>();

    for (const size of testSizes) {
      try {
        // Get SKU from catalog
        const sku = await catalogService.getSKU(productType, size, 'US');
        if (!sku) {
          console.log(`  ⚠️  No SKU found for ${size}`);
          continue;
        }

        // Get product details
        const productData = await catalogService.getProduct(productType, size, 'US');
        if (!productData) {
          console.log(`  ⚠️  No product data for ${sku}`);
          continue;
        }

        const { product, catalogProduct } = productData;

        // Detect special configurations
        const specialFeatures: string[] = [];
        if (sku.toLowerCase().includes('slimcan') || sku.toLowerCase().includes('slim-can')) {
          specialFeatures.push('slim-canvas');
        }
        if (sku.toLowerCase().includes('eco')) {
          specialFeatures.push('eco-canvas');
        }
        if (sku.toLowerCase().includes('fra-slimcan')) {
          specialFeatures.push('framed-slim-canvas');
        }

        // Extract edge information
        const edge = product.attributes?.edge?.[0] || catalogProduct.edge?.[0];
        if (edge) {
          if (edge === '19mm') {
            specialFeatures.push('19mm-edge');
          } else if (edge === '38mm') {
            specialFeatures.push('38mm-edge');
          }
        }

        // Check for other special attributes
        if (catalogProduct.paperType?.some(pt => pt.toLowerCase().includes('eco'))) {
          specialFeatures.push('eco-paper');
        }

        const variant: ConfigurationVariant = {
          sku,
          productType,
          size,
          edge,
          description: catalogProduct.description || product.description || '',
          attributes: {
            edge: product.attributes?.edge || catalogProduct.edge || [],
            wrap: product.attributes?.wrap || catalogProduct.wrap || [],
            color: product.attributes?.color || catalogProduct.frameColour || [],
            frame: product.attributes?.frame || catalogProduct.frame || [],
            glaze: product.attributes?.glaze || catalogProduct.glaze || [],
            mount: product.attributes?.mount || catalogProduct.mount || [],
            paperType: product.attributes?.paperType || catalogProduct.paperType || [],
            finish: product.attributes?.finish || catalogProduct.finish || [],
          },
          specialFeatures,
        };

        // Group by special features to identify patterns
        const variantKey = specialFeatures.length > 0 
          ? specialFeatures.join('-') 
          : 'standard';
        
        if (!variants.has(variantKey)) {
          variants.set(variantKey, variant);
        }

        console.log(`  ✅ ${size}: ${sku} ${specialFeatures.length > 0 ? `[${specialFeatures.join(', ')}]` : ''}`);

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error: any) {
        console.error(`  ❌ Error testing ${productType} ${size}:`, error.message);
      }
    }

    config.variants = Array.from(variants.values());
    config.specialConfigurations = Array.from(new Set(
      config.variants.flatMap(v => v.specialFeatures)
    ));

    results.set(productType, config);
  }

  // Print summary
  console.log('\n\n📊 DISCOVERY SUMMARY\n');
  console.log('='.repeat(80));

  for (const [productType, config] of results.entries()) {
    console.log(`\n🎨 ${productType.toUpperCase()}`);
    console.log('-'.repeat(80));
    
    if (config.specialConfigurations.length > 0) {
      console.log(`\nSpecial Configurations Found:`);
      config.specialConfigurations.forEach(feature => {
        console.log(`  • ${feature}`);
      });
    } else {
      console.log(`  No special configurations found (standard only)`);
    }

    console.log(`\nVariants Discovered:`);
    config.variants.forEach(variant => {
      console.log(`  • ${variant.sku}`);
      console.log(`    Size: ${variant.size}, Edge: ${variant.edge || 'N/A'}`);
      if (variant.specialFeatures.length > 0) {
        console.log(`    Features: ${variant.specialFeatures.join(', ')}`);
      }
    });
  }

  // Generate recommendations
  console.log('\n\n💡 RECOMMENDATIONS\n');
  console.log('='.repeat(80));

  const allSpecialFeatures = new Set<string>();
  for (const config of results.values()) {
    config.specialConfigurations.forEach(feature => allSpecialFeatures.add(feature));
  }

  if (allSpecialFeatures.size > 0) {
    console.log('\nSpecial configurations that should be added to the app:');
    allSpecialFeatures.forEach(feature => {
      console.log(`  • ${feature}`);
    });
  }

  // Check for edge depth variations
  const edgeDepths = new Set<string>();
  for (const config of results.values()) {
    config.variants.forEach(v => {
      if (v.edge) edgeDepths.add(v.edge);
    });
  }

  if (edgeDepths.size > 1) {
    console.log('\n📏 Edge Depth Options Found:');
    edgeDepths.forEach(depth => {
      console.log(`  • ${depth}`);
    });
    console.log('\n  → Recommendation: Add "Edge Depth" or "Canvas Depth" option to Studio config');
  }

  // Check for canvas type variations
  const canvasTypes = new Set<string>();
  for (const config of results.values()) {
    config.variants.forEach(v => {
      if (v.specialFeatures.includes('slim-canvas')) canvasTypes.add('slim');
      if (v.specialFeatures.includes('eco-canvas')) canvasTypes.add('eco');
      if (v.specialFeatures.includes('framed-slim-canvas')) canvasTypes.add('framed-slim');
    });
  }

  if (canvasTypes.size > 0) {
    console.log('\n🖼️ Canvas Type Variations Found:');
    canvasTypes.forEach(type => {
      console.log(`  • ${type} canvas`);
    });
    console.log('\n  → Recommendation: Add "Canvas Type" option for canvas/framed-canvas products');
  }

  console.log('\n✅ Discovery complete!\n');
}

// Run discovery
discoverConfigurations().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

