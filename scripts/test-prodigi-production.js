#!/usr/bin/env node

/**
 * Prodigi Production API Test Script
 * 
 * This script performs minimal testing against the production Prodigi API
 * to validate that our integration works with real API credentials.
 * 
 * Usage:
 * PRODIGI_API_KEY=your-real-api-key node scripts/test-prodigi-production.js
 */

const https = require('https');

// Configuration
const config = {
  apiKey: process.env.PRODIGI_API_KEY,
  baseUrl: 'https://api.prodigi.com/v4.0'
};

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

// HTTP request helper
function makeRequest(endpoint, options = {}) {
  return new Promise((resolve, reject) => {
    const url = `${config.baseUrl}${endpoint}`;
    const parsedUrl = new URL(url);
    
    const requestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: {
        'X-API-Key': config.apiKey,
        'Content-Type': 'application/json',
        'User-Agent': 'ArtFramer-Production-Test/1.0',
        ...options.headers
      }
    };

    const req = https.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(jsonData);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${jsonData.message || data}`));
          }
        } catch (error) {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

async function testProductionApi() {
  log('🚀 Testing Prodigi Production API', colors.blue);
  log('═'.repeat(50));
  
  // Check API key
  if (!config.apiKey) {
    logError('PRODIGI_API_KEY environment variable not set');
    logInfo('Usage: PRODIGI_API_KEY=your-api-key node scripts/test-prodigi-production.js');
    process.exit(1);
  }
  
  if (config.apiKey === 'sandbox') {
    logWarning('Using sandbox API key for production test');
    logInfo('This will likely fail - use your real production API key');
  }
  
  try {
    // Test 1: API connectivity
    log('\n🔍 Testing API Connectivity...', colors.blue);
    try {
      const products = await makeRequest('/products?limit=5');
      logSuccess('API connection successful');
      
      if (products.products && Array.isArray(products.products)) {
        logInfo(`Found ${products.products.length} sample products`);
        
        // Show a few sample products
        products.products.slice(0, 3).forEach(product => {
          logInfo(`  - ${product.name || product.sku}: $${product.price || 'N/A'}`);
        });
      }
    } catch (error) {
      logError(`API connectivity test failed: ${error.message}`);
      throw error;
    }
    
    // Test 2: Search for frame products
    log('\n🖼️  Searching for Frame Products...', colors.blue);
    try {
      const products = await makeRequest('/products?search=frame&limit=10');
      
      if (products.products && Array.isArray(products.products)) {
        const frameProducts = products.products.filter(p => 
          (p.name && p.name.toLowerCase().includes('frame')) ||
          (p.category && p.category.toLowerCase().includes('frame'))
        );
        
        logInfo(`Found ${frameProducts.length} frame products`);
        
        frameProducts.slice(0, 5).forEach(product => {
          logInfo(`  - ${product.name}: ${product.sku} - $${product.price}`);
        });
        
        if (frameProducts.length === 0) {
          logWarning('No frame products found - check product catalog');
        }
      }
    } catch (error) {
      logWarning(`Frame product search failed: ${error.message}`);
    }
    
    // Test 3: Test specific SKU lookup
    log('\n🔍 Testing Specific SKU Lookup...', colors.blue);
    const testSkus = ['FRAME-MD-BLK-WD', 'FRAME-LG-NAT-WD'];
    
    for (const sku of testSkus) {
      try {
        const product = await makeRequest(`/products/${sku}`);
        logSuccess(`Found product ${sku}`);
        logInfo(`  Name: ${product.name}`);
        logInfo(`  Price: $${product.price} ${product.currency}`);
        if (product.dimensions) {
          logInfo(`  Dimensions: ${product.dimensions.width}x${product.dimensions.height}cm`);
        }
      } catch (error) {
        logWarning(`SKU ${sku} not found: ${error.message}`);
      }
    }
    
    // Test 4: Shipping calculation
    log('\n🚚 Testing Shipping Calculation...', colors.blue);
    try {
      const shippingResponse = await makeRequest('/shipping/calculate', {
        method: 'POST',
        body: {
          items: [{ sku: 'FRAME-MD-BLK-WD', quantity: 1 }],
          destination: {
            countryCode: 'US',
            stateOrCounty: 'CA',
            postalCode: '90210'
          }
        }
      });
      
      logSuccess('Shipping calculation successful');
      logInfo(`  Cost: $${shippingResponse.cost} ${shippingResponse.currency}`);
      logInfo(`  Service: ${shippingResponse.serviceName}`);
      logInfo(`  Estimated Days: ${shippingResponse.estimatedDays}`);
    } catch (error) {
      logWarning(`Shipping calculation failed: ${error.message}`);
    }
    
    log('\n✨ Production API Test Complete!', colors.green);
    logInfo('Your Prodigi integration appears to be working correctly.');
    
  } catch (error) {
    log('\n💥 Production API Test Failed!', colors.red);
    logError(`Error: ${error.message}`);
    
    // Provide helpful debugging info
    log('\n🔧 Debugging Information:', colors.yellow);
    logInfo(`API Key: ${config.apiKey.substring(0, 8)}...`);
    logInfo(`Base URL: ${config.baseUrl}`);
    
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testProductionApi();
}

module.exports = { testProductionApi };
