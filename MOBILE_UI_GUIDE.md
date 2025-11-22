# 📱 Mobile UI Guide - Visual Reference

## Quick Overview

This guide shows the mobile UI patterns and interactions for the AI Studio.

---

## 📱 Mobile Layout Flow

### 1. Initial State (No Image)
```
┌───────────────────────────┐
│ Art Framer      [💬] [⚙️] │ ← Header with toggle buttons
├───────────────────────────┤
│                           │
│         🖼️                │
│   Upload your artwork     │
│                           │
│   Drag and drop or        │
│   click to browse         │
│                           │
│   [Choose File]           │
│                           │
│         ───or───          │
│                           │
│ [✨ Generate Art with AI] │
│                           │
└───────────────────────────┘
```

---

### 2. Main View (With Image)
```
┌───────────────────────────┐
│ Art Framer      [💬] [⚙️] │ ← Tap to open drawers
├───────────────────────────┤
│ [🖼️][🏠][📱][⚖️]  [Show] │ ← View modes (icons only)
│                           │
│                           │
│        3D Preview         │ ← Full-screen preview
│      (Interactive)        │
│                           │
│                           │
├───────────────────────────┤
│ [16x20 ▼] [↶][↷][▶️]     │ ← Compact controls
└───────────────────────────┘
```

**Interactions:**
- **Pinch**: Zoom in/out
- **Swipe**: Rotate frame
- **Tap [💬]**: Open chat drawer
- **Tap [⚙️]**: Open config drawer

---

### 3. Chat Drawer (Bottom Sheet)
```
┌───────────────────────────┐
│ Art Framer      [💬] [⚙️] │
├───────────────────────────┤
│                           │
│        3D Preview         │ ← Blurred/dimmed
│      (Background)         │
│                           │
└─────────┬─────────────────┘
          │                    ↑
          │   ┌──────────┐     │
          │   │   ━━━━   │     │ Swipe down
          │   ├──────────┤     │ to close
          │   │AI Assist │[×]  │
          │   ├──────────┤     │
          │   │          │     │
          │   │ Messages │     │
          │   │  here    │     │
          │   │          │     │
80vh max  │   ├──────────┤     │
height    │   │[🎨][📏]  │     │ Quick actions
          │   ├──────────┤     │
          │   │Type here │     │
          │   │    [Send]│     │
          └───┴──────────┴─────┘
```

**Gestures:**
- **Tap backdrop**: Close drawer
- **Swipe down on handle**: Dismiss
- **Scroll**: Messages scroll inside

---

### 4. Config Drawer (Side Panel)
```
┌────────┬──────────────────┐
│ Art Fr │ Configuration [×]│ ← Slides from right
├────────┤                  │
│        │ 📦 Product Type  │
│ 3D     │    [Framed ▼]    │
│ (Dim)  │                  │
│        │ 🖼️ Size          │
│        │    [16x20 ▼]     │
│        │                  │
│        │ 🎨 Frame Color   │
│        │    [black ▼]     │
│        │                  │
│        │ ✨ Frame Style   │
│        │    [classic ▼]   │
│        │                  │
│        │ Quick Options    │
│        │ [Add Mount]      │
│        │ [Premium Glaze]  │
│        │                  │
│        │ Pricing          │
│        │ $45.00 USD       │
│        │ [Hide breakdown] │
└────────┴──────────────────┘
         ←─────────────────── Full width on mobile
                              384px on tablet
```

**Gestures:**
- **Tap backdrop**: Close drawer
- **Scroll**: Config scrolls inside
- **Tap dropdowns**: Change settings

---

## 🎨 Component Adaptations

### View Mode Selector

**Desktop:**
```
┌──────────────────────────────────────────────┐
│ [🖼️ 3D Preview][🏠 In Room][📱 AR][⚖️ Compare]│
└──────────────────────────────────────────────┘
```

**Mobile:**
```
┌──────────────────────┐
│ [🖼️][🏠][📱][⚖️]     │
└──────────────────────┘
```

---

### Preview Controls

**Desktop:**
```
┌─────────────────────────────────────────────────────────────┐
│ [▶️ Auto-Rotate] [🔄 Reset]  Size: [16x20 ▼]  [↶ Undo][↷ Redo]│
└─────────────────────────────────────────────────────────────┘
```

**Mobile:**
```
┌──────────────────────────────┐
│ [16x20 ▼]   [↶] [↷] [▶️]     │
└──────────────────────────────┘
```

---

### Quick Actions

**Always wrap on mobile:**
```
┌────────────────────────┐
│ [🎨 Change color]       │
│ [📏 Adjust size]        │
│ [🏠 See in room]        │
│ [✨ Suggestions]        │
└────────────────────────┘
```

---

