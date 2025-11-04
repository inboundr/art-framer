# Complete Sequence Diagrams - Art Framer Application

This document contains detailed sequence diagrams for all major flows in the application, showing every API call, state change, and interaction.

## Table of Contents

1. [User Login Flow](#1-user-login-flow)
2. [User Signup Flow](#2-user-signup-flow)
3. [Add to Cart Flow](#3-add-to-cart-flow)
4. [Checkout Flow (Complete)](#4-checkout-flow-complete)
5. [Stripe Webhook Processing](#5-stripe-webhook-processing)
6. [Prodigi Order Creation](#6-prodigi-order-creation)
7. [Image Loading Flow](#7-image-loading-flow)

---

## 1. User Login Flow

### Sequence Diagram

```mermaid
sequenceDiagram
    participant User
    participant LoginForm
    participant CentralizedAuthProvider
    participant SupabaseClient
    participant SupabaseAuth
    participant NextJSAPI
    participant Cookies

    User->>LoginForm: Enter email/password + Submit
    LoginForm->>LoginForm: Validate inputs
    LoginForm->>CentralizedAuthProvider: signIn(email, password)
    
    CentralizedAuthProvider->>SupabaseClient: supabase.auth.signInWithPassword()
    SupabaseClient->>SupabaseAuth: POST /auth/v1/token
    SupabaseAuth-->>SupabaseClient: { session, user }
    
    SupabaseClient->>Cookies: Set auth cookies (sb-*)
    SupabaseClient-->>CentralizedAuthProvider: { data: { session, user }, error: null }
    
    CentralizedAuthProvider->>CentralizedAuthProvider: onAuthStateChange('SIGNED_IN')
    CentralizedAuthProvider->>CentralizedAuthProvider: setUser(user)
    CentralizedAuthProvider->>CentralizedAuthProvider: setSession(session)
    CentralizedAuthProvider->>CentralizedAuthProvider: fetchProfile(userId)
    
    CentralizedAuthProvider->>NextJSAPI: GET /api/profiles (if needed)
    NextJSAPI->>SupabaseClient: createClient() [reads cookies]
    SupabaseClient->>Cookies: Read cookies
    Cookies-->>SupabaseClient: Auth cookies
    SupabaseClient->>SupabaseAuth: Validate session
    SupabaseAuth-->>SupabaseClient: Valid user
    NextJSAPI-->>CentralizedAuthProvider: Profile data
    
    CentralizedAuthProvider->>CentralizedAuthProvider: setProfile(profile)
    CentralizedAuthProvider->>CentralizedAuthProvider: setIsInitialized(true)
    CentralizedAuthProvider->>CentralizedAuthProvider: setLoading(false)
    
    CentralizedAuthProvider-->>LoginForm: { error: null }
    LoginForm->>User: Show success / Close modal
    
    Note over CentralizedAuthProvider: Session synced to localStorage<br/>by Supabase client
```

### Key Points:
- Cookies are set automatically by Supabase
- Session is synced to localStorage by Supabase client
- `onAuthStateChange` listener updates React state
- Profile is fetched after successful authentication

### Potential Issues:
1. **Cookie sync timing**: If cookies aren't synced to localStorage fast enough, subsequent API calls may fail
2. **Session initialization**: `initializeAuth()` runs on every page load, may conflict with login

---

## 2. User Signup Flow

### Sequence Diagram

```mermaid
sequenceDiagram
    participant User
    participant SignupForm
    participant CentralizedAuthProvider
    participant SupabaseClient
    participant SupabaseAuth
    participant EmailService

    User->>SignupForm: Enter email/password/username + Submit
    SignupForm->>SignupForm: Validate inputs (password match, length)
    SignupForm->>SignupForm: onSignupStart() callback
    SignupForm->>CentralizedAuthProvider: signUp(email, password, metadata)
    
    CentralizedAuthProvider->>SupabaseClient: supabase.auth.signUp()
    SupabaseClient->>SupabaseAuth: POST /auth/v1/signup
    SupabaseAuth->>EmailService: Send confirmation email
    SupabaseAuth-->>SupabaseClient: { user, session: null }
    Note over SupabaseAuth: Email confirmation required
    
    SupabaseClient-->>CentralizedAuthProvider: { data: { user, session: null }, error: null }
    
    CentralizedAuthProvider->>CentralizedAuthProvider: setUser(user)
    CentralizedAuthProvider->>CentralizedAuthProvider: setSession(null)
    Note over CentralizedAuthProvider: Session is null until email confirmed
    
    CentralizedAuthProvider-->>SignupForm: { error: null }
    SignupForm->>SignupForm: setSuccess(true)
    SignupForm->>User: Show "Check Your Email" message
    
    Note over User: User clicks email confirmation link
    
    User->>SupabaseAuth: Click confirmation link
    SupabaseAuth->>SupabaseAuth: Verify token
    SupabaseAuth->>SupabaseClient: Create session
    SupabaseClient->>SupabaseClient: onAuthStateChange('SIGNED_IN')
    
    SupabaseClient->>CentralizedAuthProvider: Auth state change event
    CentralizedAuthProvider->>CentralizedAuthProvider: setSession(session)
    CentralizedAuthProvider->>CentralizedAuthProvider: setUser(user)
    CentralizedAuthProvider->>CentralizedAuthProvider: fetchProfile(userId)
```

### Key Points:
- Session is `null` until email is confirmed
- Profile creation may happen asynchronously
- User can't access protected routes until email confirmed

### Potential Issues:
1. **Email confirmation delay**: User may try to use app before confirming email
2. **Profile creation timing**: Profile might not exist when user first logs in

---

## 3. Add to Cart Flow

### Sequence Diagram

```mermaid
sequenceDiagram
    participant User
    participant UserImageGallery/CuratedImageGallery
    participant FrameSelector
    participant CartContext
    participant SupabaseClient
    participant ProductsAPI
    participant CartAPI
    participant SupabaseDB

    User->>FrameSelector: Select frame size/style/material
    FrameSelector->>UserImageGallery: onFrameSelect(frame)
    UserImageGallery->>UserImageGallery: handleAddToCart(frame)
    
    UserImageGallery->>UserImageGallery: Check user/session
    alt Session not available
        UserImageGallery->>SupabaseClient: getSession()
        SupabaseClient-->>UserImageGallery: freshSession
    end
    
    UserImageGallery->>ProductsAPI: POST /api/products<br/>(imageId, frameSize, frameStyle, frameMaterial, price)
    
    ProductsAPI->>ProductsAPI: Authenticate (cookies/header)
    alt Authentication fails
        ProductsAPI-->>UserImageGallery: 401 Unauthorized
        UserImageGallery->>User: Show auth error
    else Authentication succeeds
        ProductsAPI->>SupabaseDB: Check if product exists
        alt Product exists
            SupabaseDB-->>ProductsAPI: Existing product
        else Product doesn't exist
            ProductsAPI->>SupabaseDB: Create product record
            SupabaseDB-->>ProductsAPI: New product
        end
        ProductsAPI-->>UserImageGallery: { product: { id, ... } }
    end
    
    UserImageGallery->>CartContext: addToCart(productId, quantity)
    
    CartContext->>CartContext: Check user
    alt No user
        CartContext-->>UserImageGallery: false
        UserImageGallery->>User: Show auth error
    else User exists
        CartContext->>SupabaseClient: getSession() [fresh session]
        SupabaseClient-->>CartContext: freshSession
        
        CartContext->>CartAPI: POST /api/cart<br/>Authorization: Bearer {token}
        
        CartAPI->>CartAPI: Authenticate (multiple methods)
        Note over CartAPI: Method 1: Cookie auth<br/>Method 2: Authorization header<br/>Method 3: getSession()<br/>Method 4: refreshSession()
        
        alt Authentication fails
            CartAPI-->>CartContext: 401 Unauthorized
            CartContext-->>UserImageGallery: false
        else Authentication succeeds
            CartAPI->>SupabaseDB: Check if cart item exists
            alt Cart item exists
                CartAPI->>SupabaseDB: UPDATE cart_items SET quantity = quantity + 1
            else Cart item doesn't exist
                CartAPI->>SupabaseDB: INSERT cart_items (user_id, product_id, quantity)
            end
            SupabaseDB-->>CartAPI: Cart item data
            CartAPI-->>CartContext: { cartItem, message }
        end
        
        CartContext->>CartContext: fetchCart() [refresh cart]
        CartContext->>CartAPI: GET /api/cart
        CartAPI->>SupabaseDB: SELECT cart_items with products
        SupabaseDB-->>CartAPI: Cart data with totals
        CartAPI-->>CartContext: { cartItems, totals }
        CartContext->>CartContext: setCartData(data)
        
        CartContext-->>UserImageGallery: true
        UserImageGallery->>UserImageGallery: showCartNotification()
        UserImageGallery->>User: Show success notification
    end
```

### Key Points:
- **Two-step process**: First create product, then add to cart
- **Fresh session**: Always gets fresh session before API calls
- **Multiple auth methods**: API tries multiple authentication methods
- **Cart refresh**: Cart is refreshed after adding item

### Potential Issues:
1. **Race condition**: If user clicks "Add to Cart" multiple times quickly, multiple API calls may be made
2. **Session timing**: If session expires between product creation and cart addition, cart API call fails
3. **Product creation failure**: If product creation fails, cart addition doesn't happen, but user might not see clear error

---

## 4. Checkout Flow (Complete)

### Sequence Diagram

```mermaid
sequenceDiagram
    participant User
    participant CheckoutFlow
    participant CartContext
    participant ShippingService
    participant CheckoutAPI
    participant StripeAPI
    participant SupabaseDB
    participant GoogleMapsAPI

    User->>CheckoutFlow: Click "Proceed to Checkout"
    CheckoutFlow->>CartContext: Get cartData
    CartContext-->>CheckoutFlow: { cartItems, totals }
    
    CheckoutFlow->>CheckoutFlow: Load default address (if exists)
    User->>CheckoutFlow: Enter shipping address
    
    alt Using Google Places Autocomplete
        User->>CheckoutFlow: Select address from Google Places
        CheckoutFlow->>GoogleMapsAPI: Geocode address
        GoogleMapsAPI-->>CheckoutFlow: Validated address + coordinates
    end
    
    CheckoutFlow->>CheckoutFlow: calculateShipping(address)
    CheckoutFlow->>ShippingService: calculateShippingCost(items, address)
    
    ShippingService->>ShippingService: Get currency for country
    ShippingService->>ProdigiAPI: Get shipping quotes (if available)
    alt Prodigi API available
        ProdigiAPI-->>ShippingService: Shipping quotes
    else Prodigi API unavailable
        ShippingService->>ShippingService: Use fallback pricing
    end
    
    ShippingService-->>CheckoutFlow: { cost, estimatedDays, serviceName, ... }
    CheckoutFlow->>CheckoutFlow: setCalculatedShipping(data)
    CheckoutFlow->>CheckoutFlow: Update totals (subtotal + shipping + tax)
    
    User->>CheckoutFlow: Enter billing address (or use same as shipping)
    User->>CheckoutFlow: Click "Complete Order"
    
    CheckoutFlow->>CheckoutFlow: Validate all fields
    CheckoutFlow->>CheckoutFlow: Get fresh session
    alt Session not available
        CheckoutFlow->>SupabaseClient: getSession() [with timeout]
        SupabaseClient-->>CheckoutFlow: session
    end
    
    CheckoutFlow->>CheckoutAPI: POST /api/checkout/create-session<br/>Authorization: Bearer {token}<br/>{ cartItemIds, shippingAddress, billingAddress, ... }
    
    CheckoutAPI->>CheckoutAPI: Authenticate (multiple methods)
    alt Authentication fails
        CheckoutAPI-->>CheckoutFlow: 401 Unauthorized
        CheckoutFlow->>User: Show auth error
    else Authentication succeeds
        CheckoutAPI->>SupabaseDB: SELECT cart_items with products
        SupabaseDB-->>CheckoutAPI: Cart items
        
        CheckoutAPI->>ProdigiClient: Generate fresh SKUs for each item
        ProdigiClient-->>CheckoutAPI: Fresh SKUs
        
        CheckoutAPI->>PricingCalculator: Calculate totals
        PricingCalculator-->>CheckoutAPI: { subtotal, shipping, tax, total }
        
        CheckoutAPI->>StripeAPI: stripe.checkout.sessions.create({<br/>  line_items,<br/>  mode: 'payment',<br/>  success_url,<br/>  cancel_url,<br/>  metadata: { userId, cartItemIds }<br/>})
        
        StripeAPI-->>CheckoutAPI: { id: sessionId, url: checkoutUrl }
        
        CheckoutAPI->>SupabaseDB: Save address (optional)
        CheckoutAPI-->>CheckoutFlow: { sessionId, url }
        
        CheckoutFlow->>CheckoutFlow: setProcessing(false)
        CheckoutFlow->>User: Redirect to Stripe checkout URL
    end
    
    User->>StripeAPI: Complete payment on Stripe
    StripeAPI->>StripeAPI: Process payment
    StripeAPI->>User: Redirect to success_url<br/>?session_id={CHECKOUT_SESSION_ID}
    
    User->>CheckoutSuccessPage: Load success page
    CheckoutSuccessPage->>CheckoutSuccessPage: Extract session_id from URL
    CheckoutSuccessPage->>CheckoutAPI: GET /api/checkout/retrieve-address?sessionId={id}
    CheckoutAPI->>StripeAPI: stripe.checkout.sessions.retrieve(sessionId)
    StripeAPI-->>CheckoutAPI: Session data with shipping address
    CheckoutAPI-->>CheckoutSuccessPage: Address data
    CheckoutSuccessPage->>User: Show order confirmation
```

### Key Points:
- **Shipping calculation**: Happens client-side before checkout
- **SKU regeneration**: Fresh SKUs generated at checkout time
- **Address validation**: Google Maps validates addresses
- **Multiple currencies**: Shipping costs converted to appropriate currency
- **Stripe redirect**: User is redirected to Stripe for payment

### Potential Issues:
1. **Shipping calculation timing**: If shipping calculation is slow, user may click checkout before it completes
2. **Session expiration**: Long checkout process may cause session to expire
3. **SKU generation failure**: If Prodigi API is down, checkout may fail
4. **Address validation**: Invalid addresses may cause shipping calculation to fail

---

## 5. Stripe Webhook Processing

### Sequence Diagram

```mermaid
sequenceDiagram
    participant Stripe
    participant WebhookAPI
    participant SupabaseDB
    participant OrderRetryManager
    participant ProdigiAPI

    Stripe->>WebhookAPI: POST /api/webhooks/stripe<br/>Event: checkout.session.completed<br/>Signature: stripe-signature
    
    WebhookAPI->>WebhookAPI: Verify signature
    alt Invalid signature
        WebhookAPI-->>Stripe: 400 Bad Request
    else Valid signature
        WebhookAPI->>WebhookAPI: Parse event type
        
        alt Event: checkout.session.completed
            WebhookAPI->>WebhookAPI: handleCheckoutSessionCompleted()
            
            WebhookAPI->>WebhookAPI: Extract userId, cartItemIds from metadata
            WebhookAPI->>SupabaseDB: SELECT cart_items WHERE user_id AND id IN (...)
            SupabaseDB-->>WebhookAPI: Cart items with products
            
            alt No cart items found
                WebhookAPI->>WebhookAPI: Log error, return early
            else Cart items found
                WebhookAPI->>SupabaseDB: INSERT orders ({<br/>  user_id,<br/>  stripe_session_id,<br/>  status: 'paid',<br/>  total_amount,<br/>  shipping_address,<br/>  billing_address<br/>})
                SupabaseDB-->>WebhookAPI: Order record
                
                WebhookAPI->>SupabaseDB: INSERT order_items (for each cart item)
                SupabaseDB-->>WebhookAPI: Order items
                
                WebhookAPI->>SupabaseDB: INSERT dropship_orders ({<br/>  order_id,<br/>  order_item_id,<br/>  provider: 'prodigi',<br/>  status: 'pending'<br/>})
                SupabaseDB-->>WebhookAPI: Dropship orders
                
                WebhookAPI->>SupabaseDB: DELETE cart_items WHERE user_id AND id IN (...)
                
                WebhookAPI->>OrderRetryManager: scheduleOperation(<br/>  'prodigi_order_creation',<br/>  orderId,<br/>  { orderData, cartItems },<br/>  immediate: true<br/>)
                
                OrderRetryManager->>SupabaseDB: INSERT retry_operations
                OrderRetryManager->>OrderRetryManager: processOperation() [immediate]
                
                OrderRetryManager->>ProdigiAPI: Create order (see Prodigi flow)
                ProdigiAPI-->>OrderRetryManager: Order created
                OrderRetryManager->>SupabaseDB: UPDATE retry_operations SET status='completed'
            end
        end
        
        alt Event: payment_intent.succeeded
            WebhookAPI->>WebhookAPI: handlePaymentIntentSucceeded()
            Note over WebhookAPI: Update order status if needed
        end
        
        alt Event: payment_intent.payment_failed
            WebhookAPI->>WebhookAPI: handlePaymentIntentFailed()
            WebhookAPI->>SupabaseDB: UPDATE orders SET status='payment_failed'
        end
        
        WebhookAPI-->>Stripe: 200 OK
    end
```

### Key Points:
- **Signature verification**: Critical for security
- **Idempotency**: Webhook should be idempotent (handle duplicate events)
- **Order creation**: Order created in database immediately
- **Cart clearing**: Cart items deleted after order creation
- **Async Prodigi**: Prodigi order creation happens asynchronously via retry manager

### Potential Issues:
1. **Webhook delivery failure**: If webhook fails, order may not be created
2. **Duplicate events**: Stripe may send duplicate events, need idempotency
3. **Cart items already deleted**: If webhook runs twice, cart items may not exist
4. **Prodigi failure**: If Prodigi order creation fails, order exists but not fulfilled

---

## 6. Prodigi Order Creation

### Sequence Diagram

```mermaid
sequenceDiagram
    participant OrderRetryManager
    participant ProdigiAPI
    participant SupabaseDB
    participant StorageAPI

    OrderRetryManager->>OrderRetryManager: processOperation('prodigi_order_creation')
    OrderRetryManager->>SupabaseDB: SELECT orders + order_items + products
    SupabaseDB-->>OrderRetryManager: Order data with items
    
    OrderRetryManager->>OrderRetryManager: Convert order to Prodigi format
    
    loop For each order item
        OrderRetryManager->>StorageAPI: Convert image URL to public URL
        StorageAPI-->>OrderRetryManager: Public image URL
        
        OrderRetryManager->>ProdigiAPI: POST /v4/Orders<br/>{<br/>  recipient: { address, name },<br/>  items: [{<br/>    sku,<br/>    copies,<br/>    assets: [{ url: imageUrl }]<br/>  }]<br/>}
        
        alt Prodigi API success
            ProdigiAPI-->>OrderRetryManager: { id: prodigiOrderId, status }
            OrderRetryManager->>SupabaseDB: UPDATE dropship_orders SET {<br/>  prodigi_order_id,<br/>  status: 'submitted',<br/>  tracking_number (if available)<br/>}
        else Prodigi API failure
            OrderRetryManager->>OrderRetryManager: Calculate next retry delay
            OrderRetryManager->>SupabaseDB: UPDATE retry_operations SET {<br/>  attempts: attempts + 1,<br/>  next_retry: Date + delay,<br/>  status: 'pending',<br/>  error: errorMessage<br/>}
            Note over OrderRetryManager: Will retry later based on schedule
        end
    end
    
    alt All items successful
        OrderRetryManager->>SupabaseDB: UPDATE retry_operations SET status='completed'
    else Some items failed
        OrderRetryManager->>SupabaseDB: UPDATE retry_operations SET status='pending' (for retry)
    end
```

### Key Points:
- **Retry mechanism**: Failed orders are retried with exponential backoff
- **Image URL conversion**: Storage paths must be converted to public URLs
- **Per-item processing**: Each order item creates a separate Prodigi order
- **Status tracking**: Dropship order status updated in database

### Potential Issues:
1. **Image URL access**: If image URL is not publicly accessible, Prodigi order fails
2. **Prodigi API rate limits**: Too many requests may hit rate limits
3. **SKU mismatch**: If SKU doesn't exist in Prodigi, order fails
4. **Retry exhaustion**: If all retries fail, order is stuck in pending state

---

## 7. Image Loading Flow

### Sequence Diagram

```mermaid
sequenceDiagram
    participant User
    participant UserImageGallery
    participant CentralizedAuthProvider
    participant UserImagesAPI
    participant SupabaseDB
    participant StorageAPI

    User->>UserImageGallery: Navigate to creations page
    UserImageGallery->>CentralizedAuthProvider: useAuth()
    
    CentralizedAuthProvider->>CentralizedAuthProvider: initializeAuth()
    CentralizedAuthProvider->>SupabaseClient: getUser() [with timeout]
    alt getUser() times out
        CentralizedAuthProvider->>SupabaseClient: getSession()
        SupabaseClient-->>CentralizedAuthProvider: session
    else getUser() succeeds
        SupabaseClient-->>CentralizedAuthProvider: { user, session }
    end
    
    CentralizedAuthProvider->>CentralizedAuthProvider: setUser(user)
    CentralizedAuthProvider->>CentralizedAuthProvider: setSession(session)
    CentralizedAuthProvider-->>UserImageGallery: { user, session }
    
    UserImageGallery->>UserImageGallery: useEffect(() => fetchUserImages())
    
    alt Session not available
        UserImageGallery->>SupabaseClient: getSession() [fresh session]
        SupabaseClient-->>UserImageGallery: freshSession
    end
    
    UserImageGallery->>UserImagesAPI: GET /api/user-images?page=1&limit=20<br/>Authorization: Bearer {token}
    
    UserImagesAPI->>UserImagesAPI: Authenticate (multiple methods)
    Note over UserImagesAPI: Method 1: Cookie auth<br/>Method 2: Authorization header<br/>Method 3: getSession()<br/>Method 4: refreshSession()
    
    alt Authentication fails
        UserImagesAPI-->>UserImageGallery: 401 Unauthorized
        UserImageGallery->>User: Show auth error
    else Authentication succeeds
        UserImagesAPI->>SupabaseDB: SELECT images WHERE user_id<br/>ORDER BY created_at DESC<br/>LIMIT 20
        SupabaseDB-->>UserImagesAPI: Image records
        
        UserImagesAPI-->>UserImageGallery: { images: [...], pagination: {...} }
        
        UserImageGallery->>UserImageGallery: setImages(images)
        UserImageGallery->>User: Display images
        
        loop For each image
            UserImageGallery->>StorageAPI: Load image from storage URL
            StorageAPI-->>UserImageGallery: Image data
            UserImageGallery->>User: Render image
        end
    end
    
    alt User scrolls to bottom
        UserImageGallery->>UserImagesAPI: GET /api/user-images?page=2&limit=20
        UserImagesAPI->>SupabaseDB: SELECT images (page 2)
        SupabaseDB-->>UserImagesAPI: More images
        UserImagesAPI-->>UserImageGallery: { images: [...], pagination: { has_more: true/false } }
        UserImageGallery->>UserImageGallery: setImages([...prevImages, ...newImages])
    end
```

### Key Points:
- **Multiple auth methods**: API tries multiple authentication methods
- **Session freshness**: Client gets fresh session if needed
- **Pagination**: Images loaded in pages of 20
- **Lazy loading**: Images loaded on scroll

### Potential Issues:
1. **Session timing**: If session expires during pagination, subsequent requests fail
2. **Cookie sync**: If cookies aren't synced, cookie-based auth fails
3. **Image loading errors**: If storage URL is invalid, images don't load
4. **Race conditions**: Multiple fetch requests may cause race conditions

---

## Common Issues and Solutions

### Issue 1: Authentication Failures
**Symptoms**: 401 errors on API calls
**Root Causes**:
- Cookies not synced to localStorage
- Session expired
- Authorization header not sent

**Solutions**:
- Always get fresh session before API calls
- Send Authorization header in addition to cookies
- Use multiple authentication fallback methods in API routes

### Issue 2: Race Conditions
**Symptoms**: Cart/orders in inconsistent state
**Root Causes**:
- Multiple simultaneous API calls
- State updates not synchronized

**Solutions**:
- Use loading states to prevent multiple simultaneous calls
- Implement proper error handling and rollback
- Use optimistic updates with error recovery

### Issue 3: Session Timing
**Symptoms**: Works sometimes, fails other times
**Root Causes**:
- Session expires during long operations
- Session not refreshed before API calls

**Solutions**:
- Always get fresh session before critical operations
- Implement session refresh mechanism
- Use shorter session timeouts or refresh tokens

### Issue 4: Webhook Failures
**Symptoms**: Orders created but not fulfilled
**Root Causes**:
- Webhook delivery failure
- Webhook processing error
- Prodigi order creation failure

**Solutions**:
- Implement retry mechanism for webhooks
- Add idempotency checks
- Monitor webhook delivery and processing

---

## Recommendations

1. **Add Request Deduplication**: Prevent duplicate API calls
2. **Implement Circuit Breaker**: Prevent cascading failures
3. **Add Comprehensive Logging**: Track all API calls and state changes
4. **Implement Health Checks**: Monitor system health
5. **Add Retry Logic**: Automatic retry for transient failures
6. **Optimize Session Management**: Reduce session refresh overhead
7. **Add Monitoring**: Track error rates and performance metrics

