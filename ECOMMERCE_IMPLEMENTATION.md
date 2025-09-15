# Art Framer Ecommerce Implementation

This document outlines the complete ecommerce system implementation for Art Framer, allowing users to purchase AI-generated images as framed art pieces.

## 🏗️ Architecture Overview

The ecommerce system is built with a modern, scalable architecture:

- **Frontend**: Next.js 14 with React components
- **Backend**: Next.js API routes with Supabase
- **Database**: PostgreSQL via Supabase
- **Payments**: Stripe integration
- **Fulfillment**: Gelato API for print-on-demand
- **State Management**: React hooks and context

## 📊 Database Schema

### Core Tables

1. **products** - Framed art products
2. **orders** - Customer orders
3. **order_items** - Individual items in orders
4. **dropship_orders** - Fulfillment tracking
5. **cart_items** - Shopping cart items
6. **product_reviews** - Customer reviews
7. **wishlist_items** - User wishlists

### Key Features

- **Row Level Security (RLS)** for data protection
- **Automatic order number generation**
- **Order total calculations**
- **Dropshipping integration tracking**

## 🛒 Ecommerce Features

### Product Catalog

- **Frame Selection**: Multiple sizes, styles, and materials
- **Real-time Preview**: See how your art looks in different frames
- **Filtering & Sorting**: Find products by specifications
- **Product Reviews**: Customer feedback system

### Shopping Cart

- **Persistent Cart**: Saved across sessions
- **Quantity Management**: Easy add/remove/update
- **Price Calculations**: Automatic tax and shipping
- **Cart Validation**: Ensures product availability

### Checkout Flow

- **Multi-step Process**: Shipping → Billing → Review
- **Address Management**: Shipping and billing addresses
- **Payment Processing**: Secure Stripe integration
- **Order Confirmation**: Email notifications

### Order Management

- **Order Tracking**: Real-time status updates
- **Dropshipping Integration**: Automatic fulfillment
- **Customer Portal**: View order history and details
- **Invoice Generation**: Downloadable receipts

## 🔌 API Integrations

### Stripe Payment Processing

```typescript
// Create checkout session
const session = await createCheckoutSession({
  lineItems: formattedItems,
  successUrl: "/checkout/success",
  cancelUrl: "/checkout/cancel",
  customerEmail: user.email,
  metadata: orderMetadata,
});
```

### Prodigi Print-on-Demand

```typescript
// Create dropship order
const prodigiOrder = await prodigiClient.createOrder({
  orderReference: orderNumber,
  items: formattedItems,
  shippingAddress: customerAddress,
  customerEmail: customerEmail,
});
```

### Webhook Handling

- **Stripe Webhooks**: Payment status updates
- **Order Processing**: Automatic fulfillment
- **Status Updates**: Real-time order tracking

## 🎨 User Experience

### Frame Selection Process

1. **Generate Art**: User creates AI art
2. **Choose Frame**: Select size, style, material
3. **Preview**: See framed result
4. **Add to Cart**: One-click purchase
5. **Checkout**: Secure payment process
6. **Fulfillment**: Automatic printing and shipping

### Mobile-First Design

- **Responsive Layout**: Works on all devices
- **Touch-Friendly**: Optimized for mobile interaction
- **Fast Loading**: Optimized images and components
- **Offline Support**: PWA capabilities

## 🚀 Deployment

### Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret

# Prodigi
PRODIGI_API_KEY=your_prodigi_api_key
PRODIGI_ENVIRONMENT=sandbox
```

### Database Migration

```bash
# Run the ecommerce schema migration
supabase db push
```

### Stripe Webhook Setup

1. Create webhook endpoint in Stripe dashboard
2. Set URL to: `https://yourdomain.com/api/webhooks/stripe`
3. Select events: `checkout.session.completed`, `payment_intent.succeeded`

## 📱 Components

### Core Components

- **ProductCatalog**: Display and filter products
- **FrameSelector**: Interactive frame selection
- **ShoppingCart**: Cart management with totals
- **CheckoutFlow**: Multi-step checkout process
- **OrderManagement**: Order tracking and history

### Integration Points

- **CreationsModal**: "Buy as Frame" button
- **AppLayout**: Shopping cart icon with count
- **Navigation**: Shop and orders pages

## 🔒 Security Features

### Data Protection

- **Row Level Security**: Database-level access control
- **API Authentication**: JWT-based user verification
- **Input Validation**: Zod schema validation
- **XSS Protection**: Sanitized user inputs

### Payment Security

- **PCI Compliance**: Stripe handles card data
- **Webhook Verification**: Signature validation
- **HTTPS Only**: Encrypted data transmission
- **Rate Limiting**: API abuse prevention

## 📈 Analytics & Monitoring

### Key Metrics

- **Conversion Rate**: Art generation to purchase
- **Cart Abandonment**: Checkout completion rates
- **Order Fulfillment**: Dropshipping success rates
- **Customer Satisfaction**: Review scores

### Error Tracking

- **Stripe Errors**: Payment failure monitoring
- **API Failures**: External service issues
- **User Experience**: Frontend error tracking

## 🛠️ Development

### Local Setup

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Run database migrations
supabase db push

# Start development server
npm run dev
```

### Testing

```bash
# Run tests
npm test

# Test API endpoints
npm run test:api

# Test ecommerce flow
npm run test:ecommerce
```

## 🔄 Future Enhancements

### Planned Features

- **Subscription Model**: Monthly art delivery
- **Custom Frames**: Personalized frame options
- **Bulk Orders**: Multiple prints in one order
- **Gift Cards**: Digital gift certificates
- **Loyalty Program**: Points and rewards system

### Technical Improvements

- **Caching**: Redis for better performance
- **CDN**: Global image delivery
- **Analytics**: Advanced user behavior tracking
- **A/B Testing**: Conversion optimization

## 📞 Support

For technical support or questions about the ecommerce implementation:

- **Documentation**: Check this README and code comments
- **Issues**: Create GitHub issues for bugs
- **Discussions**: Use GitHub discussions for questions
- **Email**: Contact the development team

---

**Implementation Status**: ✅ Complete
**Last Updated**: December 2024
**Version**: 1.0.0
