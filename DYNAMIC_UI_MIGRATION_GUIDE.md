# Dynamic UI Migration Guide

## 🎯 Overview

This guide helps you migrate existing components to use the new Dynamic UI system safely and effectively. The Dynamic UI system provides adaptive layouts, smart animations, and context-aware theming.

## 🚀 Quick Start

### 1. Basic Integration

Replace static hooks with dynamic equivalents:

```typescript
// Before
import { useState, useEffect } from 'react';

// After
import { useDynamicLayoutSafe, useDynamicThemeSafe } from '@/hooks/useDynamicHooksSafe';

function MyComponent() {
  // Safe hooks with automatic fallbacks
  const { isMobile, theme } = useDynamicUI();

  return (
    <div style={{ backgroundColor: theme.colors.background }}>
      {/* Your content */}
    </div>
  );
}
```

### 2. Theme Integration

```typescript
// Before
<div className="bg-white text-black">

// After
<div style={{
  backgroundColor: theme.colors.background,
  color: theme.colors.foreground
}}>
```

### 3. Animation Integration

```typescript
import { useDynamicAnimationsSafe } from '@/hooks/useDynamicHooksSafe';

function AnimatedComponent() {
  const { createTransition, shouldAnimate } = useDynamicAnimationsSafe();

  return (
    <div style={{
      transition: createTransition([
        { property: 'opacity', duration: 300 },
        { property: 'transform', duration: 300 }
      ])
    }}>
      {/* Content */}
    </div>
  );
}
```

## 📋 Migration Checklist

### Phase 1: Safety First

- [ ] Wrap components with `DynamicErrorBoundary`
- [ ] Use safe hooks (`useDynamicLayoutSafe`, `useDynamicThemeSafe`, etc.)
- [ ] Test fallback behavior
- [ ] Verify no breaking changes

### Phase 2: Basic Integration

- [ ] Replace hardcoded colors with theme values
- [ ] Add responsive behavior using layout hooks
- [ ] Implement basic animations
- [ ] Test across different screen sizes

### Phase 3: Advanced Features

- [ ] Add performance monitoring
- [ ] Implement accessibility enhancements
- [ ] Add custom theme support
- [ ] Optimize for different devices

## 🛠️ Component Migration Patterns

### 1. Layout Component Migration

```typescript
// Before
function MyLayout({ children }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className={isMobile ? 'mobile-layout' : 'desktop-layout'}>
      {children}
    </div>
  );
}

// After
import { useDynamicLayoutSafe } from '@/hooks/useDynamicHooksSafe';

function MyLayout({ children }) {
  const { isMobile, getResponsiveClasses } = useDynamicLayoutSafe();

  return (
    <div className={getResponsiveClasses({
      xs: 'mobile-layout',
      md: 'desktop-layout'
    })}>
      {children}
    </div>
  );
}
```

### 2. Theme-Aware Component Migration

```typescript
// Before
function ThemedButton({ children, variant = 'primary' }) {
  const baseClasses = 'px-4 py-2 rounded';
  const variantClasses = {
    primary: 'bg-blue-500 text-white',
    secondary: 'bg-gray-200 text-gray-800'
  };

  return (
    <button className={`${baseClasses} ${variantClasses[variant]}`}>
      {children}
    </button>
  );
}

// After
import { useDynamicThemeSafe } from '@/hooks/useDynamicHooksSafe';

function ThemedButton({ children, variant = 'primary' }) {
  const { theme } = useDynamicThemeSafe();

  const styles = {
    primary: {
      backgroundColor: theme.colors.primary,
      color: theme.colors.primaryForeground,
    },
    secondary: {
      backgroundColor: theme.colors.secondary,
      color: theme.colors.secondaryForeground,
    }
  };

  return (
    <button
      className="px-4 py-2 rounded transition-colors"
      style={styles[variant]}
    >
      {children}
    </button>
  );
}
```

### 3. Animated Component Migration

```typescript
// Before
function FadeInComponent({ children }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div
      className={`transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {children}
    </div>
  );
}

// After
import { useDynamicAnimationsSafe, useIntersectionAnimationSafe } from '@/hooks/useDynamicHooksSafe';

