# Prodigi Integration Setup Guide

This guide will help you set up Prodigi as your primary dropshipping provider for Art Framer.

## 🎯 Why Prodigi?

Prodigi is an excellent choice for your art framing business because:

- **500,000+ customizable products** including framed prints, canvas, and wall art
- **Global print network** with 50+ suppliers in 10+ countries
- **Eco-friendly printing** with sustainable materials
- **24-48 hour fulfillment** for most products
- **Free to use** - no setup fees or monthly subscriptions
- **Fine Art Trade Guild approved** for museum-quality prints

## 🔧 Setup Steps

### 1. Create Prodigi Account

1. Visit [Prodigi.com](https://www.prodigi.com/)
2. Click "Sign up" to create your account
3. Complete the account verification process
4. Access your dashboard

### 2. Get API Credentials

1. In your Prodigi dashboard, go to **Settings** → **API**
2. Generate a new API key
3. Copy the API key for your environment variables

### 3. Environment Configuration

Add these variables to your `.env.local` file:

```env
# Prodigi Configuration
PRODIGI_API_KEY=your_prodigi_api_key_here
PRODIGI_ENVIRONMENT=sandbox  # Use 'production' for live orders
```

### 4. Product Mapping

The system automatically maps your frame specifications to Prodigi SKUs:

| Frame Size  | Style   | Material | Prodigi SKU     |
| ----------- | ------- | -------- | --------------- |
| Small       | Black   | Wood     | FRAME-SM-BLK-WD |
| Medium      | White   | Wood     | FRAME-MD-WHT-WD |
| Large       | Natural | Wood     | FRAME-LG-NAT-WD |
| Extra Large | Gold    | Wood     | FRAME-XL-GLD-WD |

### 5. Test the Integration

1. **Sandbox Testing**: Use `PRODIGI_ENVIRONMENT=sandbox` for testing
2. **Create Test Order**: Use the admin panel to create a test order
3. **Verify Fulfillment**: Check that orders are properly routed to Prodigi

## 📋 API Endpoints

### Create Prodigi Order

```bash
POST /api/dropship/prodigi
Content-Type: application/json

{
  "orderId": "uuid-of-your-order"
}
```

### Get Order Status

```bash
GET /api/dropship/prodigi?orderId=uuid-of-your-order
```

## 🔄 Order Flow

1. **Customer Places Order**: Order is created in your database
2. **Payment Confirmed**: Stripe webhook triggers order processing
3. **Dropship Order Created**: System creates Prodigi order automatically
4. **Fulfillment**: Prodigi prints and ships the framed art
5. **Tracking Updates**: System receives status updates from Prodigi

## 📊 Order Status Mapping

| Prodigi Status | Internal Status | Description            |
| -------------- | --------------- | ---------------------- |
| InProgress     | processing      | Order is being printed |
| Complete       | shipped         | Order has been shipped |
| Cancelled      | cancelled       | Order was cancelled    |
| OnHold         | pending         | Order is on hold       |
| Error          | failed          | Order failed           |

## 🌍 Global Shipping

Prodigi's global network automatically routes orders to the nearest print facility:

- **Faster Delivery**: Orders are printed closer to customers
- **Lower Costs**: Reduced shipping distances
- **Eco-Friendly**: Less environmental impact
- **Better Quality**: Local print facilities ensure quality

## 🛠️ Troubleshooting

### Common Issues

1. **API Key Invalid**
   - Verify your API key is correct
   - Check if you're using the right environment (sandbox vs production)

2. **Product SKU Not Found**
   - Ensure your frame specifications match the mapping table
   - Check if the product exists in Prodigi's catalog

3. **Order Creation Failed**
   - Verify all required fields are provided
   - Check image URL accessibility
   - Ensure shipping address is complete

### Support

- **Prodigi Support**: Contact through their dashboard
- **API Documentation**: [Prodigi API Docs](https://www.prodigi.com/print-api/)
- **Status Page**: Check [Prodigi Network Status](https://www.prodigi.com/network-status/)

## 🚀 Going Live

When you're ready to process real orders:

1. **Switch to Production**: Set `PRODIGI_ENVIRONMENT=production`
2. **Update API Key**: Use your production API key
3. **Test with Small Order**: Process a small test order first
4. **Monitor Performance**: Watch for any issues in the first few orders

## 📈 Benefits for Your Business

- **No Inventory**: No need to stock frames or prints
- **Global Reach**: Ship to customers worldwide
- **Quality Assurance**: Fine Art Trade Guild approved printing
- **Eco-Friendly**: Sustainable materials and local printing
- **Cost Effective**: No upfront costs or monthly fees
- **Scalable**: Handle any volume of orders

## 🔄 Backup Providers

The system is designed with redundancy:

1. **Primary**: Prodigi (main provider)
2. **Backup**: Alternative print providers (if Prodigi is unavailable)
3. **Emergency**: Printful (last resort)

This ensures your orders are always fulfilled, even if one provider has issues.

---

**Need Help?** Check the [Prodigi documentation](https://www.prodigi.com/print-api/) or contact their support team through your dashboard.
