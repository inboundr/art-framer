#!/usr/bin/env node

/**
 * Prodigi Catalog Analyzer
 * 
 * This script fetches and analyzes the Prodigi catalog to understand:
 * - What frame colors are available
 * - What sizes are available for each color
 * - Price ranges
 * - Product categories
 * 
 * Usage:
 *   node scripts/analyze-prodigi-catalog.js
 *   PRODIGI_API_KEY=your-key node scripts/analyze-prodigi-catalog.js
 */

const https = require('https');

// ANSI color codes for pretty output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

function log(message, color = colors.white) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.cyan);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function logHeader(message) {
  log(`\n${'='.repeat(60)}`, colors.bright);
  log(message, colors.bright + colors.cyan);
  log('='.repeat(60), colors.bright);
}

/**
 * Fetch data from Prodigi API
 * Note: Prodigi doesn't have a "list all products" endpoint,
 * so we use their search index instead
 */
async function fetchProdigiProducts() {
  logInfo('Using Prodigi search index (Prodigi API doesn\'t have a list endpoint)');
  return fetchFromSearchIndex();
}

/**
 * Fetch from Prodigi's search index (fallback)
 */
async function fetchFromSearchIndex() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'pwintylive.search.windows.net',
      path: '/indexes/live-catalogue/docs?api-version=2016-09-01&$filter=destinationCountries/any(c:%20c%20eq%20%27US%27)&search=*&$top=1000',
      method: 'GET',
      headers: {
        'api-key': '9142D85CE18C3AE0349B1FB21956B072',
        'Accept': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.value || []);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

/**
 * Filter products to get only frames
 */
function filterFrameProducts(products) {
  return products.filter(product => {
    const hasFrameInCategory = 
      product.category?.toLowerCase().includes('wall art') ||
      product.category?.toLowerCase().includes('frame');
    
    const hasFrameInType = 
      product.productType?.toLowerCase().includes('frame');
    
    const hasFrameInSku = 
      product.sku?.toLowerCase().includes('fra-can') ||
      product.sku?.toLowerCase().includes('cfpm') ||    // Classic frame with mount
      product.sku?.toLowerCase().includes('fap') ||
      product.sku?.toLowerCase().includes('global-fra');
    
    // Prodigi uses both 'frameColour' and 'color' attributes
    const hasFrameColor = 
      (product.frameColour && Array.isArray(product.frameColour) && product.frameColour.length > 0) ||
      (product.color && Array.isArray(product.color) && product.color.length > 0) ||
      (product.attributes?.color && Array.isArray(product.attributes.color) && product.attributes.color.length > 0);

    return (hasFrameInCategory || hasFrameInType || hasFrameInSku) && hasFrameColor;
  });
}

/**
 * Analyze frame products
 */
function analyzeFrameProducts(frameProducts) {
  const analysis = {
    totalProducts: frameProducts.length,
    frameColors: new Map(),
    sizes: new Map(),
    combinations: new Map(),
    priceRanges: {},
    categories: new Set(),
    productTypes: new Set(),
  };

  frameProducts.forEach(product => {
    // Get frame color from either 'frameColour', 'color', or 'attributes.color'
    const frameColor = product.frameColour?.[0] || 
                      product.color?.[0] || 
                      product.attributes?.color?.[0];
    const size = product.size?.[0] || 
                 `${product.fullProductHorizontalDimensions}x${product.fullProductVerticalDimensions}`;
    const price = product.basePriceFrom / 100; // Convert from pence
    const category = product.category;
    const productType = product.productType;

    // Track frame colors
    if (frameColor) {
      if (!analysis.frameColors.has(frameColor)) {
        analysis.frameColors.set(frameColor, []);
      }
      analysis.frameColors.get(frameColor).push(product);
    }

    // Track sizes
    if (size) {
      if (!analysis.sizes.has(size)) {
        analysis.sizes.set(size, []);
      }
      analysis.sizes.get(size).push(product);
    }

    // Track combinations
    if (frameColor && size) {
      const key = `${frameColor}-${size}`;
      if (!analysis.combinations.has(key)) {
        analysis.combinations.set(key, []);
      }
      analysis.combinations.get(key).push(product);
    }

    // Track price ranges
    if (!analysis.priceRanges[frameColor]) {
      analysis.priceRanges[frameColor] = { min: Infinity, max: -Infinity, prices: [] };
    }
    analysis.priceRanges[frameColor].min = Math.min(analysis.priceRanges[frameColor].min, price);
    analysis.priceRanges[frameColor].max = Math.max(analysis.priceRanges[frameColor].max, price);
    analysis.priceRanges[frameColor].prices.push(price);

    // Track categories and types
    if (category) analysis.categories.add(category);
    if (productType) analysis.productTypes.add(productType);
  });

  return analysis;
}

/**
 * Display analysis results
 */
