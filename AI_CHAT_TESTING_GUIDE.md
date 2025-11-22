# AI Chat Testing Guide

## 🧪 **Quick Test Scenarios**

---

## ✅ **Test 1: Basic Frame Color Change**

### **Input:**
```
User: "Try a black frame"
```

### **Expected Output:**

**AI Message:**
> "✅ Changed to a black frame! This gives a modern, elegant look that works with most artwork."

**Suggestion Card:**
```
🔵 Change Frame to Black        90% confident
Change from white to black

Proposed Changes:
• Frame Color: white → black

Why this suggestion?
Black frames create a modern, elegant look that works with most artwork

[ ✓ Accept ]  [ × Reject ]
```

### **After Clicking Accept:**
1. ✅ 3D preview immediately shows black frame
2. ✅ Configuration panel shows "Frame Color: black"
3. ✅ Confirmation message: "✅ Applied! Change Frame to Black has been updated."
4. ✅ Pricing recalculates (may change slightly)

---

## ✅ **Test 2: Size Change with Price Impact**

### **Input:**
```
User: "Make it bigger"
```

### **Expected Output:**

**AI Message:**
> "✅ Increased size to 24x30"! This creates more presence on your wall."

**Suggestion Card:**
```
🔵 Resize to 24x30"        85% confident
Change from 16x20 to 24x30

Proposed Changes:
• Size: 16x20 → 24x30

Price Impact:
Estimated Total: $149.99 → $189.99
📈 Adds $40.00

Why this suggestion?
Larger size creates more presence on your wall

[ ✓ Accept ]  [ × Reject ]
```

### **After Clicking Accept:**
1. ✅ 3D preview scales to larger size
2. ✅ Size selector shows "24x30"
3. ✅ Real pricing fetched from Prodigi
4. ✅ Price updates to actual amount

---

## ✅ **Test 3: Add Mount (Mat)**

### **Input:**
```
User: "Add a mount"
```

### **Expected Output:**

**AI Message:**
> "✅ Added a 2.4mm mount! This creates breathing room around your artwork and adds elegance."

**Suggestion Card:**
```
🔵 Add 2.4mm Mount        90% confident
Set mount to 2.4mm

Proposed Changes:
• Mount: none → 2.4mm

Price Impact:
Estimated Total: $149.99 → $161.99
📈 Adds $12.00

Why this suggestion?
A mount creates breathing room around your artwork and adds a professional, gallery-quality look

[ ✓ Accept ]  [ × Reject ]
```

### **After Clicking Accept:**
1. ✅ 3D preview shows white mat border around art
2. ✅ Configuration shows "Mount: 2.4mm"
3. ✅ Price updates with actual mount cost

---

## ✅ **Test 4: Multiple Suggestions**

### **Input:**
```
User: "Recommend something modern"
```

### **Expected Output:**

**AI Message:**
> "For a modern look, I recommend these options:"

**Multiple Suggestion Cards:**

**Card 1:**
```
🔵 Change Frame to Black
Modern, minimalist aesthetic
[ Accept ] [ Reject ]
```

**Card 2:**
```
🔵 Add Motheye Glaze
Premium UV protection + anti-glare
Price: +$25.00
[ Accept ] [ Reject ]
```

**Card 3:**
```
🔵 Remove Mount
Clean, borderless look
Price: -$12.00
[ Accept ] [ Reject ]
```

### **User Can:**
- Accept all 3 ✅
- Accept only some ✅
- Reject all ✅
- Mix and match ✅

---

## ✅ **Test 5: Product Type Switch**

### **Input:**
```
User: "Make it a canvas"
```

### **Expected Output:**

**AI Message:**
> "✅ Switching to canvas! This gives a contemporary, gallery-wrapped look."

**Suggestion Card:**
```
🔵 Switch to Canvas        85% confident
Change product type

Proposed Changes:
• Product Type: framed-print → canvas
• Wrap: Black (added)
• Frame Color: removed
• Glaze: removed

Why this suggestion?
Canvas creates a contemporary, gallery-wrapped look without a traditional frame

[ ✓ Accept ]  [ × Reject ]
```

### **After Clicking Accept:**
1. ✅ 3D preview removes frame
2. ✅ 3D preview shows black canvas edges
3. ✅ Configuration hides frame/glaze options
4. ✅ Configuration shows wrap selector
5. ✅ Pricing updates for canvas product

---

## ✅ **Test 6: Reject Suggestion**

### **Input:**
```
User: "Try gold frame"
```

**AI shows suggestion card for gold frame**

**User clicks "Reject"**

### **Expected Output:**

**Confirmation Message:**
> "Okay, I won't apply 'Change Frame to Gold'. Let me know if you'd like something different!"

**Result:**
- ❌ No changes to configuration
- ❌ No changes to 3D preview
- ❌ No pricing update
- ✅ Suggestion card disappears
- ✅ User can continue chatting

---

## ✅ **Test 7: Complex Multi-Step**

### **Input:**
```
User: "I want a large black frame with a white mount and premium glaze for my abstract painting"
```

### **Expected Output:**

**AI Message:**
> "Perfect! I'll set you up with a large, sophisticated frame setup for your abstract painting:"

**Multiple Suggestion Cards:**

**Card 1:**
```
🔵 Resize to 24x36"
Large, statement-making size
Price: +$40.00
[ Accept ] [ Reject ]
```

