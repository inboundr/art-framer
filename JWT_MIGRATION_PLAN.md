# JWT-Only Authentication Migration Plan

## Executive Summary

**Current Problem**: The app uses a complex authentication system mixing cookies and JWTs, causing intermittent failures due to:
1. Cookie-to-localStorage sync timing issues
2. Multiple fallback authentication methods causing confusion
3. Session refresh logic that sometimes hangs
4. `sessionSync.ts` making extra API calls that fail
5. Inconsistent authentication across different API routes

**Solution**: Migrate to JWT-only authentication using `Authorization: Bearer <token>` headers exclusively.

---

## Phase 1: Current Authentication Analysis

### 1.1 Authentication Patterns Found

#### Pattern A: Cookie + JWT Fallback (Most API Routes)
**Files**: `cart/route.ts`, `checkout/create-session/route.ts`, `products/route.ts`
- Try `getUser()` with cookies
- Fallback to Authorization header
- Fallback to `getSession()`
- Fallback to `refreshSession()`
- **Issues**: Complex, timing-dependent, hard to debug

#### Pattern B: JWT with Service Client (Some API Routes)
**Files**: `orders/route.ts`, `cart/shipping/route.ts`
- Try server client with cookies
- Fallback to Authorization header with service client
- **Issues**: Uses service client unnecessarily

#### Pattern C: JWT-Only (User Images - Just Updated)
**Files**: `user-images/route.ts`
- Requires Authorization header
- Direct JWT validation
- **Status**: ✅ Already migrated!

###1.2 Client-Side Token Management

#### Current State:
1. **CentralizedAuthProvider** (main auth context)
   - Stores `user`, `session`, `profile`
   - Has complex initialization with cookie sync
   - Uses `sessionSync.ts` which calls `/api/user-images` as fallback
   - 200ms delay + getUser() timeout logic

2. **Client Components Send Tokens**:
   - `CartContext`: ✅ Sends Authorization header
   - `CheckoutFlow`: ✅ Sends Authorization header
   - `UserImageGallery`: ✅ Sends Authorization header
   - `CuratedImageGallery`: ✅ Sends Authorization header
   - `OrderManagement`: ❓ Need to check

3. **Token Refresh Strategy**:
   - Supabase client auto-refreshes tokens (configured in `client.ts`)
   - Components call `getSession()` before API calls to get fresh token
   - **Issue**: Fresh token fetching adds latency and can hang

### 1.3 Server-Side Authentication

#### Current Supabase Server Client:
```typescript
// src/lib/supabase/server.ts
export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(url, key, {
    cookies: {
      getAll() { return cookieStore.getAll() },
      setAll(cookies) { /* set cookies */ }
    }
  })
}
```

**Issue**: This client expects cookies, but we want JWT-only.

**Solution**: Create a JWT-only server client that doesn't rely on cookies.

---

## Phase 2: Complete User Flows Mapped

### 2.1 Login/Signup Flow
```
User → SignupForm/LoginForm
  ↓ (signUp/signIn with email/password)
Supabase Auth API
  ↓ (returns session with JWT)
CentralizedAuthProvider
  ↓ (stores session in state + localStorage)
Client Components
  ↓ (read session.access_token)
API Routes (with Authorization: Bearer <token>)
```

**Current Issues**:
- Cookie sync delay causes initial API calls to fail
- `sessionSync.ts` makes extra `/api/user-images` calls that fail with 401

**JWT-Only Solution**:
- Login returns JWT immediately
- No cookie sync needed
- Components use JWT from localStorage directly

### 2.2 Add to Cart Flow
```
User clicks "Add to Cart"
  ↓
CuratedImageGallery/UserImageGallery
  ↓ (gets fresh session)
POST /api/curated-products (with JWT)
  ↓ (creates product)
CartContext.addToCart()
  ↓ (gets fresh session)
POST /api/cart (with JWT)
  ↓ (adds to cart)
GET /api/cart (with JWT)
  ↓ (refresh cart)
```

**Current Issues**:
- Two `getSession()` calls add latency
- If JWT expires between calls, second call fails

**JWT-Only Solution**:
- Get JWT once at start of flow
- Pass same JWT to all API calls
- If 401, refresh token once and retry

### 2.3 Checkout Flow
```
User fills checkout form
  ↓
CheckoutFlow.handleCheckout()
  ↓ (gets session with timeout)
POST /api/checkout/create-session (with JWT)
  ↓ (validates JWT, creates Stripe session)
Stripe Checkout Page
  ↓ (user pays)
Stripe redirects back
  ↓
Stripe Webhook → /api/webhooks/stripe
  ↓ (creates order)
```

**Current Issues**:
- `getSession()` with timeout can hang
- Webhook doesn't need user JWT (uses Stripe signature)

