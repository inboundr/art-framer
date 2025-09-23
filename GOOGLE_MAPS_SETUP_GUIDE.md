# 🗺️ **GOOGLE MAPS SETUP GUIDE**

## **Quick Setup for 100% Shipping Calculation**

### **Step 1: Get Google Maps API Key**

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Create new project or select existing one

2. **Enable Required APIs**

   ```bash
   # Enable these APIs:
   - Places API
   - Maps JavaScript API
   - Geocoding API (optional, for enhanced validation)
   ```

3. **Create API Key**
   - Go to "Credentials" → "Create Credentials" → "API Key"
   - Copy the generated API key

### **Step 2: Configure API Key Restrictions**

**For Security - IMPORTANT:**

1. **Application Restrictions:**

   ```
   HTTP referrers (web sites)
   Add these patterns:
   - localhost:*
   - 127.0.0.1:*
   - your-domain.com/*
   - *.your-domain.com/*
   ```

2. **API Restrictions:**
   ```
   Restrict key to specific APIs:
   ✅ Places API
   ✅ Maps JavaScript API
   ✅ Geocoding API
   ```

### **Step 3: Add to Environment**

```bash
# Add to your .env.local file:
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyC-your-actual-api-key-here
```

### **Step 4: Test Integration**

1. **Start Development Server:**

   ```bash
   npm run dev
   ```

2. **Test Address Autocomplete:**
   - Go to checkout page
   - Start typing an address in the "Street Address" field
   - You should see Google Places suggestions appear

3. **Verify Shipping Calculation:**
   - Select a suggested address
   - Shipping cost should calculate automatically
   - Look for "✅ Verified" indicator

### **Step 5: Billing Setup (Important)**

**Google Maps APIs are NOT free beyond quotas:**

1. **Enable Billing Account**
   - Required even for free tier usage
   - Set up billing in Google Cloud Console

2. **Set Usage Limits (Recommended):**

   ```
   Places API: $200/month limit
   Maps JavaScript API: $200/month limit
   ```

3. **Monitor Usage:**
   - Check Google Cloud Console regularly
   - Set up billing alerts

### **Pricing Reference (2024):**

- **Places API:** $17 per 1000 requests
- **Maps JavaScript API:** $7 per 1000 loads
- **Free Tier:** $200 credit monthly per API

### **Troubleshooting**

**API Key Not Working:**

- ✅ Check API key is correct in .env.local
- ✅ Verify APIs are enabled
- ✅ Check domain restrictions
- ✅ Ensure billing is enabled

**Address Suggestions Not Appearing:**

- ✅ Check browser console for errors
- ✅ Verify network requests in DevTools
- ✅ Test with different addresses
- ✅ Check API quotas not exceeded

**Shipping Still Shows $0.00:**

- ✅ Address must be complete (street, city, state, zip)
- ✅ Check API response in Network tab
- ✅ Fallback system should still work
- ✅ Look for console error messages

### **Production Deployment**

1. **Update Domain Restrictions:**

   ```
   Add your production domains:
   - yourdomain.com/*
   - *.yourdomain.com/*
   ```

2. **Environment Variables:**

   ```bash
   # Add to production environment:
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key
   ```

3. **Monitor Usage:**
   - Set up billing alerts
   - Monitor API usage dashboards
   - Consider implementing usage analytics

### **Fallback System**

**Even without Google Maps, shipping calculation works:**

- Users can enter addresses manually
- Intelligent estimation system provides costs
- 100% reliability guaranteed

**The system gracefully degrades:**

1. **Best:** Google Maps + Prodigi API
2. **Good:** Manual entry + Prodigi API
3. **Fallback:** Manual entry + Intelligent estimation

---

## **🎯 Success Indicators**

✅ **Address Autocomplete Working**
✅ **Shipping Costs Calculate Instantly**  
✅ **"Verified" Status Shows for Google Places**
✅ **Fallback Works When API Disabled**
✅ **No Console Errors**

**Your checkout now provides professional address validation and guaranteed shipping calculation!** 🚀

---

_For support: Check browser console for errors and verify all setup steps above._
