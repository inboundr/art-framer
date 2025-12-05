/**
 * Context Panel Component
 * Shows pricing, configuration, and suggestions
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useStudioStore, useTotalPrice } from '@/store/studio';
import { PricingDisplay } from './PricingDisplay';
import { ConfigurationSummary } from './ConfigurationSummary';
import { SmartSuggestions } from './SmartSuggestions';
import { CountrySelector } from '../CountrySelector';
import { ShippingMethodSelector } from '../ShippingMethodSelector';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';

interface ContextPanelProps {
  onOpenAuthModal?: () => void;
}

export function ContextPanel({ onOpenAuthModal }: ContextPanelProps = {}) {
  const router = useRouter();
  const { config, suggestions, setSuggestions } = useStudioStore();
  const totalPrice = useTotalPrice();
  const { user, session } = useAuth();
  const { addToCart, refreshCart } = useCart();
  const { toast } = useToast();
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  // Function to handle add to cart (extracted for reuse)
  const handleAddToCart = useCallback(async () => {
    if (!user || !session?.access_token) {
      // Show auth modal instead of toast
      if (onOpenAuthModal) {
        onOpenAuthModal();
      } else {
        // Fallback to toast if no modal handler provided
        toast({
          title: 'Authentication Required',
          description: 'Please sign in to add items to your cart.',
          variant: 'destructive',
        });
      }
      return;
    }

    if (!config.imageId) {
      toast({
        title: 'Image Required',
        description: 'Please upload an image before adding to cart.',
        variant: 'destructive',
      });
      return;
    }

    setIsAddingToCart(true);
    try {
      console.log('🛒 ContextPanel: Add to cart clicked', {
        hasUser: !!user,
        hasSession: !!session,
        hasAccessToken: !!session?.access_token,
        userId: user?.id,
      });

      // Get auth token - try from session first, fallback to getting it directly
      let authToken = session?.access_token;
      
      if (!authToken) {
        console.warn('⚠️ ContextPanel: No token in session, trying to get from Supabase directly...');
        const { supabase } = await import('@/lib/supabase/client');
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('❌ ContextPanel: Error getting session from Supabase:', sessionError);
        } else if (currentSession?.access_token) {
          console.log('✅ ContextPanel: Got token from Supabase directly');
          authToken = currentSession.access_token;
        } else {
          console.warn('⚠️ ContextPanel: No session found in Supabase either');
        }
      } else {
        console.log('✅ ContextPanel: Using token from session context');
      }

      if (!authToken) {
        console.error('❌ ContextPanel: No auth token available');
        toast({
          title: 'Authentication Required',
          description: 'Your session has expired. Please sign in again.',
          variant: 'destructive',
        });
        setIsAddingToCart(false);
        return;
      }

      let imageId = config.imageId;

      // If imageId is a UUID (from /api/upload), we need to save it to the database first
      // Check if it's a valid UUID format (not a database ID)
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(imageId || '');
      
      if (isUUID && config.imageUrl && user) {
        // Save the image to the database first
        const saveImageResponse = await fetch('/api/save-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          credentials: 'include',
          body: JSON.stringify({
            imageUrl: config.imageUrl.startsWith('http') 
              ? config.imageUrl 
              : `${window.location.origin}${config.imageUrl}`,
            prompt: 'Studio upload',
            aspectRatio: '1x1', // Default, can be enhanced
            model: 'studio',
            userId: user.id,
          }),
        });

        if (saveImageResponse.ok) {
          const { image } = await saveImageResponse.json();
          imageId = image.id;
        } else {
          // If save fails, show error
          const errorData = await saveImageResponse.json();
          throw new Error(errorData.error || 'Failed to save image to database');
        }
      }

      // Map frameColor to valid API values (must match database enum)
      // Database enum: 'black', 'white', 'natural', 'gold', 'silver', 'brown', 'grey'
      const validFrameStyles = ['black', 'white', 'natural', 'gold', 'silver', 'brown', 'grey'] as const;
      const normalizedFrameStyle = (config.frameColor && validFrameStyles.includes(config.frameColor.toLowerCase() as any))
        ? config.frameColor.toLowerCase()
        : 'black'; // Default fallback

      // Create a product from the studio configuration
      const productResponse = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          imageId: imageId,
          frameSize: config.size, // V2 sizing: Use actual size directly (e.g., "8x10", "16x20")
          frameStyle: normalizedFrameStyle, // Use frameColor, normalized to valid database enum values
          frameMaterial: 'wood', // Default, can be enhanced later
          price: config.price,
        }),
      });

      if (!productResponse.ok) {
        const errorData = await productResponse.json();
        throw new Error(errorData.error || 'Failed to create product');
      }

      const { product } = await productResponse.json();
      
      console.log('✅ ContextPanel: Product created', { 
        productId: product.id, 
        isUUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(product.id || '')
      });

      // Store destination country and shipping method for cart
      // This will be used when fetching cart to get correct pricing
      if (config.destinationCountry) {
        localStorage.setItem('cartDestinationCountry', config.destinationCountry);
      }
      if (config.shippingMethod) {
        localStorage.setItem('cartShippingMethod', config.shippingMethod);
      }

      // Then, add the product to cart
      // Note: addToCart now waits for cart refresh to complete before returning
      console.log('🛒 ContextPanel: Calling addToCart...');
      const success = await addToCart(product.id, 1);
      console.log('🛒 ContextPanel: addToCart returned:', success);
      
      if (success) {
        console.log('✅ ContextPanel: Item added to cart successfully, redirecting...');
        
        // Show success toast
        toast({
          title: 'Added to Cart',
          description: 'Item has been added to your cart successfully.',
        });
        
        // Reset loading state BEFORE redirect to ensure it's cleared
        setIsAddingToCart(false);
        
        // Set a flag so the cart page knows to wait a moment for DB commit
        // This ensures the cart fetch happens after the transaction is committed
        localStorage.setItem('cart-just-updated', Date.now().toString());
        
        // Redirect to cart page immediately (fast UX)
        // The cart page will detect the flag and wait briefly before fetching
        console.log('🚀 ContextPanel: Redirecting to /cart...');
        try {
          router.push('/cart');
        } catch (error) {
          console.error('❌ ContextPanel: router.push failed, using window.location.href:', error);
          window.location.href = '/cart';
        }
      } else {
        console.error('❌ ContextPanel: addToCart returned false');
        throw new Error('Failed to add to cart');
      }
    } catch (error) {
      console.error('❌ ContextPanel: Error adding to cart:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add item to cart. Please try again.',
        variant: 'destructive',
      });
    } finally {
      // Always reset loading state, even if redirect happens
      console.log('🔄 ContextPanel: Resetting loading state');
      setIsAddingToCart(false);
    }
  }, [user, session, config, addToCart, toast, onOpenAuthModal, router]);

  // Listen for retry event after authentication
  useEffect(() => {
    const handleRetryAddToCart = () => {
      // Retry adding to cart after authentication
      console.log('🔄 ContextPanel: Retrying add to cart after authentication');
      handleAddToCart();
    };

    window.addEventListener('retry-add-to-cart', handleRetryAddToCart);
    return () => {
      window.removeEventListener('retry-add-to-cart', handleRetryAddToCart);
    };
  }, [handleAddToCart]);

  // Load suggestions when configuration changes
  useEffect(() => {
    if (!config.imageUrl || !config.imageAnalysis) return;

    const loadSuggestions = async () => {
      try {
        const response = await fetch('/api/studio/suggestions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config,
          imageAnalysis: config.imageAnalysis,
          userContext: {
            budget: 250, // Could come from user profile
          },
        }),
        });

        if (response.ok) {
          const data = await response.json();
          setSuggestions(data.suggestions || []);
        }
      } catch (error) {
        console.error('Error loading suggestions:', error);
      }
    };

    // Debounce suggestions loading
    const timeout = setTimeout(loadSuggestions, 1000);
    return () => clearTimeout(timeout);
  }, [config]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-900">Your Frame</h2>
        <p className="text-sm text-gray-500 mt-1">
          {config.imageUrl ? 'Customize your perfect frame' : 'Upload an image to start'}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Country Selector */}
        <CountrySelector />
        
        {/* Pricing */}
        {config.imageUrl && <PricingDisplay />}
        
        {/* Shipping Method Selector */}
        {config.imageUrl && <ShippingMethodSelector />}

        {/* AI Confidence Score */}
        {config.aiConfidenceScore > 0 && (
          <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-900">
                AI Confidence
              </span>
              <span className="text-2xl font-bold text-gray-900">
                {Math.round(config.aiConfidenceScore * 100)}%
              </span>
            </div>
            <div className="w-full bg-white rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-green-500 to-blue-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${config.aiConfidenceScore * 100}%` }}
              />
            </div>
            <p className="text-xs text-gray-600 mt-2">
              This configuration is a great match for your artwork
            </p>
          </div>
        )}

        {/* Smart Suggestions */}
        {suggestions.length > 0 && <SmartSuggestions />}

        {/* Configuration Summary */}
        {config.imageUrl && <ConfigurationSummary />}
      </div>

      {/* Footer - CTA */}
      {config.imageUrl && (
        <div className="border-t border-gray-200 p-4 space-y-3 bg-white">
          <button
            data-add-to-cart-button
            className="w-full px-6 py-4 bg-black text-white rounded-xl font-bold text-base hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleAddToCart}
            disabled={isAddingToCart}
          >
            {isAddingToCart ? 'Adding...' : `Add to Cart · ${totalPrice.toFixed(2)}`}
          </button>

          <div className="flex gap-2">
            <button
              className="flex-1 px-4 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 hover:border-gray-400 transition-colors text-sm"
              onClick={async () => {
                try {
                  await useStudioStore.getState().saveConfiguration('My Frame');
                  alert('Configuration saved!');
                } catch (error) {
                  alert('Failed to save configuration');
                }
              }}
            >
              💾 Save
            </button>

            <button
              className="flex-1 px-4 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 hover:border-gray-400 transition-colors text-sm"
              onClick={() => {
                // Share functionality
                navigator.share?.({
                  title: 'My Custom Frame',
                  text: 'Check out my custom frame design!',
                  url: window.location.href,
                });
              }}
            >
              📤 Share
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

