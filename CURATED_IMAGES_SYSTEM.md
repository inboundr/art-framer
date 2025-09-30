# 🎨 Curated Images System

## Overview

The Curated Images System replaces the complex user-generated image system with a simple, fast, and reliable curated content system for the home page. This system provides consistent, high-quality images that all visitors can see without authentication.

## 🏗️ Architecture

### **Old System (Problems):**

```
Home Page → ImageGallery → useSupabaseGallery → SupabaseImageAPI → images table → Supabase Storage
```

- ❌ Complex database queries with joins
- ❌ Authentication required for many operations
- ❌ Timeout issues (10-second timeouts)
- ❌ Inconsistent content (user-generated)
- ❌ Performance issues with RLS policies

### **New System (Solution):**

```
Home Page → CuratedImageGallery → useCuratedGallery → CuratedImageAPI → curated_images table → curated-images bucket
```

- ✅ Simple, fast queries
- ✅ No authentication required
- ✅ Public bucket access
- ✅ Consistent, curated content
- ✅ Optimized for performance

## 📁 File Structure

```
src/
├── lib/
│   └── curated-images.ts          # API service for curated images
├── hooks/
│   └── useCuratedGallery.ts       # React hooks for curated images
├── components/
│   └── CuratedImageGallery.tsx    # Gallery component
├── app/api/curated-images/
│   ├── route.ts                   # Main API endpoint
│   └── featured/route.ts          # Featured images endpoint
└── scripts/
    └── upload-curated-images.js   # Upload script

supabase/migrations/
└── 20250115000000_create_curated_images_system.sql
```

## 🗄️ Database Schema

### **curated_images Table:**

```sql
CREATE TABLE public.curated_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'art',
  tags TEXT[] DEFAULT '{}',
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  aspect_ratio TEXT NOT NULL DEFAULT 'square',
  display_order INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### **Storage Bucket:**

- **Bucket Name:** `curated-images`
- **Public Access:** Yes
- **Policy:** Public read access for all visitors

## 🚀 Setup Instructions

### 1. **Run Database Migration**

```bash
# Apply the migration to create the curated images system
supabase db push
```

### 2. **Upload Sample Images**

```bash
# Run the upload script to populate with sample images
node scripts/upload-curated-images.js
```

### 3. **Verify Setup**

```bash
# Test the API endpoint
curl http://localhost:3000/api/curated-images
```

## 📊 API Endpoints

### **GET /api/curated-images**

Get paginated curated images with optional filters.

**Query Parameters:**

- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)
- `category` (string): Filter by category
- `featured_only` (boolean): Show only featured images
- `aspect_ratio` (string): Filter by aspect ratio
- `tags` (string): Comma-separated tags to filter by

**Example:**

```bash
curl "http://localhost:3000/api/curated-images?page=1&limit=10&category=abstract&featured_only=true"
```

### **GET /api/curated-images/featured**

Get featured images only.

**Query Parameters:**

- `limit` (number): Number of featured images (default: 12)

**Example:**

```bash
curl "http://localhost:3000/api/curated-images/featured?limit=6"
```

## 🎯 Usage Examples

### **Basic Gallery Component:**

```tsx
import { CuratedImageGallery } from "@/components/CuratedImageGallery";

export default function HomePage() {
  return (
    <div>
      <h1>Curated Art Gallery</h1>
      <CuratedImageGallery />
    </div>
  );
}
```

### **With Custom Handlers:**

```tsx
import { CuratedImageGallery } from "@/components/CuratedImageGallery";
import { CuratedImage } from "@/lib/curated-images";

export default function HomePage() {
  const handleImageClick = (image: CuratedImage) => {
    console.log("Image clicked:", image.title);
    // Handle image click (e.g., open modal, navigate to detail page)
  };

  return (
    <CuratedImageGallery
      onImageClick={handleImageClick}
      showFilters={true}
      enableAnimations={true}
    />
  );
}
```

### **Using Hooks Directly:**

```tsx
import {
  useCuratedGallery,
  useFeaturedImages,
} from "@/hooks/useCuratedGallery";

