#!/usr/bin/env node

/**
 * Check existing SKUs in the database
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

async function checkExistingSkus() {
  console.log('🔍 Checking existing SKUs in database...');
  
  try {
    // Get all products with their SKUs
    const { data: products, error } = await supabase
      .from('products')
      .select('id, sku, frame_size, frame_style, frame_material, created_at')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ Error fetching products:', error);
      return;
    }

    console.log(`📦 Found ${products.length} total products`);
    
    // Group by SKU
    const skuGroups = {};
    products.forEach(product => {
      if (!skuGroups[product.sku]) {
        skuGroups[product.sku] = [];
      }
      skuGroups[product.sku].push(product);
    });

    console.log('\n📊 SKU Analysis:');
    Object.entries(skuGroups).forEach(([sku, products]) => {
      console.log(`\n🔹 SKU: ${sku} (${products.length} products)`);
      products.forEach(product => {
        console.log(`   - ${product.id}: ${product.frame_size}-${product.frame_style}-${product.frame_material}`);
      });
    });

    // Check for conflicts
    const conflicts = Object.entries(skuGroups).filter(([sku, products]) => products.length > 1);
    if (conflicts.length > 0) {
      console.log('\n⚠️  SKU Conflicts Found:');
      conflicts.forEach(([sku, products]) => {
        console.log(`   ${sku}: ${products.length} products`);
      });
    } else {
      console.log('\n✅ No SKU conflicts found');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkExistingSkus()
  .then(() => {
    console.log('\n✅ SKU check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ SKU check failed:', error);
    process.exit(1);
  });
