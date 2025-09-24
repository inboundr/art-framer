# Prodigi API Validation Guide

This document explains how to validate all frame options against the Prodigi API to ensure our product mappings are correct and all options are available.

## Overview

The validation script (`scripts/validate-prodigi.js`) performs comprehensive testing of:

- ✅ API connectivity and authentication
- ✅ Product catalog validation
- ✅ Frame option availability (sizes, styles, materials)
- ✅ Product details and specifications
- ✅ Pricing validation
- ✅ Shipping cost calculations
- ✅ Order creation and management (sandbox only)

## Frame Options We Validate

### Sizes

- **Small**: 8" x 10" (20.32 x 25.4 cm)
- **Medium**: 12" x 16" (30.48 x 40.64 cm)
- **Large**: 16" x 20" (40.64 x 50.8 cm)
- **Extra Large**: 20" x 24" (50.8 x 60.96 cm)

### Styles & Materials

- **Black Wood**: Classic black wooden frame
- **White Wood**: Clean white wooden frame
- **Natural Wood**: Natural wood finish
- **Gold Wood**: Elegant gold-finished frame
- **Silver Metal**: Modern silver metal frame
- **Natural Bamboo**: Eco-friendly bamboo frame

### Expected Price Ranges (USD)

- Small: $25 - $40
- Medium: $35 - $60
- Large: $55 - $90
- Extra Large: $80 - $120

## Running the Validation

### Prerequisites

1. **Environment Variables**:

   ```bash
   # For sandbox testing (recommended)
   export PRODIGI_API_KEY="sandbox"
   export PRODIGI_ENVIRONMENT="sandbox"

   # For production testing (use your actual API key)
   export PRODIGI_API_KEY="your-actual-api-key"
   export PRODIGI_ENVIRONMENT="production"
   ```

2. **Node.js**: Ensure you have Node.js installed (v16+ recommended)

### Running the Tests

#### Option 1: Using npm scripts (Recommended)

```bash
# Test against sandbox environment (safe for testing)
npm run validate-prodigi

# Test against production environment (requires real API key)
npm run validate-prodigi:prod
```

#### Option 2: Direct execution

```bash
# Sandbox testing
PRODIGI_API_KEY=sandbox node scripts/validate-prodigi.js

# Production testing
PRODIGI_API_KEY=your-key PRODIGI_ENVIRONMENT=production node scripts/validate-prodigi.js
```

## What the Validation Tests

### 1. API Connection Test

- Verifies API endpoint accessibility
- Tests authentication with provided API key
- Confirms environment configuration

### 2. Product Catalog Validation

- Fetches all available products from Prodigi
- Validates that all our frame SKUs exist
- Checks product specifications match our expectations

### 3. Product Details Validation

- Retrieves detailed information for each frame option
- Validates dimensions, weights, and descriptions
- Checks for product images and metadata

### 4. Pricing Validation

- Confirms prices are within expected ranges
- Validates currency settings (USD)
- Checks for any pricing discrepancies

### 5. Shipping Calculations

- Tests shipping cost calculations for different regions:
  - US West Coast (CA)
  - US East Coast (NY)
  - Canada (ON)
  - United Kingdom (GB)
- Validates shipping services and estimated delivery times

### 6. Order Management (Sandbox Only)

- Creates test orders to validate order flow
- Tests order retrieval and status checking
- Tests order cancellation (sandbox only)

## Understanding the Results

### Success Indicators ✅

- Green checkmarks indicate successful validations
- All expected products found and validated
- Pricing within acceptable ranges
- Shipping calculations working correctly

### Warnings ⚠️

- Yellow warnings indicate potential issues that need attention
- Examples: Price outside expected range, missing product images
- These don't break functionality but should be investigated

### Errors ❌

- Red errors indicate critical issues that must be fixed
- Examples: Missing products, API connection failures
- These will prevent proper functionality in production

### Sample Output

```
🚀 Starting Prodigi API Validation
══════════════════════════════════════════════════

🔍 Testing API Connection...
✅ API connection successful
ℹ️  Environment: sandbox
ℹ️  Base URL: https://api.sandbox.prodigi.com/v4.0

📦 Validating Product Catalog...
ℹ️  Found 156 products in catalog
ℹ️  Found 24 frame products
✅ Found product: FRAME-MD-BLK-WD
✅   Dimensions match: 30.48x40.64cm
✅   Price in range: $39.99

🚚 Validating Shipping Calculations...
Testing shipping to US West Coast...
✅ Shipping calculated for US West Coast
ℹ️    Cost: $9.99 USD
ℹ️    Service: Standard Shipping
ℹ️    Estimated Days: 5-7

📋 VALIDATION SUMMARY
══════════════════════════════════════════════════
ℹ️  Total Frame Options: 9
✅ Validated Products: 9
✨ Validation Complete!
```

## Validation Report

The script generates a detailed JSON report saved as `prodigi-validation-report.json` containing:

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "environment": "sandbox",
  "summary": {
    "totalFrameOptions": 9,
    "validatedProducts": 9,
    "missingProducts": 0
  },
  "results": [...],
  "recommendations": [...]
}
```

## Troubleshooting Common Issues

### API Connection Failures

```bash
❌ API connection failed: HTTP 401: Unauthorized
```

**Solution**: Check your API key configuration

- For sandbox: Use `PRODIGI_API_KEY=sandbox`
- For production: Use your actual Prodigi API key

### Missing Products

```bash
❌ Missing product: FRAME-LG-NAT-BM
```

**Solution**: Update the product SKU mapping in `src/lib/prodigi.ts`

### Price Range Warnings

```bash
⚠️  Price outside expected range: $75.99 (expected $55-$90)
```

**Solution**: Update the expected price ranges or investigate pricing changes

### Shipping Calculation Failures

```bash
⚠️  Shipping calculation failed for Canada: HTTP 400: Invalid destination
```

**Solution**: Check address format requirements for international shipping

## Integration with CI/CD

Add validation to your deployment pipeline:

```yaml
# .github/workflows/validate-prodigi.yml
name: Validate Prodigi Integration

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  validate-prodigi:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "18"
      - run: npm ci
      - run: npm run validate-prodigi
        env:
          PRODIGI_API_KEY: sandbox
          PRODIGI_ENVIRONMENT: sandbox
```

## Updating Frame Options

When adding new frame options:

1. **Update the app configuration**:
   - Add to `FRAME_OPTIONS` in `src/components/FrameSelector.tsx`
   - Update product mappings in `src/lib/prodigi.ts`

2. **Update the validation script**:
   - Add new options to `FRAME_OPTIONS` array
   - Update expected dimensions and price ranges

3. **Run validation**:

   ```bash
   npm run validate-prodigi
   ```

4. **Review results** and fix any issues before deploying

## Best Practices

1. **Regular Validation**: Run validation weekly to catch API changes
2. **Pre-deployment**: Always validate before major releases
3. **Monitor Pricing**: Check for unexpected price changes
4. **Test Internationally**: Validate shipping to all target countries
5. **Sandbox First**: Always test in sandbox before production

## Support

For issues with the validation script or Prodigi integration:

1. Check the generated validation report
2. Review Prodigi API documentation
3. Contact Prodigi support for API-specific issues
4. Update product mappings as needed

---

**Last Updated**: January 2024  
**Script Version**: 1.0.0
