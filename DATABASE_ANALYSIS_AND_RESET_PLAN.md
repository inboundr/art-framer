# 🗄️ Database Analysis & Reset Plan

## 📊 **Current Database Architecture**

### **Core Tables & Relationships**

```
auth.users (Supabase Auth)
    ↓
profiles (extends auth.users)
    ↓
images (user-generated images)
    ↓
products (framed versions of images)
    ↓
orders → order_items → products
    ↓
dropship_orders (fulfillment tracking)

curated_images (public gallery images)
```

### **1. User Management**

- **`auth.users`**: Supabase authentication (managed by Supabase)
- **`profiles`**: Extended user data (username, avatar, etc.)

### **2. Image System**

- **`images`**: User-generated images (PRIVATE - only owner can see)
- **`curated_images`**: Public gallery images (EVERYONE can see)
- **`image_likes`**: User likes on images

### **3. E-commerce System**

- **`products`**: Framed versions of images
- **`orders`**: Customer orders
- **`order_items`**: Items within orders
- **`dropship_orders`**: Fulfillment tracking
- **`cart_items`**: Shopping cart
- **`product_reviews`**: Customer reviews
- **`wishlist_items`**: User wishlists

## 🔄 **Database Operations Flow**

### **User Registration Flow**

```
1. User signs up → auth.users created
2. Profile created → profiles table
3. User can generate images → images table
4. Images are PRIVATE by default
```

### **Image Generation Flow**

```
1. User generates image → images table (is_public = false)
2. User can create products → products table
3. Products reference images
4. Only owner can see their images
```

### **Public Gallery Flow**

```
1. Admin uploads curated images → curated_images table
2. Images stored in 'curated-images' bucket
3. Public access via RLS policies
4. Home page shows curated images
```

### **E-commerce Flow**

```
1. User adds product to cart → cart_items table
2. User checks out → orders table
3. Order items created → order_items table
4. Fulfillment initiated → dropship_orders table
```

## 🎯 **Current Issues Identified**

### **1. RLS Policy Conflicts**

- User images have conflicting public/private policies
- Need to ensure user images are ALWAYS private
- Curated images should be ALWAYS public

### **2. Database Schema Inconsistencies**

- Multiple migration files with overlapping changes
- Some tables missing proper constraints
- RLS policies not properly configured

### **3. Curated Images Management**

- Images stored in `/public-images` folder
- Need to migrate to Supabase Storage
- Need proper seed data system

## 🚀 **Reset & Seed Data Plan**

### **Phase 1: Complete Database Reset**

```bash
# 1. Reset Supabase database
supabase db reset --linked

# 2. Apply all migrations in correct order
supabase db push
```

### **Phase 2: Create Comprehensive Seed Data**

#### **A. Curated Images Seed Data**

Create a comprehensive seed script that:

1. **Uploads all images from `/public-images` to Supabase Storage**
2. **Creates curated_images records with proper metadata**
3. **Sets up proper categories and tags**
4. **Configures display order and featured status**

#### **B. Sample User Data**

Create sample users for testing:

- Test user with generated images
- Admin user for management
- Sample orders and products

#### **C. Product Catalog Seed Data**

Create sample products for:

- Different frame sizes
- Different frame styles
- Different frame materials
- Various price points

### **Phase 3: RLS Policy Configuration**

Ensure proper security:

- User images: PRIVATE (only owner)
- Curated images: PUBLIC (everyone)
- Products: PUBLIC (for catalog)
- Orders: PRIVATE (only owner)

## 📁 **Curated Images Migration Plan**

### **Current State**

- 206 images in `/public-images` folder
- Images are JPG format
- Need to be uploaded to Supabase Storage
- Need metadata extraction and categorization

### **Migration Strategy**

#### **1. Image Upload Script**

```javascript
// scripts/seed-curated-images.js
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

async function uploadCuratedImages() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const imagesDir = path.join(__dirname, "../public-images");
  const imageFiles = fs
    .readdirSync(imagesDir)
    .filter((file) => file.endsWith(".jpg") || file.endsWith(".jpeg"));

  for (const file of imageFiles) {
    // Upload to Supabase Storage
    // Create curated_images record
    // Set proper metadata
  }
}
```

#### **2. Metadata Generation**

- Extract image dimensions
- Generate titles and descriptions
- Categorize by visual content
- Set display order
- Mark some as featured

#### **3. Storage Organization**

- Upload to `curated-images` bucket
- Generate thumbnails
- Set proper public access
- Configure CDN

## 🛠️ **Implementation Steps**

### **Step 1: Database Reset**

```bash
# Reset the database completely
supabase db reset --linked

# Verify clean state
supabase db diff
```

### **Step 2: Apply Migrations**

```bash
# Apply all migrations in order
supabase db push

# Verify schema
supabase db diff
```

### **Step 3: Create Seed Data Scripts**

```bash
# Create comprehensive seed data
node scripts/seed-database.js
node scripts/seed-curated-images.js
node scripts/seed-sample-data.js
```

### **Step 4: Verify Setup**

```bash
# Test database connection
curl http://localhost:3000/api/test-db

# Test curated images
curl http://localhost:3000/api/curated-images

# Test user authentication
curl http://localhost:3000/api/orders
```

## 🎯 **Expected Results**

### **After Reset & Seed:**

1. **Clean Database Schema**
   - All tables properly created
   - RLS policies correctly configured
   - No conflicting policies

2. **Curated Images System**
   - All 206 images uploaded to Supabase Storage
   - Proper metadata and categorization
   - Public access for home page gallery

3. **User Images Privacy**
   - User images are completely private
   - Only owners can see their images
   - No public access to user content

4. **E-commerce System**
   - Sample products available
   - Test orders and cart functionality
   - Proper fulfillment tracking

5. **Performance Optimized**
   - Proper indexes on all tables
   - Optimized queries
   - Fast image loading

## 🔍 **Verification Checklist**

- [ ] Database reset successful
- [ ] All migrations applied
- [ ] RLS policies configured correctly
- [ ] Curated images uploaded and accessible
- [ ] User images are private
- [ ] E-commerce system functional
- [ ] API endpoints working
- [ ] Authentication working
- [ ] Storage buckets configured
- [ ] Performance optimized

This comprehensive reset will give you a clean, properly configured database with all the curated images as seed data, ensuring a smooth development experience.