function displayAnalysis(analysis) {
  logHeader('PRODIGI FRAME CATALOG ANALYSIS');

  log(`\n📊 Total frame products found: ${colors.bright}${analysis.totalProducts}${colors.reset}`);

  // Frame Colors
  logHeader('FRAME COLORS AVAILABLE');
  const sortedColors = Array.from(analysis.frameColors.entries()).sort((a, b) => b[1].length - a[1].length);
  
  sortedColors.forEach(([color, products]) => {
    const sizes = new Set();
    products.forEach(p => {
      const size = p.size?.[0] || `${p.fullProductHorizontalDimensions}x${p.fullProductVerticalDimensions}`;
      sizes.add(size);
    });
    
    log(`\n${colors.bright}${color.toUpperCase()}${colors.reset} (${products.length} products)`);
    log(`  Sizes: ${Array.from(sizes).join(', ')}`);
    
    if (analysis.priceRanges[color]) {
      const range = analysis.priceRanges[color];
      log(`  Price range: £${range.min.toFixed(2)} - £${range.max.toFixed(2)}`);
    }
  });

  // Size Distribution
  logHeader('SIZE DISTRIBUTION');
  const sortedSizes = Array.from(analysis.sizes.entries()).sort((a, b) => b[1].length - a[1].length);
  
  sortedSizes.slice(0, 10).forEach(([size, products]) => {
    log(`  ${size.padEnd(20)} ${products.length} products`);
  });

  // Categories
  logHeader('PRODUCT CATEGORIES');
  analysis.categories.forEach(category => {
    log(`  • ${category}`);
  });

  // Product Types
  logHeader('PRODUCT TYPES');
  analysis.productTypes.forEach(type => {
    log(`  • ${type}`);
  });

  // Combinations Matrix
  logHeader('COLOR-SIZE COMBINATIONS MATRIX');
  log('\nThis shows which combinations are actually available in Prodigi:\n');
  
  const uniqueSizes = new Set();
  analysis.combinations.forEach((products, key) => {
    const [, size] = key.split('-');
    uniqueSizes.add(size);
  });

  const sizesArray = Array.from(uniqueSizes).slice(0, 10);
  const colorsArray = Array.from(analysis.frameColors.keys());

  // Header row
  log(`${'Color'.padEnd(15)} | ${sizesArray.map(s => s.padEnd(12)).join(' | ')}`);
  log('-'.repeat(15 + sizesArray.length * 14));

  colorsArray.forEach(color => {
    let row = `${color.padEnd(15)} |`;
    sizesArray.forEach(size => {
      const key = `${color}-${size}`;
      const available = analysis.combinations.has(key);
      row += ` ${(available ? '✓' : '-').padEnd(12)} |`;
    });
    log(row);
  });

  // Key Findings
  logHeader('KEY FINDINGS');
  
  const colorsWithMostSizes = sortedColors[0];
  log(`\n${colors.green}✓${colors.reset} Color with most sizes: ${colors.bright}${colorsWithMostSizes[0]}${colors.reset} (${colorsWithMostSizes[1].length} products)`);
  
  const colorsWithFewestSizes = sortedColors[sortedColors.length - 1];
  log(`${colors.yellow}⚠${colors.reset}  Color with fewest sizes: ${colors.bright}${colorsWithFewestSizes[0]}${colors.reset} (${colorsWithFewestSizes[1].length} products)`);
  
  log(`\n${colors.cyan}ℹ${colors.reset}  Total unique combinations: ${colors.bright}${analysis.combinations.size}${colors.reset}`);

  // Recommendations
  logHeader('RECOMMENDATIONS');
  log(`
1. ${colors.green}Update FrameSelector${colors.reset} to use dynamic data from Prodigi API
2. ${colors.green}Show only available combinations${colors.reset} for each frame color
3. ${colors.green}Add loading state${colors.reset} while fetching catalog
4. ${colors.green}Cache catalog data${colors.reset} for better performance
5. ${colors.green}Handle fallback${colors.reset} if API is unavailable
`);
}

/**
 * Main function
 */
async function main() {
  try {
    log(`${colors.bright}Prodigi Catalog Analyzer${colors.reset}\n`);
    
    logInfo('Fetching products from Prodigi...');
    const products = await fetchProdigiProducts();
    logSuccess(`Fetched ${products.length} total products`);

    logInfo('Filtering frame products...');
    const frameProducts = filterFrameProducts(products);
    logSuccess(`Found ${frameProducts.length} frame products`);

    if (frameProducts.length === 0) {
      logWarning('No frame products found. Check your API key or filters.');
      return;
    }

    logInfo('Analyzing frame products...');
    const analysis = analyzeFrameProducts(frameProducts);
    
    displayAnalysis(analysis);

    logHeader('DONE');
    logSuccess('Analysis complete!\n');

  } catch (error) {
    logError(`Error: ${error.message}`);
    
    // Provide helpful guidance for common errors
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      log('');
      logWarning('This usually means:');
      log('  • You\'re using a sandbox API key with production environment', colors.yellow);
      log('  • Or your API key is invalid/expired', colors.yellow);
      log('');
      logInfo('Solutions:');
      log('  1. Use sandbox environment (default): npm run analyze-catalog', colors.cyan);
      log('  2. Get a production API key from Prodigi dashboard', colors.cyan);
      log('  3. Check your PRODIGI_API_KEY in .env.local', colors.cyan);
    }
    
    console.error(error);
    process.exit(1);
  }
}

// Run the analyzer
main();

