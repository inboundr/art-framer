# Prodigi API v4 - Complete Integration Guide (V2)

**100% coverage of the official Prodigi Print API v4**

---

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Configuration](#configuration)
- [Core Features](#core-features)
- [API Reference](#api-reference)
- [Examples](#examples)
- [Migration from V1](#migration-from-v1)
- [Best Practices](#best-practices)
- [Error Handling](#error-handling)
- [Troubleshooting](#troubleshooting)

---

## Overview

The Prodigi V2 Integration is a complete, production-ready TypeScript SDK for the Prodigi Print API v4. It provides:

- ✅ **100% API Coverage**: All endpoints from the official Prodigi API
- ✅ **TypeScript First**: Fully typed with comprehensive interfaces
- ✅ **Enterprise Ready**: Rate limiting, retry logic, caching
- ✅ **Developer Friendly**: Intuitive API with extensive documentation
- ✅ **Production Tested**: Error handling and logging built-in

### What's New in V2

1. **Complete Order Management**
   - Create, retrieve, list orders with pagination
   - Full order action support (cancel, update recipient, shipping method, metadata)
   - Check available actions before performing them

2. **Advanced Quoting**
   - Get quotes for all shipping methods
   - Compare shipping options
   - Calculate total costs with breakdown

3. **Product Information**
   - Get complete product details
   - Calculate photobook spine widths
   - Check country availability

4. **Webhook Support**
   - Built-in webhook handler
   - Event-driven architecture
   - Easy to extend

5. **Enterprise Features**
   - Automatic retries with exponential backoff
   - Rate limiting (respects Prodigi's limits)
   - Response caching
   - Idempotency key support

---

## Quick Start

### 1. Install

```typescript
// The library is already in your project at:
// /src/lib/prodigi-v2
```

### 2. Configure

Add to your `.env` file:

```bash
# Required
PRODIGI_API_KEY=your-api-key-here
PRODIGI_ENVIRONMENT=sandbox  # or 'production'

# Optional
PRODIGI_CALLBACK_URL=https://yoursite.com/api/prodigi-v2/webhooks
PRODIGI_TIMEOUT=30000
PRODIGI_RETRIES=3
PRODIGI_ENABLE_CACHE=true
```

### 3. Use

```typescript
import { prodigiSDK } from '@/lib/prodigi-v2';

// Create an order
const order = await prodigiSDK.orders.create({
  merchantReference: 'ORDER-001',
  shippingMethod: 'Standard',
  recipient: {
    name: 'John Doe',
    address: {
      line1: '123 Main St',
      postalOrZipCode: '12345',
      countryCode: 'US',
      townOrCity: 'New York',
    },
  },
  items: [{
    sku: 'GLOBAL-CAN-10x10',
    copies: 1,
    sizing: 'fillPrintArea',
    assets: [{
      printArea: 'default',
      url: 'https://example.com/image.jpg',
    }],
  }],
});

console.log('Order created:', order.id);
```

---

## Installation

The V2 integration is already included in your project. No additional installation required.

**File Structure:**
```
/src/lib/prodigi-v2/
├── index.ts              # Main export
├── client.ts             # Core API client
├── types.ts              # TypeScript types
├── constants.ts          # Constants and configs
├── errors.ts             # Error classes
├── utils.ts              # Utility functions
├── orders.ts             # Orders API
├── order-actions.ts      # Order Actions API
├── quotes.ts             # Quotes API
├── products.ts           # Products API
└── webhooks.ts           # Webhooks handler

/src/app/api/prodigi-v2/  # Next.js API routes
├── orders/route.ts
├── orders/[orderId]/route.ts
├── orders/[orderId]/actions/route.ts
├── quotes/route.ts
├── products/[sku]/route.ts
└── webhooks/route.ts
```

---

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PRODIGI_API_KEY` | Yes | - | Your Prodigi API key |
| `PRODIGI_ENVIRONMENT` | No | `sandbox` | `sandbox` or `production` |
| `PRODIGI_CALLBACK_URL` | No | - | URL for webhook callbacks |
| `PRODIGI_TIMEOUT` | No | `30000` | Request timeout (ms) |
| `PRODIGI_RETRIES` | No | `3` | Number of retries |
| `PRODIGI_ENABLE_CACHE` | No | `true` | Enable response caching |

### Custom Configuration

```typescript
import { ProdigiSDK } from '@/lib/prodigi-v2';

const prodigi = new ProdigiSDK({
  apiKey: 'your-api-key',
  environment: 'production',
  timeout: 45000,
  retries: 5,
  enableCache: true,
  cacheTtl: 3600000, // 1 hour
  callbackUrl: 'https://yoursite.com/webhooks/prodigi',
});
```

---

## Core Features

### Orders Management

```typescript
// Create order
const order = await prodigiSDK.orders.create(orderData);

// Get order by ID
const order = await prodigiSDK.orders.get('ord_840796');

// List orders with pagination
const result = await prodigiSDK.orders.list({
  top: 25,
  skip: 0,
  status: 'Complete',
});

// Get all orders (handles pagination automatically)
const allOrders = await prodigiSDK.orders.getAll({ status: 'Complete' });

// Get order by merchant reference
const order = await prodigiSDK.orders.getByMerchantReference('ORDER-001');
```

### Order Actions

```typescript
// Check available actions
const actions = await prodigiSDK.orderActions.getActions('ord_840796');

// Cancel order
if (actions.cancel.isAvailable === 'Yes') {
  const order = await prodigiSDK.orderActions.cancel('ord_840796');
}

// Update metadata
const order = await prodigiSDK.orderActions.updateMetadata('ord_840796', {
  customerNote: 'Rush order',
  source: 'website',
});

// Update recipient
const order = await prodigiSDK.orderActions.updateRecipient('ord_840796', {
  name: 'Jane Smith',
  address: { /* new address */ },
});

// Update shipping method
const order = await prodigiSDK.orderActions.updateShippingMethod(
  'ord_840796',
  'Express'
);
```

### Quotes & Pricing

```typescript
// Get quotes for all shipping methods
const quotes = await prodigiSDK.quotes.create({
  destinationCountryCode: 'US',
  shippingMethod: 'Standard',
  items: [{
    sku: 'GLOBAL-CAN-10x10',
    copies: 2,
    attributes: { wrap: 'black' },
    assets: [{ printArea: 'default' }],
  }],
});

// Compare shipping methods
const sorted = await prodigiSDK.quotes.compareShippingMethods('US', items);
const cheapest = sorted[0];
const fastest = sorted[sorted.length - 1];

// Get total cost breakdown
const cost = await prodigiSDK.quotes.getTotalCost('US', items, 'Standard');
console.log(`Items: ${cost.items.formatted}`);
console.log(`Shipping: ${cost.shipping.formatted}`);
console.log(`Total: ${cost.total.formatted}`);
```

### Products

```typescript
// Get product details
const product = await prodigiSDK.products.get('GLOBAL-CAN-10x10');

// Get photobook spine width
const spine = await prodigiSDK.products.getPhotobookSpine({
  sku: 'BOOK-A4-P-HARD-M',
  pageCount: 50,
  destinationCountryCode: 'US',
});

// Check availability
const available = await prodigiSDK.products.isAvailableForCountry(
  'GLOBAL-CAN-10x10',
  'US'
);

// Get print area dimensions
const dimensions = await prodigiSDK.products.getPrintAreaDimensions(
  'GLOBAL-CAN-10x10',
  'default',
  { wrap: 'black' }
);
```

### Webhooks

```typescript
// Register webhook handlers
prodigiSDK.webhooks.on('order.complete', async (event, order) => {
  console.log(`Order ${order.id} completed!`);
  await sendCustomerNotification(order);
});

prodigiSDK.webhooks.on('order.shipment.shipped', async (event, order) => {
  const tracking = WebhookHelpers.getTrackingInfo(order);
  await updateOrderTracking(order.id, tracking);
});

prodigiSDK.webhooks.on('order.error', async (event, order) => {
  const issues = WebhookHelpers.getOrderIssues(order);
  await alertAdmin(order.id, issues);
});

// In your webhook route:
// /api/prodigi-v2/webhooks/route.ts (already configured!)
```

---

## API Reference

### Orders API

#### `orders.create(orderData, useIdempotency?)`
Create a new order.

**Parameters:**
- `orderData`: CreateOrderRequest
- `useIdempotency`: boolean (default: true)

**Returns:** Promise<Order>

#### `orders.get(orderId)`
Get order by ID.

**Parameters:**
- `orderId`: string (format: `ord_XXXXXX`)

**Returns:** Promise<Order>

#### `orders.list(params?)`
List orders with pagination.

**Parameters:**
- `params`: GetOrdersParams
  - `top`: number (default: 25)
  - `skip`: number (default: 0)
  - `status`: OrderStage
  - `merchantReference`: string

**Returns:** Promise<GetOrdersResponse>

#### `orders.getAll(params?, maxOrders?)`
Get all orders (handles pagination automatically).

**Parameters:**
- `params`: Omit<GetOrdersParams, 'top' | 'skip'>
- `maxOrders`: number (default: 1000)

**Returns:** Promise<Order[]>

#### `orders.getByMerchantReference(merchantReference)`
Get order by your custom reference.

**Parameters:**
- `merchantReference`: string

**Returns:** Promise<Order | null>

---

### Order Actions API

#### `orderActions.getActions(orderId)`
Get available actions for an order.

**Returns:** Promise<OrderActions>

#### `orderActions.cancel(orderId)`
Cancel an order.

**Returns:** Promise<Order>

#### `orderActions.updateMetadata(orderId, metadata)`
Update order metadata.

**Returns:** Promise<Order>

#### `orderActions.updateRecipient(orderId, recipient)`
Update recipient details.

**Returns:** Promise<Order>

#### `orderActions.updateShippingMethod(orderId, shippingMethod)`
Update shipping method.

**Returns:** Promise<Order>

#### Helper Methods:
- `canCancel(orderId)`: Promise<boolean>
- `canChangeRecipient(orderId)`: Promise<boolean>
- `canChangeShippingMethod(orderId)`: Promise<boolean>
- `canChangeMetadata(orderId)`: Promise<boolean>

---

### Quotes API

#### `quotes.create(quoteRequest)`
Create a quote.

**Returns:** Promise<Quote[]>

#### `quotes.getForShippingMethod(country, items, method)`
Get quote for specific shipping method.

**Returns:** Promise<Quote | null>

#### `quotes.compareShippingMethods(country, items)`
Compare all shipping methods (sorted by price).

**Returns:** Promise<Quote[]>

#### `quotes.getTotalCost(country, items, method)`
Get total cost breakdown.

**Returns:** Promise<CostBreakdown>

#### Helper Methods:
- `getShippingCost(country, items, method)`
- `getCheapestOption(country, items)`
- `getFastestOption(country, items)`
- `estimateDeliveryTime(method)`

---

### Products API

#### `products.get(sku)`
Get product details.

**Returns:** Promise<Product>

#### `products.getPhotobookSpine(request)`
Calculate photobook spine width.

**Returns:** Promise<PhotobookSpineResponse>

#### Helper Methods:
- `isAvailableForCountry(sku, country)`: Promise<boolean>
- `getAvailableAttributes(sku)`: Promise<Record<string, string[]>>
- `getVariantByAttributes(sku, attributes)`: Promise<ProductVariant | null>
- `getPrintAreaDimensions(sku, printArea, attributes)`: Promise<Dimensions | null>
- `getShippingCountries(sku, attributes?)`: Promise<string[]>
- `hasRequiredAttributes(sku)`: Promise<boolean>

---

### Webhooks API

#### `webhooks.on(event, handler)`
Register event handler.

#### `webhooks.off(event, handler)`
Remove event handler.

#### `webhooks.handleWebhook(payload)`
Process webhook payload.

#### `webhooks.validate(payload)`
Validate webhook payload.

**Events:**
- `order.created`
- `order.shipment.shipped`
- `order.complete`
- `order.cancelled`
- `order.error`

---

## Examples

### Complete Order Flow

```typescript
import { prodigiSDK } from '@/lib/prodigi-v2';

async function processOrder(imageUrl: string, customerData: any) {
  try {
    // 1. Get quote
    const quotes = await prodigiSDK.quotes.create({
      destinationCountryCode: customerData.country,
      shippingMethod: 'Standard',
      items: [{
        sku: 'GLOBAL-CAN-10x10',
        copies: 1,
        assets: [{ printArea: 'default' }],
      }],
    });
    
    const standardQuote = quotes.find(q => q.shipmentMethod === 'Standard')!;
    
    // 2. Create order
    const order = await prodigiSDK.orders.create({
      merchantReference: `ORDER-${Date.now()}`,
      shippingMethod: 'Standard',
      recipient: {
        name: customerData.name,
        email: customerData.email,
        address: customerData.address,
      },
      items: [{
        sku: 'GLOBAL-CAN-10x10',
        copies: 1,
        sizing: 'fillPrintArea',
        assets: [{
          printArea: 'default',
          url: imageUrl,
        }],
      }],
      metadata: {
        customerId: customerData.id,
        orderSource: 'website',
      },
    });
    
    // 3. Store order in database
    await db.orders.create({
      id: order.id,
      merchantReference: order.merchantReference,
      status: order.status.stage,
      totalCost: standardQuote.costSummary.totalCost,
    });
    
    return { success: true, order };
  } catch (error) {
    console.error('Order processing failed:', error);
    return { success: false, error };
  }
}
```

---

## Migration from V1

### Key Differences

| Feature | V1 | V2 |
|---------|-----|-----|
| Order Actions | ❌ Limited | ✅ Complete |
| Pagination | ❌ Manual | ✅ Automatic |
| Rate Limiting | ❌ None | ✅ Built-in |
| Retry Logic | ❌ Manual | ✅ Automatic |
| Webhooks | ⚠️ Basic | ✅ Event-driven |
| TypeScript | ⚠️ Partial | ✅ 100% typed |

### Migration Steps

1. **Keep V1 for existing orders**
```typescript
// Old code still works
import { prodigiClient } from '@/lib/prodigi';
```

2. **Use V2 for new features**
```typescript
// New code
import { prodigiSDK } from '@/lib/prodigi-v2';
```

3. **Gradual migration**
```typescript
// You can use both simultaneously
import { prodigiClient as v1 } from '@/lib/prodigi';
import { prodigiSDK as v2 } from '@/lib/prodigi-v2';

// Use v2 for new orders
const order = await v2.orders.create(...);

// Use v1 for old order tracking
const oldOrder = await v1.getOrder('ord_123');
```

---

## Best Practices

### 1. Always Use Idempotency Keys
```typescript
const order = await prodigiSDK.orders.create(orderData, true); // ✅ Generates key
```

### 2. Check Actions Before Performing
```typescript
const actions = await prodigiSDK.orderActions.getActions(orderId);
if (actions.cancel.isAvailable === 'Yes') {
  await prodigiSDK.orderActions.cancel(orderId);
}
```

### 3. Handle Webhooks for Order Updates
```typescript
// Don't poll - use webhooks!
prodigiSDK.webhooks.on('order.complete', updateOrderStatus);
```

### 4. Cache Product Details
```typescript
// Product details are cached automatically
const product = await prodigiSDK.products.get(sku); // Cached for 1 hour
```

### 5. Use Type Safety
```typescript
import type { Order, CreateOrderRequest } from '@/lib/prodigi-v2';

const orderData: CreateOrderRequest = { /* TypeScript will validate */ };
```

---

## Error Handling

### Error Types

```typescript
import {
  ProdigiAPIError,
  ProdigiAuthenticationError,
  ProdigiValidationError,
  ProdigiRateLimitError,
  ProdigiNotFoundError,
  isProdigiError,
} from '@/lib/prodigi-v2';

try {
  await prodigiSDK.orders.create(orderData);
} catch (error) {
  if (error instanceof ProdigiAuthenticationError) {
    // Invalid API key
  } else if (error instanceof ProdigiValidationError) {
    // Validation errors
    console.log(error.validationErrors);
  } else if (error instanceof ProdigiRateLimitError) {
    // Rate limited - retry after
    console.log(`Retry after ${error.retryAfter} seconds`);
  } else if (error instanceof ProdigiNotFoundError) {
    // Resource not found
  } else if (isProdigiError(error)) {
    // Generic Prodigi error
    console.log(error.statusCode, error.getUserMessage());
  }
}
```

---

## Troubleshooting

### Common Issues

#### 1. "Invalid API Key"
```bash
# Check your .env file
PRODIGI_API_KEY=your-actual-key-here
```

#### 2. "Order cannot be cancelled"
```typescript
// Always check actions first
const actions = await prodigiSDK.orderActions.getActions(orderId);
```

#### 3. "Product not found"
```typescript
// Verify SKU exists
const available = await prodigiSDK.products.isAvailableForCountry(sku, 'US');
```

#### 4. "Rate limit exceeded"
```typescript
// SDK handles this automatically with retries
// If still seeing errors, increase retry delay:
const prodigi = new ProdigiSDK({
  apiKey: '...',
  retryDelay: 2000, // 2 seconds instead of 1
});
```

---

## Support

- **Documentation**: [https://www.prodigi.com/print-api/docs/reference/](https://www.prodigi.com/print-api/docs/reference/)
- **Postman Collection**: `/Prodigi API V4- Public Collection.postman_collection.json`
- **Email**: support@prodigi.com

---

## License

This integration is part of your project. Prodigi API is subject to Prodigi's terms of service.

