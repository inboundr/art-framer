# Prodigi V2 - Quick Start Guide

**Get started with the Prodigi Print API v4 in 5 minutes** 🚀

---

## Step 1: Configure Environment

Add to `.env.local`:

```bash
PRODIGI_API_KEY=your-sandbox-api-key-here
PRODIGI_ENVIRONMENT=sandbox
PRODIGI_CALLBACK_URL=https://yoursite.com/api/prodigi-v2/webhooks
```

**Get your API key**: [https://dashboard.prodigi.com](https://dashboard.prodigi.com)

---

## Step 2: Create Your First Order

```typescript
import { prodigiSDK } from '@/lib/prodigi-v2';

const order = await prodigiSDK.orders.create({
  merchantReference: 'MY-ORDER-001',
  shippingMethod: 'Standard',
  recipient: {
    name: 'John Doe',
    email: 'john@example.com',
    address: {
      line1: '123 Main Street',
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
      url: 'https://example.com/artwork.jpg',
    }],
  }],
});

console.log('Order created:', order.id);
console.log('Status:', order.status.stage);
```

---

## Step 3: Get a Quote First (Recommended)

```typescript
const quotes = await prodigiSDK.quotes.create({
  destinationCountryCode: 'US',
  shippingMethod: 'Standard',
  items: [{
    sku: 'GLOBAL-CAN-10x10',
    copies: 1,
    assets: [{ printArea: 'default' }],
  }],
});

// Compare shipping methods
quotes.forEach(quote => {
  console.log(
    `${quote.shipmentMethod}: ${quote.costSummary.totalCost?.amount} ${quote.costSummary.totalCost?.currency}`
  );
});

// Use the cheapest
const cheapest = quotes.sort((a, b) => 
  parseFloat(a.costSummary.totalCost?.amount || '0') - 
  parseFloat(b.costSummary.totalCost?.amount || '0')
)[0];
```

---

## Step 4: Track Orders

```typescript
// Get order status
const order = await prodigiSDK.orders.get('ord_840796');

console.log('Stage:', order.status.stage);
console.log('Details:', order.status.details);

// Check for issues
if (order.status.issues.length > 0) {
  order.status.issues.forEach(issue => {
    console.error('Issue:', issue.description);
  });
}

// Get tracking info
if (order.shipments.length > 0) {
  order.shipments.forEach(shipment => {
    if (shipment.tracking) {
      console.log('Tracking:', shipment.tracking.url);
    }
  });
}
```

---

## Step 5: Handle Webhooks

Edit `/src/app/api/prodigi-v2/webhooks/route.ts`:

```typescript
prodigiSDK.webhooks.on('order.complete', async (event, order) => {
  // Your custom logic here
  console.log(`Order ${order.id} is complete!`);
  
  // Example: Update your database
  await db.orders.update({
    where: { prodigiId: order.id },
    data: { status: 'fulfilled' },
  });
  
  // Example: Send customer email
  await sendTrackingEmail(order);
});

prodigiSDK.webhooks.on('order.error', async (event, order) => {
  // Handle errors
  console.error(`Order ${order.id} has issues:`, order.status.issues);
  
  // Alert admin
  await notifyAdmin(order);
});
```

---

## Common SKUs

| Product | SKU | Description |
|---------|-----|-------------|
| Canvas 10x10" | `GLOBAL-CAN-10x10` | Standard canvas print |
| Framed Print 16x20" | `GLOBAL-CFPM-16X20` | Framed print |
| Fine Art Print 16x24" | `GLOBAL-FAP-16X24` | Unframed art print |
| Large Frame 30x40" | `GLOBAL-FRA-CAN-30X40` | Large framed canvas |

**Find more SKUs**: [https://www.prodigi.com/products/](https://www.prodigi.com/products/)

---

## Shipping Methods

| Method | Speed | Best For |
|--------|-------|----------|
| `Budget` | 10-14 days | Cost-conscious customers |
| `Standard` | 5-7 days | Most orders (recommended) |
| `Express` | 2-3 days | Urgent orders |
| `Overnight` | 1 day | Time-critical |

---

## Product Attributes

Some products require attributes:

```typescript
{
  sku: 'GLOBAL-CAN-10x10',
  // ...
  attributes: {
    wrap: 'Black', // or 'White', 'ImageWrap', 'MirrorWrap'
  },
}
```

```typescript
{
  sku: 'GLOBAL-CFPM-16X20',
  // ...
  attributes: {
    color: 'black', // or 'white', 'natural'
  },
}
```

Get available attributes:

```typescript
const attributes = await prodigiSDK.products.getAvailableAttributes('GLOBAL-CAN-10x10');
console.log(attributes); // { wrap: ['Black', 'White', 'ImageWrap', 'MirrorWrap'] }
```

---

## Order Modifications

### Cancel an Order

```typescript
// Check if cancellation is available
const canCancel = await prodigiSDK.orderActions.canCancel('ord_840796');

if (canCancel) {
  const order = await prodigiSDK.orderActions.cancel('ord_840796');
  console.log('Order cancelled');
}
```

### Update Recipient

```typescript
await prodigiSDK.orderActions.updateRecipient('ord_840796', {
  name: 'Jane Smith',
  email: 'jane@example.com',
  address: {
    line1: '456 Oak Street',
    postalOrZipCode: '54321',
    countryCode: 'US',
    townOrCity: 'Los Angeles',
  },
});
```

### Update Shipping Method

```typescript
await prodigiSDK.orderActions.updateShippingMethod('ord_840796', 'Express');
```

---

## Error Handling

```typescript
import { 
  ProdigiValidationError,
  ProdigiRateLimitError,
  isProdigiError 
} from '@/lib/prodigi-v2';

try {
  const order = await prodigiSDK.orders.create(orderData);
} catch (error) {
  if (error instanceof ProdigiValidationError) {
    console.error('Validation errors:', error.validationErrors);
  } else if (error instanceof ProdigiRateLimitError) {
    console.error(`Rate limited. Retry after ${error.retryAfter}s`);
  } else if (isProdigiError(error)) {
    console.error('Prodigi error:', error.getUserMessage());
  } else {
    console.error('Unknown error:', error);
  }
}
```

---

## Image Requirements

| Attribute | Requirement |
|-----------|-------------|
| **Format** | JPG, PNG, TIFF, PDF |
| **DPI** | 300 DPI recommended (min 72) |
| **Color Mode** | RGB |
| **URL** | Publicly accessible HTTPS URL |
| **Max Size** | 100MB |

**Get required dimensions:**

```typescript
const dimensions = await prodigiSDK.products.getPrintAreaDimensions(
  'GLOBAL-CAN-10x10',
  'default'
);

console.log(`Required: ${dimensions.width}x${dimensions.height}px`);
```

---

## Testing

### Sandbox Environment

```bash
PRODIGI_ENVIRONMENT=sandbox
```

- **No charges**
- **No fulfillment**
- Test all features safely

### Production Environment

```bash
PRODIGI_ENVIRONMENT=production
```

- **Real charges**
- **Real fulfillment**
- Orders will be printed and shipped!

---

## Next Steps

1. **Read Full Guide**: `PRODIGI_V2_INTEGRATION_GUIDE.md`
2. **Explore API Routes**: `/src/app/api/prodigi-v2/`
3. **Check Types**: `/src/lib/prodigi-v2/types.ts`
4. **Test with Postman**: `Prodigi API V4- Public Collection.postman_collection.json`

---

## Need Help?

- **SDK Documentation**: `PRODIGI_V2_INTEGRATION_GUIDE.md`
- **Official API Docs**: https://www.prodigi.com/print-api/docs/reference/
- **Support**: support@prodigi.com

---

## Useful Links

- [Prodigi Dashboard](https://dashboard.prodigi.com)
- [Prodigi Sandbox Dashboard](https://sandbox-beta-dashboard.pwinty.com)
- [Product Catalog](https://www.prodigi.com/products/)
- [API Reference](https://www.prodigi.com/print-api/docs/reference/)

---

**Ready to go live?**

1. Get production API key
2. Change `PRODIGI_ENVIRONMENT=production`
3. Update `PRODIGI_CALLBACK_URL` to your production URL
4. Test with a real order
5. 🎉 You're live!

