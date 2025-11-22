# 3D Preview Testing Guide

## 🧪 **How to Test the Fixes**

Run through these scenarios to verify 100% accuracy:

---

## 📝 **Test Checklist**

### **Test 1: Product Type Switching**

1. Start with **Framed Print** (black frame, acrylic glaze)
2. Switch to **Canvas**
   - ✅ Frame should disappear
   - ✅ Black wrap edges should appear
   - ✅ Glaze should disappear
3. Switch to **Framed Canvas**
   - ✅ Frame should reappear (black)
   - ✅ Wrap edges should remain visible
   - ✅ Glaze should stay hidden
4. Switch back to **Framed Print**
   - ✅ Wrap should disappear
   - ✅ Glaze should reappear
   - ✅ Frame should stay visible

---

### **Test 2: Frame Color Changes**

With **Framed Print** selected:

1. Change frame color: black → white
   - ✅ Frame should turn white immediately
2. Change to gold
   - ✅ Frame should become metallic gold
3. Change to natural
   - ✅ Frame should become wood-toned
4. Change to silver
   - ✅ Frame should become metallic silver

---

### **Test 3: Wrap Color Changes**

With **Canvas** selected:

1. Change wrap: Black → White
   - ✅ All 4 canvas edges should turn white
2. Change to ImageWrap
   - ✅ Edges should turn dark gray (indicating image wrap)
3. Change to MirrorWrap
   - ✅ Edges should turn light gray (indicating mirror effect)
4. Back to Black
   - ✅ Edges should turn black

---

### **Test 4: Glaze Types**

With **Framed Print** selected:

1. Glaze: acrylic
   - ✅ Slight reflection/gloss visible
2. Change to motheye
   - ✅ Less reflective, ultra-clear
3. Change to glass
   - ✅ More reflective than acrylic
4. Change to none
   - ✅ Glaze layer disappears completely

---

### **Test 5: Mount/Mat**

With **Framed Print** selected:

1. Mount: none → 2.0mm
   - ✅ White mat border appears around artwork
2. Change mount color: white → cream
   - ✅ Mat color changes to cream
3. Change to off-white
   - ✅ Mat becomes slightly off-white
4. Change mount: 2.0mm → none
   - ✅ Mat disappears

---

### **Test 6: Size Changes**

1. Start with 16x20
2. Change to 24x36
   - ✅ Frame proportions update
   - ✅ All elements scale correctly
3. Change to 8x10
   - ✅ Everything scales down
4. Change to 36x48
   - ✅ Large size renders correctly

---

### **Test 7: Acrylic Product**

1. Switch to **Acrylic**
   - ✅ Clear acrylic overlay appears
   - ✅ Frame/wrap/mount all hidden
2. Change finish (if available)
   - ✅ Glossiness changes

---

### **Test 8: Metal Product**

1. Switch to **Metal**
   - ✅ Metallic appearance
   - ✅ Frame/wrap/mount all hidden
2. Change finish (if available)
   - ✅ Reflectivity changes

---

## 🎯 **Quick Validation Test**

**Do this test to verify everything works:**

```
1. Product Type: Framed Print
2. Frame Color: black
3. Glaze: acrylic
4. Mount: 2.0mm
5. Mount Color: white
6. Size: 18x24

THEN:

7. Switch Product Type to Canvas
   - Frame disappears ✅
   - Wrap appears (Black) ✅
   - Mount disappears ✅
   - Glaze disappears ✅

8. Change Wrap to White
   - Edges turn white ✅

9. Switch Product Type to Framed Canvas
   - Frame reappears (black) ✅
   - Wrap stays (white edges) ✅
   - Glaze stays hidden ✅
   - Mount stays hidden ✅

10. Change Frame Color to gold
    - Frame turns gold ✅

11. Change Size to 24x36
    - Everything scales up ✅

12. Switch Product Type to Acrylic
    - Frame disappears ✅
    - Wrap disappears ✅
    - Acrylic overlay appears ✅
```

**If all ✅ pass, your 3D preview is 100% accurate!**

---

## 🐛 **Debugging Issues**

If something doesn't update:

1. **Open browser console** (F12)
2. Look for errors in the console
3. Check that config is updating in the store:
   ```javascript
   // In console:
   window.localStorage.getItem('studio-storage')
   ```
4. Verify Three.js is rendering:
   - You should see the 3D scene
   - No blank canvas
5. Check network tab for API errors

---

## 📸 **Visual Reference**

### **Framed Print (Black, Acrylic Glaze, White Mount)**
- Black frame border
- Clear glass-like layer over artwork
- White mat border inside frame
- Artwork in center

### **Canvas (Black Wrap)**
- No frame
- Black edges on all 4 sides
- Beige backing visible
- Artwork on front

### **Framed Canvas (Black Frame, White Wrap)**
- Black frame border
- White canvas edges visible
- No glaze layer
- Artwork in center

### **Acrylic (Glossy)**
- No frame
- Clear acrylic overlay (shiny)
- Artwork directly visible through acrylic

### **Metal (Brushed)**
- No frame
- Metallic sheen on surface
- Artwork appears printed on metal

---

## ✅ **Expected Behavior**

### **Instant Updates**
- All changes should reflect **immediately** (< 100ms)
- No lag or delay
- Smooth transitions

### **No Glitches**
- No flickering
- No white flashes
- No missing elements
- No console errors

### **Correct Visibility**
- Right elements show for each product type
- No "ghost" elements from previous config
- Colors match exactly

---

## 🎉 **Success Criteria**

Your 3D preview is working perfectly if:

- ✅ Every configuration change updates the 3D model
- ✅ Colors match what you selected
- ✅ Product type switching works flawlessly
- ✅ No visual glitches or artifacts
- ✅ Size changes scale everything correctly
- ✅ Wrap/glaze/mount appear only when appropriate
- ✅ Materials look realistic (metallic, glossy, matte)

**If all above pass → 100% accuracy achieved!** 🎯