**JWT-Only Solution**:
- Get JWT from context directly (already in memory)
- No `getSession()` call needed
- Webhooks unchanged (don't use JWT)

### 2.4 Order Management Flow
```
User views orders page
  ↓
OrderManagement component
  ↓
GET /api/orders (with JWT)
  ↓ (returns user orders)
```

**Current Issues**:
- Needs to check if sends JWT

**JWT-Only Solution**:
- Always send JWT from context

### 2.5 Image Loading Flow
```
User navigates to creations page
  ↓
UserImageGallery
  ↓ (waits for session if not ready)
GET /api/user-images (with JWT)
  ↓ (returns user images)
```

**Current Issues**:
- Fixed! Already JWT-only

**JWT-Only Solution**:
- ✅ Already implemented

---

## Phase 3: Files Affected by Authentication

### 3.1 API Routes (Must Update to JWT-Only)

#### High Priority (User-Facing):
1. ✅ `/api/user-images/route.ts` - Already JWT-only
2. ❌ `/api/cart/route.ts` (GET, POST) - Remove cookie fallbacks
3. ❌ `/api/cart/[id]/route.ts` (PUT) - Remove cookie fallbacks
4. ❌ `/api/cart/shipping/route.ts` (POST) - Remove cookie fallbacks
5. ❌ `/api/products/route.ts` (GET, POST) - Remove cookie fallbacks
6. ❌ `/api/checkout/create-session/route.ts` (POST) - Remove cookie fallbacks
7. ❌ `/api/orders/route.ts` (GET) - Remove cookie fallbacks
8. ❌ `/api/orders/[id]/route.ts` (GET) - Remove cookie fallbacks
9. ❌ `/api/curated-products/route.ts` (POST) - Check & update

#### Medium Priority (Admin/Internal):
10. ❌ `/api/orders/management/route.ts` - Check & update
11. ❌ `/api/orders/[id]/status/route.ts` - Check & update
12. ❌ `/api/notifications/route.ts` - Check & update

#### Low Priority (Webhooks - No JWT):
13. ✅ `/api/webhooks/stripe/route.ts` - No auth needed (uses Stripe signature)
14. ✅ `/api/webhooks/prodigi/route.ts` - No auth needed

#### No Auth Needed:
15. `/api/curated-images/*` - Public endpoints
16. `/api/auth/signout/route.ts` - Special case (clears session)

### 3.2 Client Components (Must Always Send JWT)

#### Already Sending JWT:
1. ✅ `src/contexts/CartContext.tsx` - Sends JWT
2. ✅ `src/components/CheckoutFlow.tsx` - Sends JWT
3. ✅ `src/components/UserImageGallery.tsx` - Sends JWT
4. ✅ `src/components/CuratedImageGallery.tsx` - Sends JWT

#### Need to Check:
5. ❓ `src/components/OrderManagement.tsx` - Check if sends JWT
6. ❓ `src/components/CreationsModal.tsx` - Check if sends JWT
7. ❓ `src/components/CartModal.tsx` - Check if makes API calls

### 3.3 Auth Context/Providers (Must Simplify)

1. ❌ `src/contexts/CentralizedAuthProvider.tsx` - Remove cookie sync logic
2. ❌ `src/lib/supabase/sessionSync.ts` - DELETE FILE (causes issues)
3. ✅ `src/lib/supabase/client.ts` - Good (uses localStorage)
4. ❌ `src/lib/supabase/server.ts` - Update to not rely on cookies

### 3.4 Middleware

1. ❓ `middleware.ts` - Check if needed for JWT-only

---

## Phase 4: JWT-Only Authentication Strategy

### 4.1 Core Principles

1. **Single Source of Truth**: JWT token from `session.access_token`
2. **No Cookie Dependencies**: API routes don't read cookies
3. **Authorization Header Required**: All authenticated API calls send `Authorization: Bearer <token>`
4. **No Fallbacks**: If JWT invalid, return 401 immediately
5. **Client-Side Token Management**: Components get token from AuthContext

### 4.2 Token Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User Logs In                                              │
│    SignupForm/LoginForm → supabase.auth.signInWithPassword() │
│    Returns: { session: { access_token, refresh_token, ... } }│
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. AuthContext Stores Session                                │
│    - setSession(session)                                     │
│    - setUser(session.user)                                   │
│    - Supabase client stores in localStorage automatically    │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Component Needs to Make API Call                         │
│    - const { session } = useAuth()                           │
│    - token = session?.access_token                           │
│    - If no token, show login prompt                          │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Component Makes API Call                                  │
│    fetch('/api/endpoint', {                                  │
│      headers: { 'Authorization': `Bearer ${token}` }         │
│    })                                                         │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. API Route Validates JWT                                   │
│    const token = request.headers.get('authorization')        │
│    if (!token) return 401                                    │
│    const { user } = await supabase.auth.getUser(token)       │
│    if (!user) return 401                                     │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. Token Refresh (Automatic)                                 │
│    - Supabase client auto-refreshes before expiry           │
│    - onAuthStateChange('TOKEN_REFRESHED', session)           │
│    - AuthContext updates session automatically              │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 Standardized API Authentication Helper

```typescript
// src/lib/auth/jwtAuth.ts
import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function authenticateRequest(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      user: null,
      error: 'Missing or invalid Authorization header'
    };
  }

  const token = authHeader.substring(7);
  const supabase = await createClient();
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return {
      user: null,
      error: error?.message || 'Invalid token'
    };
  }

  return { user, error: null };
}
```

---

## Phase 5: Implementation Plan

### Step 1: Create JWT Auth Helper ✅
- Create `src/lib/auth/jwtAuth.ts`
- Standardized authentication function
- Used by all API routes

### Step 2: Update All API Routes
For each API route:
1. Remove cookie-based auth code
2. Remove `getSession()` fallback
3. Remove `refreshSession()` fallback
4. Use `authenticateRequest()` helper
5. Return 401 if no valid JWT

**Order of migration**:
1. `/api/cart/*` (3 files) - Most used
2. `/api/products/*` (2 files)
3. `/api/checkout/*` (2 files)
4. `/api/orders/*` (4 files)
5. `/api/curated-products` (1 file)
6. `/api/notifications` (1 file)

### Step 3: Simplify CentralizedAuthProvider
1. Remove `sessionSync.ts` import
2. Remove cookie sync logic
3. Remove API call fallbacks
4. Simplify initialization to just:
   ```typescript
   const { data: { session } } = await supabase.auth.getSession();
   ```
5. No delays, no retries, no fallbacks

### Step 4: Delete Unnecessary Files
1. Delete `src/lib/supabase/sessionSync.ts`
2. Clean up any imports

### Step 5: Update Client Components
1. Verify all components get token from context
2. Remove any `getSession()` calls before fetch
3. Use token from context directly

### Step 6: Update Server Client (If Needed)
- Current server client reads cookies
- May not be needed for JWT-only
- Consider if we need it at all

### Step 7: Testing
1. Test login flow
2. Test add to cart
3. Test checkout
4. Test order viewing
5. Test image loading
6. Test token refresh

### Step 8: Build & Deploy
1. Run `npm run build`
2. Fix any errors
3. Deploy to Vercel

---

## Phase 6: Benefits of JWT-Only

### 6.1 Simplicity
- **Before**: 4-5 authentication fallbacks per API route
- **After**: 1 authentication method per API route
- **Code Reduction**: ~70% less auth code

### 6.2 Reliability
- No cookie sync timing issues
- No race conditions between auth methods
- Predictable behavior

### 6.3 Performance
- No extra `getSession()` calls
- No delays for cookie sync
- Faster API responses

### 6.4 Debuggability
- Clear error messages ("Authorization header required")
- No confusing fallback chains
- Easy to trace issues

### 6.5 Security
- Token only in memory and localStorage
- No cookie-related vulnerabilities
- Clear token lifecycle

---

## Phase 7: Rollback Plan

If JWT-only causes issues:

1. **Quick Rollback**: Revert to previous commit
   ```bash
   git revert HEAD~N
   ```

2. **Partial Rollback**: Keep JWT-only for some routes
   - Keep `/api/user-images` as JWT-only
   - Add cookie fallback to critical routes

3. **Debugging**: Add comprehensive logging
   - Log token presence/absence
   - Log token validation results
   - Log where tokens come from

---

## Phase 8: Migration Checklist

### Pre-Migration
- [ ] Create JWT auth helper
- [ ] Document current auth patterns
- [ ] Identify all authenticated routes
- [ ] Create backup branch

### Migration
- [ ] Update `/api/cart/route.ts`
- [ ] Update `/api/cart/[id]/route.ts`
- [ ] Update `/api/cart/shipping/route.ts`
- [ ] Update `/api/products/route.ts`
- [ ] Update `/api/checkout/create-session/route.ts`
- [ ] Update `/api/orders/route.ts`
- [ ] Update `/api/orders/[id]/route.ts`
- [ ] Update `/api/curated-products/route.ts`
- [ ] Update `/api/orders/management/route.ts`
- [ ] Update `/api/notifications/route.ts`
- [ ] Simplify `CentralizedAuthProvider`
- [ ] Delete `sessionSync.ts`
- [ ] Verify all components send JWT

### Post-Migration
- [ ] Run full build
- [ ] Fix TypeScript errors
- [ ] Test all flows locally
- [ ] Deploy to staging
- [ ] Test on staging
- [ ] Deploy to production

---

## Estimated Timeline

- **Analysis & Planning**: ✅ Complete
- **Helper Creation**: 15 minutes
- **API Routes Update**: 2-3 hours (13 files)
- **Auth Provider Simplification**: 30 minutes
- **Component Verification**: 30 minutes
- **Testing**: 1 hour
- **Build & Deploy**: 30 minutes

**Total**: ~5-6 hours

---

## Next Steps

1. Create JWT auth helper
2. Start migrating API routes (one at a time)
3. Test after each migration
4. Simplify auth provider
5. Final build & deploy

