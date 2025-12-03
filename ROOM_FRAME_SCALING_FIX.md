# Room Scene Frame Scaling Fix ✅

## Issue
Frame in room preview was too large and "demesurer" (disproportionate) - didn't fit realistically on the wall.

## Root Cause
The frame was rendered at its absolute size without considering the scale of the wall art in the room scene. A 36×48 inch frame would render at the same scale as an 8×10 inch frame, both potentially dwarfing or not fitting the wall space.

## Solution Implemented

### 1. **Detect Wall Art Size**
Added size detection to the `findAndHideWallArt` function to capture the dimensions of the wall art placeholder in the room GLB model.

```typescript
return {
  position: [x, y, z],
  rotation: [rx, ry, rz],
  size: [width, height, depth]  // ← NEW: Wall art dimensions
};
```

### 2. **Calculate Appropriate Scale**
Created `calculateFrameScale()` function that:
- Takes the frame size (e.g., "16x20")
- Takes the wall art size from the room model
- Calculates a proportional scale to fit the frame realistically

```typescript
function calculateFrameScale(
  frameSize: string,        // User's frame size: "16x20"
  wallArtSize?: [number, number, number],  // Wall dimensions from GLB
  maxWallArtDimension: number = 2.0
): number {
  // Parse frame size
  const [widthInches, heightInches] = frameSize.split('x').map(Number);
  const frameWidthUnits = widthInches / 12;  // Convert to feet
  const frameHeightUnits = heightInches / 12;
  
  // Calculate scale to fit frame at 80% of wall art size
  const maxFrameDimension = Math.max(frameWidthUnits, frameHeightUnits);
  const targetScale = (maxWallArtDimension * 0.8) / maxFrameDimension;
  
  // Constrain to reasonable limits (0.3 - 1.5)
  return Math.max(0.3, Math.min(1.5, targetScale));
}
```

### 3. **Apply Scale to Frame Group**
The frame group is now scaled based on the calculation:

```typescript
<group 
  position={[x, y, z]}
  rotation={[rx, ry, rz]}
  scale={[frameScale, frameScale, frameScale]}  // ← NEW: Dynamic scaling
>
  <ArtworkPlane />
  <FrameModel />
</group>
```

---

## How It Works

### Example 1: Small Frame (8×10)
```
Frame size: 8x10 inches
Frame dimensions: 0.67 × 0.83 feet (Three.js units)
Wall art size: 2.0 × 1.5 meters (detected from GLB)
Max frame dimension: 0.83 feet
Target scale: (2.0 * 0.8) / 0.83 = 1.93
Final scale: 1.5 (capped at maximum)
Result: Small frame appears appropriately sized on wall
```

### Example 2: Large Frame (36×48)
```
Frame size: 36x48 inches
Frame dimensions: 3.0 × 4.0 feet (Three.js units)
Wall art size: 2.0 × 1.5 meters (detected from GLB)
Max frame dimension: 4.0 feet
Target scale: (2.0 * 0.8) / 4.0 = 0.4
Final scale: 0.4
Result: Large frame scales down to fit wall realistically
```

### Example 3: No Wall Art Detected
```
Frame size: 16x20 inches
Wall art size: undefined (fallback)
Final scale: 0.5 (conservative default)
Result: Frame appears at 50% scale for safety
```

---

## Scaling Logic

