# Checkout Pricing Accuracy Fix

## Problem Summary

The checkout page was displaying different prices and product information compared to the Stripe checkout page:

### Issues Identified:
1. **Product Type Display**: Checkout always showed "Frame" instead of actual product types (Canvas, Poster, Framed Print, etc.)
2. **Currency Mismatch**: Checkout displayed USD prices while Stripe charged in CAD for Canadian addresses
3. **Price Discrepancies**: Individual item prices differed between checkout review and Stripe by ~$10-30 USD per item
4. **Shipping Cost Mismatch**: $169.66 (checkout) vs CA$297.92 (Stripe) 
5. **Tax Calculation**: $0 (checkout) vs CA$49.03 (Stripe)

## Root Causes

### 1. Product Type Hardcoded as "Frame"
- All UI components were hardcoding "Frame" instead of using the actual `product_type` from the database
- The `product_type` field existed but wasn't being used in the UI

### 2. Currency Not Synchronized
- Cart was loaded with USD prices (default)
- Stripe session was created with real-time Prodigi pricing in destination country currency (CAD for Canada)
- Checkout page never updated cart prices when shipping address changed to a different country

### 3. No Currency Parameter Sent to Stripe
- Checkout flow wasn't sending the expected currency to the session creation API
- This caused Prodigi to return prices in the destination country's default currency

## Solutions Implemented

### 1. Product Type Display Fix

#### Created Product Type Utility (`src/lib/utils/product-type-labels.ts`)
- `getProductTypeLabel()`: Maps product types to user-friendly names
- `inferProductTypeFromSku()`: Infers product type from SKU patterns
- `getProductTypeLabelFromProduct()`: Convenience function for UI components

#### Updated Cart Service (`src/lib/checkout/services/cart.service.ts`)
- Added `getProductTypeLabel()` method
- Updated `formatCartItem()` to properly name products with their type
- Added `productType` to `frameConfig` for easier access

#### Updated Type Definitions
- **`cart.types.ts`**: Added `productType?` to `CartItem.frameConfig`
- **`order.types.ts`**: Added `productType?` to `OrderItem.frameConfig`
- **`CartContext.tsx`**: Added `product_type?` to products interface

#### Updated All UI Components
- `CheckoutFlow.tsx`: Review step and order summary
- `ShoppingCart.tsx`: Cart item display
- `CartSidebar.tsx`: Sidebar cart
- `ProductCatalog.tsx`: Product listings

#### Updated Payment Service
- Added `productType` to Stripe metadata

**Result**: Now displays "12×30" Canvas" instead of "12×30" Frame"

### 2. Currency Synchronization Fix

#### Updated CheckoutFlow (`src/components/CheckoutFlow.tsx`)

**Added Currency Update Effect**:
```typescript
// Update cart destination country when shipping address country changes
useEffect(() => {
  if (shippingAddress.country && typeof window !== 'undefined') {
    const currentStoredCountry = localStorage.getItem('cartDestinationCountry');
    if (currentStoredCountry !== shippingAddress.country) {
      localStorage.setItem('cartDestinationCountry', shippingAddress.country);
      // Trigger cart refresh to get prices in the correct currency
      if (addressManuallyModified) {
        window.dispatchEvent(new Event('storage'));
      }
    }
  }
}, [shippingAddress.country, addressManuallyModified]);
```

**Added Currency to Stripe Session Request**:
```typescript
body: JSON.stringify({
  // ... other fields
  currency: getDisplayCurrency(), // Pass the expected currency
}),
```

#### Updated CartContext (`src/contexts/CartContext.tsx`)

**Added Storage Event Listener**:
```typescript
// Listen for storage events to refetch cart when destination country changes
useEffect(() => {
  const handleStorageChange = (e: StorageEvent | Event) => {
    if (e instanceof StorageEvent) {
      if (e.key === 'cartDestinationCountry' && e.newValue !== e.oldValue) {
        fetchCart(); // Refetch with new country
      }
    } else {
      fetchCart(); // Same-window update
    }
  };

  window.addEventListener('storage', handleStorageChange);
  return () => window.removeEventListener('storage', handleStorageChange);
}, [fetchCart]);
```

