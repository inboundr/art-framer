'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';
import { getProxiedImageUrl } from '@/lib/utils/imageProxy';
import { CreationsModal } from './CreationsModal';
import { FrameSelector } from './FrameSelector';
import { Button } from '@/components/ui/button';
import { ShoppingCart, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/contexts/CartContext';
import { useCartNotification } from './CartNotificationToast';

interface UserImage {
  id: string;
  image_url: string;
  prompt: string;
  created_at: string;
  width: number;
  height: number;
  likes: number;
  aspect_ratio?: string;
}

interface UserImageCardProps {
  image: UserImage;
  onImageClick: (image: UserImage) => void;
  onBuyAsFrame: (image: UserImage) => void;
}

function UserImageCard({ image, onImageClick, onBuyAsFrame }: UserImageCardProps) {
  // Normalize any DB-stored storage path into a public URL
  const normalizeImageUrl = useCallback((url?: string | null) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    try {
      const { data } = supabase.storage.from('images').getPublicUrl(url);
      return data?.publicUrl || url;
    } catch {
      return url;
    }
  }, []);
  const getAspectRatioClass = () => {
    // Map our aspect ratios to CSS classes
    switch (image.aspect_ratio) {
      case 'square':
        return 'aspect-square';
      case 'wide':
        return 'aspect-[4/3] md:aspect-[3/2]';
      case 'tall':
        return 'aspect-[3/4] md:aspect-[2/3]';
      default:
        return 'aspect-square';
    }
  };

  return (
    <div className="break-inside-avoid mb-2">
      <div className="relative group cursor-pointer" onClick={() => onImageClick(image)}>
        {/* Image Container */}
        <div className={`${getAspectRatioClass()} w-full overflow-hidden rounded-lg bg-dark-tertiary`}>
          {/* Gradient Background */}
          <div 
            className="w-full h-full bg-gradient-to-br from-pink-primary/20 via-purple-500/20 to-blue-500/20 relative"
            style={{
              background: 'linear-gradient(151deg, rgba(255, 159, 189, 0.20) 0%, rgba(246, 136, 194, 0.20) 20%, rgba(229, 115, 204, 0.20) 40%, rgba(200, 101, 219, 0.20) 60%, rgba(154, 94, 237, 0.20) 90%, rgba(61, 94, 255, 0.20) 100%)'
            }}
          >
            {/* Checker Pattern Overlay */}
            <div className="absolute top-0 left-0 w-full h-full opacity-100">
              <svg 
                width="18" 
                height="18" 
                viewBox="0 0 19 19" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                className="w-[18px] h-[18px]"
                style={{ 
                  position: 'absolute', 
                  top: '8px', 
                  left: '8px', 
                  zIndex: 10 
                }}
              >
                <g clipPath="url(#clip0_desktop)">
                  <path 
                    fillRule="evenodd" 
                    clipRule="evenodd" 
                    d="M0.664062 0.310547H8.66406V8.31055H0.664062V0.310547ZM8.66406 8.31055H16.6641V16.3105H8.66406V8.31055Z" 
                    fill="#09090B"
                  />
                </g>
                <defs>
                  <clipPath id="clip0_desktop">
                    <rect width="16" height="16" fill="white" transform="translate(0.664062 0.310547)"/>
                  </clipPath>
                </defs>
              </svg>
            </div>

            {/* Main Image */}
            <img
              src={getProxiedImageUrl(normalizeImageUrl(image.image_url))}
              alt={image.prompt}
              className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
              loading="lazy"
            />
            
            {/* Order Frame Button - Top Right Corner */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <Button 
                size="sm" 
                variant="default" 
                className="rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-3 py-2 shadow-lg"
                onClick={(e) => {
                  e.stopPropagation();
                  onBuyAsFrame(image);
                }}
              >
                <ShoppingCart className="w-4 h-4 mr-1" />
                Order Frame
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function UserImageGallery() {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const { addToCart } = useCart();
  const { showCartNotification } = useCartNotification();
  
  // Debug function - expose to window for testing
  useEffect(() => {
    (window as any).testAddToCartFunction = async () => {
      console.log('🧪 TEST: Calling addToCart directly');
      if (!user) {
        console.error('🧪 TEST: No user');
        return;
      }
      try {
        console.log('🧪 TEST: Making direct fetch to /api/cart');
        const response = await fetch('/api/cart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ productId: 'test-product-id', quantity: 1 }),
        });
        console.log('🧪 TEST: Fetch response', response.status, await response.text());
      } catch (error) {
        console.error('🧪 TEST: Fetch error', error);
      }
    };
    return () => {
      delete (window as any).testAddToCartFunction;
    };
  }, [user]);
  
  // Normalize any DB-stored storage path into a public URL
  const normalizeImageUrl = useCallback((url?: string | null) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    try {
      const { data } = supabase.storage.from('images').getPublicUrl(url);
      return data?.publicUrl || url;
    } catch {
      return url;
    }
  }, []);
  const [images, setImages] = useState<UserImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [selectedImage, setSelectedImage] = useState<UserImage | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [showFrameSelector, setShowFrameSelector] = useState(false);
  const [frameSelectorImage, setFrameSelectorImage] = useState<UserImage | null>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const IMAGES_PER_PAGE = 20;
  const lastFetchedUserIdRef = useRef<string | null>(null);

  const fetchUserImages = useCallback(async (pageNum: number = 0, append: boolean = false) => {
    if (!user) {
      setLoading(false);
      return;
    }

    // If session is not available, try to get it fresh
    let authToken = session?.access_token;
    if (!authToken) {
      console.log('🔄 UserImageGallery: No session token, fetching fresh session...');
      try {
        const { data: { session: freshSession } } = await supabase.auth.getSession();
        if (freshSession?.access_token) {
          authToken = freshSession.access_token;
          console.log('✅ UserImageGallery: Got fresh session token');
        }
      } catch (error) {
        console.warn('⚠️ UserImageGallery: Failed to get fresh session', error);
      }
    }

    try {
      const page = pageNum + 1; // API uses 1-based pagination
      const params = new URLSearchParams({
        page: page.toString(),
        limit: IMAGES_PER_PAGE.toString(),
      });

      console.log('📡 UserImageGallery: Fetching images', {
        page,
        hasToken: !!authToken,
        userId: user.id
      });

      const response = await fetch(`/api/user-images?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
        headers: authToken ? {
          'Authorization': `Bearer ${authToken}`
        } : {}
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        setLoading(false);
        
        if (response.status === 401) {
          toast({
            title: 'Authentication Required',
            description: 'Please sign in to view your creations.',
            variant: 'destructive',
          });
          setImages([]);
        } else if (!append) {
          toast({
            title: 'Failed to load images',
            description: errorData.error || 'Please try refreshing the page.',
            variant: 'destructive',
          });
        }
        return;
      }

      const data = await response.json();

      const newImages = data.images || [];
      
      if (append) {
        setImages(prev => [...prev, ...newImages]);
      } else {
        setImages(newImages);
      }
      
      setHasMore(data.pagination?.has_more ?? false);
    } catch (error) {
      console.error('❌ UserImageGallery: Fetch error:', error);
      setLoading(false);
      if (!append) {
        toast({
          title: 'Network Error',
          description: 'Failed to load images. Please check your connection.',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  }, [user, session, IMAGES_PER_PAGE, toast]);

  // Fetch images when user is available (including after page refresh)
  useEffect(() => {
    const userId = user?.id;
    
    // If we have a user and haven't fetched for this user yet, fetch
    if (userId && lastFetchedUserIdRef.current !== userId) {
      console.log('📡 UserImageGallery: User available, checking session before fetching', { 
        userId,
        hasSession: !!session,
        hasToken: !!session?.access_token,
      });
      
      // Wait a bit for session to be available if it's not ready yet
      if (!session?.access_token) {
        console.log('⏳ UserImageGallery: Session not ready, waiting 100ms...');
        const timeoutId = setTimeout(() => {
          console.log('📡 UserImageGallery: Retrying fetch after session wait', {
            hasSession: !!session,
            hasToken: !!session?.access_token,
          });
          lastFetchedUserIdRef.current = userId;
          setLoading(true);
          setPage(0);
          fetchUserImages(0, false);
        }, 100);
        return () => clearTimeout(timeoutId);
      }
      
      lastFetchedUserIdRef.current = userId;
      setLoading(true);
      setPage(0);
      fetchUserImages(0, false);
    } else if (user === null && lastFetchedUserIdRef.current !== null) {
      // User was logged out - clear everything
      console.log('🚪 UserImageGallery: User logged out, clearing images');
      lastFetchedUserIdRef.current = null;
      setLoading(false);
      setImages([]);
      setPage(0);
    }
  }, [user?.id, session, fetchUserImages, user]);

  const handleScroll = useCallback(() => {
    if (!galleryRef.current || !hasMore || loading) return;
    
    const { scrollTop, scrollHeight, clientHeight } = galleryRef.current;
    if (scrollTop + clientHeight >= scrollHeight - 1000) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchUserImages(nextPage, true);
    }
  }, [hasMore, loading, page, fetchUserImages]);

  useEffect(() => {
    const galleryElement = galleryRef.current;
    if (galleryElement) {
      galleryElement.addEventListener('scroll', handleScroll);
      return () => galleryElement.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  const handleImageClick = (image: UserImage) => {
    setSelectedImage(image);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedImage(null);
  };

  const handleBuyAsFrame = (image: UserImage) => {
    setFrameSelectorImage(image);
    setShowFrameSelector(true);
  };

  const handleAddToCart = async (frame: any) => {
    console.log('🔥🔥🔥 UserImageGallery.handleAddToCart CALLED 🔥🔥🔥');
    console.log('🛒 UserImageGallery: handleAddToCart CALLED', { 
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
      console.error('❌ UserImageGallery: No user - STOPPING HERE');
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to add items to your cart.',
        variant: 'destructive',
      });
      return;
    }
    console.log('✅ UserImageGallery: User check passed');

    if (!frameSelectorImage?.id) {
      console.error('❌ UserImageGallery: frameSelectorImage or image ID missing - STOPPING HERE', { 
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
    console.log('✅ UserImageGallery: frameSelectorImage check passed', { imageId: frameSelectorImage.id });

    if (!frame || !frame.size || !frame.style || !frame.material || typeof frame.price !== 'number') {
      console.error('❌ UserImageGallery: Invalid frame object - STOPPING HERE', {
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
    console.log('✅ UserImageGallery: Frame validation passed');

    try {
      console.log('🛒 UserImageGallery: About to make API call to /api/products', {
        imageId: frameSelectorImage.id,
        frameSize: frame.size,
        frameStyle: frame.style,
        frameMaterial: frame.material,
        price: frame.price,
        timestamp: new Date().toISOString()
      });
      
      console.log('🔑 UserImageGallery: Checking session from useAuth...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('🔑 UserImageGallery: getSession() completed', { 
        hasSession: !!session, 
        hasError: !!sessionError,
        hasToken: !!session?.access_token 
      });
      
      if (sessionError) {
        console.error('❌ UserImageGallery: Session error', sessionError);
        throw new Error('Authentication error. Please try signing in again.');
      }
      
      if (!session) {
        console.error('❌ UserImageGallery: No session');
        throw new Error('Please sign in to add items to your cart.');
      }
      
      console.log('✅ UserImageGallery: Session obtained from getSession', { hasToken: !!session.access_token });
      
      console.log('🚀 UserImageGallery: MAKING FETCH REQUEST NOW to /api/products', {
        url: '/api/products',
        method: 'POST',
        hasToken: !!session.access_token,
        body: {
          imageId: frameSelectorImage.id,
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
      console.log('🚀 Starting fetch to /api/products...');
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
        },
        credentials: 'include',
        body: JSON.stringify({
          imageId: frameSelectorImage.id,
          frameSize: frame.size,
          frameStyle: frame.style,
          frameMaterial: frame.material,
          price: frame.price,
        }),
      });

      console.log('✅ Fetch completed, response received:', { 
        status: response.status, 
        ok: response.ok,
        statusText: response.statusText 
      });

      if (!response.ok) {
        console.log('❌ Response not OK, parsing error data...');
        const errorData = await response.json();
        console.error('API Error:', errorData);
        
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

      console.log('📦 Parsing response JSON...');
      const data = await response.json();
      console.log('✅ Response parsed:', { hasProduct: !!data.product, productId: data.product?.id });
      console.log('✅ UserImageGallery: API response received', { 
        status: response.status, 
        hasProduct: !!data.product,
        productId: data.product?.id 
      });
      
      if (!data.product || !data.product.id) {
        console.error('❌ UserImageGallery: Invalid API response', data);
        throw new Error('Invalid product data received from server.');
      }
      
      console.log('🛒 UserImageGallery: Calling addToCart', { productId: data.product.id, quantity: 1 });
      const success = await addToCart(data.product.id, 1);
      console.log('🛒 UserImageGallery: addToCart result', { success });

      if (!success) {
        console.error('❌ UserImageGallery: addToCart returned false');
        throw new Error('Failed to add to cart');
      }

      console.log('✅ UserImageGallery: Item successfully added to cart, showing notification');

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
        console.log('✅ UserImageGallery: Cart notification displayed');
      } catch (notificationError) {
        console.error('❌ UserImageGallery: Error showing cart notification', notificationError);
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

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Please sign in to view your creations</p>
        </div>
      </div>
    );
  }

  if (loading && images.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your creations...</p>
        </div>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center py-12">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-secondary flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-muted-foreground">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
              <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="2"/>
              <polyline points="21,15 16,10 5,21" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No creations yet</h3>
          <p className="text-muted-foreground mb-6">Start creating amazing AI art to see your images here</p>
          <button 
            onClick={() => window.location.href = '/'}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Create Your First Image
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Gallery Container */}
      <div 
        ref={galleryRef}
        className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-8"
        style={{ height: 'calc(100vh - 200px)' }}
      >
        <div className="max-w-7xl mx-auto">
          {/* Masonry Grid */}
          <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4">
            {images.map((image) => (
              <UserImageCard
                key={image.id}
                image={image}
                onImageClick={handleImageClick}
                onBuyAsFrame={handleBuyAsFrame}
              />
            ))}
          </div>
          
          {/* Loading indicator */}
          {loading && images.length > 0 && (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}
        </div>
      </div>

      {/* CreationsModal */}
      {selectedImage && (
        <CreationsModal
          isOpen={modalOpen}
          onClose={handleCloseModal}
          imageUrl={normalizeImageUrl(selectedImage.image_url)}
          promptText={selectedImage.prompt}
          imageId={selectedImage.id}
          isMobile={false} // You can add mobile detection here if needed
          isCuratedImage={false} // User images are not curated images
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
                    <h2 className="text-2xl font-bold">Choose Your Frame</h2>
                    <p className="text-muted-foreground">
                      Select the perfect frame for your AI-generated art
                    </p>
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
                  imageUrl={normalizeImageUrl(frameSelectorImage.image_url)}
                  imagePrompt={frameSelectorImage.prompt}
                  onFrameSelect={(frame) => {
                    // Handle frame selection - this is just for preview/display
                    console.log('🎨 UserImageGallery: Frame selected for preview', frame);
                  }}
                  onAddToCart={handleAddToCart}
                  selectedFrame={null} // Let FrameSelector auto-select first matching frame
                  showPreview={true}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
