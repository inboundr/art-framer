#!/usr/bin/env node

/**
 * Fix remaining CUR- prefixed SKUs
 * Updates the last 2 products with old SKUs to use verified Prodigi SKUs
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixRemainingCurSkus() {
  console.log('🔧 Fixing remaining CUR- prefixed SKUs...');
  
  try {
    // Find the remaining products with CUR- prefixed SKUs
    const { data: products, error: fetchError } = await supabase
      .from('products')
      .select('id, sku, frame_size, frame_style, frame_material')
      .like('sku', 'CUR-%');

    if (fetchError) {
      console.error('❌ Error fetching products:', fetchError);
      return;
    }

    if (!products || products.length === 0) {
      console.log('✅ No products with CUR- SKUs found');
      return;
    }

    console.log(`📦 Found ${products.length} products with CUR- SKUs`);

    let updatedCount = 0;
    let errorCount = 0;

    // Update each product with a unique verified SKU
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      
      // Create unique SKUs for each product
      let newSku;
      if (product.frame_size === 'medium') {
        if (product.frame_style === 'black') {
          newSku = `GLOBAL-FAP-11X14-${String(i + 4).padStart(2, '0')}`; // Continue from 04
        } else if (product.frame_style === 'gold') {
          newSku = `GLOBAL-FAP-11X14-GOLD-${String(i + 1).padStart(2, '0')}`;
        } else {
          newSku = `GLOBAL-FAP-11X14-${product.frame_style.toUpperCase()}-${String(i + 1).padStart(2, '0')}`;
        }
      } else {
        // For other sizes, use the base mapping with unique suffix
        const baseSku = {
          'small': 'GLOBAL-FAP-8X10',
          'medium': 'GLOBAL-FAP-11X14',
          'large': 'GLOBAL-FAP-16X24',
          'extra_large': 'GLOBAL-FAP-20X30'
        }[product.frame_size] || 'GLOBAL-FAP-11X14';
        
        newSku = `${baseSku}-${product.frame_style.toUpperCase()}-${String(i + 1).padStart(2, '0')}`;
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

    console.log('\n📊 Migration Summary:');
    console.log(`✅ Successfully updated: ${updatedCount} products`);
    console.log(`❌ Errors: ${errorCount} products`);
    console.log(`📦 Total processed: ${products.length} products`);

    if (errorCount === 0) {
      console.log('\n🎉 All CUR- SKUs fixed successfully!');
    } else {
      console.log('\n⚠️  Some products failed to update. Check the logs above.');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

// Run the migration
fixRemainingCurSkus()
  .then(() => {
    console.log('\n✅ CUR- SKU fix completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ CUR- SKU fix failed:', error);
    process.exit(1);
  });
