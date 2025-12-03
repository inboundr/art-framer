# Studio Style Examples - Copy & Paste Ready

## 🎨 Complete Component Examples

Use these exact patterns when building new features to maintain consistency with the `/studio` design.

---

## 📄 Full Page Template

```tsx
'use client';

import { AuthenticatedLayout } from '@/components/AuthenticatedLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function YourPage() {
  return (
    <AuthenticatedLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Top Spacer */}
        <div className="h-16 min-h-16 bg-gray-50" />
        
        {/* Main Content */}
        <div className="container mx-auto px-4 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Page Title
            </h1>
            <p className="text-gray-600">
              A brief description of what this page does
            </p>
          </div>

          {/* Content Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Card Title</CardTitle>
                <CardDescription>Card description</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Card content goes here
                </p>
                <Button className="w-full">Action</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
```

---

## 🔘 Button Examples

### Primary Action (Black)
```tsx
<Button>
  Continue
</Button>
```

### Secondary Action (Outline)
```tsx
<Button variant="outline">
  Cancel
</Button>
```

### Destructive Action (Red)
```tsx
<Button variant="destructive">
  Delete
</Button>
```

### Ghost Button (No background)
```tsx
<Button variant="ghost">
  Learn More
</Button>
```

### With Icon
```tsx
import { Plus } from 'lucide-react';

<Button>
  <Plus className="w-4 h-4 mr-2" />
  Add Item
</Button>
```

### Full Width
```tsx
<Button className="w-full">
  Sign In
</Button>
```

### Button Group
```tsx
<div className="flex gap-3">
  <Button variant="outline" className="flex-1">
    Cancel
  </Button>
  <Button className="flex-1">
    Confirm
  </Button>
</div>
```

---

## 📝 Form Examples

### Simple Form
```tsx
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {/* Name Field */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-900">
          Your Name
        </label>
        <Input
          type="text"
          placeholder="John Doe"
          value={formData.name}
          onChange={(e) => setFormData({...formData, name: e.target.value})}
        />
      </div>

      {/* Email Field */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-900">
          Email Address
        </label>
        <Input
          type="email"
          placeholder="john@example.com"
          value={formData.email}
          onChange={(e) => setFormData({...formData, email: e.target.value})}
        />
      </div>

      {/* Message Field */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-900">
          Message
        </label>
        <textarea
          className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent hover:border-gray-400 transition-colors resize-none"
          rows={4}
          placeholder="Your message..."
          value={formData.message}
          onChange={(e) => setFormData({...formData, message: e.target.value})}
        />
      </div>

      {/* Submit Button */}
      <Button type="submit" className="w-full">
        Send Message
      </Button>
    </form>
  );
}
```

---

## 🃏 Card Layouts

### Basic Info Card
```tsx
<Card>
  <CardHeader>
    <CardTitle>Statistics</CardTitle>
    <CardDescription>Your performance this month</CardDescription>
  </CardHeader>
  <CardContent>
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">Total Sales</span>
        <span className="text-lg font-bold text-gray-900">$12,345</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">Orders</span>
        <span className="text-lg font-bold text-gray-900">42</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">Customers</span>
        <span className="text-lg font-bold text-gray-900">28</span>
      </div>
    </div>
  </CardContent>
</Card>
```

### Action Card
```tsx
<Card className="hover:shadow-lg transition-shadow cursor-pointer">
  <CardHeader>
    <div className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center text-2xl mb-3">
      🎨
    </div>
    <CardTitle>Create New Project</CardTitle>
    <CardDescription>
      Start a new project from scratch or use a template
    </CardDescription>
  </CardHeader>
  <CardContent>
    <Button className="w-full">Get Started</Button>
  </CardContent>
</Card>
```

### Image Card
```tsx
<Card>
  <div className="aspect-video relative overflow-hidden rounded-t-xl">
    <img
      src="/path/to/image.jpg"
      alt="Card image"
      className="w-full h-full object-cover"
    />
  </div>
  <CardHeader>
    <CardTitle>Project Name</CardTitle>
    <CardDescription>Created on Jan 1, 2025</CardDescription>
  </CardHeader>
  <CardContent>
    <div className="flex gap-2">
      <Button variant="outline" className="flex-1">
        View
      </Button>
      <Button className="flex-1">
        Edit
      </Button>
    </div>
  </CardContent>
</Card>
```

---

## 🪟 Modal Examples

### Confirmation Modal
```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

function ConfirmModal({ isOpen, onClose, onConfirm }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Are you sure?</DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete your data.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### Form Modal
```tsx
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Create New Item</DialogTitle>
      <DialogDescription>
        Fill in the details below to create a new item
      </DialogDescription>
    </DialogHeader>
    
    <form className="space-y-4 mt-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-900">
          Item Name
        </label>
        <Input type="text" placeholder="Enter name..." />
      </div>
      
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-900">
          Description
        </label>
        <textarea
          className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
          rows={3}
          placeholder="Enter description..."
        />
      </div>
      
      <div className="flex gap-3 pt-4">
        <Button variant="outline" onClick={() => setIsOpen(false)} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" className="flex-1">
          Create
        </Button>
      </div>
    </form>
  </DialogContent>
</Dialog>
```

---

## 📊 List & Table Patterns

### Simple List
```tsx
<Card>
  <CardHeader>
    <CardTitle>Recent Activity</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.id} className="flex items-center justify-between py-3 border-b border-gray-200 last:border-0">
          <div>
            <p className="font-medium text-gray-900">{item.title}</p>
            <p className="text-sm text-gray-600">{item.description}</p>
          </div>
          <Button variant="ghost" size="sm">
            View
          </Button>
        </div>
      ))}
    </div>
  </CardContent>
