/**
 * Dynamic Image Gallery with adaptive layout, animations, and theming
 * Demonstrates the full power of the dynamic UI system
 */

'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useDynamicLayout, useContainerQuery } from '@/hooks/useDynamicLayout';
import { useDynamicAnimations, useIntersectionAnimation } from '@/hooks/useDynamicAnimations';
import { useDynamicTheme } from '@/hooks/useDynamicTheme';
import { useGallery } from '@/hooks/useGallery';

interface DynamicImageGalleryProps {
  className?: string;
  showFilters?: boolean;
  enableAnimations?: boolean;
  adaptiveLayout?: boolean;
}

interface ImageCardProps {
  image: any;
  index: number;
  onLike: (id: string) => void;
  onUnlike: (id: string) => void;
  isLiked: boolean;
  isInteracting: boolean;
  animationDelay: number;
}

function DynamicImageCard({ 
  image, 
  onLike, 
  onUnlike, 
  isLiked, 
  isInteracting, 
  animationDelay 
}: ImageCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  // const { theme, isDark, getAdaptiveColor } = useDynamicTheme(); // Unused for now
  const { animatePreset, createTransition } = useDynamicAnimations();
  const { isMobile, getSpacing } = useDynamicLayout();
  
  // Intersection animation
  const { ref: animationRef, hasAnimated } = useIntersectionAnimation(
    'morphIn',
    { delay: animationDelay },
    { threshold: 0.2 }
  );

  // Set both refs
  useEffect(() => {
    if (cardRef.current) {
      animationRef(cardRef.current);
    }
  }, [animationRef]);

  // Hover animations
  const handleMouseEnter = useCallback(() => {
    if (cardRef.current && !isMobile) {
      animatePreset(cardRef.current, 'scaleIn', { duration: 200 });
    }
  }, [animatePreset, isMobile]);

  const handleMouseLeave = useCallback(() => {
    if (cardRef.current && !isMobile) {
      animatePreset(cardRef.current, 'scaleOut', { duration: 150 });
    }
  }, [animatePreset, isMobile]);

  // Like animation
  const handleLikeClick = useCallback(() => {
    if (cardRef.current) {
      animatePreset(cardRef.current, 'bounce', { duration: 400 });
    }
    
    if (isLiked) {
      onUnlike(image.id);
    } else {
      onLike(image.id);
    }
  }, [image.id, isLiked, onLike, onUnlike, animatePreset]);

  const cardStyles: React.CSSProperties = {
    transition: createTransition([
      { property: 'transform', duration: 200, easing: 'ease-out' },
      { property: 'box-shadow', duration: 200, easing: 'ease-out' },
      { property: 'border-color', duration: 150, easing: 'ease-out' },
    ]),
    borderRadius: '8px',
    backgroundColor: 'hsl(var(--card))',
    borderColor: 'hsl(var(--border))',
    color: 'hsl(var(--card-foreground))',
    padding: getSpacing(12),
    margin: getSpacing(8),
    opacity: hasAnimated ? 1 : 0,
    transform: hasAnimated ? 'scale(1)' : 'scale(0.8)',
  };

  const imageStyles: React.CSSProperties = {
    borderRadius: '6px',
    transition: createTransition({ property: 'transform', duration: 300 }),
  };

  return (
    <div
      ref={cardRef}
      className="group relative overflow-hidden border cursor-pointer"
      style={cardStyles}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={() => {
        // Handle image click
        console.log('Image clicked:', image.id);
      }}
    >
      {/* Image Container */}
      <div className="relative overflow-hidden">
        <img
          src={image.image_url || image.thumbnail_url}
          alt={image.prompt || 'Generated artwork'}
          className="w-full h-auto object-cover"
          style={imageStyles}
          loading="lazy"
        />
        
        {/* Overlay on hover */}
        <div 
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          style={{
            background: `linear-gradient(135deg, hsl(var(--primary) / 0.2), hsl(var(--accent) / 0.4))`,
            backdropFilter: 'blur(2px)',
          }}
        >
          {/* Action buttons */}
          <div className="absolute top-2 right-2 flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleLikeClick();
              }}
              className="p-2 rounded-full transition-all duration-200 hover:scale-110"
              style={{
                backgroundColor: isLiked ? 'hsl(var(--primary))' : 'hsl(var(--background))',
                color: isLiked ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground))',
                opacity: isInteracting ? 0.5 : 1,
              }}
              disabled={isInteracting}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill={isLiked ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mt-3">
        <p 
          className="text-sm line-clamp-2"
          style={{ 
            color: 'hsl(var(--muted-foreground))',
            fontSize: '0.875rem',
          }}
        >
          {image.prompt}
        </p>
        
        {/* Metadata */}
        <div className="flex items-center justify-between mt-2">
          <span 
            className="text-xs"
            style={{ color: 'hsl(var(--muted-foreground))' }}
          >
            {image.aspect_ratio || '1:1'}
          </span>
          <span 
            className="text-xs"
            style={{ color: 'hsl(var(--muted-foreground))' }}
          >
            {image.model || 'V_3'}
          </span>
        </div>
      </div>
    </div>
  );
}

