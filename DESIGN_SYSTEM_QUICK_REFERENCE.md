# Art Framer Design System - Quick Reference

## 🎨 Colors

### Primary Palette
```
Black (Primary Action): #111827 (gray-900)
White (Backgrounds):    #FFFFFF
Light Gray (BG):        #F9FAFB (gray-50)
Gray Borders:           #E5E7EB (gray-200)
Gray Text:              #6B7280 (gray-600)
Hover Gray:             #F3F4F6 (gray-100)
```

### Usage
- **Primary Actions**: Black buttons
- **Backgrounds**: White cards on gray-50 pages
- **Borders**: Gray-200 (2px for emphasis, 1px for subtle)
- **Text**: Gray-900 for headers, gray-600 for body

## 🔘 Buttons

### Primary Button
```tsx
<Button>Action</Button>
// or
<button className="bg-black text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors">
  Action
</button>
```

### Secondary Button
```tsx
<Button variant="outline">Action</Button>
// or
<button className="bg-white text-black px-6 py-3 rounded-lg font-medium border-2 border-gray-300 hover:bg-gray-50 transition-colors">
  Action
</button>
```

### Sizes
```tsx
<Button size="sm">Small</Button>      // h-9, px-4
<Button size="default">Default</Button> // h-11, px-6
<Button size="lg">Large</Button>       // h-12, px-8
```

## 📝 Inputs

### Text Input
```tsx
<Input type="text" placeholder="Enter text..." />
// Includes:
// - 2px gray-300 border
// - rounded-lg
// - Black focus ring (2px)
// - h-11 height
// - Gray-400 border on hover
```

### With Label
```tsx
<div className="space-y-2">
  <label className="text-sm font-medium text-gray-900">
    Email
  </label>
  <Input type="email" />
</div>
```

## 🃏 Cards

### Basic Card
```tsx
<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description text</CardDescription>
  </CardHeader>
  <CardContent>
    Content goes here
  </CardContent>
</Card>
```

### Features
- White background
- 2px gray-200 border
- rounded-xl
- shadow-sm with hover:shadow-md
- Padding: 1.5rem (24px)

## 🪟 Modals/Dialogs

### Basic Dialog
```tsx
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Modal Title</DialogTitle>
      <DialogDescription>
        Modal description
      </DialogDescription>
    </DialogHeader>
    <div>Content</div>
  </DialogContent>
</Dialog>
```

### Features
- White background
- 2px gray-200 border
- rounded-2xl
- 50% black overlay with backdrop-blur
- shadow-xl
- Close button: gray-100 hover, rounded-lg

## 📏 Spacing

### Margin/Padding Scale
```
xs:  0.25rem (4px)
sm:  0.5rem  (8px)
md:  1rem    (16px)
lg:  1.5rem  (24px)
xl:  2rem    (32px)
2xl: 2.5rem  (40px)
```

### Common Patterns
```tsx
// Page container
<div className="container mx-auto px-4 py-8">

// Section spacing
<section className="mb-12">

// Card spacing
<Card className="p-6">

// Stack items
<div className="space-y-4">
```

## 🔤 Typography

### Headings
```tsx
// Page Title
<h1 className="text-3xl font-bold text-gray-900 mb-2">

// Section Title
<h2 className="text-2xl font-bold text-gray-900 mb-4">

// Card Title
<h3 className="text-xl font-bold text-gray-900">

// Small Heading
<h4 className="text-lg font-semibold text-gray-900">
```

### Body Text
```tsx
// Regular
<p className="text-gray-600">

// Small
<p className="text-sm text-gray-600">

// Muted
<p className="text-sm text-gray-500">

// Bold
<p className="text-gray-900 font-medium">
```

## 🔵 Border Radius

```
sm:  0.5rem  (8px)  - Small elements
md:  0.75rem (12px) - Buttons, inputs
lg:  1rem    (16px) - Cards
xl:  1.5rem  (24px) - Modals
2xl: 2rem    (32px) - Hero sections
```

