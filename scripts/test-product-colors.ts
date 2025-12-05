/**
 * Test Script: Discover Available Colors for Each Product Type
 * 
 * This script queries Prodigi v2 API to determine which colors are available
 * for each product type. Colors vary by product type, so we need to handle
 * them dynamically.
 */

import 'dotenv/config';
import { ProdigiClient } from '../src/lib/prodigi-v2/client';
import { ProductsAPI } from '../src/lib/prodigi-v2/products';
import { azureSearchClient } from '../src/lib/prodigi-v2/azure-search/client';
import type { ProdigiSearchFilters } from '../src/lib/prodigi-v2/azure-search/types';

const PRODUCT_TYPES = [
  'framed-print',
  'canvas',
  'framed-canvas',
  'acrylic',
  'metal',
  'poster',
] as const;

interface ColorDiscovery {
  productType: string;
  colors: Set<string>;
  sampleSKUs: string[];
  totalProducts: number;
}

async function discoverColorsForProductType(
  productType: string,
  productsAPI: ProductsAPI
): Promise<ColorDiscovery> {
  console.log(`\n📦 Discovering colors for ${productType}...`);

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
    top: 200, // Get many more samples for comprehensive color coverage
  });

  const colors = new Set<string>();
  const sampleSKUs: string[] = [];
  let productsWithColors = 0;
  const checkedSKUs = new Set<string>(); // Track SKUs we've already checked

  console.log(`   📦 Found ${result.products.length} products in catalog`);

  // Fetch product details to get color attributes
  // Check more products to ensure we find all color variants
  for (const catalogProduct of result.products) {
    // Skip if no SKU
    if (!catalogProduct.sku) continue;
    
    // Skip if we've already checked this SKU
    if (checkedSKUs.has(catalogProduct.sku)) continue;
    checkedSKUs.add(catalogProduct.sku);

    try {
      const product = await productsAPI.get(catalogProduct.sku);
      
      if (product.attributes?.color) {
        productsWithColors++;
        if (sampleSKUs.length < 10) {
          sampleSKUs.push(catalogProduct.sku);
        }
        
        // Add all color options - preserve original case first, then normalize
        if (Array.isArray(product.attributes.color)) {
          product.attributes.color.forEach((color: string) => {
            // Store both original and normalized versions
            const normalized = color.toLowerCase().trim();
            colors.add(normalized);
            
            // Also check for variations like "dark grey" vs "dark-grey"
            const variations = [
              normalized,
              normalized.replace(/\s+/g, '-'),
              normalized.replace(/-/g, ' '),
            ];
            variations.forEach(v => colors.add(v));
          });
        } else if (typeof product.attributes.color === 'string') {
          const colorValue = product.attributes.color as string;
          const normalized = colorValue.toLowerCase().trim();
          colors.add(normalized);
          colors.add(normalized.replace(/\s+/g, '-'));
          colors.add(normalized.replace(/-/g, ' '));
        }
        
        // Log the product to see what we're getting
        if (productsWithColors <= 5) {
          console.log(`      Product ${catalogProduct.sku}: colors =`, product.attributes.color);
        }
      }
    } catch (error) {
      // Skip products that fail to fetch
      if (productsWithColors < 5) {
        console.warn(`   ⚠️  Could not fetch ${catalogProduct.sku}:`, (error as Error).message);
      }
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Stop if we've checked enough products or found many colors
    if (productsWithColors >= 100 || colors.size >= 10) {
      console.log(`   ✅ Checked ${productsWithColors} products, found ${colors.size} unique colors`);
      break;
    }
  }

  return {
    productType,
    colors,
    sampleSKUs: sampleSKUs.slice(0, 5), // Keep first 5 as samples
    totalProducts: productsWithColors,
  };
}

async function discoverAllColors() {
  console.log('🎨 Discovering Available Colors for Each Product Type\n');
  console.log('='.repeat(80));

  // Initialize Prodigi client
  const apiKey = process.env.PRODIGI_API_KEY;
  const environment = (process.env.PRODIGI_ENVIRONMENT as 'sandbox' | 'production') || 'production';

  if (!apiKey) {
    console.error('❌ PRODIGI_API_KEY environment variable is required');
    process.exit(1);
  }

  const client = new ProdigiClient({
    apiKey,
    environment,
  });

  const productsAPI = new ProductsAPI(client);

  const discoveries: ColorDiscovery[] = [];

  // Discover colors for each product type
  for (const productType of PRODUCT_TYPES) {
    try {
      const discovery = await discoverColorsForProductType(productType, productsAPI);
      discoveries.push(discovery);
      
      console.log(`   ✅ Found ${discovery.colors.size} unique colors:`, Array.from(discovery.colors).sort());
      console.log(`   📊 Tested ${discovery.totalProducts} products`);
    } catch (error) {
      console.error(`   ❌ Failed for ${productType}:`, error);
      discoveries.push({
        productType,
        colors: new Set(),
        sampleSKUs: [],
        totalProducts: 0,
      });
    }
  }

  // Print summary
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 COLOR DISCOVERY SUMMARY\n');

  const allColors = new Set<string>();
  const colorByProductType: Record<string, string[]> = {};

  for (const discovery of discoveries) {
    const colorArray = Array.from(discovery.colors).sort();
    colorByProductType[discovery.productType] = colorArray;
    colorArray.forEach(color => allColors.add(color));
    
    console.log(`${discovery.productType}:`);
    console.log(`   Colors (${colorArray.length}): ${colorArray.join(', ') || 'N/A'}`);
    console.log(`   Sample SKUs: ${discovery.sampleSKUs.slice(0, 3).join(', ')}`);
    console.log('');
  }

  console.log('='.repeat(80));
  console.log(`\n🎨 ALL UNIQUE COLORS ACROSS ALL PRODUCT TYPES (${allColors.size}):`);
  console.log(Array.from(allColors).sort().join(', '));
  console.log('\n');

  // Generate TypeScript type definition
  console.log('📝 TypeScript Color Definitions:\n');
  console.log('export const PRODUCT_TYPE_COLORS: Record<string, string[]> = {');
  for (const [productType, colors] of Object.entries(colorByProductType)) {
    console.log(`  '${productType}': [${colors.map(c => `'${c}'`).join(', ')}],`);
  }
  console.log('};\n');

  // Check for differences
  console.log('🔍 COLOR DIFFERENCES BY PRODUCT TYPE:\n');
  const productTypes = Object.keys(colorByProductType);
  for (let i = 0; i < productTypes.length; i++) {
    for (let j = i + 1; j < productTypes.length; j++) {
      const type1 = productTypes[i];
      const type2 = productTypes[j];
      const colors1 = new Set(colorByProductType[type1]);
      const colors2 = new Set(colorByProductType[type2]);
      
      const onlyIn1 = Array.from(colors1).filter(c => !colors2.has(c));
      const onlyIn2 = Array.from(colors2).filter(c => !colors1.has(c));
      
      if (onlyIn1.length > 0 || onlyIn2.length > 0) {
        console.log(`${type1} vs ${type2}:`);
        if (onlyIn1.length > 0) {
          console.log(`   Only in ${type1}: ${onlyIn1.join(', ')}`);
        }
        if (onlyIn2.length > 0) {
          console.log(`   Only in ${type2}: ${onlyIn2.join(', ')}`);
        }
        console.log('');
      }
    }
  }

  return { discoveries, colorByProductType, allColors: Array.from(allColors).sort() };
}

// Run discovery
discoverAllColors().catch(error => {
  console.error('❌ Color discovery failed:', error);
  process.exit(1);
});

