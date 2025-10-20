# 🔒 **Manual Privacy Fix Steps**

## 🚨 **Database Connection Issue**

The automated script failed due to a database connection issue. Here are the manual steps to apply the privacy fix:

## 🛠️ **Manual Application Steps**

### **Step 1: Apply the Migration**

```bash
# Run this command manually
supabase db push --include-all
```

If that fails, try:

```bash
# Alternative approach
supabase db reset --linked
```

### **Step 2: Verify the Fix**

After applying the migration, you can verify the fix by checking the RLS policies:

```sql
-- Check current RLS policies for images table
SELECT
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'images'
ORDER BY policyname;
```

## 📋 **What the Migration Does**

The migration file `supabase/migrations/20250120000001_fix_user_images_privacy.sql` will:

1. **Remove public access** to user images:

   ```sql
   DROP POLICY IF EXISTS "Images are viewable by everyone if public" ON public.images;
   ```

2. **Keep user images private**:

   ```sql
   CREATE POLICY "Users can view own images" ON public.images
     FOR SELECT USING (auth.uid() = user_id);
   ```

3. **Preserve curated images as public**:
   ```sql
   CREATE POLICY "Public can view curated images" ON public.curated_images
     FOR SELECT USING (is_active = true);
   ```

## 🧪 **Testing After Fix**

### **Test 1: User Images Privacy**

1. Login as a user
2. Generate some images
3. Verify you can only see your own images
4. Verify other users cannot see your images

### **Test 2: Curated Images Public Access**

1. Open the app in an incognito window (not logged in)
2. Verify you can see curated images on the home page
3. Verify the home page loads for non-authenticated users

## 🎯 **Expected Results**

- ✅ **User Images**: Private (only owner can see)
- ✅ **Curated Images**: Public (everyone can see on home page)
- ✅ **No Security Issues**: Clear separation between private and public content

## 🔧 **If Migration Fails**

If you continue to have database connection issues:

1. **Check your Supabase project status**
2. **Verify your database password**
3. **Try running the SQL directly in Supabase Dashboard**

You can also run the SQL commands directly in the Supabase Dashboard SQL Editor:

```sql
-- Remove public access to user images
DROP POLICY IF EXISTS "Images are viewable by everyone if public" ON public.images;
DROP POLICY IF EXISTS "Public images are viewable by everyone" ON public.images;

-- Ensure user images are only accessible by their owner
CREATE POLICY "Users can view own images" ON public.images
  FOR SELECT USING (auth.uid() = user_id);
```

## 🎉 **After Successful Application**

Once the migration is applied successfully:

- User images will be completely private
- Only curated images will be public
- Your image system will be secure
- No user data will be accidentally exposed

The fix ensures your image system follows the correct architecture where user images are always private and only curated images are public for the home page gallery.