</Card>
```

### Grid List
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {items.map((item) => (
    <Card key={item.id} className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle>{item.title}</CardTitle>
        <CardDescription>{item.category}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600 mb-4">{item.description}</p>
        <Button className="w-full">Select</Button>
      </CardContent>
    </Card>
  ))}
</div>
```

---

## 🎯 State Patterns

### Loading State
```tsx
{isLoading ? (
  <div className="flex flex-col items-center justify-center p-12">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mb-4" />
    <p className="text-gray-600">Loading...</p>
  </div>
) : (
  <div>{/* Your content */}</div>
)}
```

### Empty State
```tsx
<div className="flex flex-col items-center justify-center p-12 text-center">
  <div className="text-6xl mb-4">📭</div>
  <h3 className="text-xl font-bold text-gray-900 mb-2">
    No items found
  </h3>
  <p className="text-gray-600 mb-6 max-w-md">
    Get started by creating your first item. It only takes a few seconds.
  </p>
  <Button>
    Create Your First Item
  </Button>
</div>
```

### Error State
```tsx
<div className="border-2 border-red-200 bg-red-50 rounded-lg p-6">
  <div className="flex items-start gap-3">
    <div className="text-2xl">⚠️</div>
    <div>
      <h4 className="font-bold text-red-900 mb-1">
        Something went wrong
      </h4>
      <p className="text-sm text-red-800 mb-4">
        {error.message}
      </p>
      <Button variant="outline" size="sm" onClick={retry}>
        Try Again
      </Button>
    </div>
  </div>
</div>
```

### Success State
```tsx
<div className="border-2 border-green-200 bg-green-50 rounded-lg p-6">
  <div className="flex items-start gap-3">
    <div className="text-2xl">✅</div>
    <div>
      <h4 className="font-bold text-green-900 mb-1">
        Success!
      </h4>
      <p className="text-sm text-green-800">
        Your changes have been saved successfully.
      </p>
    </div>
  </div>
</div>
```

---

## 🎨 Special Patterns

### Hero Section
```tsx
<div className="bg-white border-b-2 border-gray-200">
  <div className="container mx-auto px-4 py-16 text-center">
    <h1 className="text-5xl font-bold text-gray-900 mb-4">
      Welcome to Art Framer
    </h1>
    <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
      Create stunning AI art and get it delivered as a beautiful framed print
    </p>
    <div className="flex gap-4 justify-center">
      <Button size="lg">
        Get Started
      </Button>
      <Button variant="outline" size="lg">
        Learn More
      </Button>
    </div>
  </div>
</div>
```

### Feature Grid
```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
  {features.map((feature) => (
    <div key={feature.id} className="text-center">
      <div className="w-16 h-16 rounded-full bg-black text-white flex items-center justify-center text-3xl mx-auto mb-4">
        {feature.icon}
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">
        {feature.title}
      </h3>
      <p className="text-gray-600">
        {feature.description}
      </p>
    </div>
  ))}
</div>
```

### Pricing Card
```tsx
<Card>
  <CardHeader>
    <div className="text-center">
      <p className="text-sm text-gray-600 mb-2">Pro Plan</p>
      <div className="flex items-baseline justify-center gap-1">
        <span className="text-5xl font-bold text-gray-900">$29</span>
        <span className="text-gray-600">/month</span>
      </div>
    </div>
  </CardHeader>
  <CardContent>
    <ul className="space-y-3 mb-6">
      <li className="flex items-center gap-2 text-gray-600">
        <span className="text-green-600">✓</span> Unlimited generations
      </li>
      <li className="flex items-center gap-2 text-gray-600">
        <span className="text-green-600">✓</span> Priority support
      </li>
      <li className="flex items-center gap-2 text-gray-600">
        <span className="text-green-600">✓</span> Advanced features
      </li>
    </ul>
    <Button className="w-full">
      Choose Plan
    </Button>
  </CardContent>
</Card>
```

---

## 💡 Pro Tips

1. **Always use the full color name**: `text-gray-900` not `text-foreground`
2. **Prefer explicit borders**: `border-2 border-gray-200` not just `border`
3. **Use rounded-lg minimum**: Never use `rounded-sm` or `rounded-md`
4. **Add hover states**: Always include `hover:` variants on interactive elements
5. **Include transitions**: Add `transition-colors` or `transition-all`
6. **Mind the spacing**: Use `space-y-4` or `space-y-6` for vertical stacks
7. **Be consistent with padding**: Cards should use `p-6`, modals `p-6` or `p-8`
8. **Use shadow sparingly**: `shadow-sm` for cards, `shadow-xl` for modals
9. **Focus states matter**: Always add `focus:ring-2 focus:ring-black`
10. **Test on mobile**: Ensure touch targets are at least 44px (h-11 or larger)

---

## 🎯 Quick Copy Classes

```
/* Page Background */
bg-gray-50

/* Card/Modal */
bg-white border-2 border-gray-200 rounded-xl shadow-sm

/* Button Primary */
bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800

/* Button Secondary */
bg-white text-black px-6 py-3 rounded-lg border-2 border-gray-300 hover:bg-gray-50

/* Input */
w-full h-11 px-4 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-black

/* Heading */
text-3xl font-bold text-gray-900

/* Body Text */
text-gray-600

/* Muted Text */
text-sm text-gray-500
```

---

**Remember**: When in doubt, look at the `/studio` page for reference! 🎨

