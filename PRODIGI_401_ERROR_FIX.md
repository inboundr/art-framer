# 🔐 **PRODIGI 401 ERROR FIX - PRODUCTION ISSUE**

## Problem Identified

**Error in Production:**

```
2025-09-27T23:00:49.778Z [error] Error fetching Prodigi product details: Error: Prodigi API error: 401
    at d.request (.next/server/app/api/frames/images/route.js:1:8883)
    at async d.getProductDetails (.next/server/app/api/frames/images/route.js:1:9125)
```

## Root Cause Analysis

### **1. 401 Unauthorized Error**

- **Status Code**: 401 Unauthorized
- **Meaning**: Invalid or missing API key
- **Location**: Prodigi API calls in production
- **Impact**: Frame details API falling back to mock data

### **2. Possible Causes**

1. **Missing API Key**: `PRODIGI_API_KEY` not set in production environment
2. **Invalid API Key**: API key is incorrect or expired
3. **Wrong Environment**: Using sandbox key in production or vice versa
4. **Placeholder Key**: Still using `your_prodigi_api_key_here` placeholder

## Solution Implemented

### **1. Enhanced Error Handling**

#### **Before (Basic Error):**

```typescript
} catch (prodigiError) {
  console.error('Error fetching frame details from Prodigi:', prodigiError);
  // Basic fallback
}
```

#### **After (Enhanced Error Handling):**

```typescript
} catch (prodigiError) {
  console.error('❌ Error fetching frame details from Prodigi:', prodigiError);

  // Enhanced error logging for debugging
  if (prodigiError instanceof Error) {
    console.error('Prodigi error details:', {
      message: prodigiError.message,
      stack: prodigiError.stack,
      apiKey: process.env.PRODIGI_API_KEY ? 'Present' : 'Missing',
      environment: process.env.PRODIGI_ENVIRONMENT || 'Not set'
    });
  }

  // Fallback with error indication
  return NextResponse.json({
    success: true,
    frame: { /* mock data */ },
    fallback: true, // Indicate this is fallback data
    error: prodigiError instanceof Error ? prodigiError.message : 'Unknown Prodigi error'
  });
}
```

### **2. API Key Validation**

#### **Pre-Request Validation:**

```typescript
// Check if Prodigi API key is configured
const prodigiApiKey = process.env.PRODIGI_API_KEY;
if (
  !prodigiApiKey ||
  prodigiApiKey === "your_prodigi_api_key_here" ||
  prodigiApiKey === "your-prodigi-api-key-here"
) {
  console.warn("⚠️ Prodigi API key not configured, using fallback data");
  throw new Error("Prodigi API key not configured");
}
```

### **3. Enhanced Prodigi Client Error Handling**

#### **Specific 401 Error Handling:**

```typescript
if (response.status === 401) {
  console.error("❌ Prodigi API 401 Unauthorized:", {
    message: "Invalid or missing API key",
    apiKey: this.apiKey ? "Present but invalid" : "Missing",
    environment: this.environment,
    endpoint: endpoint,
    responseText: errorText,
  });
  throw new Error(
    `Prodigi API 401 Unauthorized: Invalid or missing API key. Check PRODIGI_API_KEY environment variable.`
  );
}
```

### **4. Comprehensive Logging**

#### **Request Logging:**

```typescript
console.log(`🌐 Prodigi API request: ${options.method || "GET"} ${url}`);
console.log(`🔑 API Key: ${this.apiKey ? "Present" : "Missing"}`);
console.log(`🌍 Environment: ${this.environment}`);
```

#### **Response Logging:**

```typescript
console.log(`✅ Prodigi API response successful: ${endpoint}`);
```

## Production Configuration

### **1. Environment Variables Required**

#### **Production Environment:**

```bash
# Prodigi Configuration
PRODIGI_API_KEY=your_actual_prodigi_api_key
PRODIGI_ENVIRONMENT=production
PRODIGI_WEBHOOK_SECRET=your_webhook_secret
```

#### **Development Environment:**

```bash
# Prodigi Configuration
PRODIGI_API_KEY=your_sandbox_prodigi_api_key
PRODIGI_ENVIRONMENT=sandbox
PRODIGI_WEBHOOK_SECRET=your_webhook_secret
```

### **2. API Key Validation**

#### **Check Current Configuration:**

