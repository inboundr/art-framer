# 🗑️ Storage Cleanup Guide

## 🎯 **Overview**

This guide provides multiple options for cleaning up Supabase Storage buckets, ensuring a complete reset of your Art Framer storage system.

## 🚀 **Quick Options**

### **Option 1: Automated Storage Cleanup**

```bash
# Clean up all storage buckets automatically
npm run db:cleanup-storage
```

### **Option 2: Safe Reset with Storage Cleanup**

```bash
# Reset database and clean storage in one command
npm run db:reset-safe
```

### **Option 3: Manual Cleanup via Supabase Dashboard**

1. Go to your Supabase project dashboard
2. Navigate to **Storage** section
3. Delete all files from each bucket:
   - `curated-images`
   - `user-images`
   - `images`
   - `uploads`
   - Any other custom buckets

## 📋 **What Gets Cleaned**

### **Storage Buckets Cleaned**

- ✅ **curated-images**: Public gallery images
- ✅ **user-images**: Private user-generated images
- ✅ **images**: Legacy image storage
- ✅ **uploads**: File uploads
- ✅ **public-images**: Any other custom buckets

### **Files Removed**

- ✅ **All image files** (JPG, PNG, WebP, etc.)
- ✅ **Thumbnail files**
- ✅ **Metadata files**
- ✅ **Temporary uploads**
- ✅ **Legacy files**

## 🛠️ **Script Details**

### **`scripts/cleanup-storage.js`**

**Features:**

- Lists all available storage buckets
- Identifies public vs private buckets
- Deletes all files from specified buckets
- Provides detailed cleanup summary
- Handles errors gracefully

**Usage:**

```bash
# Run the cleanup script
npm run db:cleanup-storage

# Or run directly
node scripts/cleanup-storage.js
```

**Output Example:**

```
🗑️  Starting Storage Cleanup...
==================================================

📋 Available storage buckets:
  - curated-images (public)
  - user-images (private)

🗑️  Cleaning up curated-images bucket...
📁 Found 206 files in curated-images bucket
✅ Successfully cleaned curated-images bucket

🗑️  Cleaning up user-images bucket...
📁 Found 15 files in user-images bucket
✅ Successfully cleaned user-images bucket

📊 Cleanup Summary:
✅ Successfully cleaned: 2 buckets
❌ Errors: 0 buckets
📁 Total buckets checked: 5

🎉 Storage cleanup completed successfully!
```

## 🔍 **Verification Steps**

### **1. Check Storage Buckets**

```bash
# After cleanup, verify buckets are empty
# Go to Supabase dashboard → Storage
# Each bucket should show 0 files
```

### **2. Test Application**

```bash
# Start the application
npm run dev

# Check that:
# - Home page loads without images
# - No broken image links
# - No storage-related errors
```

### **3. Re-seed if Needed**

```bash
# If you want to restore images
npm run db:seed-curated
```

## 🚨 **Troubleshooting**

### **Common Issues**

#### **1. Permission Denied**

```bash
# Error: Permission denied for storage bucket
# Solution: Check your SUPABASE_SERVICE_ROLE_KEY
echo $SUPABASE_SERVICE_ROLE_KEY
```

#### **2. Bucket Not Found**

```bash
# Error: Bucket 'curated-images' not found
# Solution: Bucket doesn't exist yet, this is normal
# The script will skip non-existent buckets
```

#### **3. Files Not Deleting**

```bash
# Error: Files still exist after cleanup
# Solution: Check bucket policies in Supabase dashboard
# Ensure service role has delete permissions
```

### **Manual Recovery**

If automated cleanup fails:

1. **Go to Supabase Dashboard**
2. **Navigate to Storage**
3. **Select each bucket**
4. **Delete files manually**
5. **Check bucket policies**

## 📊 **Storage Policies**

### **Required Policies for Cleanup**

```sql
-- Service role can delete from curated-images
CREATE POLICY "Service role can delete curated images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'curated-images' AND
    auth.role() = 'service_role'
  );

-- Service role can delete from user-images
CREATE POLICY "Service role can delete user images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'user-images' AND
    auth.role() = 'service_role'
  );
```

## 🎯 **Best Practices**

### **Before Cleanup**

1. **Backup important files** (if any)
2. **Check bucket contents** in dashboard
3. **Verify service role permissions**
4. **Test in development first**

### **After Cleanup**

1. **Verify buckets are empty**
2. **Check application functionality**
3. **Re-seed if needed**
4. **Monitor for any issues**

## 🚀 **Next Steps**

After successful storage cleanup:

1. **Reset Database**: `npm run db:reset`
2. **Seed Sample Data**: `npm run db:seed`
3. **Seed Curated Images**: `npm run db:seed-curated`
4. **Test Application**: `npm run dev`

## 🎉 **Success Indicators**

After cleanup, you should see:

- ✅ **Empty storage buckets** in Supabase dashboard
- ✅ **No broken image links** in application
- ✅ **Clean database** ready for new data
- ✅ **Fresh start** for development

Your storage system is now completely clean and ready for a fresh start! 🎯