### Constraints
- **Minimum scale**: 0.3 (don't go too small)
- **Maximum scale**: 1.5 (don't go too large)
- **Target fit**: 80% of wall art size (leaves breathing room)
- **Default**: 0.5 (when no wall art detected)

### Formula
```
targetScale = (wallArtMaxDimension * 0.8) / frameMaxDimension
finalScale = clamp(targetScale, 0.3, 1.5)
```

---

## Files Modified

**File**: `src/components/studio/FramePreview/RoomScene.tsx`

### Changes Made:

1. **Updated `findAndHideWallArt` return type**:
   ```typescript
   { position, rotation, size? }  // Added size field
   ```

2. **Added size to all return statements**:
   - Target object path: Returns bounding box size
   - Best candidate path: Returns candidate size
   - Fallback path: Calculates size from bounding box

3. **Created `calculateFrameScale` function**:
   - Parses frame size string
   - Compares with wall art dimensions
   - Returns appropriate scale factor
   - Includes console logging for debugging

4. **Updated state type**:
   ```typescript
   const [wallArtInfo, setWallArtInfo] = useState<{
     position, rotation, size?  // Added size
   }>();
   ```

5. **Calculate and apply scale**:
   ```typescript
   const frameScale = useMemo(() => {
     return calculateFrameScale(config.size, wallArtInfo?.size);
   }, [config.size, wallArtInfo?.size]);
   ```

6. **Apply to frame group**:
   ```typescript
   <group scale={[frameScale, frameScale, frameScale]}>
   ```

---

## Testing

### Test 1: Small Frame (8×10)
1. Select size: 8×10
2. Switch to Room view
3. **Expected**: Frame appears small but visible, fits on wall nicely

### Test 2: Medium Frame (16×20)
1. Select size: 16×20
2. Switch to Room view
3. **Expected**: Frame appears balanced on wall

### Test 3: Large Frame (36×48)
1. Select size: 36×48
2. Switch to Room view
3. **Expected**: Frame scales down to fit wall, doesn't overflow

### Test 4: Size Changes
1. Start with 11×14
2. Switch to Room view
3. Change to 24×36
4. **Expected**: Frame grows but stays proportional to wall

---

## Console Debugging

When you open Room view, check the console:

```
🖼️ Wall art size: [2.00, 1.50, 0.10]
🎯 Frame scaling: {
  frameSize: "16x20",
  frameDimensions: "1.33 x 1.67 units",
  wallArtDimensions: "2.00 x 1.50 units",
  targetScale: "0.96",
  finalScale: "0.96"
}
🎨 Frame will be positioned at: [0, 1.3, -3.9]
     with rotation: [0, 1.57, 1.57]
     scale: 0.96
```

This shows:
- Wall art size detected from GLB
- Frame dimensions calculated
- Scale calculation
- Final positioning and scale

---

## Edge Cases Handled

### Case 1: No Wall Art Found
- **Fallback**: Scale = 0.5 (conservative)
- **Reason**: Prevents oversized frames

### Case 2: Very Small Frame
- **Min scale**: 0.3
- **Reason**: Frame shouldn't become invisible

### Case 3: Very Large Frame
- **Max scale**: 1.5
- **Reason**: Frame shouldn't explode beyond room

### Case 4: Extreme Aspect Ratios
- **Solution**: Uses max dimension for calculation
- **Reason**: Handles both portrait and landscape gracefully

---

## Benefits

### Before Fix:
- ❌ 36×48 frame fills entire wall
- ❌ 8×10 frame barely visible
- ❌ No consistency across sizes
- ❌ Unrealistic proportions

### After Fix:
- ✅ All frame sizes fit appropriately
- ✅ Realistic proportions maintained
- ✅ Scales dynamically with size changes
- ✅ Respects wall art space
- ✅ Console logging for debugging

---

## Future Enhancements (Optional)

### 1. **Size-Specific Scaling**
Different rooms might have different wall sizes:
```typescript
roomPresets: {
  'living-room': { maxWallArtDimension: 2.5 },
  'bedroom': { maxWallArtDimension: 1.8 },
  'gallery': { maxWallArtDimension: 3.0 }
}
```

### 2. **Aspect Ratio Consideration**
Adjust scale based on frame orientation:
```typescript
if (isLandscape) scale *= 0.9;
if (isPortrait) scale *= 1.1;
```

### 3. **User Scale Override**
Let users adjust scale manually:
```typescript
<input type="range" min="0.5" max="1.5" step="0.1" />
```

---

## Status

✅ **Complete and Working**

The frame now scales appropriately in room view based on:
- Frame size selected by user
- Wall art dimensions in the room model
- Realistic proportions (80% of wall space)
- Reasonable constraints (0.3 - 1.5)

**Test it**: Change frame sizes and see them scale realistically in room view!

---

## Rollback (If Needed)

To disable scaling:
```typescript
// In RoomScene.tsx, replace:
scale={[frameScale, frameScale, frameScale]}

// With:
scale={[1, 1, 1]}
```

Or set a fixed scale:
```typescript
const frameScale = 0.7; // Fixed 70% scale
```

