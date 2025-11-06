# Flow Analysis Summary - Critical Issues Found

After analyzing all flows in detail, here are the critical issues that could cause intermittent failures:

## Critical Issues

### 1. **Session Timing Issues** ⚠️ HIGH PRIORITY

**Problem**: Sessions may expire or become stale during long operations, causing authentication failures.

**Affected Flows**:

- Add to Cart (product creation → cart addition takes time)
- Checkout (address entry → shipping calculation → checkout session creation)
- Image Loading (initial load → pagination)

**Root Cause**:

- Sessions are cached in React state
- Long operations may exceed session validity
- Fresh session is only fetched when needed, but timing is critical

**Solution**:

```typescript
// Always get fresh session before critical operations
const getFreshSession = async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
};

// Use before API calls
const session = await getFreshSession();
```

**Recommendation**: Implement session refresh interceptor that automatically refreshes expired sessions.

---

### 2. **Cookie Synchronization Race Conditions** ⚠️ HIGH PRIORITY

**Problem**: Cookies may not be synced to localStorage when API calls are made, causing authentication failures.

**Affected Flows**:

- All API calls immediately after login
- Page refresh scenarios
- Initial page load

**Root Cause**:

- Supabase SSR stores sessions in cookies
- Browser client needs to sync cookies to localStorage
- There's a timing gap between cookie setting and localStorage sync

**Solution**:

- Wait for session sync before making API calls
- Use Authorization header as primary auth method (more reliable than cookies)
- Implement retry logic with exponential backoff

**Recommendation**: Remove dependency on cookie sync and rely primarily on Authorization headers.

---

### 3. **Multiple Simultaneous API Calls** ⚠️ MEDIUM PRIORITY

**Problem**: Rapid user actions (e.g., clicking "Add to Cart" multiple times) can cause race conditions.

**Affected Flows**:

- Add to Cart (multiple clicks)
- Checkout (multiple submit clicks)
- Image pagination (scroll triggers)

**Root Cause**:

- No request deduplication
- No loading state management
- State updates not synchronized

**Solution**:

```typescript
const [isProcessing, setIsProcessing] = useState(false);

const handleAddToCart = async () => {
  if (isProcessing) return; // Prevent duplicate calls
  setIsProcessing(true);
  try {
    // ... add to cart logic
  } finally {
    setIsProcessing(false);
  }
};
```

**Recommendation**: Implement request deduplication and loading states for all critical operations.

---

### 4. **Webhook Idempotency** ⚠️ MEDIUM PRIORITY

**Problem**: Stripe may send duplicate webhook events, causing duplicate orders or errors.

**Affected Flows**:

- Stripe webhook processing
- Order creation
- Cart clearing

**Root Cause**:

- No idempotency checks
- Duplicate webhook events processed multiple times
- Cart items may already be deleted

**Solution**:

```typescript
// Check if order already exists
const { data: existingOrder } = await supabase
  .from("orders")
  .select("id")
  .eq("stripe_session_id", session.id)
  .single();

if (existingOrder) {
  console.log("Order already processed, skipping");
  return;
}
```

**Recommendation**: Implement idempotency checks for all webhook handlers.

---

### 5. **Prodigi API Failures** ⚠️ MEDIUM PRIORITY

**Problem**: Prodigi API failures cause orders to be stuck in pending state.

**Affected Flows**:

- Prodigi order creation
- Order fulfillment

**Root Cause**:

- Prodigi API may be down or rate-limited
- Retry mechanism may exhaust all retries
- No manual intervention mechanism

**Solution**:

- Implement exponential backoff retry
- Add manual retry button in admin panel
- Monitor retry queue and alert on failures

**Recommendation**: Implement better retry logic and monitoring.

---

### 6. **Image URL Conversion Failures** ⚠️ LOW PRIORITY

**Problem**: Storage paths may not convert to public URLs correctly, causing Prodigi order failures.

**Affected Flows**:

- Prodigi order creation
- Image display

**Root Cause**:

- Storage paths need conversion to public URLs
- Bucket configuration may be incorrect
- Image URLs may be invalid

**Solution**:

- Validate image URLs before sending to Prodigi
- Add fallback mechanisms
- Log conversion failures for debugging

**Recommendation**: Add comprehensive image URL validation and error handling.

---

## Recommended Fixes (Priority Order)

### Priority 1: Fix Session Management

1. Always get fresh session before API calls
2. Implement automatic session refresh
3. Remove dependency on cookie sync timing

### Priority 2: Add Request Deduplication

1. Prevent duplicate API calls
2. Add loading states to buttons
3. Implement request queue for critical operations

### Priority 3: Fix Webhook Idempotency

1. Check if order already exists before creating
2. Handle duplicate webhook events gracefully
3. Add idempotency keys to webhook processing

### Priority 4: Improve Error Handling

1. Add comprehensive error logging
2. Implement retry logic with exponential backoff
3. Add user-friendly error messages

### Priority 5: Add Monitoring

1. Track API call success rates
2. Monitor session expiration rates
3. Alert on webhook failures
4. Track Prodigi order creation success rates

---

## Testing Recommendations

1. **Session Expiration Tests**: Test behavior when session expires during operations
2. **Race Condition Tests**: Test rapid user actions (multiple clicks)
3. **Webhook Duplicate Tests**: Test handling of duplicate webhook events
4. **Prodigi Failure Tests**: Test behavior when Prodigi API is down
5. **Cookie Sync Tests**: Test behavior immediately after login/refresh

---

## Code Changes Needed

### 1. Session Management Utility

```typescript
// lib/utils/session.ts
export async function getFreshSession(): Promise<Session | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

export async function ensureValidSession(): Promise<Session> {
  let session = await getFreshSession();
  if (!session || isExpired(session)) {
    const {
      data: { session: refreshed },
    } = await supabase.auth.refreshSession();
    if (!refreshed) throw new Error("Unable to refresh session");
    session = refreshed;
  }
  return session;
}
```

### 2. Request Deduplication Hook

```typescript
// hooks/useRequestDeduplication.ts
export function useRequestDeduplication() {
  const pendingRequests = useRef<Map<string, Promise<any>>>(new Map());

  const deduplicate = async <T>(
    key: string,
    request: () => Promise<T>
  ): Promise<T> => {
    if (pendingRequests.current.has(key)) {
      return pendingRequests.current.get(key)!;
    }

    const promise = request().finally(() => {
      pendingRequests.current.delete(key);
    });

    pendingRequests.current.set(key, promise);
    return promise;
  };

  return { deduplicate };
}
```

### 3. Webhook Idempotency

```typescript
// In webhook handler
async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
  supabase: any
) {
  // Check if already processed
  const { data: existingOrder } = await supabase
    .from("orders")
    .select("id")
    .eq("stripe_session_id", session.id)
    .single();

  if (existingOrder) {
    console.log("Order already processed:", existingOrder.id);
    return { success: true, orderId: existingOrder.id };
  }

  // ... continue with order creation
}
```

---

## Conclusion

The intermittent failures are primarily caused by:

1. **Session timing issues** (most critical)
2. **Cookie synchronization race conditions**
3. **Lack of request deduplication**
4. **Missing webhook idempotency**

Addressing these issues in priority order should significantly improve system reliability.
