# Pending Cart Image - Frame Selector Modal Fix

## ✅ **FIXED**

---

## Problem

When users clicked "Order Frame" while **not logged in**:
1. Image was stored in `localStorage` as `pending-cart-image`
2. User logged in via AuthModal
3. **After login**, the OLD "Choose Your Frame" modal opened instead of redirecting to studio

## Root Cause

The **pending cart logic** in both gallery components was still using the OLD frame selector modal flow:

### **CuratedImageGallery.tsx** (lines 258-259)
```typescript
// ❌ OLD FLOW: Opens modal
setFrameSelectorImage(curatedImage);
setShowFrameSelector(true);
```

### **UserImageGallery.tsx** (lines 192-193)
```typescript
// ❌ OLD FLOW: Opens modal  
setFrameSelectorImage(userImage);
setShowFrameSelector(true);
```

This conflicted with the NEW flow where "Order Frame" should redirect to `/studio`.

---

## Solution

Updated the pending cart logic in both components to **redirect to studio** instead of opening the modal:

### **CuratedImageGallery.tsx** ✅
```typescript
if (isRecent) {
  console.log('🛒 Found pending cart image after login:', pendingImage);
  
  // Normalize the image URL
  let publicUrl = pendingImage.image_url;
  if (!pendingImage.image_url.startsWith('http://') && !pendingImage.image_url.startsWith('https://')) {
    const { data } = supabase.storage.from('curated-images').getPublicUrl(pendingImage.image_url);
    publicUrl = data?.publicUrl || pendingImage.image_url;
  }
  
  // Set the image in studio store
  setImage(publicUrl, pendingImage.id);
  
  // Clear the pending image
  localStorage.removeItem('pending-cart-image');
  
  console.log('🎨 CuratedImageGallery: Redirecting to studio with pending image');
  
  // Small delay to ensure session persists
  setTimeout(() => {
    router.push('/studio');
  }, 100);
}
```

### **UserImageGallery.tsx** ✅
```typescript
if (isRecent) {
  console.log('🛒 Found pending cart image after login:', pendingImage);
  
  // Normalize the image URL
  const normalizeUrl = (url?: string | null) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    try {
      const { data } = supabase.storage.from('images').getPublicUrl(url);
      return data?.publicUrl || url;
    } catch {
      return url;
    }
  };
  
  const publicUrl = normalizeUrl(pendingImage.image_url);
  
  // Set the image in studio store
  setImage(publicUrl, pendingImage.id);
  
  // Clear the pending image
  localStorage.removeItem('pending-cart-image');
  
  console.log('🎨 UserImageGallery: Redirecting to studio with pending image');
  
  // Small delay to ensure session persists
  setTimeout(() => {
    router.push('/studio');
  }, 100);
}
```

---

## Files Modified

1. **`src/components/CuratedImageGallery.tsx`**
   - Updated pending cart logic (lines 233-265)
   - Now redirects to studio instead of opening modal

2. **`src/components/UserImageGallery.tsx`**
   - Updated pending cart logic (lines 174-199)
   - Now redirects to studio instead of opening modal

---

## How It Works Now

### **Unauthenticated User Flow**
1. User clicks "Order Frame" on an image
2. Image stored in `localStorage` as `pending-cart-image`
3. AuthModal opens
4. User logs in
5. **After login:** Image loaded into studio store
6. **Redirects to `/studio`** ✅
7. User can customize frame and add to cart

### **Authenticated User Flow**
1. User clicks "Order Frame" on an image
2. **Directly redirects to `/studio`** ✅
3. User can customize frame and add to cart

---

## Testing Checklist

### **Unauthenticated User**
- [ ] Click "Order Frame" on curated image → should prompt login
- [ ] After login → should redirect to studio (NOT open modal)
- [ ] Image should be loaded in studio preview
- [ ] Session should persist

### **Authenticated User**
- [ ] Click "Order Frame" on curated image → should redirect to studio immediately
- [ ] Click "Order Frame" on user image → should redirect to studio immediately
- [ ] No modal should appear
- [ ] Session should persist

---

## Related Fixes

This fix is part of the larger **Authentication Session Persistence** improvement:
- See `AUTH_SESSION_FIX.md` for full auth fix documentation
- See `AUTH_FIX_SUMMARY.md` for quick reference

---

## Logging & Debugging

All pending cart operations are logged:
- 🛒 **Pending cart**: Image stored/retrieved from localStorage
- 🎨 **Redirect**: Redirecting to studio
- 🔄 **Closing**: Closing modals (should no longer happen)

Check browser console for these logs during testing.

---

## Conclusion

The "Choose Your Frame" modal will **no longer appear** when:
1. Unauthenticated users click "Order Frame" and then log in
2. Authenticated users click "Order Frame"

All "Order Frame" buttons now **consistently redirect to `/studio`** as intended.

