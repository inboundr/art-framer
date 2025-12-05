# Session Usage Analysis & Recommendations

## Why We Use Sessions

### 1. **JWT Authentication Required**

- All v2 API endpoints (`/api/v2/checkout/*`) require JWT authentication
- The `Authorization: Bearer <token>` header is mandatory
- Without the token, API calls return `401 Unauthorized`

### 2. **Session Contains Access Token**

- `session.access_token` is the JWT needed for authenticated requests
- Token expires and needs refresh (handled by Supabase)
- Token is stored in localStorage by Supabase

### 3. **Centralized State Management**

- `CentralizedAuthProvider` manages session state globally
- All components can access session via `useAuth()` hook
- Prevents duplicate session fetches

---

## Previous Issues with Sessions

### **Problem 1: Race Conditions**

- Components tried to use `session.access_token` before it was initialized
- `CentralizedAuthProvider` initializes asynchronously
- Components mounted before session was ready → API calls failed

### **Problem 2: Session Not Persisting**

- Full page reloads (`window.location.href`) cleared React state
- Session was in localStorage but not in React context
- Components couldn't access session immediately after reload

### **Problem 3: Silent Failures**

- Components checked `if (!session?.access_token) return;`
- No user feedback when session wasn't ready
- Actions appeared to do nothing

---

## Current Session Usage Patterns

### ✅ **Good Pattern (CartContext)**

```typescript
const fetchCart = useCallback(async () => {
  if (!user) {
    setCartData(null);
    return;
  }

  // ✅ Wait for session token
  if (!session?.access_token) {
    console.log("Cart: Waiting for session to be ready...");
    return; // Don't fetch yet
  }

  // ✅ Use token in headers
  const response = await fetch(apiUrl, {
    headers: session?.access_token
      ? {
          Authorization: `Bearer ${session.access_token}`,
        }
      : {},
  });
}, [user, session]);

useEffect(() => {
  if (user && session?.access_token) {
    fetchCart(); // ✅ Only fetch when token is ready
  } else if (user && !session?.access_token) {
    console.log("Cart: User exists but session not ready, waiting...");
  }
}, [user, session?.access_token, fetchCart]);
```

**Why this works:**

- Waits for `session?.access_token` before making API calls
- Re-runs when token becomes available
- Prevents 401 errors

---

### ❌ **Problem Pattern (CartModal - Current)**

```typescript
const fetchCart = useCallback(async () => {
  if (!user) return;

  // ❌ No session token check!
  const response = await fetch("/api/v2/checkout/cart", {
    credentials: "include", // ❌ Relies on cookies, might not work
  });
}, [user, session, toast]); // ❌ session in deps but not checked

const updateQuantity = async (cartItemId: string, newQuantity: number) => {
  if (!user || !session?.access_token) return; // ✅ Check exists but...
  // ❌ Silently returns - no user feedback
};
```

**Problems:**

1. `fetchCart` doesn't check for `session?.access_token`
2. Relies on `credentials: 'include'` which might not work for JWT auth
3. Silent failures when session isn't ready
4. Inconsistent: `handleCheckout` calls `supabase.auth.getSession()` directly

---

## Issues in CartModal.tsx

### **Issue 1: fetchCart Doesn't Wait for Session**

```typescript
// Line 98-139
const fetchCart = useCallback(async () => {
  if (!user) return; // ✅ Checks user

  // ❌ NO CHECK for session?.access_token!
  const response = await fetch("/api/v2/checkout/cart", {
    credentials: "include", // ❌ Might not work without JWT
  });
}, [user, session, toast]);
```

**Problem:**

- If `session?.access_token` isn't ready, API call will fail with 401
- `credentials: 'include'` sends cookies but v2 APIs need JWT in header

### **Issue 2: Silent Failures**

```typescript
// Line 147-185
const updateQuantity = async (cartItemId: string, newQuantity: number) => {
  if (!user || !session?.access_token) return; // ❌ Silently returns
  // No user feedback!
};
```

