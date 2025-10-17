#!/usr/bin/env node

/**
 * SKU Migration Script
 * 
 * This script identifies and fixes invalid SKUs in the database by:
 * 1. Finding all products with generated SKUs (PRODIGI-* pattern)
 * 2. Validating each SKU with the Prodigi API
 * 3. Replacing invalid SKUs with valid ones
 * 4. Updating the database with the corrected SKUs
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Prodigi API configuration
const PRODIGI_API_KEY = process.env.PRODIGI_API_KEY;
const PRODIGI_BASE_URL = 'https://api.prodigi.com/v4.0';

if (!PRODIGI_API_KEY) {
  console.error('❌ Missing PRODIGI_API_KEY environment variable');
  process.exit(1);
}

/**
 * Validate a SKU with the Prodigi API
 */
async function validateSkuWithProdigi(sku) {
  try {
    const response = await fetch(`${PRODIGI_BASE_URL}/products/${sku}`, {
      headers: {
        'X-API-Key': PRODIGI_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      return {
        isValid: true,
        product: data.product,
        error: null
      };
    } else if (response.status === 404) {
      return {
        isValid: false,
        product: null,
        error: 'SKU not found'
      };
    } else {
      const errorText = await response.text();
      return {
        isValid: false,
        product: null,
        error: `API error: ${response.status} - ${errorText}`
      };
    }
  } catch (error) {
    return {
      isValid: false,
      product: null,
      error: `Network error: ${error.message}`
    };
  }
}

/**
 * Generate a valid SKU based on frame specifications
 */
async function generateValidSku(frameSize, frameStyle, frameMaterial) {
  console.log(`🔧 Generating valid SKU for: ${frameSize}-${frameStyle}-${frameMaterial}`);
  
  // Known working SKUs based on frame size
  const knownWorkingSkus = {
    'small': ['GLOBAL-FAP-8X10', 'GLOBAL-CAN-10x10'],
    'medium': ['GLOBAL-FAP-11X14', 'GLOBAL-CFPM-16X20'],
    'large': ['GLOBAL-FAP-16X24', 'GLOBAL-CFPM-16X20'],
    'extra_large': ['GLOBAL-FRA-CAN-30X40']
  };

  // Try known working SKUs first
  const candidates = knownWorkingSkus[frameSize] || knownWorkingSkus['medium'];
  
  for (const candidateSku of candidates) {
    const validation = await validateSkuWithProdigi(candidateSku);
    if (validation.isValid) {
      console.log(`✅ Found valid SKU: ${candidateSku}`);
      return candidateSku;
    }
  }

  // If no known SKUs work, try to discover from Prodigi API
  try {
    const searchResponse = await fetch(`${PRODIGI_BASE_URL}/products?limit=50`, {
      headers: {
        'X-API-Key': PRODIGI_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      if (searchData.products && searchData.products.length > 0) {
        // Use the first available product as a fallback
        const fallbackSku = searchData.products[0].sku;
        console.log(`⚠️ Using discovered fallback SKU: ${fallbackSku}`);
        return fallbackSku;
      }
    }
  } catch (error) {
    console.warn(`⚠️ Failed to discover SKUs from API: ${error.message}`);
  }

  // Final fallback to a known working SKU
  const fallbackSku = 'GLOBAL-FAP-11X14';
  console.log(`⚠️ Using final fallback SKU: ${fallbackSku}`);
  return fallbackSku;
}

/**
 * Main migration function
 */
async function migrateInvalidSkus() {
  console.log('🚀 Starting SKU migration...');
  console.log('📋 This will identify and fix invalid SKUs in the database\n');

  try {
    // Step 1: Find all products with generated SKUs
    console.log('🔍 Step 1: Finding products with generated SKUs...');
    const { data: products, error: fetchError } = await supabase
      .from('products')
      .select('id, sku, frame_size, frame_style, frame_material, name')
      .like('sku', 'PRODIGI-%');

    if (fetchError) {
      throw new Error(`Failed to fetch products: ${fetchError.message}`);
    }

    console.log(`📊 Found ${products.length} products with generated SKUs`);

    if (products.length === 0) {
      console.log('✅ No products with generated SKUs found. Migration complete!');
      return;
    }

    // Step 2: Validate each SKU
    console.log('\n🔍 Step 2: Validating SKUs with Prodigi API...');
    const invalidProducts = [];
    const validProducts = [];

    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      console.log(`\n[${i + 1}/${products.length}] Validating: ${product.sku}`);
      
      const validation = await validateSkuWithProdigi(product.sku);
      
      if (validation.isValid) {
        console.log(`✅ Valid: ${product.sku}`);
        validProducts.push(product);
      } else {
        console.log(`❌ Invalid: ${product.sku} - ${validation.error}`);
        invalidProducts.push(product);
      }

      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n📊 Validation Results:`);
    console.log(`✅ Valid SKUs: ${validProducts.length}`);
    console.log(`❌ Invalid SKUs: ${invalidProducts.length}`);

    if (invalidProducts.length === 0) {
      console.log('\n🎉 All SKUs are valid! No migration needed.');
      return;
    }

    // Step 3: Generate valid SKUs for invalid products
    console.log('\n🔧 Step 3: Generating valid SKUs for invalid products...');
    const updates = [];

    for (let i = 0; i < invalidProducts.length; i++) {
      const product = invalidProducts[i];
      console.log(`\n[${i + 1}/${invalidProducts.length}] Fixing: ${product.sku}`);
      
      try {
        const validSku = await generateValidSku(
          product.frame_size,
          product.frame_style,
          product.frame_material
        );

        updates.push({
          id: product.id,
          oldSku: product.sku,
          newSku: validSku,
          frameSize: product.frame_size,
          frameStyle: product.frame_style,
          frameMaterial: product.frame_material
        });

        console.log(`✅ Generated: ${product.sku} → ${validSku}`);
      } catch (error) {
        console.error(`❌ Failed to generate SKU for ${product.sku}: ${error.message}`);
      }

      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Step 4: Update the database
    console.log('\n💾 Step 4: Updating database with valid SKUs...');
    let successCount = 0;
    let errorCount = 0;

    for (const update of updates) {
      try {
        const { error: updateError } = await supabase
          .from('products')
          .update({ sku: update.newSku })
          .eq('id', update.id);

        if (updateError) {
          console.error(`❌ Failed to update ${update.oldSku}: ${updateError.message}`);
          errorCount++;
        } else {
          console.log(`✅ Updated: ${update.oldSku} → ${update.newSku}`);
          successCount++;
        }
      } catch (error) {
        console.error(`❌ Database error for ${update.oldSku}: ${error.message}`);
        errorCount++;
      }
    }

    // Step 5: Summary
    console.log('\n🎉 Migration Complete!');
    console.log('📊 Summary:');
    console.log(`✅ Successfully updated: ${successCount} products`);
    console.log(`❌ Failed to update: ${errorCount} products`);
    console.log(`📋 Total processed: ${updates.length} products`);

    if (errorCount > 0) {
      console.log('\n⚠️ Some products failed to update. Please check the errors above.');
      process.exit(1);
    } else {
      console.log('\n🎉 All products updated successfully!');
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run the migration
if (require.main === module) {
  migrateInvalidSkus()
    .then(() => {
      console.log('\n✅ Migration script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateInvalidSkus, validateSkuWithProdigi, generateValidSku };