**Card 2:**
```
🔵 Change Frame to Black
Modern, elegant aesthetic
No price change
[ Accept ] [ Reject ]
```

**Card 3:**
```
🔵 Add 2.4mm Mount (White)
Professional gallery look
Price: +$12.00
[ Accept ] [ Reject ]
```

**Card 4:**
```
🔵 Upgrade to Motheye Glaze
99% UV protection, anti-glare
Price: +$25.00
[ Accept ] [ Reject ]
```

### **After Accepting All:**
1. ✅ Large size (24x36")
2. ✅ Black frame
3. ✅ White mat border
4. ✅ Premium glaze overlay
5. ✅ Total price: ~$227.00 (real Prodigi pricing)

---

## 🎯 **Commands to Test**

### **Frame Colors:**
- "Try a white frame"
- "Change to natural wood"
- "Make it gold"
- "Silver frame please"
- "I want black"

### **Sizes:**
- "Make it bigger"
- "Try 20x30"
- "I want 8x10"
- "Make it smaller"
- "Show me 36x48"

### **Mounts:**
- "Add a mount"
- "Add a white mount"
- "Black mat please"
- "Remove the mount"
- "Add a cream mount"

### **Glazing:**
- "Add premium glaze"
- "Upgrade to motheye"
- "Remove the glaze"
- "Acrylic glass please"

### **Canvas:**
- "Make it a canvas"
- "Try image wrap"
- "White edges"
- "Mirror wrap please"

### **Product Types:**
- "Show me as acrylic"
- "Make it metal print"
- "Switch to framed canvas"
- "Back to framed print"

### **Multiple Changes:**
- "Make it modern" (suggests black frame, remove mount)
- "Traditional look" (suggests gold/natural, add mount)
- "Budget-friendly" (suggests smaller size, basic glaze)
- "Premium version" (suggests larger, motheye glaze, mount)

### **Questions:**
- "What colors work?"
- "Suggest something"
- "Recommend options"
- "What's a mount?"
- "What's the difference between glazes?"

---

## 🐛 **Debugging Checklist**

If suggestions don't appear:

1. **Check Browser Console**
   - Look for errors
   - Check if API responded with `suggestions` array

2. **Check Network Tab**
   - POST to `/api/studio/chat`
   - Response should include `suggestions: [...]`

3. **Check Zustand Store**
   ```javascript
   // In browser console:
   window.localStorage.getItem('studio-storage')
   // Should show pendingSuggestions array
   ```

4. **Check Component Rendering**
   - Message should have `suggestions` property
   - `SuggestionCard` should be in DOM
   - Check for CSS issues (hidden elements)

5. **Check AI Response**
   - Console log in `/api/studio/chat/route.ts`
   - Should show: `[Chat] Returning suggestions:` with array

---

## ✅ **Success Indicators**

Your system is working perfectly if:

- ✅ Every chat message with a change shows a suggestion card
- ✅ Suggestion cards have accept/reject buttons
- ✅ Clicking accept updates the 3D preview immediately
- ✅ Pricing recalculates after accepting
- ✅ Confirmation messages appear
- ✅ Multiple suggestions can coexist
- ✅ Rejected suggestions disappear
- ✅ No console errors
- ✅ Loading spinner shows while applying
- ✅ Changes persist after page refresh

---

## 🎉 **Example Session**

```
User: "Hey, I just uploaded a photo"
AI: "Great! Let's create the perfect frame. What style are you going for?"

User: "Something modern"
AI: "For a modern look, I recommend:" [Shows black frame suggestion]

User: [Clicks Accept]
AI: "✅ Applied! Your frame is now black."

User: "Make it bigger"
AI: "I'll resize it to 24x30"" [Shows size change with price]

User: [Clicks Accept]
AI: "✅ Applied! Your frame is now 24x30"."

User: "Perfect! What about protecting it?"
AI: "I recommend motheye glaze for protection" [Shows glaze upgrade]

User: [Clicks Accept]
AI: "✅ Applied! Premium glaze added."

Result: Modern 24x30" black frame with motheye glaze
Price: Real Prodigi pricing (~$190)
Time: < 2 minutes
Clicks: 3 accepts
```

---

## 🚀 **Power User Tips**

### **Batch Acceptance:**
If AI suggests 3 things and you like all 3, accept them in order:
1. First accept → updates config + 3D
2. Second accept → updates config + 3D
3. Third accept → updates config + 3D

Each builds on the previous!

### **Quick Rejection:**
Don't like a suggestion? Just say:
- "No thanks"
- "Try something else"
- "I don't like that"
- Or click Reject button

### **Comparison:**
Say "Show me options" to get multiple suggestions at once, then cherry-pick!

### **Specific Requests:**
Be specific for better suggestions:
- ❌ "Change it"
- ✅ "Change to a white frame with a black mount"

---

## 💬 **Test Result Template**

Use this template to report testing:

```
Test: [Name]
Input: "[User message]"
Expected: [What should happen]
Actual: [What happened]
Status: ✅ Pass / ❌ Fail
Issues: [Any problems]
```

Example:
```
Test: Frame Color Change
Input: "Try black frame"
Expected: Suggestion card with accept/reject
Actual: Suggestion appeared, worked perfectly
Status: ✅ Pass
Issues: None
```

---

Your AI chat is now **fully functional** with Cursor-style suggestions! 🎉

