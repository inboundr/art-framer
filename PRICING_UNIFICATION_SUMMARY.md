# Pricing System Unification Summary

## Overview
Unified the pricing system between Studio and Cart pages to use the same components, libraries, and APIs.

## Key Requirements for Accurate Pricing

### Prodigi API Requirements
- **Country (Required)**: Prodigi quotes API only needs `destinationCountryCode` (ISO 3166-1 alpha-2)
- **Full Address (Optional)**: Not required for quotes, but needed for:
  - Address validation
  - Final checkout accuracy
  - Shipping method selection

### Studio Page Requirements
- **Input**: Country only (detected from IP or user selection)
- **Output**: 
  - Real-time Prodigi pricing
  - Shipping cost range (min-max across all methods)
  - All shipping method options
  - Currency conversion
- **Use Case**: User is browsing/designing, doesn't have full address yet

### Cart/Checkout Page Requirements
- **Input**: Full shipping address (for validation and final accuracy)
- **Output**:
  - Real-time Prodigi pricing
  - Exact shipping cost per method (when address provided)
  - Address validation
  - Currency conversion
- **Use Case**: User is ready to checkout, has full address

## What Was Unified

### 1. Shared Components
- **`src/components/shared/PricingDisplay.tsx`**: Unified pricing display component
  - Works with country-only or full address
  - Shows shipping range when address not available
  - Shows exact shipping when address is available
  - Uses same `formatPrice` utility from `@/lib/prodigi-v2/utils`

### 2. Shared Libraries
Both pages now use:
- `formatPrice` from `@/lib/prodigi-v2/utils` (currency formatting)
- `currencyService` from `@/lib/currency` (currency conversion)
- `prodigiSDK` from `@/lib/prodigi-v2` (Prodigi API access)
- `buildProdigiAttributes` from `@/lib/checkout/utils/attribute-builder` (attribute building)

### 3. Unified API Endpoint
- **`src/app/api/shared/pricing/route.ts`**: Unified pricing API
  - Accepts country-only or full address
  - Returns same format for both scenarios
  - Handles currency conversion
  - Returns all shipping method options

### 4. Component Wrappers
- **Studio**: `StudioPricingDisplay` wrapper adapts studio store to unified component
- **Cart**: Can use unified component directly with cart data

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Unified Pricing System                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────┐         ┌──────────────────┐    │
│  │   Studio Page    │         │   Cart Page      │    │
│  │  (Country Only)  │         │ (Full Address)   │    │
│  └────────┬─────────┘         └────────┬─────────┘    │
│           │                            │               │
│           └────────────┬───────────────┘               │
│                        │                               │
│           ┌────────────▼────────────┐                  │
│           │  Unified PricingDisplay │                  │
│           │    Component            │                  │
│           └────────────┬────────────┘                  │
│                        │                               │
│           ┌────────────▼────────────┐                  │
│           │  /api/shared/pricing   │                  │
│           │  (or /api/studio/      │                  │
│           │   pricing for now)    │                  │
│           └────────────┬────────────┘                  │
│                        │                               │
│           ┌────────────▼────────────┐                  │
│           │   Prodigi Quotes API    │                  │
│           │  (needs country only)   │                  │
│           └────────────────────────┘                  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Benefits

1. **Consistency**: Same pricing logic, formatting, and currency handling
2. **Maintainability**: Single source of truth for pricing display
3. **Accuracy**: Both use real-time Prodigi quotes
4. **Flexibility**: Component adapts to available data (country vs full address)
5. **Code Reuse**: Shared utilities and components

## Migration Status

- ✅ Created unified `PricingDisplay` component
- ✅ Created unified pricing API endpoint
- ✅ Updated Studio to use unified component (via wrapper)
- ⏳ Cart/Checkout can be updated to use unified component (optional, current implementation works)

## Next Steps (Optional)

1. Update Cart/Checkout to use unified `PricingDisplay` component
2. Migrate Studio to use `/api/shared/pricing` instead of `/api/studio/pricing`
3. Add more shared utilities as needed

## Notes

- Prodigi quotes API **only requires country** - full address is not needed for pricing
- Full address is used for validation and final checkout accuracy
- Shipping cost range is shown when only country is available
- Exact shipping cost is shown when full address is available

