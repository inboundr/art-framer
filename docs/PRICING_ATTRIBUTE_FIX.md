# Pricing Attribute Key Format Fix

## Issue
Attributes were being normalized to lowercase keys (e.g., `mountcolor`) before sending to Prodigi API, but Prodigi expects camelCase keys (e.g., `mountColor`).

## Root Cause
The `normalizeAttributesForMatching` function converts all keys to lowercase for consistent matching, but we were sending these normalized (lowercase) keys directly to Prodigi instead of the original camelCase keys.

## Solution
1. **Send original camelCase keys to Prodigi**: The attribute builder returns attributes with camelCase keys (`mountColor`, `paperType`, etc.), which is the format Prodigi expects.

2. **Normalize only for matching**: The normalization to lowercase is only used for generating quote keys to match quote responses back to cart items. This ensures consistent matching regardless of how Prodigi returns the attributes.

## Changes Made

### `src/lib/checkout/services/pricing.service.ts`
- Changed to send original `attributes` (camelCase) to Prodigi instead of `normalizedAttrs` (lowercase)
- Normalization is still used for quote key generation and matching

### `src/lib/checkout/services/shipping.service.ts`
- Changed to send original `attributes` (camelCase) to Prodigi instead of `normalizedAttrs` (lowercase)
- Ensures consistency with pricing service

## Attribute Format

### Sent to Prodigi (camelCase keys):
```json
{
  "mountColor": "Black",
  "paperType": "Standard canvas (SC)",
  "wrap": "black"
}
```

### Normalized for Matching (lowercase keys):
```json
{
  "mountcolor": "black",
  "papertype": "standard canvas (sc)",
  "wrap": "black"
}
```

## Testing
- Created test scripts to verify attribute normalization
- All variants of `mountColor`/`mountcolor` normalize correctly to `mountcolor` for matching
- Health endpoint test passes
- No attribute validation warnings in server logs

## Verification
- ✅ Attribute normalization works correctly for matching
- ✅ camelCase keys sent to Prodigi (as expected)
- ✅ Lowercase keys used for matching (consistent)
- ✅ Build passes without errors

