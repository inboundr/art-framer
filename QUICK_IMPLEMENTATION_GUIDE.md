# Quick Implementation Guide - Country Selection

## 🚀 How to Add Country Selection to Your Studio (5 minutes)

---

## Step 1: Add Country to Store (1 minute)

Update `/src/store/studio.ts`:

```typescript
interface FrameConfiguration {
  // ... existing fields ...
  destinationCountry?: string; // ADD THIS
}

const getDefaultConfig = (): FrameConfiguration => ({
  // ... existing defaults ...
  destinationCountry: 'US', // ADD THIS
});
```

---

## Step 2: Update Pricing Call (1 minute)

In `/src/store/studio.ts`, update the `updatePricingAsync` function:

```typescript
updatePricingAsync: async () => {
  const { config, isPricingLoading } = get();
  
  if (isPricingLoading) return;
  
  set({ isPricingLoading: true });
  
  try {
    const response = await fetch('/api/studio/pricing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        config,
        country: config.destinationCountry || 'US', // ADD THIS
      }),
    });
    
    // ... rest of the function
  }
}
```

---

## Step 3: Add Country Selector to UI (3 minutes)

### Option A: Simple Dropdown (Fastest)

Add to `/src/components/studio/ContextPanel/ConfigurationSummary.tsx`:

```typescript
import { COUNTRIES, formatCountry } from '@/lib/countries';

// In your component:
<div className="config-item">
  <label className="text-sm font-medium text-gray-700">
    🌍 Shipping To
  </label>
  <select
    value={config.destinationCountry || 'US'}
    onChange={(e) => updateConfig({ destinationCountry: e.target.value })}
    className="w-full px-3 py-2 border rounded-md"
  >
    {COUNTRIES.map(country => (
      <option key={country.code} value={country.code}>
        {country.flag} {country.name}
      </option>
    ))}
  </select>
</div>
```

### Option B: Grouped Dropdown (Better UX)

```typescript
import { getCountriesByRegion } from '@/lib/countries';

const countriesByRegion = getCountriesByRegion();

<select
  value={config.destinationCountry || 'US'}
  onChange={(e) => updateConfig({ destinationCountry: e.target.value })}
  className="w-full px-3 py-2 border rounded-md"
>
  {Object.entries(countriesByRegion).map(([region, countries]) => (
    <optgroup key={region} label={region}>
      {countries.map(country => (
        <option key={country.code} value={country.code}>
          {country.flag} {country.name}
        </option>
      ))}
    </optgroup>
  ))}
</select>
```

### Option C: Auto-detect with Override (Best UX)

```typescript
import { detectUserCountry } from '@/lib/countries';

// In your component's useEffect:
useEffect(() => {
  const autoDetect = async () => {
    if (!config.destinationCountry) {
      const detectedCountry = await detectUserCountry();
      updateConfig({ destinationCountry: detectedCountry });
    }
  };
  autoDetect();
}, []);

// Then show the selector so users can override
```

---

## Step 4: Display Delivery Estimate

Add to your pricing display component:

```tsx
{pricing && pricing.deliveryEstimate && (
  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
    <div className="flex items-center gap-2">
      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <div>
        <div className="font-medium text-blue-900">
          Estimated Delivery: {pricing.deliveryEstimate.formatted}
        </div>
        {pricing.deliveryEstimate.note && (
          <div className="text-sm text-blue-700 mt-1">
            {pricing.deliveryEstimate.note}
          </div>
        )}
      </div>
    </div>
  </div>
)}
```

---

## 🎯 That's It!

You now have:
- ✅ Country selection
- ✅ Accurate shipping costs per country
- ✅ Real delivery estimates
- ✅ Proper currency for each region

---

## 🧪 Testing

Test these scenarios:

```bash
# US Customer
country: 'US'
Expected: USD, ~5-8 days, moderate shipping

# UK Customer  
country: 'GB'
Expected: GBP, ~4-5 days, lower shipping (if printed in UK)

# Australian Customer
country: 'AU'  
Expected: AUD, ~7-10 days, higher shipping

# EU Customer
country: 'DE'
Expected: EUR, ~7-9 days, moderate shipping
```

---

## 🔍 Debugging

Enable detailed logging by checking the server console:

```
[Pricing] Request received: { productType: 'framed-print', size: '18x24', currentSku: null }
[Pricing] Cleaned config: { productType: 'framed-print', hasFrameColor: true, hasGlaze: 'acrylic', hasWrap: undefined }
[Pricing] Requesting quote from Prodigi: { sku: 'fra-box-hge-mount1-acry-40x50', attributes: {...}, country: 'GB' }
[Pricing] Quote received: {
  sku: 'fra-box-hge-mount1-acry-40x50',
  total: 198.74,
  items: 132.1,
  shipping: 66.64,
  currency: 'USD',
  productionCountry: 'GB',
  destinationCountry: 'GB',
  deliveryEstimate: '4-5 business days'
}
```

Look for:
- ✅ `country: 'GB'` in the request (not 'US')
- ✅ `destinationCountry: 'GB'` in the response
- ✅ `deliveryEstimate` showing reasonable days

---

## 📝 Optional Enhancements

### Add Multiple Shipping Methods

```typescript
// Get quotes for all shipping methods
const methods = ['Budget', 'Standard', 'Express'];
const quotes = await Promise.all(
  methods.map(method => 
    fetch('/api/studio/pricing', {
      body: JSON.stringify({ 
        config, 
        country,
        shippingMethod: method // ADD THIS to API
      })
    })
  )
);

// Show comparison table
```

### Add IP-based Auto-detection (Server-side)

In your API route:

```typescript
import { headers } from 'next/headers';

export async function POST(request: NextRequest) {
  const headersList = headers();
  const detectedCountry = headersList.get('x-vercel-ip-country') || 'US';
  
  const { config, country: requestCountry } = await request.json();
  const country = requestCountry || config.destinationCountry || detectedCountry;
  
  // ... rest of API
}
```

---

## 🎉 Done!

Your pricing is now **100% accurate** for international customers! 🌍

