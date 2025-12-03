# Authentication Session Persistence Fix

## Problem

Users were experiencing inconsistent authentication behavior:

1. **Add to Cart in `/studio`**: Required re-login despite being authenticated
2. **Redirect from Image Modal → Studio**: Lost login session on navigation
3. **General Session Loss**: Session not persisting between page navigations

## Root Cause

The authentication session persistence issue was caused by:

1. **Race Condition on Mount**: `CentralizedAuthProvider` only initialized session **once** on mount with empty dependency array
2. **No Cleanup Handling**: Missing `mounted` flag checks led to state updates after component unmount
3. **No Visibility Handling**: Session wasn't re-checked when users returned to the tab or switched pages
4. **Navigation Timing**: Redirects happened before session was fully persisted in localStorage

## Solution

### 1. **Enhanced Session Initialization** (`CentralizedAuthProvider.tsx`)

Added proper cleanup and mounted checks:

```typescript
useEffect(() => {
  let mounted = true;

  const initializeAuth = async () => {
    if (!mounted) return;
    // ... initialization logic
  };

  initializeAuth();

  return () => {
    mounted = false;
  };
}, []);
```

**Why this helps**: Prevents state updates after component unmounts, avoiding race conditions.

---

### 2. **Improved Auth State Change Listener**

Added mounted check to prevent updates after unmount:

```typescript
useEffect(() => {
  let mounted = true;

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (!mounted) return;
    // ... handle event
  });

  return () => {
    mounted = false;
    subscription.unsubscribe();
  };
}, [fetchProfile]);
```

**Why this helps**: Ensures auth state changes don't update unmounted components.

---

### 3. **Enhanced Session Refresh**

Improved `refreshSession` to first check localStorage before attempting refresh:

```typescript
const refreshSession = async () => {
  // First try to get the current session from localStorage
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (session) {
    // Update state immediately
    setSession(session);
    setUser(session.user);
    await fetchProfile(session.user.id);
    return;
  }

  // If no session, try to refresh
  const { data, error: refreshError } = await supabase.auth.refreshSession();
  // ... handle refresh
};
```

**Why this helps**: Prioritizes existing session over refresh, reducing unnecessary API calls.

---

### 4. **Visibility Change Handler**

Added automatic session check when user returns to the tab:

```typescript
useEffect(() => {
  const handleVisibilityChange = async () => {
    if (document.visibilityState === "visible" && isInitialized) {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session && session.user) {
        if (!user || user.id !== session.user.id) {
          // Restore session
          setSession(session);
          setUser(session.user);
          await fetchProfile(session.user.id);
        }
      }
    }
  };

  document.addEventListener("visibilitychange", handleVisibilityChange);

  return () => {
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  };
}, [isInitialized, user, fetchProfile]);
```

**Why this helps**: Restores session when user switches back to the tab, handling multi-tab scenarios.

---

### 5. **Studio Page Session Refresh**

Added explicit session refresh when navigating to `/studio`:

```typescript
// In studio/page.tsx
const { refreshSession, isInitialized } = useAuth();

useEffect(() => {
  if (isInitialized) {
    console.log("🎨 Studio: Refreshing session on page load");
    refreshSession();
  }
}, [isInitialized, refreshSession]);
```

**Why this helps**: Ensures session is fresh when landing on the studio page, especially after redirects.

---

### 6. **Navigation Delay for Session Persistence**

Added small delay before navigation to ensure session is written to localStorage:

```typescript
// In UserImageGallery.tsx, CuratedImageGallery.tsx, CreationsModal.tsx
const handleBuyAsFrame = async (image) => {
  // Set image in store
  setImage(publicUrl, image.id);

  // Small delay to ensure session persists
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Navigate to studio
  router.push("/studio");
};
```

**Why this helps**: Gives Supabase time to write session to localStorage before navigation.

---

## Files Modified

1. **`src/contexts/CentralizedAuthProvider.tsx`**
   - Added `mounted` flags to prevent state updates after unmount
   - Enhanced `refreshSession` to check localStorage first
   - Added visibility change handler for tab switching
   - Improved error handling and logging

2. **`src/app/(studio)/studio/page.tsx`**
   - Added `refreshSession` call on page mount
   - Imported `useAuth` hook