export default function CustomGallery() {
  const { images, loading, error, loadMore } = useCuratedGallery({
    pageSize: 20,
    filters: { category: "abstract", featured_only: true },
  });

  const { images: featuredImages } = useFeaturedImages(6);

  return (
    <div>
      {loading && <div>Loading...</div>}
      {error && <div>Error: {error.message}</div>}
      {images.map((image) => (
        <div key={image.id}>{image.title}</div>
      ))}
    </div>
  );
}
```

## 🎨 Adding New Curated Images

### **Method 1: Using the Upload Script**

1. Edit `scripts/upload-curated-images.js`
2. Add your image data to the `curatedImagesData` array
3. Run: `node scripts/upload-curated-images.js`

### **Method 2: Manual Database Insert**

```sql
INSERT INTO public.curated_images (
  title, description, category, tags, image_url,
  width, height, aspect_ratio, display_order, is_featured
) VALUES (
  'My Artwork',
  'Beautiful digital art',
  'digital',
  ARRAY['digital', 'art', 'colorful'],
  'https://example.com/image.jpg',
  800, 600, 'wide', 10, true
);
```

### **Method 3: Using Supabase Dashboard**

1. Go to your Supabase dashboard
2. Navigate to Table Editor → curated_images
3. Click "Insert" and fill in the fields
4. Upload your image to the `curated-images` storage bucket

## 🔧 Configuration

### **Environment Variables:**

```env
# Required for upload script
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### **Storage Bucket Policies:**

```sql
-- Public read access
CREATE POLICY "Curated images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'curated-images');

-- Admin upload access (optional)
CREATE POLICY "Admins can upload curated images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'curated-images' AND
    auth.role() = 'authenticated'
  );
```

## 📈 Performance Benefits

### **Before (Old System):**

- ❌ Complex joins: `images` + `profiles` + `image_likes`
- ❌ RLS policies requiring authentication
- ❌ 10-second timeouts
- ❌ Inconsistent loading times
- ❌ User-dependent content

### **After (New System):**

- ✅ Simple single-table queries
- ✅ Public access, no authentication needed
- ✅ Fast, consistent loading
- ✅ Optimized indexes
- ✅ Curated, reliable content

## 🎯 Key Features

### **1. No Authentication Required**

- All visitors can see images immediately
- No login barriers
- Better user experience

### **2. Fast Loading**

- Simple database queries
- Optimized indexes
- No complex joins

### **3. Consistent Content**

- Manually curated images
- High-quality, reliable content
- No dependency on user uploads

### **4. Flexible Filtering**

- Category-based filtering
- Tag-based search
- Featured images
- Aspect ratio filtering

### **5. Infinite Scroll**

- Automatic pagination
- Smooth loading experience
- Performance optimized

## 🔍 Monitoring & Debugging

### **Check Database:**

```sql
-- View all curated images
SELECT id, title, category, is_featured, created_at
FROM curated_images
WHERE is_active = true
ORDER BY display_order;

-- Check storage bucket
SELECT * FROM storage.objects
WHERE bucket_id = 'curated-images';
```

### **API Testing:**

```bash
# Test main endpoint
curl "http://localhost:3000/api/curated-images?limit=5"

# Test featured endpoint
curl "http://localhost:3000/api/curated-images/featured?limit=3"

# Test with filters
curl "http://localhost:3000/api/curated-images?category=abstract&featured_only=true"
```

## 🚀 Deployment

### **1. Run Migration in Production:**

```bash
supabase db push --project-ref your-project-ref
```

### **2. Upload Images:**

```bash
# Set production environment variables
export NEXT_PUBLIC_SUPABASE_URL=your_production_url
export SUPABASE_SERVICE_ROLE_KEY=your_production_key

# Run upload script
node scripts/upload-curated-images.js
```

### **3. Verify Deployment:**

```bash
# Test production API
curl "https://your-domain.com/api/curated-images"
```

## 🎉 Benefits Summary

- ✅ **Fast Loading**: No more 10-second timeouts
- ✅ **No Authentication**: All visitors can see images
- ✅ **Consistent Content**: Curated, high-quality images
- ✅ **Better Performance**: Simple queries, optimized indexes
- ✅ **Reliable**: No dependency on user-generated content
- ✅ **Scalable**: Easy to add more curated images
- ✅ **Maintainable**: Simple architecture, easy to debug

This new system provides a much better foundation for your home page gallery! 🎨
