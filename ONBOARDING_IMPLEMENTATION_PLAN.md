# Art Framer - Onboarding Implementation Plan

## 🎯 Overview

This document outlines the specific implementation tasks to create a seamless user onboarding experience for Art Framer, focusing on converting visitors into successful frame purchasers.

## 📋 Implementation Tasks

### Phase 1: Remove Credits System (Week 1)

#### Database Changes

- [ ] **Update database schema**
  - Remove `credits` column from profiles table
  - Remove `plan_type` column - no plans needed
  - Simplify user profile to focus on core functionality
  - Update TypeScript types in `src/lib/supabase/client.ts`

#### Code Changes

- [ ] **Remove credits from UI components**
  - ✅ Update `src/components/Sidebar.tsx` - Show "Create Frames" instead of plan status
  - ✅ Update `src/components/ProfilePopup.tsx` - Show "Unlimited Frames" instead of credits
  - ✅ Update `src/components/WelcomeModal.tsx` - Remove credits messaging
  - ✅ Update `src/app/faq/page.tsx` - Remove credits from FAQ

#### Migration Script

```sql
-- Remove credits column and plan_type - no plans needed
-- Check if columns exist before dropping them
DO $$
BEGIN
    -- Drop credits column if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'profiles' AND column_name = 'credits') THEN
        ALTER TABLE profiles DROP COLUMN credits;
    END IF;

    -- Drop plan_type column if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'profiles' AND column_name = 'plan_type') THEN
        ALTER TABLE profiles DROP COLUMN plan_type;
    END IF;
END $$;

-- Keep is_premium for any future premium features, but no plan restrictions
```

### Phase 2: New Onboarding Flow (Week 2)

#### Welcome Modal Redesign

- [ ] **Update welcome modal content**
  - Change from credits-based to value-focused messaging
  - Add "Create Your First Frame" CTA
  - Include social proof and customer photos
  - Add progress indicator (Step 1 of 3)

#### Onboarding Steps Implementation

- [ ] **Step 1: Art Generation**
  - Guided prompt writing with examples
  - Style selection with visual previews
  - "Generate" button with excitement building
  - Success animation when art is created

- [ ] **Step 2: Frame Selection**
  - Frame size recommendations based on art
  - Material and finish options with samples
  - Price calculator showing total cost
  - "Add to Cart" with clear next steps

- [ ] **Step 3: Checkout & Order**
  - Simplified checkout process
  - Shipping time estimates
  - Order confirmation with tracking info
  - Success celebration animation

#### Progress Tracking

- [ ] **Add onboarding progress to user profile**
  - Track completion of each step
  - Show progress in UI
  - Allow users to resume where they left off

### Phase 3: Email Automation (Week 3)

#### Email Templates

- [ ] **Welcome Email**
  - Subject: "Welcome to Art Framer! Let's create your first masterpiece"
  - Content: 3-step process explanation
  - CTA: "Create Your First Frame"
  - Customer success story

- [ ] **First Frame Reminder**
  - Subject: "Your first frame is waiting to be created"
  - Content: Process reminder with examples
  - CTA: "Start Creating"
  - FAQ section

- [ ] **Production Update**
  - Subject: "Your frame is being crafted with love"
  - Content: Production timeline and photos
  - Expected delivery date
  - Customer service contact

- [ ] **Delivery Confirmation**
  - Subject: "Your masterpiece has arrived! 🎨"
  - Content: Delivery confirmation and tips
  - Photo sharing request
  - Referral program invitation

#### Email System Setup

- [ ] **Configure email automation**
  - Set up triggers for each email
  - Add personalization variables
  - Test email delivery
  - Set up analytics tracking

### Phase 4: Content Creation (Week 4)

#### Video Content

- [ ] **Create onboarding videos using Veo**
  - "How Art Framer Works" (30 seconds)
  - "Frame Selection Guide" (45 seconds)
  - "Unboxing Experience" (60 seconds)
  - "Customer Success Stories" (30 seconds)

#### Image Content

- [ ] **Create hero images using Midjourney**
  - Product photography of framed artwork
  - Lifestyle shots in modern homes
  - Before/after comparisons
  - Social media ready images

#### Copywriting

- [ ] **Update all copy to remove credits references**
  - Landing page hero section
  - Feature descriptions
  - Pricing pages
  - Help documentation

### Phase 5: Analytics & Optimization (Week 5)

#### Tracking Implementation

- [ ] **Set up conversion tracking**
  - Sign-up to first frame creation
  - First frame to checkout
  - Checkout completion rate
  - Email open and click rates

#### A/B Testing

- [ ] **Test onboarding variations**
  - Welcome modal messaging
  - Email subject lines
  - CTA button text
  - Progress indicators

#### User Feedback

- [ ] **Gather user feedback**
  - Onboarding experience survey
  - Feature request collection
  - Pain point identification
  - Success story collection

## 🎨 Design Specifications

### Welcome Modal Redesign

```tsx
// New welcome modal structure
const features = [
  {
    icon: <Star className="w-5 h-5 text-pink-primary" />,
    title: "Create unlimited art frames",
    description:
      "Generate as many custom frames as you want! No limits, no restrictions - just pure creativity.",
  },
  {
    icon: <Globe className="w-5 h-5 text-primary" />,
    title: "Your generations are private",
    description:
      "All your generated images are private to you. The home page shows curated public images for inspiration.",
  },
  {
    icon: <Shield className="w-5 h-5 text-green-500" />,
    title: "Professional quality frames",
    description:
      "Each frame is handcrafted with premium materials and delivered to your door.",
  },
];
```