export function DynamicImageGallery({ 
  className = '',
  showFilters = true,
  enableAnimations = true,
  adaptiveLayout = true,
}: DynamicImageGalleryProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { images, loading: isLoading, hasMore, loadMore } = useGallery();
  const [likedImages, setLikedImages] = useState<Set<string>>(new Set());
  const [interactionLoading, setInteractionLoading] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'masonry' | 'grid' | 'list'>('masonry');
  
  // Dynamic hooks
  const { 
    width, 
    isMobile, 
    isTablet, 
    breakpoint, 
    optimalImageGrid, 
    getSpacing,
    getResponsiveClasses,
  } = useDynamicLayout();
  
  const { theme, isDark, getAdaptiveColor } = useDynamicTheme();
  const { animatePreset, staggeredAnimate, createTransition } = useDynamicAnimations();
  const { width: containerWidth, isNarrow, isMedium, isWide } = useContainerQuery(containerRef);

  // Calculate optimal layout
  const layoutConfig = useMemo(() => {
    if (!adaptiveLayout) {
      return { columns: isMobile ? 1 : isTablet ? 2 : 3, gap: 16 };
    }

    const baseConfig = optimalImageGrid;
    
    // Adjust based on view mode
    switch (viewMode) {
      case 'list':
        return { columns: 1, gap: 12 };
      case 'grid':
        return { 
          columns: Math.min(baseConfig.columns, isMobile ? 2 : isTablet ? 3 : 4), 
          gap: baseConfig.gap 
        };
      case 'masonry':
      default:
        return baseConfig;
    }
  }, [adaptiveLayout, optimalImageGrid, viewMode, isMobile, isTablet]);

  // Handle like/unlike with animation
  const handleLike = useCallback(async (imageId: string) => {
    setInteractionLoading(imageId);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      setLikedImages(prev => new Set([...prev, imageId]));
    } catch (error) {
      console.error('Failed to like image:', error);
    } finally {
      setInteractionLoading(null);
    }
  }, []);

  const handleUnlike = useCallback(async (imageId: string) => {
    setInteractionLoading(imageId);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      setLikedImages(prev => {
        const newSet = new Set(prev);
        newSet.delete(imageId);
        return newSet;
      });
    } catch (error) {
      console.error('Failed to unlike image:', error);
    } finally {
      setInteractionLoading(null);
    }
  }, []);

  // Intersection observer for infinite scroll
  const loadingRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!loadingRef.current || !hasMore || isLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loadingRef.current);

    return () => observer.disconnect();
  }, [loadMore, hasMore, isLoading]);

  // Staggered animation for new images
  useEffect(() => {
    if (!enableAnimations || !containerRef.current) return;

    const imageCards = containerRef.current.querySelectorAll('[data-image-card]');
    const newCards = Array.from(imageCards).slice(-4); // Animate last 4 cards
    
    if (newCards.length > 0) {
      staggeredAnimate(
        newCards,
        [
          { opacity: 0, transform: 'translateY(20px) scale(0.9)' },
          { opacity: 1, transform: 'translateY(0) scale(1)' },
        ],
        { duration: 400, easing: 'ease-out' },
        100
      );
    }
  }, [images.length, enableAnimations, staggeredAnimate]);

  // Dynamic grid styles
  const gridStyles: React.CSSProperties = useMemo(() => {
    const baseStyles: React.CSSProperties = {
      transition: createTransition([
        { property: 'grid-template-columns', duration: 300 },
        { property: 'gap', duration: 300 },
      ]),
    };

    switch (viewMode) {
      case 'masonry':
        return {
          ...baseStyles,
          columns: layoutConfig.columns,
          columnGap: `${layoutConfig.gap}px`,
          columnFill: 'balance',
        };
      case 'grid':
        return {
          ...baseStyles,
          display: 'grid',
          gridTemplateColumns: `repeat(${layoutConfig.columns}, 1fr)`,
          gap: `${layoutConfig.gap}px`,
        };
      case 'list':
        return {
          ...baseStyles,
          display: 'flex',
          flexDirection: 'column',
          gap: `${layoutConfig.gap}px`,
        };
      default:
        return baseStyles;
    }
  }, [viewMode, layoutConfig, createTransition]);

  // Container styles
  const containerStyles: React.CSSProperties = {
    backgroundColor: theme.colors.background,
    color: theme.colors.foreground,
    minHeight: '100vh',
    padding: getSpacing(16),
    transition: createTransition([
      { property: 'background-color', duration: 200 },
      { property: 'color', duration: 200 },
    ]),
  };

  return (
    <div 
      ref={containerRef}
      className={`dynamic-image-gallery ${className}`}
      style={containerStyles}
    >
      {/* Header with controls */}
      {showFilters && (
        <div className="flex items-center justify-between mb-6">
          <h2 
            className="text-2xl font-semibold"
            style={{ color: theme.colors.foreground }}
          >
            Gallery
          </h2>
          
          {/* View mode controls */}
          <div 
            className="flex items-center gap-2 p-1 rounded-lg"
            style={{ 
              backgroundColor: theme.colors.muted,
              border: `1px solid ${theme.colors.border}`,
            }}
          >
            {(['masonry', 'grid', 'list'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className="px-3 py-2 rounded-md text-sm font-medium transition-all duration-200"
                style={{
                  backgroundColor: viewMode === mode ? theme.colors.primary : 'transparent',
                  color: viewMode === mode ? theme.colors.primaryForeground : theme.colors.mutedForeground,
                }}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Gallery Grid */}
      <div 
        className={getResponsiveClasses({
          xs: 'gallery-mobile',
          sm: 'gallery-tablet',
          lg: 'gallery-desktop',
        })}
        style={gridStyles}
      >
        {images.map((image, index) => (
          <div key={`${image.id}-${index}`} data-image-card>
            <DynamicImageCard
              image={image}
              index={index}
              onLike={handleLike}
              onUnlike={handleUnlike}
              isLiked={likedImages.has(image.id)}
              isInteracting={interactionLoading === image.id}
              animationDelay={enableAnimations ? index * 50 : 0}
            />
          </div>
        ))}
      </div>

      {/* Loading indicator */}
      {hasMore && (
        <div 
          ref={loadingRef}
          className="w-full text-center mt-8 py-4"
        >
          {isLoading ? (
            <div className="flex items-center justify-center gap-2">
              <div 
                className="w-4 h-4 rounded-full animate-spin"
                style={{
                  border: `2px solid ${theme.colors.border}`,
                  borderTopColor: theme.colors.primary,
                }}
              />
              <span style={{ color: theme.colors.mutedForeground }}>
                Loading more images...
              </span>
            </div>
          ) : (
            <div className="w-4 h-4" />
          )}
        </div>
      )}

      {/* Debug info (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div 
          className="fixed bottom-4 left-4 p-2 rounded text-xs font-mono"
          style={{ 
            backgroundColor: theme.colors.card,
            border: `1px solid ${theme.colors.border}`,
            color: theme.colors.mutedForeground,
          }}
        >
          <div>Breakpoint: {breakpoint}</div>
          <div>Container: {containerWidth}px</div>
          <div>Columns: {layoutConfig.columns}</div>
          <div>Gap: {layoutConfig.gap}px</div>
          <div>View: {viewMode}</div>
          <div>Theme: {theme.name}</div>
        </div>
      )}
    </div>
  );
}
