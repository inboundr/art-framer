'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useCuratedGallery } from '@/hooks/useCuratedGallery';
import type { CuratedImage } from '@/lib/curated-images';
import { Heart, Eye, Download, Share2, ShoppingCart, XCircle, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useDynamicAnimationsSafe } from '@/hooks/useDynamicHooksSafe';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/contexts/CartContext';
import { useCartNotification } from './CartNotificationToast';
import { supabase } from '@/lib/supabase/client';
import { CreationsModal } from './CreationsModal';
import { FrameSelector } from './FrameSelector';

interface CuratedImageCardProps {
  image: CuratedImage;
  onImageClick?: (image: CuratedImage) => void;
  onBuyAsFrame?: (image: CuratedImage) => void;
  onOpenAuthModal?: () => void;
  animationDelay?: number;
}

function CuratedImageCard({ image, onImageClick, onBuyAsFrame, onOpenAuthModal, animationDelay = 0 }: CuratedImageCardProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const { createTransition } = useDynamicAnimationsSafe();
  const { user } = useAuth();
  const { toast } = useToast();
  const { addToCart } = useCart();
  const { showCartNotification } = useCartNotification();

  const handleImageClick = () => {
    onImageClick?.(image);
  };

  const handleBuyAsFrame = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering image click
    console.log('🛒 Order Frame clicked:', { user: !!user, hasOnOpenAuthModal: !!onOpenAuthModal });
    
    if (!user) {
      console.log('🔐 User not authenticated, opening auth modal');
      // Store the selected image in localStorage for after login
      localStorage.setItem('pending-cart-image', JSON.stringify({
        id: image.id,
        image_url: image.image_url,
        title: image.title,
        description: image.description,
        aspect_ratio: image.aspect_ratio,
        timestamp: Date.now()
      }));
      
      // Show auth modal for non-authenticated users
      if (onOpenAuthModal) {
        console.log('🔐 Calling onOpenAuthModal');
        onOpenAuthModal();
      } else {
        console.error('❌ onOpenAuthModal not provided');
      }
      return;
    }
    console.log('✅ User authenticated, proceeding to frame selection');
    // Directly trigger the frame selection without opening CreationsModal
    onBuyAsFrame?.(image);
  };

  const handleView = (e: React.MouseEvent) => {
    e.stopPropagation();
    onImageClick?.(image);
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    // TODO: Implement like functionality
    console.log('Like clicked for image:', image.id);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.share) {
      navigator.share({
        title: image.title,
        text: `Check out this beautiful AI-generated art: ${image.title}`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: 'Link Copied',
        description: 'Link has been copied to clipboard.',
      });
    }
  };

  const handleImageLoad = () => {
    setIsLoaded(true);
  };

  return (
    <Card 
      className="group cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-lg"
      style={{
        animationDelay: `${animationDelay}ms`,
        transition: createTransition([
          { property: 'transform', duration: 300 },
          { property: 'box-shadow', duration: 300 },
        ]),
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleImageClick}
    >
      <CardContent className="p-0 relative">
        {/* Image Container */}
        <div className="relative overflow-hidden group">
          {!isLoaded && (
            <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
          
          <img
            src={image.image_url}
            alt={image.title}
            className={`w-full h-auto object-cover transition-opacity duration-300 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={handleImageLoad}
            loading="lazy"
          />
          
          {/* Order Frame Button - Top Right Corner */}
          <div 
            className={`absolute top-2 right-2 transition-all duration-300 pointer-events-auto ${
              isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
            }`}
          >
            <Button 
              size="sm" 
              variant="default" 
              className="rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-3 py-2 shadow-lg"
              onClick={handleBuyAsFrame}
            >
              <ShoppingCart className="w-4 h-4 mr-1" />
              Order Frame
            </Button>
          </div>
        </div>

      </CardContent>
    </Card>
  );
}

interface CuratedImageGalleryProps {
  className?: string;
  showFilters?: boolean;
  enableAnimations?: boolean;
  onImageClick?: (image: CuratedImage) => void;
  onBuyAsFrame?: (image: CuratedImage) => void;
  onOpenAuthModal?: () => void;
}

export function CuratedImageGallery({ 
  className = '',
  showFilters = true,
  enableAnimations = true,
  onImageClick,
  onBuyAsFrame,
  onOpenAuthModal
}: CuratedImageGalleryProps) {
  const { images, loading, error, hasMore, loadMore } = useCuratedGallery();
  const { user } = useAuth();
  
  // Debug logging
  useEffect(() => {
    console.log('🖼️ CuratedImageGallery render:', { 
      imagesCount: images.length, 
      loading, 
      hasError: !!error,
      hasMore,
      errorMessage: error?.message
    });
  }, [images.length, loading, error, hasMore]);

  // Additional debug logging for initial load
  useEffect(() => {
    console.log('🖼️ CuratedImageGallery initial load check:', { 
      images: images.length > 0 ? `${images.length} images loaded` : 'no images yet',
      loading,
      error: error ? error.message : 'no error',
      hasMore
    });
  }, []);

  // Additional debug logging for hook state
  useEffect(() => {
    console.log('🖼️ CuratedImageGallery hook state:', { 
      images: images.length > 0 ? `${images.length} images` : 'no images',
      loading,
      error: error ? error.message : 'no error',
      hasMore
    });
  }, [images, loading, error, hasMore]);

  // Add retry mechanism for failed image loads
  useEffect(() => {
    if (error && !loading && images.length === 0) {
      console.log('🔄 CuratedImageGallery: Retrying after error...');
      const retryTimer = setTimeout(() => {
        window.location.reload();
      }, 3000);
      
      return () => clearTimeout(retryTimer);
    }
  }, [error, loading, images.length]);

  // Check for pending cart image after login
  useEffect(() => {
    if (user) {
      const pendingImageData = localStorage.getItem('pending-cart-image');
      if (pendingImageData) {
        try {
          const pendingImage = JSON.parse(pendingImageData);
          // Check if the data is not too old (within 1 hour)
          const isRecent = Date.now() - pendingImage.timestamp < 60 * 60 * 1000;
          if (isRecent) {
            console.log('🛒 Found pending cart image after login:', pendingImage);
            // Convert to CuratedImage format and show modal
            const curatedImage: CuratedImage = {
              id: pendingImage.id,
              image_url: pendingImage.image_url,
              title: pendingImage.title,
              description: pendingImage.description,
              category: 'curated',
              tags: [],
              thumbnail_url: null,
              width: 800,
              height: 600,
              aspect_ratio: pendingImage.aspect_ratio,
              display_order: 0,
              is_featured: false,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            // Go directly to frame selection for pending image
            setFrameSelectorImage(curatedImage);
            setShowFrameSelector(true);
            // Clear the pending image
            localStorage.removeItem('pending-cart-image');
          } else {
            // Clear old pending image
            localStorage.removeItem('pending-cart-image');
          }
        } catch (error) {
          console.error('Error parsing pending cart image:', error);
          localStorage.removeItem('pending-cart-image');
        }
      }
    }
  }, [user]);
  const [isHydrated, setIsHydrated] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef<HTMLDivElement>(null);
  const [selectedImage, setSelectedImage] = useState<CuratedImage | null>(null);
  const [showCreationsModal, setShowCreationsModal] = useState(false);
  const [showFrameSelector, setShowFrameSelector] = useState(false);
  const [frameSelectorImage, setFrameSelectorImage] = useState<CuratedImage | null>(null);

  // Dynamic animations hook
  const { createTransition } = useDynamicAnimationsSafe();
  
  // Cart and toast hooks
  const { toast } = useToast();
  const { addToCart } = useCart();
  const { showCartNotification } = useCartNotification();

  // Ensure hydration safety
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const handleBuyAsFrame = (image: CuratedImage) => {
    // Show frame selector directly
    setFrameSelectorImage(image);
    setShowFrameSelector(true);
    onBuyAsFrame?.(image);
  };

  const handleImageClick = (image: CuratedImage) => {
    setSelectedImage(image);
    setShowCreationsModal(true);
    onImageClick?.(image);
  };

  const handleCloseCreationsModal = () => {
    setShowCreationsModal(false);
    setSelectedImage(null);
  };

  const handleAddToCart = async (frame: any) => {
    console.log('🔥🔥🔥 CuratedImageGallery.handleAddToCart CALLED 🔥🔥🔥');
    console.log('🛒 CuratedImageGallery: handleAddToCart called', { 
      hasUser: !!user, 
      hasFrameSelectorImage: !!frameSelectorImage,
      frameSelectorImageId: frameSelectorImage?.id,
      frame,
      frameDetails: frame ? {
        size: frame.size,
        style: frame.style,
        material: frame.material,
        price: frame.price,
        hasAllProps: !!(frame.size && frame.style && frame.material && typeof frame.price === 'number')
      } : null
    });
    
    if (!user) {
      console.error('❌ CuratedImageGallery: No user - STOPPING HERE');
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to add items to your cart.',
        variant: 'destructive',
      });
      return;
    }
    console.log('✅ CuratedImageGallery: User check passed');

    if (!frameSelectorImage?.id) {
      console.error('❌ CuratedImageGallery: frameSelectorImage or image ID missing - STOPPING HERE', { 
        frameSelectorImage,
        hasFrameSelectorImage: !!frameSelectorImage,
        imageId: frameSelectorImage?.id
      });
      toast({
        title: 'Image Error',
        description: 'Image ID is missing. Please try again.',
        variant: 'destructive',
      });
      return;
    }
    console.log('✅ CuratedImageGallery: frameSelectorImage check passed', { imageId: frameSelectorImage.id });

    if (!frame || !frame.size || !frame.style || !frame.material || typeof frame.price !== 'number') {
      console.error('❌ CuratedImageGallery: Invalid frame object - STOPPING HERE', {
        frame,
        hasFrame: !!frame,
        hasSize: !!frame?.size,
        hasStyle: !!frame?.style,
        hasMaterial: !!frame?.material,
        hasPrice: typeof frame?.price === 'number',
        priceType: typeof frame?.price
      });
      toast({
        title: 'Error',
        description: 'Invalid frame selection. Please try again.',
        variant: 'destructive',
      });
      return;
    }
    console.log('✅ CuratedImageGallery: Frame validation passed');

    try {
      console.log('🛒 CuratedImageGallery: About to get session...');
      // Get the session to access the token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('❌ CuratedImageGallery: Session error', sessionError);
        throw new Error('Authentication error. Please try signing in again.');
      }
      
      if (!session) {
        console.error('❌ CuratedImageGallery: No session');
        throw new Error('Please sign in to add items to your cart.');
      }
      
      console.log('✅ CuratedImageGallery: Session obtained', { hasToken: !!session.access_token });
      
      console.log('🚀 CuratedImageGallery: MAKING FETCH REQUEST NOW to /api/curated-products', {
        url: '/api/curated-products',
        method: 'POST',
        hasToken: !!session.access_token,
        body: {
          curatedImageId: frameSelectorImage.id,
          frameSize: frame.size,
          frameStyle: frame.style,
          frameMaterial: frame.material,
          price: frame.price
        }
      });
      
      // Test if fetch is available
      if (typeof fetch === 'undefined') {
        console.error('❌❌❌ FETCH IS NOT AVAILABLE! ❌❌❌');
        throw new Error('Fetch API is not available');
      }
      
      console.log('✅ Fetch is available, making request...');
      
      // Use curated products API for curated images
      const response = await fetch('/api/curated-products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
        },
        credentials: 'include',
        body: JSON.stringify({
          curatedImageId: frameSelectorImage.id,
          frameSize: frame.size,
          frameStyle: frame.style,
          frameMaterial: frame.material,
          price: frame.price,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        
        // Provide more specific error messages
        if (response.status === 401) {
          throw new Error('Please log in to add items to your cart');
        } else if (response.status === 404) {
          throw new Error('Image not found or no longer available');
        } else if (response.status === 500) {
          throw new Error(errorData.details || errorData.error || 'Failed to create product');
        } else {
          throw new Error(errorData.error || 'Failed to create product');
        }
      }

      const data = await response.json();
      
      // Use the cart context to add to cart
      const success = await addToCart(data.product.id, 1);

      if (!success) {
        throw new Error('Failed to add to cart');
      }

      console.log('✅ CuratedImageGallery: Item successfully added to cart, showing notification');

      // Show enhanced cart notification with action buttons
      try {
      showCartNotification({
        itemName: `${frame.size} ${frame.style} Frame`,
        itemImage: frameSelectorImage.image_url,
        onViewCart: () => {
          // Close the frame selector and navigate to cart
          setShowFrameSelector(false);
          window.location.href = '/cart';
        },
        onContinueShopping: () => {
          // Just close the frame selector
          setShowFrameSelector(false);
        }
      });
        console.log('✅ CuratedImageGallery: Cart notification displayed');
      } catch (notificationError) {
        console.error('❌ CuratedImageGallery: Error showing cart notification', notificationError);
        // Fallback to simple toast notification
        toast({
          title: 'Added to Cart',
          description: `${frame.size} ${frame.style} Frame has been added to your cart.`,
        });
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add framed art to cart. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // Only create observer if we have more content to load
    if (!hasMore || loading) {
      return;
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          console.log('🔄 Curated gallery intersection observer triggered loadMore');
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadingRef.current) {
      observerRef.current.observe(loadingRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, loading]); // Remove loadMore from dependencies to prevent infinite re-creation

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-foreground mb-2">Failed to load images</h3>
          <p className="text-muted-foreground mb-4">{error.message}</p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`flex flex-col items-center self-stretch bg-background text-foreground ${className}`}
    >
      <div 
        className="flex flex-col items-center w-full max-w-7xl mx-auto py-6 px-4"
      >
        {/* Masonry Layout Container */}
        <div className="w-full">
          {/* Dynamic Responsive Masonry Columns */}
          <div 
            className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 2xl:columns-6 gap-4"
          >
            {images.map((image, index) => (
              <CuratedImageCard 
                key={`${image.id}-${index}`}
                image={image}
                onImageClick={handleImageClick}
                onBuyAsFrame={handleBuyAsFrame}
                onOpenAuthModal={onOpenAuthModal}
                animationDelay={enableAnimations ? index * 100 : 0}
              />
            ))}
          </div>
        </div>

        {/* Loading indicator for infinite scroll */}
        {hasMore && (
          <div 
            ref={loadingRef}
            className="flex justify-center items-center py-8"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin"></div>
                <span className="text-muted-foreground">Loading more images...</span>
              </div>
            ) : (
              <div className="text-muted-foreground">Scroll to load more</div>
            )}
          </div>
        )}

        {/* No more images */}
        {!hasMore && images.length > 0 && (
          <div className="flex justify-center items-center py-8">
            <div className="text-muted-foreground">No more images to load</div>
          </div>
        )}

        {/* Empty state */}
        {!loading && images.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-foreground mb-2">No images found</h3>
              <p className="text-muted-foreground">Check back later for new curated content.</p>
            </div>
          </div>
        )}
      </div>

      {/* Creations Modal for viewing images in full size */}
      {selectedImage && (
        <CreationsModal
          isOpen={showCreationsModal}
          onClose={handleCloseCreationsModal}
          imageUrl={selectedImage.image_url}
          promptText={selectedImage.title}
          imageId={selectedImage.id}
          isMobile={false}
          isCuratedImage={true} // Curated images are indeed curated
        />
      )}

      {/* Frame Selector Modal */}
      {showFrameSelector && frameSelectorImage && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm">
          <div className="flex h-full">
            <div className="flex-1 bg-background overflow-y-auto">
              <div className="max-w-4xl mx-auto p-6">
                {/* Modal Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h2 className="text-2xl font-bold">Choose Your Frame</h2>
                      <div className="relative group">
                        <HelpCircle className="h-5 w-5 text-muted-foreground cursor-help" />
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                          <div className="text-center">
                            <div className="font-semibold mb-1">How to choose your frame</div>
                            <div className="text-xs">
                              Select your preferred size, style, and material. Options will automatically update to show only available combinations. Unavailable options are grayed out.
                            </div>
                          </div>
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setShowFrameSelector(false)}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>

                {/* Frame Selector */}
                <FrameSelector
                  imageUrl={frameSelectorImage.image_url}
                  imagePrompt={frameSelectorImage.title}
                  onFrameSelect={(frame) => {
                    // Handle frame selection
                    console.log('Frame selected:', frame);
                  }}
                  onAddToCart={handleAddToCart}
                  selectedFrame={null}
                  showPreview={true}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
