#!/usr/bin/env node

/**
 * Migration script to update existing products with unique SKUs
 * This script addresses the issue where multiple products with the same frame specifications
 * have the same SKU, causing database constraint violations.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Generate a unique SKU by appending image ID to base SKU
 */
function generateUniqueSku(baseSku, imageId) {
  if (!imageId) {
    console.warn('⚠️ No image ID provided, using timestamp for uniqueness');
    return `${baseSku}-${Date.now().toString(36)}`;
  }
  
  // Extract first 8 characters of image ID for uniqueness
  const imageIdSuffix = imageId.substring(0, 8);
  return `${baseSku}-${imageIdSuffix}`;
}

/**
 * Check if a SKU is already unique (contains image ID suffix)
 */
function isUniqueSku(sku) {
  // Check if SKU ends with pattern: -XXXXXXXX (8 hex characters)
  return /^.+-[a-f0-9]{8}$/.test(sku);
}

/**
 * Main migration function
 */
async function migrateSkusToUnique() {
  console.log('🚀 Starting SKU migration to unique format...');
  console.log('📋 This will update existing products to have unique SKUs per image\n');

  try {
    // Step 1: Find all products that need migration
    console.log('🔍 Step 1: Finding products that need unique SKUs...');
    const { data: products, error: fetchError } = await supabase
      .from('products')
      .select('id, sku, image_id, frame_size, frame_style, frame_material')
      .not('sku', 'is', null);

    if (fetchError) {
      throw new Error(`Failed to fetch products: ${fetchError.message}`);
    }

    console.log(`📊 Found ${products.length} products with SKUs`);

    // Step 2: Identify products that need migration
    const productsToMigrate = products.filter(product => !isUniqueSku(product.sku));
    const alreadyUnique = products.filter(product => isUniqueSku(product.sku));

    console.log(`📊 Migration Analysis:`);
    console.log(`✅ Already unique: ${alreadyUnique.length}`);
    console.log(`🔄 Need migration: ${productsToMigrate.length}`);

    if (productsToMigrate.length === 0) {
      console.log('\n🎉 All products already have unique SKUs! Migration complete.');
      return;
    }

    // Step 3: Group products by base SKU to identify conflicts
    console.log('\n🔍 Step 2: Analyzing SKU conflicts...');
    const skuGroups = {};
    
    productsToMigrate.forEach(product => {
      if (!skuGroups[product.sku]) {
        skuGroups[product.sku] = [];
      }
      skuGroups[product.sku].push(product);
    });

    const conflictingSkus = Object.keys(skuGroups).filter(sku => skuGroups[sku].length > 1);
    console.log(`⚠️ Found ${conflictingSkus.length} SKUs with conflicts`);

    // Step 4: Generate unique SKUs for products that need migration
    console.log('\n🔧 Step 3: Generating unique SKUs...');
    const updates = [];

    for (const product of productsToMigrate) {
      const uniqueSku = generateUniqueSku(product.sku, product.image_id);
      updates.push({
        id: product.id,
        oldSku: product.sku,
        newSku: uniqueSku,
        imageId: product.image_id,
        frameSpecs: `${product.frame_size}-${product.frame_style}-${product.frame_material}`
      });
    }

    console.log(`📝 Generated ${updates.length} unique SKUs`);

    // Step 5: Update the database
    console.log('\n💾 Step 4: Updating database with unique SKUs...');
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

    // Step 6: Summary
    console.log('\n🎉 Migration Complete!');
    console.log('📊 Summary:');
    console.log(`✅ Successfully updated: ${successCount} products`);
    console.log(`❌ Failed updates: ${errorCount} products`);
    console.log(`📊 Total processed: ${updates.length} products`);

    if (errorCount > 0) {
      console.log('\n⚠️ Some products failed to update. Please check the errors above.');
    } else {
      console.log('\n🎉 All products successfully migrated to unique SKUs!');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run the migration
if (require.main === module) {
  migrateSkusToUnique()
    .then(() => {
      console.log('\n✅ Migration script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateSkusToUnique, generateUniqueSku, isUniqueSku };
