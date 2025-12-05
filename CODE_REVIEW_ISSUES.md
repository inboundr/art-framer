# Code Review - Issues Found

## Critical Issues

### 1. ❌ Cart/Checkout NOT Using Unified Component
**Problem**: CheckoutFlow and ShoppingCart still have inline pricing display code instead of using the unified `PricingDisplay` component.

**Location**:
- `src/components/CheckoutFlow.tsx` (lines 1297-1361)
- `src/components/ShoppingCart.tsx` (lines 300-341)

**Impact**: Duplicated code, inconsistent UI, harder to maintain

### 2. ❌ formatPrice Using require() Instead of Import
**Problem**: CheckoutFlow and ShoppingCart use `require('@/lib/prodigi-v2/utils')` instead of proper ES6 import.

**Location**:
- `src/components/CheckoutFlow.tsx` (line 580)
- `src/components/ShoppingCart.tsx` (line 69)

**Impact**: 
- Inconsistent with studio (which uses proper import)
- Runtime dependency resolution instead of compile-time
- Potential bundle size issues

### 3. ❌ Unified API Endpoint Not Used
**Problem**: Created `/api/shared/pricing` but nothing uses it. Studio still uses `/api/studio/pricing`, cart uses `/api/v2/checkout/cart`.

**Impact**: Duplicated API logic, not actually unified

### 4. ❌ Cart Service Bug: Average Price Calculation
**Problem**: Cart service calculates average price per item, which is wrong when cart has different items with different prices.

**Location**: `src/lib/checkout/services/cart.service.ts` (lines 410-426)

**Example Bug**:
- Item 1: $50 (quantity 1)
- Item 2: $100 (quantity 1)
- Current code: Both items show $75 (average)
- Should be: Item 1 = $50, Item 2 = $100

**Impact**: Incorrect item prices displayed in cart

### 5. ❌ Different Pricing Calculation Approaches
**Problem**: Studio and Cart use different services:
- Studio: `/api/studio/pricing` → uses `prodigiSDK` directly
- Cart: `PricingService` class → uses `QuotesAPI` directly

**Impact**: Different logic, potential inconsistencies

## Medium Issues

### 6. ⚠️ Missing Individual Item Pricing
**Problem**: Cart service gets combined quote for all items, then divides by quantity. This doesn't work for different items.

**Solution Needed**: Get individual quotes per item, or use Prodigi's combined quote properly.

### 7. ⚠️ Currency Inconsistency
**Problem**: Some places use `totals.currency`, others use `getDisplayCurrency()`, others hardcode 'USD'.

## Fixes Needed

1. Replace `require()` with proper `import` statements
2. Replace inline pricing display with unified `PricingDisplay` component
3. Fix cart service to get individual item prices correctly
4. Consider migrating to unified API endpoint (or ensure both use same logic)