```bash
# Check if API key is set
echo $PRODIGI_API_KEY

# Check environment
echo $PRODIGI_ENVIRONMENT
```

#### **Test API Key:**

```bash
# Test with curl
curl -X GET "https://api.sandbox.prodigi.com/v4.0/products" \
  -H "X-API-Key: your_actual_api_key"
```

## Debugging Steps

### **1. Check Production Logs**

Look for these log messages:

- `🌐 Prodigi API request: GET https://api.prodigi.com/v4.0/products/...`
- `🔑 API Key: Present` or `🔑 API Key: Missing`
- `❌ Prodigi API 401 Unauthorized:` (if error occurs)

### **2. Verify Environment Variables**

#### **In Production:**

```bash
# Check environment variables
env | grep PRODIGI
```

#### **Expected Output:**

```bash
PRODIGI_API_KEY=your_actual_api_key
PRODIGI_ENVIRONMENT=production
PRODIGI_WEBHOOK_SECRET=your_webhook_secret
```

### **3. Test API Connectivity**

#### **Test Endpoint:**

```bash
curl -X GET "https://api.prodigi.com/v4.0/products" \
  -H "X-API-Key: your_actual_api_key" \
  -H "Content-Type: application/json"
```

#### **Expected Response:**

```json
{
  "outcome": "Ok",
  "products": [...]
}
```

## Common Issues and Solutions

### **Issue 1: API Key Not Set**

**Error**: `🔑 API Key: Missing`
**Solution**: Set `PRODIGI_API_KEY` environment variable

### **Issue 2: Invalid API Key**

**Error**: `❌ Prodigi API 401 Unauthorized`
**Solution**: Verify API key is correct and active

### **Issue 3: Wrong Environment**

**Error**: API works in sandbox but fails in production
**Solution**: Use production API key for production environment

### **Issue 4: Placeholder Key**

**Error**: API key is `your_prodigi_api_key_here`
**Solution**: Replace with actual API key from Prodigi dashboard

## Monitoring and Alerts

### **1. Log Monitoring**

Watch for these patterns:

- `⚠️ Prodigi API key not configured` - Missing configuration
- `❌ Prodigi API 401 Unauthorized` - Invalid API key
- `🔄 Using fallback mock data` - Fallback mode active

### **2. Health Check Endpoint**

Create a health check endpoint:

```typescript
// GET /api/health/prodigi
export async function GET() {
  try {
    const testProduct =
      await prodigiClient.getProductDetails("GLOBAL-CAN-10x10");
    return NextResponse.json({
      status: "healthy",
      prodigi: "connected",
      environment: process.env.PRODIGI_ENVIRONMENT,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        prodigi: "disconnected",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
```

## Deployment Checklist

### **Pre-Deployment:**

- [ ] Verify `PRODIGI_API_KEY` is set in production environment
- [ ] Confirm `PRODIGI_ENVIRONMENT=production` for live environment
- [ ] Test API key with curl command
- [ ] Check that API key has required permissions

### **Post-Deployment:**

- [ ] Monitor logs for 401 errors
- [ ] Test frame details API endpoint
- [ ] Verify fallback data is working if API fails
- [ ] Check health check endpoint

## Expected Results

### **Before Fix:**

```json
{
  "error": "Prodigi API error: 401",
  "success": false
}
```

### **After Fix:**

```json
{
  "success": true,
  "frame": {
    "sku": "GLOBAL-CAN-10x10",
    "name": "Standard canvas on quality stretcher bar",
    "price": 29.99,
    "dimensions": { "width": 10, "height": 10, "units": "in" }
  },
  "fallback": false
}
```

### **With Fallback (API Key Missing):**

```json
{
  "success": true,
  "frame": {
    "sku": "GLOBAL-CAN-10x10",
    "name": "small black wood frame",
    "price": 29.99,
    "dimensions": { "width": 20, "height": 25, "depth": 2 }
  },
  "fallback": true,
  "error": "Prodigi API key not configured"
}
```

## Next Steps

1. **Set Real API Key**: Replace placeholder with actual Prodigi API key
2. **Test in Production**: Verify API calls work correctly
3. **Monitor Logs**: Watch for any remaining 401 errors
4. **Update Documentation**: Keep API key management documented

---

_Prodigi 401 Error Fix Documentation_
_Last Updated: $(date)_