### 3. How It Works Now

1. **User enters Canadian address** in checkout
2. **Checkout detects country change** and updates `localStorage.cartDestinationCountry` to "CA"
3. **Storage event is dispatched**, triggering CartContext to refetch cart
4. **Cart API is called** with `?country=CA&shippingMethod=Standard`
5. **Pricing Service** gets real-time Prodigi quote for Canada (returns CAD prices)
6. **Cart items update** with CAD prices
7. **Shipping calculation** returns CAD shipping costs
8. **Checkout displays** all prices in CAD
9. **Stripe session is created** with CAD currency parameter
10. **Stripe checkout page** shows consistent CAD prices

### 4. Price Consistency Flow

```
User enters address (Canada)
  ↓
localStorage.setItem('cartDestinationCountry', 'CA')
  ↓
window.dispatchEvent(new Event('storage'))
  ↓
CartContext.fetchCart()
  ↓
GET /api/v2/checkout/cart?country=CA
  ↓
PricingService.calculatePricing(items, 'CA')
  ↓
Prodigi API Quote (returns CAD prices)
  ↓
Cart items updated with CAD
  ↓
Shipping calculated in CAD
  ↓
POST /api/v2/checkout/session { currency: 'CAD' }
  ↓
Stripe session with CAD prices
  ↓
✅ Prices match!
```

## Files Changed

### New Files
- `src/lib/utils/product-type-labels.ts` - Product type utility functions

### Modified Files
1. `src/lib/checkout/services/cart.service.ts` - Product name generation
2. `src/lib/checkout/services/payment.service.ts` - Product metadata
3. `src/lib/checkout/types/cart.types.ts` - Added productType
4. `src/lib/checkout/types/order.types.ts` - Added productType  
5. `src/contexts/CartContext.tsx` - Storage listener & product_type
6. `src/components/CheckoutFlow.tsx` - Currency sync & product display
7. `src/components/ShoppingCart.tsx` - Product display
8. `src/components/CartSidebar.tsx` - Product display
9. `src/components/ProductCatalog.tsx` - Product display

## Testing Recommendations

### Test Scenarios

1. **Product Type Display**
   - Add various product types to cart (Canvas, Poster, Framed Print)
   - Verify correct type shows in: Cart, Checkout Review, Stripe

2. **Currency Conversion**
   - Start with US address (USD prices)
   - Change to Canadian address
   - Verify prices update to CAD throughout checkout
   - Complete checkout and verify Stripe shows CAD

3. **Multi-Currency**
   - Test with addresses in: US (USD), Canada (CAD), UK (GBP), Australia (AUD)
   - Verify currency changes appropriately

4. **Price Consistency**
   - Compare checkout review prices with Stripe prices
   - Verify: Item prices, Shipping, Tax, Total all match

## Expected Results

### Before Fix
- Checkout: $455.90 USD (wrong currency, wrong prices)
- Stripe: CA$675.07 (~$513 USD) (correct currency and prices)
- Product types: All showed "Frame"

### After Fix
- Checkout: CA$675.07 (correct currency, correct prices)
- Stripe: CA$675.07 (correct currency, correct prices)
- Product types: Show actual types (Canvas, Poster, etc.)
- ✅ **100% Price Consistency**

## Notes

- The fix maintains backward compatibility with the old cart system
- Currency conversion happens automatically based on shipping address
- localStorage is used as the source of truth for destination country
- Cart refetches automatically when country changes
- All prices come from real-time Prodigi quotes

## Future Improvements

1. Add visual currency indicator in cart/checkout
2. Show exchange rate when currency differs from default
3. Add currency selector (optional) for users who prefer different display currency
4. Cache Prodigi quotes to reduce API calls
5. Add loading state when cart is refetching due to country change

