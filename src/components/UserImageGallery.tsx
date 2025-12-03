'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';
import { getProxiedImageUrl } from '@/lib/utils/imageProxy';
import { CreationsModal } from './CreationsModal';
import { Button } from '@/components/ui/button';
import { ShoppingCart, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/contexts/CartContext';
import { useCartNotification } from './CartNotificationToast';
import { useStudioStore } from '@/store/studio';

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
  onOpenAuthModal?: () => void;
}

function UserImageCard({ image, onImageClick, onBuyAsFrame, onOpenAuthModal }: UserImageCardProps) {
  const { user } = useAuth();
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
        <div className={`${getAspectRatioClass()} w-full overflow-hidden rounded-lg bg-gray-100`}>
          {/* Gradient Background */}
          <div 
            className="w-full h-full bg-gradient-to-br from-pink-primary/20 via-purple-500/20 to-blue-500/20 relative"
            style={{
              background: 'linear-gradient(151deg, rgba(255, 159, 189, 0.20) 0%, rgba(246, 136, 194, 0.20) 20%, rgba(229, 115, 204, 0.20) 40%, rgba(200, 101, 219, 0.20) 60%, rgba(154, 94, 237, 0.20) 90%, rgba(61, 94, 255, 0.20) 100%)'
            }}
          >
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
                  console.log('🛒 Order Frame clicked (UserImageCard):', { user: !!user, hasOnOpenAuthModal: !!onOpenAuthModal });
                  
                  if (!user) {
                    console.log('🔐 User not authenticated, opening auth modal');
                    // Store the selected image in localStorage for after login
                    localStorage.setItem('pending-cart-image', JSON.stringify({
                      id: image.id,
                      image_url: image.image_url,
                      prompt: image.prompt,
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

interface UserImageGalleryProps {
  onOpenAuthModal?: () => void;
}

export function UserImageGallery({ onOpenAuthModal }: UserImageGalleryProps = {}) {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const { addToCart } = useCart();
  const { showCartNotification } = useCartNotification();
  const { setImage } = useStudioStore();
  const router = useRouter();
  
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

  // Check for pending cart image after login and redirect to studio
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
            const publicUrl = normalizeImageUrl(pendingImage.image_url);
            setImage(publicUrl, pendingImage.id);
            localStorage.removeItem('pending-cart-image');
            
            // Small delay to ensure session persists
            setTimeout(() => {
              router.push('/studio');
            }, 100);
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
  }, [user, setImage, router, normalizeImageUrl]);
  const [images, setImages] = useState<UserImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [selectedImage, setSelectedImage] = useState<UserImage | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const galleryRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const IMAGES_PER_PAGE = 20;
  const lastFetchedUserIdRef = useRef<string | null>(null);

  const fetchUserImages = useCallback(async (pageNum: number = 0, append: boolean = false) => {
    if (!user) {
      setLoading(false);
      return;
    }

    // Use session from useAuth hook (no need to call getSession())
    const authToken = session?.access_token;
    
    if (!authToken) {
      console.warn('⚠️ UserImageGallery: No session token available from context');
      // If no token, user isn't fully authenticated yet
      setLoading(false);
      return;
    }
    
    console.log('✅ UserImageGallery: Using auth token from context');

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

  const handleBuyAsFrame = async (image: UserImage) => {
    console.log('🎨 UserImageGallery: Redirecting to studio with image');
    
    if (!user) {
      console.log('🔐 User not authenticated, storing pending image');
      localStorage.setItem('pending-cart-image', JSON.stringify({
        id: image.id,
        image_url: image.image_url,
        prompt: image.prompt,
        aspect_ratio: image.aspect_ratio,
        timestamp: Date.now()
      }));
      if (onOpenAuthModal) {
        onOpenAuthModal();
      } else {
        toast({
          title: 'Authentication Required',
          description: 'Please sign in to order a frame.',
          variant: 'destructive',
        });
      }
      return;
    }

    const publicUrl = normalizeImageUrl(image.image_url);
    setImage(publicUrl, image.id);
    
    await new Promise(resolve => setTimeout(resolve, 100)); // Delay for session persistence
    router.push('/studio');
  };

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Please sign in to view your creations</p>
        </div>
      </div>
    );
  }

  if (loading && images.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your creations...</p>
        </div>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center py-12">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-600">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
              <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="2"/>
              <polyline points="21,15 16,10 5,21" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No creations yet</h3>
          <p className="text-gray-600 mb-6">Start creating amazing AI art to see your images here</p>
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
                onOpenAuthModal={onOpenAuthModal}
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
          onOpenAuthModal={onOpenAuthModal}
        />
      )}
    </>
  );
}