### Onboarding Progress Component

```tsx
// Progress indicator component
const OnboardingProgress = ({ currentStep, totalSteps }) => (
  <div className="flex items-center justify-center space-x-2 mb-6">
    {Array.from({ length: totalSteps }, (_, i) => (
      <div
        key={i}
        className={`w-3 h-3 rounded-full ${
          i < currentStep ? "bg-pink-primary" : "bg-gray-300"
        }`}
      />
    ))}
    <span className="ml-2 text-sm text-gray-600">
      Step {currentStep} of {totalSteps}
    </span>
  </div>
);
```

## 📧 Email Template Examples

### Welcome Email Template

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Welcome to Art Framer</title>
  </head>
  <body>
    <div
      style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;"
    >
      <h1>Welcome to Art Framer! 🎨</h1>
      <p>Hi {{user_name}},</p>
      <p>
        We're excited to help you turn your ideas into beautiful framed art!
      </p>

      <h2>Here's how it works:</h2>
      <ol>
        <li>
          <strong>Generate Art:</strong> Describe your vision and we'll create
          it
        </li>
        <li>
          <strong>Choose Frame:</strong> Select size, material, and finish
        </li>
        <li>
          <strong>Order & Enjoy:</strong> We'll craft and deliver your frame
        </li>
      </ol>

      <div style="text-align: center; margin: 30px 0;">
        <a
          href="{{create_frame_url}}"
          style="background: #FF8FB4; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px;"
        >
          Create Your First Frame
        </a>
      </div>

      <p>Questions? Just reply to this email - we're here to help!</p>
      <p>Best regards,<br />The Art Framer Team</p>
    </div>
  </body>
</html>
```

## 🎬 Video Content Prompts

### Veo Video Prompts

1. **"How Art Framer Works" (30 seconds)**

   ```
   Create a professional video showing a person using a smartphone to generate AI art, then selecting a frame, and receiving a beautiful framed artwork at their door. Show the transformation from digital to physical product. Use warm, inviting lighting and modern interior design.
   ```

2. **"Frame Selection Guide" (45 seconds)**

   ```
   Create an educational video showing different frame styles, materials, and sizes. Show a person comparing different options on their phone, with close-up shots of frame textures and finishes. Include text overlays explaining each option.
   ```

3. **"Unboxing Experience" (60 seconds)**
   ```
   Create an unboxing video showing someone receiving a beautifully packaged frame, opening it carefully, and hanging it on their wall. Show the emotional reaction and satisfaction. Use natural lighting and authentic reactions.
   ```

### Midjourney Image Prompts

1. **Hero Images**

   ```
   Professional product photography of custom framed artwork in modern home interior, warm lighting, lifestyle shot, high quality, 8k
   ```

2. **Product Showcase**

   ```
   Product photography of different frame styles and materials, studio lighting, clean background, commercial photography
   ```

3. **Social Media Images**
   ```
   Instagram-style photo of someone creating art on their phone, modern lifestyle, bright colors, social media aesthetic
   ```

## 📊 Success Metrics

### Onboarding Metrics

- **Sign-up to first frame creation**: Target >80%
- **First frame to checkout**: Target >60%
- **Checkout completion**: Target >90%
- **Email open rates**: Target >25%
- **Email click-through rates**: Target >5%

### Retention Metrics

- **7-day retention**: Target >40%
- **30-day retention**: Target >20%
- **Repeat purchase rate**: Target >15%
- **Referral rate**: Target >10%

## 🚀 Launch Checklist

### Pre-Launch (Week 1)

- [ ] Remove all credits references
- [ ] Update database schema
- [ ] Test all user flows
- [ ] Prepare launch content

### Launch Week

- [ ] Deploy new onboarding flow
- [ ] Send welcome emails to existing users
- [ ] Monitor key metrics
- [ ] Gather user feedback

### Post-Launch (Week 2-4)

- [ ] Analyze conversion data
- [ ] Optimize based on feedback
- [ ] A/B test improvements
- [ ] Plan next feature releases

## 🔧 Technical Requirements

### Database Changes

```sql
-- Migration to remove credits system
BEGIN;

-- Add plan_type column
ALTER TABLE profiles ADD COLUMN plan_type VARCHAR(20) DEFAULT 'free';

-- Update existing records
UPDATE profiles SET plan_type = 'free' WHERE is_premium = false;
UPDATE profiles SET plan_type = 'premium' WHERE is_premium = true;

-- Remove credits column
ALTER TABLE profiles DROP COLUMN credits;

COMMIT;
```

### Component Updates

- [ ] Update TypeScript types
- [ ] Remove credits from all components
- [ ] Add plan status display
- [ ] Update onboarding flow logic

### Email System

- [ ] Set up email automation triggers
- [ ] Create email templates
- [ ] Configure personalization
- [ ] Set up analytics tracking

This implementation plan provides a clear roadmap for removing the credits system and creating a compelling onboarding experience that focuses on value and user success.
