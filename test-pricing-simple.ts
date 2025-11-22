/**
 * Simplified Pricing Test - Tests actual pricing API flow
 */

// First, load environment
import { config } from 'dotenv';
config({ path: '.env.local' });

// Now we can safely import and use the SDK
import { ProdigiSDK } from './src/lib/prodigi-v2/index';

async function testPricingFlow() {
  const apiKey = process.env.PRODIGI_API_KEY;
  
  if (!apiKey) {
    console.error('❌ PRODIGI_API_KEY not found in environment');
    process.exit(1);
  }
  
  console.log('✅ API Key loaded');
  console.log('\nInitializing Prodigi SDK...');
  
  const sdk = new ProdigiSDK({
    apiKey,
    environment: 'production',
  });
  
  console.log('✅ SDK initialized\n');
  
  // Test 1: Canvas 18x24
  console.log('='.repeat(60));
  console.log('Test 1: Canvas 18x24 with Black wrap');
  console.log('='.repeat(60));
  
  try {
    // Get SKU
    console.log('Looking up SKU...');
    const sku = await sdk.catalog.getSKU('canvas', '18x24', 'US');
    console.log(`Found SKU: ${sku}`);
    
    if (!sku) {
      console.log('❌ No SKU found\n');
      return;
    }
    
    // Get product details
    console.log('Fetching product details...');
    const product = await sdk.products.get(sku);
    console.log(`Product: ${product.description}`);
    console.log(`Attributes:`, Object.keys(product.attributes));
    console.log(`Valid wrap values:`, product.attributes.wrap || 'N/A');
    
    // Test with wrap attribute
    console.log('\n--- Test 1a: With "black" wrap (lowercase) ---');
    try {
      const quotes1 = await sdk.quotes.create({
        destinationCountryCode: 'US',
        shippingMethod: 'Standard',
        items: [{
          sku,
          copies: 1,
          attributes: { wrap: 'black' },
          assets: [{ url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5' }],
        }],
      });
      
      const quote1 = quotes1[0];
      const itemCost1 = parseFloat(quote1.items?.[0]?.itemCosts?.total || '0');
      const shippingCost1 = parseFloat(quote1.shipments?.[0]?.cost?.amount || '0');
      console.log(`✅ Success! Total: $${(itemCost1 + shippingCost1).toFixed(2)}`);
    } catch (error: any) {
      console.log(`❌ Failed: ${error.message}`);
      if (error.validationErrors) {
        console.log(`Validation errors:`, error.validationErrors);
      }
    }
    
    // Test with no attributes
    console.log('\n--- Test 1b: With no attributes ---');
    try {
      const quotes2 = await sdk.quotes.create({
        destinationCountryCode: 'US',
        shippingMethod: 'Standard',
        items: [{
          sku,
          copies: 1,
          attributes: {},
          assets: [{ url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5' }],
        }],
      });
      
      const quote2 = quotes2[0];
      const itemCost2 = parseFloat(quote2.items?.[0]?.itemCosts?.total || '0');
      const shippingCost2 = parseFloat(quote2.shipments?.[0]?.cost?.amount || '0');
      console.log(`✅ Success! Total: $${(itemCost2 + shippingCost2).toFixed(2)}`);
    } catch (error: any) {
      console.log(`❌ Failed: ${error.message}`);
      if (error.validationErrors) {
        console.log(`Validation errors:`, error.validationErrors);
      }
    }
    
  } catch (error: any) {
    console.log(`❌ Error: ${error.message}`);
    console.log(error);
  }
  
  // Test 2: Framed Print 18x24
  console.log('\n' + '='.repeat(60));
  console.log('Test 2: Framed Print 18x24');
  console.log('='.repeat(60));
  
  try {
    console.log('Looking up SKU...');
    const sku = await sdk.catalog.getSKU('framed-print', '18x24', 'US');
    console.log(`Found SKU: ${sku}`);
    
    if (!sku) {
      console.log('❌ No SKU found\n');
      return;
    }
    
    console.log('Fetching product details...');
    const product = await sdk.products.get(sku);
    console.log(`Product: ${product.description}`);
    console.log(`Attributes:`, Object.keys(product.attributes));
    
    console.log(`\nAttribute options:`);
    Object.entries(product.attributes).forEach(([key, values]) => {
      console.log(`  ${key}:`, (values as string[]).join(', '));
    });
    
    // Test with minimal valid attributes
    console.log('\n--- Test 2a: Minimal valid attributes ---');
    const hasMount = product.attributes.hasOwnProperty('mount');
    const attributes: any = {
      color: product.attributes.color?.[0],
      glaze: product.attributes.glaze?.[0],
    };
    
    if (hasMount && product.attributes.mount?.length > 0) {
      attributes.mount = product.attributes.mount[0];
    }
    
    console.log('Sending attributes:', attributes);
    
    try {
      const quotes = await sdk.quotes.create({
        destinationCountryCode: 'US',
        shippingMethod: 'Standard',
        items: [{
          sku,
          copies: 1,
          attributes,
          assets: [{ url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5' }],
        }],
      });
      
      const quote = quotes[0];
      const itemCost = parseFloat(quote.items?.[0]?.itemCosts?.total || '0');
      const shippingCost = parseFloat(quote.shipments?.[0]?.cost?.amount || '0');
      console.log(`✅ Success! Total: $${(itemCost + shippingCost).toFixed(2)}`);
    } catch (error: any) {
      console.log(`❌ Failed: ${error.message}`);
      if (error.validationErrors) {
        console.log(`Validation errors:`, error.validationErrors);
      }
    }
    
  } catch (error: any) {
    console.log(`❌ Error: ${error.message}`);
    console.log(error);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('Tests complete!');
  console.log('='.repeat(60) + '\n');
}

testPricingFlow().catch(console.error);

