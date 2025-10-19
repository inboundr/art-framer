# Prodigi Order Edit Window Feature

## Overview

The Prodigi Order Edit Window feature allows orders to be paused before they are sent to production, during which time they can be edited or cancelled. This feature changes the API response structure and introduces new order statuses.

## Configuration Options

When you enable the Order Edit Window in your Prodigi account, you can choose from these options:

- **None, process immediately** - Orders are processed immediately (default behavior)
- **2 hours** - Orders are paused for 2 hours before production
- **6 hours** - Orders are paused for 6 hours before production
- **24 hours** - Orders are paused for 24 hours before production
- **Pause indefinitely, until manually released** - Orders remain paused until manually released
- **Other** - Custom duration

## API Response Changes

### New Order Status: "Paused"

When the edit window is enabled, orders will initially have a status of `"Paused"` instead of `"InProgress"`. This status indicates the order is waiting in the edit window.

### Enhanced Order Response Structure

The Prodigi API now returns additional fields in order responses:

```typescript
interface ProdigiOrderResponse {
  id: string;
  status: string; // "Paused" when in edit window
  trackingNumber?: string; // null during edit window
  trackingUrl?: string; // null during edit window
  estimatedDelivery?: string; // null during edit window
  totalPrice: number;
  currency: string;
  items: Array<{
    sku: string;
    quantity: number;
    status: string; // "Paused" for items during edit window
  }>;

  // NEW: Edit window information
  editWindow?: {
    duration: string; // "2 hours", "24 hours", "indefinite", etc.
    expiresAt?: string; // ISO timestamp when edit window expires
    canEdit: boolean; // Whether order can be modified
    canCancel: boolean; // Whether order can be cancelled
    expired?: boolean; // Whether edit window has expired
  };

  // NEW: Modification history
  modifications?: Array<{
    type: string; // "quantity_change", "address_change", etc.
    field: string; // Field that was modified
    oldValue: any; // Previous value
    newValue: any; // New value
    timestamp: string; // ISO timestamp of modification
  }>;

  // NEW: Cancellation information
  cancelledAt?: string; // ISO timestamp when cancelled
  cancellationReason?: string; // Reason for cancellation
}
```

## Status Mapping

Our internal status mapping has been updated to handle the new "Paused" status:

```typescript
const statusMap: Record<string, string> = {
  InProgress: "processing",
  Complete: "shipped",
  Cancelled: "cancelled",
  OnHold: "pending",
  Error: "failed",
  Paused: "paused", // NEW: Maps to our internal 'paused' status
};
```

## New Methods Added

### 1. Check if Order Can Be Edited

```typescript
const editStatus = await prodigiClient.canEditOrder("ord_123456");
console.log(editStatus);
// {
//   canEdit: true,
//   canCancel: true,
//   editWindow: {
//     duration: '2 hours',
//     expiresAt: '2024-01-14T14:00:00Z',
//     expired: false
//   }
// }
```

### 2. Update Order During Edit Window

```typescript
const updatedOrder = await prodigiClient.updateOrder("ord_123456", {
  items: [
    {
      sku: "GLOBAL-CFPM-16X20",
      quantity: 2, // Changed from 1
      attributes: {},
    },
  ],
  shippingAddress: {
    name: "John Doe",
    address: {
      line1: "456 New St",
      postalOrZipCode: "10002",
      countryCode: "US",
      townOrCity: "New York",
      stateOrCounty: "NY",
    },
  },
});
```

### 3. Enhanced Order Status

```typescript
const orderStatus = await prodigiClient.getOrderStatus("ord_123456");
console.log(orderStatus);
// {
//   status: 'paused', // or 'processing', 'shipped', etc.
//   trackingNumber: null, // null during edit window
//   trackingUrl: null, // null during edit window
//   estimatedDelivery: null, // null during edit window
//   editWindow: {
//     duration: '2 hours',
//     expiresAt: '2024-01-14T14:00:00Z',
//     canEdit: true,
//     canCancel: true,
//     expired: false
//   },
//   modifications: [
//     {
//       type: 'quantity_change',
//       field: 'quantity',
//       oldValue: 1,
//       newValue: 2,
//       timestamp: '2024-01-14T13:15:00Z'
//     }
//   ]
// }
```

## Order Lifecycle with Edit Window

1. **Order Created** → Status: `"Paused"` (if edit window enabled)
2. **During Edit Window** → Can modify items, shipping address, or cancel
3. **Edit Window Expires** → Status changes to `"InProgress"` → Production begins
4. **Production Complete** → Status: `"Complete"` → Tracking available

## Error Handling

### Edit Window Expired

```typescript
try {
  await prodigiClient.updateOrder('ord_123456', { items: [...] });
} catch (error) {
  // Error: "Edit window has expired"
  // Order can no longer be modified
}
```

### Invalid Operations

```typescript
try {
  await prodigiClient.cancelOrder("ord_123456");
} catch (error) {
  // Error: "Order is not in a state that allows modification"
  // Order is no longer in edit window
}
```

## Implementation in Your Application

### 1. Check Order Status Before Actions

```typescript
const orderStatus = await prodigiClient.getOrderStatus(orderId);

if (orderStatus.status === "paused" && orderStatus.editWindow?.canEdit) {
  // Allow customer to modify order
  console.log("Order can be edited until:", orderStatus.editWindow.expiresAt);
} else if (orderStatus.status === "processing") {
  // Order is in production, show tracking info
  console.log("Order is being processed");
} else if (orderStatus.status === "shipped") {
  // Order is complete, show delivery info
  console.log("Order shipped, tracking:", orderStatus.trackingNumber);
}
```

### 2. Handle Order Modifications

```typescript
// Check if order can be modified
const canEdit = await prodigiClient.canEditOrder(orderId);

if (canEdit.canEdit) {
  // Show edit interface to customer
  // Allow quantity changes, address updates, etc.
} else {
  // Show message that order cannot be modified
  console.log("Order cannot be modified at this time");
}
```

### 3. Monitor Edit Window Expiration

```typescript
const orderStatus = await prodigiClient.getOrderStatus(orderId);

if (orderStatus.editWindow?.expired) {
  // Edit window has expired, order is now in production
  console.log("Edit window expired, order is now being processed");
}
```

## Testing

Comprehensive tests have been created to verify the edit window functionality:

- Order creation with different edit window durations
- Status mapping for paused orders
- Order modification during edit window
- Edit window expiration handling
- Error scenarios for expired edit windows

Run the tests with:

```bash
npm test -- src/lib/__tests__/prodigi-order-edit-window.test.ts
```

## Migration Guide

If you're enabling the edit window feature on an existing system:

1. **Update Status Handling**: Add support for the new `"paused"` status
2. **Update UI**: Show edit options when order is in edit window
3. **Update Notifications**: Handle paused status in order notifications
4. **Update Webhooks**: Ensure webhook handlers can process paused status
5. **Test Thoroughly**: Verify all order flows work with edit window enabled

## Benefits

- **Customer Flexibility**: Customers can modify orders before production
- **Reduced Returns**: Fewer incorrect orders due to last-minute changes
- **Better Customer Experience**: More control over their orders
- **Cost Savings**: Fewer wasted products from incorrect orders

## Considerations

- **Production Delays**: Orders take longer to reach production
- **Complexity**: More complex order state management
- **UI Changes**: Need to handle paused status in user interface
- **Monitoring**: Need to track edit window expiration