## 🖱️ Interaction Patterns

### 1. Opening Drawers

**Chat Drawer:**
```
Tap [💬] button
         ↓
    ┌─────────┐
    │ Drawer  │ ← Slides up from bottom
    │ appears │    with fade-in backdrop
    └─────────┘
```

**Config Drawer:**
```
Tap [⚙️] button
         ↓
┌─────────┐
│ Drawer  │ ← Slides in from right
│ appears │    with fade-in backdrop
└─────────┘
```

---

### 2. Closing Drawers

**Method 1: Tap Backdrop**
```
┌────────────────┐
│ Tap anywhere   │
│ outside drawer │ ← Closes drawer
│                │
│  ┌──────────┐  │
│  │  Drawer  │  │
│  └──────────┘  │
└────────────────┘
```

**Method 2: Close Button**
```
┌──────────────┐
│  Drawer  [×] │ ← Tap × to close
├──────────────┤
│              │
└──────────────┘
```

**Method 3: Swipe (Chat Only)**
```
     Swipe down ↓
    ┌──────────┐
    │   ━━━━   │ ← Handle indicates swipeable
    ├──────────┤
    │  Drawer  │
    └──────────┘
```

---

## 📐 Responsive Breakpoints

### Mobile Portrait (< 640px)
```
Single column
Full-width drawers
Icon-only buttons
Compact spacing
```

### Mobile Landscape (640px - 768px)
```
Single column
Config drawer: 384px (not full width)
Show some labels
Normal spacing
```

### Tablet (768px - 1024px)
```
Adaptive layout
Config drawer: 384px
Show all labels
Desktop-like spacing
```

### Desktop (≥ 1024px)
```
Three-panel layout
All panels visible
Full controls
Maximum information density
```

---

## 🎯 Touch Targets

### Minimum Sizes
```
┌─────────────┐
│   Button    │ ← 44px × 44px minimum
│  (44×44)    │    for comfortable tapping
└─────────────┘
```

### Icon Buttons
```
┌───┐
│ ⚙️ │ ← 40px × 40px (with padding)
└───┘
```

### List Items
```
┌──────────────────────┐
│  Configuration Item  │ ← 48px height
└──────────────────────┘
```

---

## 🎨 Visual Feedback

### Button States

**Normal:**
```
┌──────────┐
│  Button  │ ← bg-white border-gray-300
└──────────┘
```

**Active (Tap):**
```
┌──────────┐
│  Button  │ ← bg-gray-50 border-gray-400
└──────────┘    (immediate feedback)
```

**Disabled:**
```
┌──────────┐
│  Button  │ ← opacity-50 cursor-not-allowed
└──────────┘
```

---

## 📱 Mobile-Specific Features

### 1. Compact Header
```
┌─────────────────────────┐
│ Art Framer   [💬] [⚙️]  │ ← 60px height
│ AI Studio               │    Sticky position
└─────────────────────────┘
```

### 2. Drawer Handle
```
    ┌──────────┐
    │   ━━━━   │ ← Visual affordance
    │          │    indicates swipeable
```

### 3. Safe Areas
```
┌─────────────────────────┐
│        Notch area       │ ← Respect safe areas
├─────────────────────────┤
│                         │
│      Content here       │
│                         │
├─────────────────────────┤
│   Bottom safe area      │ ← Home indicator
└─────────────────────────┘
```

---

## 🧪 Testing Scenarios

### 1. Portrait Mode
```
□ Header shows correctly
□ Drawers open/close smoothly
□ 3D preview is interactive
□ Text is readable
□ Buttons are tappable
```

### 2. Landscape Mode
```
□ Layout adapts appropriately
□ Drawers don't cover too much
□ Controls are accessible
□ Preview maintains aspect ratio
```

### 3. Tablet
```
□ Config drawer is 384px (not full width)
□ Labels show on buttons
□ Spacing is comfortable
```

### 4. Device Rotation
```
□ Layout reflows smoothly
□ State is preserved
□ No layout shift errors
```

---

## ✨ Animation Timings

```css
Drawer slide-in:  200ms ease-out
Backdrop fade:    150ms ease-in
Button press:     100ms ease-in-out
View transition:  200ms ease-in-out
```

---

## 🎉 Mobile UX Checklist

✅ **Touch-optimized** - All targets ≥ 44×44px  
✅ **Gesture support** - Swipe, pinch, tap  
✅ **Readable text** - Appropriate font sizes  
✅ **Fast loading** - Optimized assets  
✅ **Smooth animations** - < 200ms transitions  
✅ **Accessible** - Works with screen readers  
✅ **Responsive** - Adapts to any screen size  
✅ **Intuitive** - Clear visual hierarchy  

---

**The mobile experience is polished and ready for production!** 📱✨

