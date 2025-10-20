# 🗄️ Database Reset & Seed Guide

## 🎯 **Overview**

This guide provides a complete solution for resetting your Art Framer database and seeding it with curated images from the `/public-images` folder. The process ensures a clean, properly configured database with all necessary data.

## 🚀 **Quick Start**

### **Option 1: Full Reset (Recommended)**

```bash
# Complete database reset with all seed data
npm run db:full-reset
```

### **Option 2: Safe Reset (Handles Permission Issues)**

```bash
# Safe reset that handles Supabase permission issues
npm run db:reset-safe
```

### **Option 3: Step-by-Step Reset**

```bash
# 1. Reset database only
npm run db:reset

# 2. Clean up storage buckets
npm run db:cleanup-storage

# 3. Seed with sample data
npm run db:seed

# 4. Seed curated images (if you have images in public-images/)
npm run db:seed-curated
```

## 📋 **What Each Script Does**

### **1. `scripts/full-database-reset.js`**

- **Purpose**: Complete database reset and seed process
- **What it does**:
  - Resets Supabase database completely
  - Applies all migrations
  - Seeds sample data (users, images, products, orders)
  - Seeds curated images from `/public-images` folder
  - Verifies database setup

### **2. `scripts/reset-database.js`**

- **Purpose**: Reset database only
- **What it does**:
  - Resets Supabase database
  - Applies all migrations
  - Verifies schema

### **3. `scripts/seed-database.js`**

- **Purpose**: Seed with sample data
- **What it does**:
  - Creates sample users
  - Creates sample images (private)
  - Creates sample products
  - Creates sample orders and cart items
  - Creates sample reviews

### **4. `scripts/seed-curated-images.js`**

- **Purpose**: Seed curated images from `/public-images`
- **What it does**:
  - Uploads images to Supabase Storage
  - Creates curated_images records
  - Generates metadata and categories
  - Sets up public access

### **5. `scripts/cleanup-storage.js`**

- **Purpose**: Clean up Supabase Storage buckets
- **What it does**:
  - Lists all storage buckets
  - Deletes all files from curated-images bucket
  - Deletes all files from user-images bucket
  - Cleans up any other custom buckets
  - Provides cleanup summary

## 🎨 **Curated Images System**

### **Current Setup**

- **Source**: 206 images in `/public-images` folder
- **Format**: JPG files
- **Storage**: Supabase Storage bucket `curated-images`
- **Access**: Public (no authentication required)

### **What Happens During Seed**

1. **Image Upload**: All images uploaded to Supabase Storage
2. **Metadata Generation**: Titles, descriptions, categories, tags
3. **Thumbnail Creation**: 300x300 thumbnails generated
4. **Database Records**: Curated images table populated
5. **Public Access**: RLS policies configured for public access

### **Generated Metadata**

- **Categories**: abstract, nature, urban, portrait, landscape, etc.
- **Tags**: Auto-generated based on visual content
- **Featured Images**: 20% randomly marked as featured
- **Display Order**: Random ordering for variety

## 🗄️ **Database Schema After Reset**

### **Core Tables**

```
profiles (user data)
├── images (user-generated, PRIVATE)
├── products (framed versions)
├── orders → order_items
├── cart_items
└── product_reviews

curated_images (public gallery, PUBLIC)
```

### **RLS Policies**

- **User Images**: PRIVATE (only owner can see)
- **Curated Images**: PUBLIC (everyone can see)
- **Products**: PUBLIC (for catalog)
- **Orders**: PRIVATE (only owner)

## 🛠️ **Prerequisites**

### **Environment Variables**

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### **Dependencies**

```bash
# Install required packages
npm install @supabase/supabase-js sharp @faker-js/faker
```

### **Supabase Setup**

```bash
# Link to your Supabase project
supabase link --project-ref your-project-ref

# Ensure you're logged in
supabase login
```

## 🔍 **Verification Steps**

### **1. Check Database Schema**

```bash
# Verify no schema differences
supabase db diff

# Should return empty (no differences)
```

### **2. Test API Endpoints**

```bash
# Test curated images API
curl http://localhost:3000/api/curated-images

# Test database connection
curl http://localhost:3000/api/test-db
```

### **3. Check Supabase Dashboard**

- Navigate to your Supabase project
- Check **Table Editor** for data
- Check **Storage** for uploaded images
- Check **Authentication** for RLS policies

## 🎯 **Expected Results**

### **After Full Reset**

- ✅ **Clean Database**: No conflicting data or policies
- ✅ **Sample Data**: 10 users, 50+ images, 100+ products, 20 orders
- ✅ **Curated Images**: All 206 images uploaded and accessible
- ✅ **Public Gallery**: Home page shows curated images
- ✅ **Private User Images**: User images are completely private
- ✅ **E-commerce**: Full shopping cart and order system

### **Performance Benefits**

- ✅ **Fast Loading**: Optimized queries and indexes
- ✅ **Public Access**: No authentication required for gallery
- ✅ **CDN Ready**: Images served from Supabase Storage
- ✅ **Mobile Optimized**: Responsive image loading

## 🚨 **Troubleshooting**

### **Common Issues**

#### **1. Database Connection Failed**

```bash
# Check environment variables
echo $NEXT_PUBLIC_SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY

# Re-link Supabase project
supabase link --project-ref your-project-ref
```

#### **2. Migration Errors**

```bash
# Reset and try again
supabase db reset --linked
supabase db push
```

#### **3. Image Upload Failed**

```bash
# Check if images exist
ls -la public-images/

# Check file permissions
chmod 644 public-images/*.jpg
```

#### **4. RLS Policy Issues**

```bash
# Check policies in Supabase dashboard
# Navigate to Authentication → Policies
# Verify user images are private, curated images are public
```

### **Manual Recovery**

```bash
# If scripts fail, run manually
supabase db reset --linked
supabase db push
node scripts/seed-database.js
node scripts/seed-curated-images.js
```

## 📊 **Monitoring & Maintenance**

### **Check Database Health**

```bash
# View database logs
supabase logs

# Check storage usage
# Navigate to Supabase dashboard → Storage
```

### **Update Curated Images**

```bash
# Add new images to public-images/
# Run seed script again
npm run db:seed-curated
```

### **Backup Database**

```bash
# Export database schema
supabase db dump --schema-only > schema.sql

# Export data
supabase db dump --data-only > data.sql
```

## 🎉 **Success Indicators**

After running the full reset, you should see:

1. **Database**: Clean schema with all tables
2. **Sample Data**: Users, images, products, orders
3. **Curated Images**: All images uploaded and accessible
4. **API Endpoints**: Working `/api/curated-images`
5. **Home Page**: Gallery loads with curated images
6. **User Images**: Private and secure
7. **Performance**: Fast loading times

## 🚀 **Next Steps**

1. **Start Development**: `npm run dev`
2. **Test Application**: Visit `http://localhost:3000`
3. **Verify Gallery**: Check home page loads images
4. **Test Authentication**: Sign up and generate images
5. **Test E-commerce**: Add products to cart and checkout

Your database is now ready for development with a complete, properly configured system! 🎯