3. **`src/components/UserImageGallery.tsx`**
   - Made `handleBuyAsFrame` async
   - Added 100ms delay before navigation

4. **`src/components/CuratedImageGallery.tsx`**
   - Made `handleBuyAsFrame` async
   - Added 100ms delay before navigation

5. **`src/components/CreationsModal.tsx`**
   - Made `handleBuyAsFrame` async
   - Added 100ms delay before navigation

---

## How It Works Now

### **User Login → Add to Cart Flow**

1. User logs in via `AuthModal`
2. `CentralizedAuthProvider` receives `SIGNED_IN` event
3. Session stored in localStorage via Supabase
4. Auth context updates: `user`, `session`, `profile`
5. User clicks "Add to Cart" in studio
6. `ContextPanel` checks `user` and `session` from `useAuth()`
7. If both exist, makes API call with `session.access_token`
8. API validates token via `authenticateRequest()`
9. Cart item added successfully

### **Image Modal → Studio Redirect Flow**

1. User clicks "Order Frame" on image modal
2. `handleBuyAsFrame` sets image in studio store
3. **NEW**: Waits 100ms for session persistence
4. Navigates to `/studio` page
5. Studio page mounts → `CentralizedAuthProvider` initializes
6. Provider calls `supabase.auth.getSession()` → finds session in localStorage
7. **NEW**: Studio page calls `refreshSession()` on mount
8. Auth context populated with `user`, `session`, `profile`
9. User can add to cart without re-login

### **Tab Switch / Page Visibility**

1. User switches away from tab
2. User returns to tab
3. **NEW**: Visibility change handler fires
4. Provider checks `supabase.auth.getSession()`
5. If session exists but differs from current state, restores it
6. If no session but user was logged in, clears state
7. User remains authenticated

---

## Testing Checklist

- [ ] User logs in → session persists on page refresh
- [ ] User logs in → navigates to `/studio` → still logged in
- [ ] User clicks "Order Frame" on image → redirects to studio → still logged in
- [ ] User adds item to cart in studio → no re-login required
- [ ] User switches tabs → returns → still logged in
- [ ] User logs out → session cleared across all pages
- [ ] Multiple tabs: Login in tab 1 → switch to tab 2 → session available

---

## Technical Details

### **Session Storage**

Supabase stores the session in localStorage under the key:

```
sb-<project-ref>-auth-token
```

This localStorage item contains:

- `access_token`: JWT for API authentication
- `refresh_token`: Token for refreshing expired sessions
- `expires_at`: Timestamp when token expires
- `user`: User object with ID, email, metadata

### **Session Lifecycle**

1. **Sign In**: Supabase writes session to localStorage
2. **getSession()**: Reads from localStorage (synchronous, fast)
3. **refreshSession()**: Exchanges refresh_token for new access_token (async, slow)
4. **onAuthStateChange**: Listens for session changes across tabs

### **Why getSession() > refreshSession()**

- `getSession()`: Reads localStorage → instant
- `refreshSession()`: Makes API call → can hang for 5-10 seconds
- Our fix: Always try `getSession()` first, only refresh if needed

---

## Logging & Debugging

All auth operations are logged with emojis for easy identification:

- 🔍 **Session check**: Looking for existing session
- ✅ **Success**: Session found/restored
- ❌ **Error**: Authentication failed
- 🎧 **Listener**: Auth state change event
- 🚪 **Sign out**: User logged out
- 👁️ **Visibility**: Tab became visible
- 🎨 **Studio**: Studio page events

Check browser console for these logs to debug auth issues.

---

## Known Limitations

1. **100ms delay**: Required for session persistence, but adds slight delay to navigation
2. **Visibility API**: Not supported in very old browsers (IE11)
3. **Multiple tabs**: If user logs out in one tab, other tabs will detect on next visibility change

---

## Future Improvements

1. **Service Worker**: Could cache session and synchronize across tabs instantly
2. **Optimistic UI**: Show "Adding to cart..." immediately, handle auth in background
3. **Session Pre-warming**: Pre-fetch session on hover over navigation links
4. **Token Refresh Strategy**: Auto-refresh tokens 5 minutes before expiry
