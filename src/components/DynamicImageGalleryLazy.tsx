/**
 * Lazy-loaded Dynamic Image Gallery
 * Reduces initial bundle size by loading dynamic features on demand
 */

'use client';

import React, { Suspense, lazy } from 'react';
import { ImageGallery } from './ImageGallery';

// Temporarily use regular gallery to avoid bundling issues
// const DynamicImageGalleryFull = lazy(() => 
//   import('./DynamicImageGallery').then(module => ({
//     default: module.DynamicImageGallery
//   }))
// );

// Fallback to regular ImageGallery for now
const DynamicImageGalleryFull = lazy(() => 
  import('./ImageGallery').then(module => ({
    default: module.ImageGallery
  }))
);

// Loading fallback component
function DynamicGalleryFallback() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-primary"></div>
      <p className="text-sm text-muted-foreground">Loading dynamic gallery...</p>
    </div>
  );
}

interface DynamicImageGalleryLazyProps {
  useDynamicFeatures?: boolean;
  className?: string;
  showFilters?: boolean;
  enableAnimations?: boolean;
  adaptiveLayout?: boolean;
}

export function DynamicImageGalleryLazy({
  useDynamicFeatures = false,
  ...props
}: DynamicImageGalleryLazyProps) {
  // Use regular gallery by default, dynamic on demand
  if (!useDynamicFeatures) {
    return <ImageGallery />;
  }

  return (
    <Suspense fallback={<DynamicGalleryFallback />}>
      <DynamicImageGalleryFull />
    </Suspense>
  );
}

/**
 * Hook to enable dynamic features with user preference
 */
export function useDynamicGalleryPreference() {
  const [enableDynamic, setEnableDynamic] = React.useState(() => {
    if (typeof window === 'undefined') return false;
    
    // Check user preference or device capability
    const saved = localStorage.getItem('art-framer-dynamic-gallery');
    if (saved !== null) {
      return saved === 'true';
    }
    
    // Enable by default on capable devices
    const hasGoodConnection = 'connection' in navigator 
      ? (navigator as any).connection?.effectiveType === '4g'
      : true;
    const hasGoodDevice = window.devicePixelRatio <= 2; // Not super high-res
    
    return hasGoodConnection && hasGoodDevice;
  });

  const setDynamicPreference = React.useCallback((enabled: boolean) => {
    setEnableDynamic(enabled);
    localStorage.setItem('art-framer-dynamic-gallery', enabled.toString());
  }, []);

  return {
    enableDynamic,
    setDynamicPreference,
  };
}