**Problem:**

- User clicks button → nothing happens
- No error message or loading state
- User doesn't know why action failed

### **Issue 3: Inconsistent Session Access**

```typescript
// Line 222-263
const handleCheckout = async () => {
  // ❌ Calls getSession() directly instead of using context
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // ❌ Inconsistent with other functions that use context session
};
```

**Problem:**

- Different pattern from `updateQuantity` and `removeItem`
- Could get stale session if context hasn't updated
- Adds unnecessary async call

---

## Recommendations

### **1. Fix fetchCart to Wait for Session**

```typescript
const fetchCart = useCallback(async () => {
  if (!user) {
    setCartData(null);
    return;
  }

  // ✅ Wait for session token
  if (!session?.access_token) {
    console.log("CartModal: Waiting for session to be ready...");
    return; // Don't fetch yet
  }

  setLoading(true);
  try {
    const response = await fetch(
      "/api/v2/checkout/cart?country=US&shippingMethod=Standard",
      {
        credentials: "include",
        headers: {
          Authorization: `Bearer ${session.access_token}`, // ✅ Add JWT header
        },
      }
    );
    // ... rest of logic
  } finally {
    setLoading(false);
  }
}, [user, session, toast]);

useEffect(() => {
  if (isOpen && user && session?.access_token) {
    // ✅ Check token
    fetchCart();
  }
}, [isOpen, user, session?.access_token, fetchCart]); // ✅ Watch token
```

### **2. Add User Feedback for Session Issues**

```typescript
const updateQuantity = async (cartItemId: string, newQuantity: number) => {
  if (!user) {
    toast({
      title: "Authentication Required",
      description: "Please sign in to update cart items.",
      variant: "destructive",
    });
    return;
  }

  if (!session?.access_token) {
    toast({
      title: "Session Loading",
      description: "Please wait a moment and try again.",
      variant: "default",
    });
    return;
  }

  // ... rest of logic
};
```

### **3. Use Context Session Consistently**

```typescript
const handleCheckout = async () => {
  if (!user || !session?.access_token) {
    toast({
      title: "Authentication Required",
      description: "Please sign in to checkout.",
      variant: "destructive",
    });
    return;
  }

  // ✅ Use context session instead of getSession()
  const response = await fetch("/api/v2/checkout/session", {
    headers: {
      Authorization: `Bearer ${session.access_token}`, // ✅ From context
    },
    // ... rest
  });
};
```

---

## When Session Might Not Be Available

### **1. Initial Page Load**

- `CentralizedAuthProvider` initializes asynchronously
- Session might not be ready for 100-500ms
- Components should wait for `session?.access_token`

### **2. Page Refresh**

- Full page reload clears React state
- Session exists in localStorage but not in context yet
- Provider needs to read from localStorage first

### **3. Token Expiration**

- Access tokens expire (typically 1 hour)
- Supabase auto-refreshes, but there's a brief window
- Components should handle refresh gracefully

### **4. Network Issues**

- Session refresh might fail
- Components should retry or show error

---

## Best Practices

### ✅ **DO:**

1. Always check `session?.access_token` before API calls
2. Wait for token in `useEffect` dependencies
3. Provide user feedback when session isn't ready
4. Use context session consistently
5. Add loading states while waiting for session

### ❌ **DON'T:**

1. Make API calls without checking `session?.access_token`
2. Rely solely on `credentials: 'include'` for JWT auth
3. Silently fail when session isn't ready
4. Call `supabase.auth.getSession()` directly (use context)
5. Assume session is always available

---

## Conclusion

**Sessions are necessary** for v2 API authentication, but they must be handled carefully:

1. **Wait for token** before API calls
2. **Check token availability** in all auth-dependent functions
3. **Provide feedback** when session isn't ready
4. **Use context consistently** instead of direct Supabase calls
5. **Handle edge cases** (initial load, refresh, expiration)

The current `CartModal` implementation has issues that could cause silent failures. It should follow the same pattern as `CartContext` for reliability.