function FadeInComponent({ children }) {
  const { createTransition } = useDynamicAnimationsSafe();
  const { ref, hasAnimated } = useIntersectionAnimationSafe('fadeIn');

  return (
    <div
      ref={ref}
      style={{
        opacity: hasAnimated ? 1 : 0,
        transform: hasAnimated ? 'translateY(0)' : 'translateY(20px)',
        transition: createTransition([
          { property: 'opacity', duration: 400 },
          { property: 'transform', duration: 400 }
        ])
      }}
    >
      {children}
    </div>
  );
}
```

## 🔧 Advanced Migration Patterns

### 1. Performance-Aware Components

```typescript
import { usePerformanceAwareFeatures } from '@/hooks/usePerformanceMonitor';

function PerformanceAwareComponent() {
  const { enableAnimations, enableComplexLayouts } = usePerformanceAwareFeatures();

  return (
    <div>
      {enableComplexLayouts ? (
        <ComplexMasonryLayout />
      ) : (
        <SimpleGridLayout />
      )}

      {enableAnimations && <AnimatedElements />}
    </div>
  );
}
```

### 2. Accessibility-Enhanced Components

```typescript
import { useAccessibilityEnhancements, useFocusManagement } from '@/hooks/useAccessibilityEnhancements';

function AccessibleModal({ isOpen, onClose, children }) {
  const { effectivePreferences } = useAccessibilityEnhancements();
  const { containerRef } = useFocusManagement({
    trapFocus: true,
    restoreFocus: true,
    initialFocus: '[data-focus-initial]'
  });

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      style={{
        animationDuration: effectivePreferences.reducedMotion ? '0s' : '0.3s'
      }}
    >
      <button
        data-focus-initial
        onClick={onClose}
        aria-label="Close modal"
      >
        ×
      </button>
      {children}
    </div>
  );
}
```

## 🎨 Theme Customization

### 1. Custom Theme Colors

```typescript
import { useDynamicThemeSafe } from '@/hooks/useDynamicHooksSafe';

function CustomThemedComponent() {
  const { theme, generateColorVariations } = useDynamicThemeSafe();

  // Generate color variations for custom elements
  const brandColors = generateColorVariations('#ff6b6b');

  return (
    <div style={{
      backgroundColor: brandColors['100'],
      borderColor: brandColors['300'],
      color: theme.colors.foreground
    }}>
      Custom themed content
    </div>
  );
}
```

### 2. Conditional Theme Application

```typescript
function ConditionalThemedComponent({ useCustomTheme = false }) {
  const { theme, getAdaptiveColor } = useDynamicThemeSafe();

  const backgroundColor = useCustomTheme
    ? '#custom-color'
    : getAdaptiveColor(theme.colors.background, theme.colors.card);

  return (
    <div style={{ backgroundColor }}>
      Content
    </div>
  );
}
```

## 📱 Responsive Migration

### 1. Container-Based Responsive Design

```typescript
import { useContainerQuery } from '@/hooks/useDynamicLayout';

function ResponsiveCard() {
  const containerRef = useRef(null);
  const { width, isNarrow, isMedium, isWide } = useContainerQuery(containerRef);

  return (
    <div ref={containerRef}>
      {isNarrow && <CompactLayout />}
      {isMedium && <StandardLayout />}
      {isWide && <ExpandedLayout />}
    </div>
  );
}
```

### 2. Adaptive Grid Systems

```typescript
function AdaptiveGrid({ items }) {
  const { optimalImageGrid } = useDynamicLayoutSafe();

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${optimalImageGrid.columns}, 1fr)`,
        gap: `${optimalImageGrid.gap}px`
      }}
    >
      {items.map(item => <GridItem key={item.id} {...item} />)}
    </div>
  );
}
```

## 🚨 Common Pitfalls & Solutions

### 1. Hook Dependencies

```typescript
// ❌ Wrong - Unsafe hook usage
function BadComponent() {
  const { theme } = useDynamicTheme(); // Can throw if provider missing
}

// ✅ Correct - Safe hook usage
function GoodComponent() {
  const { theme } = useDynamicThemeSafe(); // Always returns fallback
}
```

### 2. Animation Performance

