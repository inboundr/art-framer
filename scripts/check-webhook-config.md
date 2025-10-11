# 🔧 **Stripe Webhook Configuration Guide**

## **The Problem**

Your orders aren't being created because the Stripe webhook is not configured. Stripe doesn't know to send events to your application.

## **Solution: Configure Stripe Webhook**

### **Step 1: Access Stripe Dashboard**

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Make sure you're in the **correct account** (live vs test)
3. Navigate to **Developers** → **Webhooks**

### **Step 2: Create Webhook Endpoint**

1. Click **"Add endpoint"**
2. **Endpoint URL**: `https://www.coolart.studio/api/webhooks/stripe`
3. **Description**: "Art Framer Order Processing"

### **Step 3: Select Events**

Enable these events for comprehensive payment handling:

**Primary Events (Required):**

- ✅ `checkout.session.completed` - **Main event for successful orders**
- ✅ `payment_intent.succeeded` - **Backup confirmation for successful payments**
- ✅ `payment_intent.payment_failed` - **Handle failed payments**

**Additional Events (Recommended):**

- ✅ `checkout.session.async_payment_succeeded` - **For bank transfers, SEPA, etc.**
- ✅ `checkout.session.async_payment_failed` - **For failed async payments**
- ✅ `payment_intent.requires_action` - **For 3D Secure authentication**
- ✅ `charge.dispute.created` - **For chargebacks/disputes**
- ✅ `invoice.payment_failed` - **For subscription failures (if applicable)**

### **Step 4: Get Webhook Secret**

1. After creating the webhook, click on it
2. In the **"Signing secret"** section, click **"Reveal"**
3. Copy the secret (starts with `whsec_`)

### **Step 5: Update Environment Variables**

Add this to your production environment:

```
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### **Step 6: Test the Webhook**

1. Go to the webhook in Stripe dashboard
2. Click **"Send test webhook"**
3. Select `checkout.session.completed`
4. Check if your application receives it

## **Verification Steps**

### **Check Webhook Logs**

After configuring, test a real checkout and check:

1. **Stripe Dashboard** → **Webhooks** → **Your webhook** → **Recent deliveries**
2. Look for successful deliveries (green checkmarks)
3. If there are failures (red X), click to see error details

### **Check Application Logs**

Look for these log messages in your application:

```
🔍 Webhook received: { type: 'checkout.session.completed', ... }
📝 Processing checkout session completed: { sessionId: 'cs_...', ... }
✅ Order created successfully: { orderId: '...', ... }
```

## **Troubleshooting**

### **Common Issues:**

1. **Webhook not receiving events**
   - Check if webhook URL is correct
   - Verify webhook is enabled in Stripe dashboard
   - Check if your server is accessible from internet

2. **Signature verification failed**
   - Ensure `STRIPE_WEBHOOK_SECRET` is set correctly
   - Check if secret matches the one in Stripe dashboard

3. **Order still not created**
   - Check application logs for errors
   - Verify database connection
   - Check if user ID and cart items are in session metadata

## **Expected Flow After Fix**

### **Successful Payment Flow:**

1. ✅ User completes checkout → Stripe processes payment
2. ✅ Stripe sends `checkout.session.completed` webhook to your app
3. ✅ Your webhook creates order in database
4. ✅ User sees order in their order list

### **Failed Payment Flow:**

1. ❌ User payment fails (insufficient funds, declined card, etc.)
2. ❌ Stripe sends `payment_intent.payment_failed` webhook
3. ❌ Your webhook updates order status to "cancelled"
4. ❌ User sees payment failed message

### **Async Payment Flow (Bank Transfers, SEPA):**

1. 🔄 User initiates bank transfer payment
2. 🔄 Stripe sends `checkout.session.completed` (payment pending)
3. 🔄 Later: Stripe sends `checkout.session.async_payment_succeeded` when bank confirms
4. ✅ Your webhook processes the successful payment

## **Quick Test**

After configuring the webhook, you can test it by:

1. Making a test purchase
2. Checking if order appears in your database
3. Checking Stripe webhook logs for successful delivery
