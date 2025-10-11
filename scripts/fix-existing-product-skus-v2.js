#!/usr/bin/env node

/**
 * Fix existing product SKUs migration v2
 * Handles duplicate SKUs by creating unique identifiers
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing required environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Base SKU mapping
const baseSkuMapping = {
  'small': 'GLOBAL-FAP-8X10',     // 8x10 for small
  'medium': 'GLOBAL-FAP-11X14',   // 11x14 for medium  
  'large': 'GLOBAL-FAP-16X24',    // 16x24 for large
  'extra_large': 'GLOBAL-FAP-20X30' // 20x30 for extra large
};

async function fixExistingProductSkus() {
  console.log('🔧 Starting SKU migration v2 for existing products...');
  
  try {
    // Find all products with old CUR- prefixed SKUs
    const { data: products, error: fetchError } = await supabase
      .from('products')
      .select('id, sku, frame_size, frame_style, frame_material, created_at')
      .like('sku', 'CUR-%')
      .order('created_at', { ascending: true }); // Order by creation date

    if (fetchError) {
      console.error('❌ Error fetching products:', fetchError);
      return;
    }

    if (!products || products.length === 0) {
      console.log('✅ No products with old SKUs found');
      return;
    }

    console.log(`📦 Found ${products.length} products with old SKUs`);

    // Group products by frame specifications
    const productGroups = {};
    products.forEach(product => {
      const key = `${product.frame_size}-${product.frame_style}-${product.frame_material}`;
      if (!productGroups[key]) {
        productGroups[key] = [];
      }
      productGroups[key].push(product);
    });

    console.log(`📊 Grouped into ${Object.keys(productGroups).length} specification groups`);

    let updatedCount = 0;
    let errorCount = 0;

    // Process each group
    for (const [specKey, groupProducts] of Object.entries(productGroups)) {
      console.log(`\n🔧 Processing group: ${specKey} (${groupProducts.length} products)`);
      
      const baseSku = baseSkuMapping[groupProducts[0].frame_size] || 'GLOBAL-FAP-11X14';
      
      // For each product in the group, create a unique SKU
      for (let i = 0; i < groupProducts.length; i++) {
        const product = groupProducts[i];
        let newSku;
        
        if (i === 0) {
          // First product gets the base SKU
          newSku = baseSku;
        } else {
          // Subsequent products get a unique suffix
          newSku = `${baseSku}-${String(i + 1).padStart(2, '0')}`;
        }
        
        try {
          console.log(`🔄 Updating product ${product.id}: ${product.sku} → ${newSku}`);
          
          const { error: updateError } = await supabase
            .from('products')
            .update({ 
              sku: newSku,
              updated_at: new Date().toISOString()
            })
            .eq('id', product.id);

          if (updateError) {
            console.error(`❌ Error updating product ${product.id}:`, updateError);
            errorCount++;
          } else {
            console.log(`✅ Updated product ${product.id}`);
            updatedCount++;
          }
        } catch (error) {
          console.error(`❌ Error processing product ${product.id}:`, error);
          errorCount++;
        }
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`✅ Successfully updated: ${updatedCount} products`);
    console.log(`❌ Errors: ${errorCount} products`);
    console.log(`📦 Total processed: ${products.length} products`);

    if (errorCount === 0) {
      console.log('\n🎉 All products updated successfully!');
    } else {
      console.log('\n⚠️  Some products failed to update. Check the logs above.');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

// Run the migration
fixExistingProductSkus()
  .then(() => {
    console.log('\n✅ SKU migration v2 completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ SKU migration v2 failed:', error);
    process.exit(1);
  });