## 💫 Shadows

```tsx
// Card
<div className="shadow-sm hover:shadow-md">

// Modal
<div className="shadow-xl">

// Dropdown
<div className="shadow-lg">

// Subtle
<div className="shadow">
```

## 🎯 Focus States

### All Interactive Elements
```
focus:outline-none 
focus:ring-2 
focus:ring-black 
focus:ring-offset-2
```

### Example
```tsx
<button className="focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2">
  Focused Button
</button>
```

## 📱 Layout Templates

### Page Layout
```tsx
<div className="min-h-screen bg-gray-50">
  {/* Top Spacer */}
  <div className="h-16 min-h-16 bg-gray-50" />
  
  {/* Content */}
  <div className="container mx-auto px-4 py-8">
    <div className="mb-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        Page Title
      </h1>
      <p className="text-gray-600">
        Page description
      </p>
    </div>
    
    {/* Main Content */}
  </div>
</div>
```

### Card Grid
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <Card>...</Card>
  <Card>...</Card>
  <Card>...</Card>
</div>
```

### Form Layout
```tsx
<form className="space-y-6">
  <div className="space-y-2">
    <label className="text-sm font-medium text-gray-900">
      Field Label
    </label>
    <Input />
  </div>
  
  <Button type="submit" className="w-full">
    Submit
  </Button>
</form>
```

## ⚡ Common Patterns

### Loading State
```tsx
<div className="flex items-center justify-center p-8">
  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black" />
</div>
```

### Empty State
```tsx
<div className="text-center p-12">
  <div className="text-4xl mb-4">📭</div>
  <h3 className="text-xl font-bold text-gray-900 mb-2">
    No items yet
  </h3>
  <p className="text-gray-600 mb-6">
    Get started by creating your first item
  </p>
  <Button>Create Item</Button>
</div>
```

### Error State
```tsx
<div className="border-2 border-red-200 bg-red-50 rounded-lg p-4">
  <p className="text-sm text-red-800">
    Something went wrong. Please try again.
  </p>
</div>
```

### Success State
```tsx
<div className="border-2 border-green-200 bg-green-50 rounded-lg p-4">
  <p className="text-sm text-green-800">
    Success! Your changes have been saved.
  </p>
</div>
```

## 🎨 CSS Classes Quick Copy

```css
/* Backgrounds */
bg-gray-50      /* Page background */
bg-white        /* Card/modal background */
bg-gray-100     /* Hover state */
bg-black        /* Primary button */

/* Text */
text-gray-900   /* Headers */
text-gray-600   /* Body */
text-gray-500   /* Muted */
text-white      /* On dark backgrounds */

/* Borders */
border-gray-200 /* Standard border */
border-gray-300 /* Input border */
border-2        /* Emphasis border */

/* Shadows */
shadow-sm       /* Card */
shadow-md       /* Card hover */
shadow-xl       /* Modal */

/* Rounded */
rounded-lg      /* Button, input */
rounded-xl      /* Card */
rounded-2xl     /* Modal */

/* Spacing */
p-4 p-6 p-8     /* Padding */
m-4 m-6 m-8     /* Margin */
space-y-4       /* Stack spacing */
gap-4 gap-6     /* Grid/flex gap */
```

## 📋 Component Checklist

When creating a new component:

- [ ] Use white background on gray-50 pages
- [ ] Use 2px borders for cards/inputs
- [ ] Use rounded-lg or rounded-xl
- [ ] Add hover states (shadow, background)
- [ ] Add focus states (black ring)
- [ ] Use gray-900 for headings
- [ ] Use gray-600 for body text
- [ ] Ensure proper spacing (p-6 for cards)
- [ ] Add transition-all for smooth animations
- [ ] Test on mobile (touch targets ≥ 44px)

---

**Quick Tip**: When in doubt, look at `/studio` page or existing cards/buttons for reference!