```typescript
// ❌ Wrong - Uncontrolled animations
function BadAnimation() {
  return (
    <div className="animate-spin"> {/* Always animates */}
      Content
    </div>
  );
}

// ✅ Correct - Performance-aware animations
function GoodAnimation() {
  const { shouldAnimate } = useAccessibleAnimation();

  return (
    <div className={shouldAnimate ? 'animate-spin' : ''}>
      Content
    </div>
  );
}
```

### 3. Theme Color Usage

```typescript
// ❌ Wrong - Hardcoded colors
function BadTheming() {
  return <div className="bg-white text-black">Content</div>;
}

// ✅ Correct - Dynamic theme colors
function GoodTheming() {
  const { theme } = useDynamicThemeSafe();

  return (
    <div style={{
      backgroundColor: theme.colors.background,
      color: theme.colors.foreground
    }}>
      Content
    </div>
  );
}
```

## 🧪 Testing Migration

### 1. Component Testing

```typescript
import { render } from '@testing-library/react';
import { DynamicThemeProvider } from '@/components/DynamicThemeProvider';

function renderWithDynamicUI(component) {
  return render(
    <DynamicThemeProvider>
      {component}
    </DynamicThemeProvider>
  );
}

test('component works with dynamic theme', () => {
  const { getByRole } = renderWithDynamicUI(<MyComponent />);
  // Test assertions
});
```

### 2. Accessibility Testing

```typescript
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

test('component is accessible', async () => {
  const { container } = renderWithDynamicUI(<MyComponent />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

## 📈 Performance Optimization

### 1. Lazy Loading Dynamic Features

```typescript
import { DynamicImageGalleryLazy } from '@/components/DynamicImageGalleryLazy';

function OptimizedGallery() {
  const [enableDynamic, setEnableDynamic] = useState(false);

  return (
    <div>
      <button onClick={() => setEnableDynamic(true)}>
        Enable Enhanced Gallery
      </button>

      <DynamicImageGalleryLazy
        useDynamicFeatures={enableDynamic}
      />
    </div>
  );
}
```

### 2. Performance Monitoring

```typescript
import { PerformanceMonitor } from '@/hooks/usePerformanceMonitor';

function MonitoredComponent() {
  return (
    <PerformanceMonitor componentName="MyComponent">
      <MyComponent />
    </PerformanceMonitor>
  );
}
```

## 🎯 Migration Timeline

### Week 1: Foundation

- [ ] Integrate error boundaries
- [ ] Replace unsafe hooks with safe versions
- [ ] Test existing functionality

### Week 2: Enhancement

- [ ] Add theme integration
- [ ] Implement responsive improvements
- [ ] Add basic animations

### Week 3: Optimization

- [ ] Performance monitoring
- [ ] Accessibility enhancements
- [ ] Bundle optimization

### Week 4: Polish

- [ ] Advanced features
- [ ] Custom themes
- [ ] Final testing

## 🆘 Troubleshooting

### Common Issues

1. **Theme not applying**: Ensure `DynamicThemeProvider` wraps your app
2. **Animations not working**: Check `prefers-reduced-motion` settings
3. **Layout shifts**: Use intersection observers for animations
4. **Performance issues**: Enable performance monitoring to identify bottlenecks

### Debug Tools

```typescript
// Enable development status indicators
<DynamicStatusIndicator />

// Monitor performance
const { metrics, logMetrics } = usePerformanceMonitor();
console.log(metrics);

// Check accessibility
const { effectivePreferences } = useAccessibilityEnhancements();
console.log(effectivePreferences);
```

## 📚 Additional Resources

- [Dynamic UI API Reference](./DYNAMIC_UI_API.md)
- [Theme Customization Guide](./THEME_CUSTOMIZATION.md)
- [Animation Best Practices](./ANIMATION_GUIDE.md)
- [Accessibility Guidelines](./ACCESSIBILITY_GUIDE.md)

## 🤝 Support

For migration assistance:

1. Check the [troubleshooting section](#troubleshooting)
2. Review component examples in `/src/components/`
3. Use development debug tools
4. Test thoroughly before production deployment

Remember: **All migrations are optional and backward compatible**. The system gracefully falls back to original behavior if dynamic features fail.
