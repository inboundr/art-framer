/**
 * Analyze Pricing and Shipping from Server Logs
 * 
 * This script analyzes the actual server logs to find issues with pricing and shipping
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const logFile = '/tmp/dev-server.log';

if (!existsSync(logFile)) {
  console.log('❌ Server log file not found. Start the dev server first.');
  process.exit(1);
}

const logs = readFileSync(logFile, 'utf-8');

interface Issue {
  type: 'error' | 'warning' | 'mismatch';
  message: string;
  context: any;
}

const issues: Issue[] = [];

// Pattern 1: SKU not found errors
const skuNotFoundPattern = /SkuNotFound.*providedValue["']:["']([^"']+)["']/gi;
let match;
while ((match = skuNotFoundPattern.exec(logs)) !== null) {
  issues.push({
    type: 'error',
    message: `SKU not found: ${match[1]}`,
    context: { sku: match[1] },
  });
}

// Pattern 2: Attribute validation warnings
const attributeWarningPattern = /\[Attributes\].*not valid for (\w+)\. Valid:/gi;
const attributeWarnings: string[] = [];
while ((match = attributeWarningPattern.exec(logs)) !== null) {
  attributeWarnings.push(match[1]);
  issues.push({
    type: 'warning',
    message: `Invalid attribute value for ${match[1]}`,
    context: { attribute: match[1] },
  });
}

// Pattern 3: Price matching failures
const priceMatchPattern = /Could not find unit cost for cart item (\d+)/gi;
while ((match = priceMatchPattern.exec(logs)) !== null) {
  issues.push({
    type: 'error',
    message: `Price matching failed for cart item ${match[1]}`,
    context: { cartIndex: match[1] },
  });
}

// Pattern 4: Average price fallbacks
const avgPricePattern = /using average.*cart item (\d+)/gi;
while ((match = avgPricePattern.exec(logs)) !== null) {
  issues.push({
    type: 'warning',
    message: `Using average price fallback for cart item ${match[1]}`,
    context: { cartIndex: match[1] },
  });
}

// Pattern 5: Attribute mismatches in quote items
const quoteItemPattern = /\[Pricing\] Quote item:[\s\S]{1,500}?attributes:[\s\S]{1,200}?}/g;
const quoteItems: any[] = [];
while ((match = quoteItemPattern.exec(logs)) !== null) {
  try {
    const jsonMatch = match[0].match(/attributes:\s*({[^}]+})/);
    if (jsonMatch) {
      const attrs = JSON.parse(jsonMatch[1].replace(/'/g, '"'));
      quoteItems.push(attrs);
    }
  } catch (e) {
    // Ignore parse errors
  }
}

// Pattern 6: Mapped quote items
const mappedPattern = /\[Pricing\] Mapped quote item to unit cost: ([^=]+) = ([\d.]+)/g;
const mappedItems: Array<{ key: string; cost: number }> = [];
while ((match = mappedPattern.exec(logs)) !== null) {
  mappedItems.push({
    key: match[1].trim(),
    cost: parseFloat(match[2]),
  });
}

// Pattern 7: Mapped cart items
const cartItemPattern = /\[Pricing\] Mapped cart item (\d+) to unit cost: ([\d.]+) \(quoteKey: ([^)]+)\)/g;
const cartMappings: Array<{ index: number; cost: number; key: string }> = [];
while ((match = cartItemPattern.exec(logs)) !== null) {
  cartMappings.push({
    index: parseInt(match[1]),
    cost: parseFloat(match[2]),
    key: match[3],
  });
}

// Pattern 8: Attribute normalization issues
const attrNormalizationPattern = /mountcolor|mountColor/gi;
const hasMountColorIssues = attrNormalizationPattern.test(logs);
if (hasMountColorIssues) {
  issues.push({
    type: 'warning',
    message: 'Potential mountColor case sensitivity issues detected',
    context: {},
  });
}

// Analysis
console.log('📊 Pricing and Shipping Analysis from Server Logs\n');
console.log('='.repeat(80));

console.log(`\n🔍 Found ${issues.length} issues:`);
console.log(`   Errors: ${issues.filter(i => i.type === 'error').length}`);
console.log(`   Warnings: ${issues.filter(i => i.type === 'warning').length}`);

if (issues.length > 0) {
  console.log('\n📋 Issues:');
  issues.forEach((issue, i) => {
    const icon = issue.type === 'error' ? '❌' : '⚠️';
    console.log(`   ${i + 1}. ${icon} ${issue.message}`);
    if (Object.keys(issue.context).length > 0) {
      console.log(`      Context: ${JSON.stringify(issue.context)}`);
    }
  });
}

console.log(`\n📦 Quote Items Found: ${quoteItems.length}`);
if (quoteItems.length > 0) {
  console.log('   Sample attributes:');
  quoteItems.slice(0, 3).forEach((attrs, i) => {
    console.log(`   ${i + 1}. ${JSON.stringify(attrs)}`);
  });
}

console.log(`\n💰 Mapped Quote Items: ${mappedItems.length}`);
if (mappedItems.length > 0) {
  console.log('   Sample mappings:');
  mappedItems.slice(0, 5).forEach((item, i) => {
    console.log(`   ${i + 1}. ${item.key.substring(0, 60)}... = $${item.cost.toFixed(2)}`);
  });
}

console.log(`\n🛒 Cart Item Mappings: ${cartMappings.length}`);
if (cartMappings.length > 0) {
  console.log('   Sample mappings:');
  cartMappings.slice(0, 5).forEach((item, i) => {
    console.log(`   ${i + 1}. Item ${item.index}: $${item.cost.toFixed(2)} (key: ${item.key.substring(0, 40)}...)`);
  });
}

// Check for attribute key consistency
const allAttrKeys = new Set<string>();
quoteItems.forEach(attrs => {
  Object.keys(attrs).forEach(key => allAttrKeys.add(key.toLowerCase()));
});

console.log(`\n🔑 Unique Attribute Keys Found: ${Array.from(allAttrKeys).sort().join(', ')}`);

// Check for mountColor case issues
const mountColorVariants = new Set<string>();
const mountColorPattern = /["']mount[_-]?color["']/gi;
let mountMatch;
while ((mountMatch = mountColorPattern.exec(logs)) !== null) {
  mountColorVariants.add(mountMatch[0]);
}

if (mountColorVariants.size > 1) {
  console.log(`\n⚠️  MountColor case inconsistency detected:`);
  Array.from(mountColorVariants).forEach(variant => {
    console.log(`   - ${variant}`);
  });
  issues.push({
    type: 'error',
    message: 'mountColor attribute has inconsistent casing',
    context: { variants: Array.from(mountColorVariants) },
  });
}

// Summary
console.log('\n' + '='.repeat(80));
console.log('\n📊 Summary:');
console.log(`   Total Issues: ${issues.length}`);
console.log(`   Critical Errors: ${issues.filter(i => i.type === 'error').length}`);
console.log(`   Warnings: ${issues.filter(i => i.type === 'warning').length}`);

if (issues.filter(i => i.type === 'error').length > 0) {
  console.log('\n❌ Critical issues found that need fixing!');
  process.exit(1);
} else {
  console.log('\n✅ No critical errors found in logs.');
}

