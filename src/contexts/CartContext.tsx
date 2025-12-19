'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';

interface CartItem {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
  updated_at: string;
  price?: number; // Real-time price from Prodigi
  currency?: string; // Currency for this item
  products: {
    id: string;
    image_id: string;
    frame_size: string;
    frame_style: string;
    frame_material: string;
    price: number;
    cost: number;
    weight_grams: number;
    dimensions_cm: {
      width: number;
      height: number;
      depth: number;
    };
    status: string;
    sku: string;
    product_type?: string; // Product type (framed-print, canvas, poster, etc.)
    currency?: string; // Currency for this product
    images: {
      id: string;
      prompt: string;
      image_url: string;
      thumbnail_url: string | null;
      user_id: string;
      created_at: string;
    };
  };
}

interface CartData {
  cartItems: CartItem[];
  totals: {
    subtotal: number;
    taxAmount: number;
    shippingAmount: number;
    total: number;
    itemCount: number;
    currency?: string;
  };
}

interface CartContextType {
  cartData: CartData | null;
  loading: boolean;
  refreshCart: () => Promise<void>;
  addToCart: (productId: string, quantity?: number) => Promise<boolean>;
  updateQuantity: (cartItemId: string, quantity: number) => Promise<boolean>;
  removeFromCart: (cartItemId: string) => Promise<boolean>;
  clearCart: () => Promise<boolean>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartData, setCartData] = useState<CartData | null>(null);
  const [loading, setLoading] = useState(false);
  const { user, session } = useAuth();

  const fetchCart = useCallback(async () => {
    if (!user) {
      setCartData(null);
      return;
    }

    // Don't fetch if session isn't ready yet
    if (!session?.access_token) {
      console.log('Cart: Waiting for session to be ready...');
      return;
    }

    setLoading(true);
    try {
      console.log('Cart: Session data', { 
        hasSession: !!session, 
        hasToken: !!session?.access_token,
        userId: user.id,
        userEmail: user.email,
        sessionExpiry: session?.expires_at
      });
      
      // Get destination country and shipping method from localStorage (set by studio or checkout)
      // or default to US/Standard
      const destinationCountry = typeof window !== 'undefined' 
        ? (localStorage.getItem('cartDestinationCountry') || 'US')
        : 'US';
      const shippingMethod = typeof window !== 'undefined'
        ? (localStorage.getItem('cartShippingMethod') || 'Standard')
        : 'Standard';

      console.log('Cart: Fetching cart with', { destinationCountry, shippingMethod });

      // Use v2 checkout API for cart with real-time pricing
      // Pass destination country and shipping method as query parameters
      // Use relative URL to avoid SSR issues with window.location
      const apiUrl = `/api/v2/checkout/cart?country=${encodeURIComponent(destinationCountry)}&shippingMethod=${encodeURIComponent(shippingMethod)}`;

      const response = await fetch(apiUrl, {
        credentials: 'include',
        headers: session?.access_token ? {
          'Authorization': `Bearer ${session.access_token}`
        } : {}
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Cart: fetchCart API response', { 
          hasCart: !!data.cart,
          itemsCount: data.cart?.items?.length || 0,
          dataKeys: Object.keys(data),
          hasPricingError: !!data.pricingError,
          hasWarning: !!data.warning
        });
        
        // Show warning if pricing is unavailable
        if (data.warning || data.pricingError) {
          console.warn('Cart: Pricing unavailable:', data.warning || data.pricingError);
        }
        
        // V2 API returns { cart: { items, totals } } format
        // Transform to match CartData interface: { cartItems, totals }
        let cartData: CartData;
        
        if (data.cart) {
          // V2 API format: { cart: { items, totals: { subtotal, shipping, tax, total, currency } } }
          const items = data.cart.items || [];
          const v2Totals = data.cart.totals || {};
          
          // Transform v2 CartItem[] to old format with products.images
          // V2 API already provides imageUrl, name, sku, etc. in the CartItem
          // We just need to format it to match the old structure
          console.log('Cart: fetchCart - Transforming', items.length, 'items from v2 format');
          
          const transformedItems: CartItem[] = items.map((item: any) => {
            // V2 CartItem already has all the data we need
            // Just format it to match the old structure expected by ShoppingCart component
            return {
              id: item.id,
              user_id: user.id,
              product_id: item.productId,
              quantity: item.quantity,
              created_at: item.createdAt instanceof Date ? item.createdAt.toISOString() : (typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString()),
              updated_at: item.updatedAt instanceof Date ? item.updatedAt.toISOString() : (typeof item.updatedAt === 'string' ? item.updatedAt : new Date().toISOString()),
              products: {
                id: item.productId,
                image_id: '', // Not needed for display
                frame_size: item.frameConfig?.size || '16x20', // V2 sizing: default to "16x20" instead of 'medium'
                frame_style: item.frameConfig?.style || item.frameConfig?.color || 'black',
                frame_material: item.frameConfig?.material || 'wood',
                price: item.price || 0, // Real-time price from Prodigi
                cost: (item.originalPrice || item.price || 0) * 0.4,
                weight_grams: 0,
                dimensions_cm: { width: 0, height: 0, depth: 0 },
                status: 'active',
                sku: item.sku || '',
                product_type: item.frameConfig?.productType, // Product type from frameConfig
                currency: item.currency || 'USD', // Add currency to products
                images: {
                  id: '',
                  prompt: '',
                  image_url: item.imageUrl || '',
                  thumbnail_url: item.imageUrl || null,
                  user_id: user.id,
                  created_at: new Date().toISOString(),
                },
              },
              // Add price and currency at item level for easier access
              price: item.price || 0,
              currency: item.currency || 'USD',
            };
          });
          
          console.log('Cart: fetchCart - Transformation complete, created', transformedItems.length, 'items');
          cartData = {
            cartItems: transformedItems,
            totals: {
              subtotal: v2Totals.subtotal || 0,
              taxAmount: v2Totals.tax || 0,
              shippingAmount: v2Totals.shipping || 0,
              total: v2Totals.total || 0,
              itemCount: transformedItems.length,
              currency: v2Totals.currency || 'USD',
            },
          };
          console.log('Cart: fetchCart - cartData created with', cartData.cartItems.length, 'items');
        } else {
          // Fallback: assume old format if cart is not present
          cartData = {
            cartItems: data.cartItems || [],
            totals: data.totals || {
              subtotal: 0,
              taxAmount: 0,
              shippingAmount: 0,
              total: 0,
              itemCount: 0,
            },
          };
        }
        
        console.log('Cart: fetchCart success', { 
          itemCount: cartData.cartItems?.length || 0,
          total: cartData.totals?.total || 0
        });
        setCartData(cartData);
        console.log('Cart: fetchCart - setCartData called, function completing');
      } else {
        const errorText = await response.text();
        let errorData: any = null;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          // Not JSON
        }
        console.error('Cart: fetchCart failed', { 
          status: response.status, 
          statusText: response.statusText,
          error: errorData || errorText
        });
        setCartData(null);
      }
    } catch (error) {
      console.error('Error fetching cart:', error);
      setCartData(null);
    } finally {
      setLoading(false);
    }
  }, [user, session]);

  const addToCart = async (productId: string, quantity: number = 1): Promise<boolean> => {
    if (!user) {
      console.error('Cart: addToCart called without user');
      return false;
    }

    try {
      // Use session from auth context instead of calling getSession()
      // to avoid hanging issues (same as checkout flow fix)
      console.log('Cart: addToCart - Using session from context', { 
        hasSession: !!session,
        hasToken: !!session?.access_token 
      });
      
      if (!session?.access_token) {
        console.error('Cart: No session or access token available in addToCart');
        return false;
      }

      console.log('Cart: addToCart - Making API call', { 
        productId, 
        quantity, 
        hasToken: !!session.access_token 
      });

      // Use v2 checkout API for cart (same as fetchCart)
      const response = await fetch('/api/v2/checkout/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        credentials: 'include',
        body: JSON.stringify({
          productId,
          quantity,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to add to cart';
        let errorDetails: any = null;
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
          errorDetails = errorData.details;
        } catch {
          errorMessage = `Failed to add to cart (${response.status})`;
        }
        
        // Log full error details
        console.error('Cart: addToCart API error', { 
          status: response.status, 
          statusText: response.statusText,
          error: errorMessage,
          requestBody: { productId, quantity },
        });
        
        // Log error details separately for better visibility
        if (errorDetails) {
          console.error('Cart: Error details:', errorDetails);
          console.error('Cart: Error details (JSON):', JSON.stringify(errorDetails, null, 2));
          if (errorDetails.issues) {
            console.error('Cart: Validation issues:', errorDetails.issues);
            console.error('Cart: Validation issues (JSON):', JSON.stringify(errorDetails.issues, null, 2));
          }
        } else {
          console.error('Cart: Full error response:', errorText);
        }
        return false;
      }

      const data = await response.json();
      console.log('Cart: addToCart API response', { 
        productId, 
        quantity,
        response: data,
        hasItem: !!data.item,
      });
      
      // Validate response contains cart item (v2 API returns { item } not { cartItem })
      if (!data.item) {
        console.error('Cart: addToCart - API returned success but no item in response', data);
        return false;
      }
      
      // Item successfully added - return immediately and refresh cart in background
      // This allows the UI to respond quickly while cart updates in the background
      console.log('Cart: addToCart - Item added successfully, refreshing cart in background...');
      
      // Refresh cart in background (don't await) - this allows immediate return
      // The cart will update when fetchCart completes
      setTimeout(() => {
        fetchCart().catch((error) => {
          console.error('Cart: addToCart - Background cart refresh failed:', error);
        });
      }, 300);
      
      console.log('Cart: addToCart - Returning true (success)');
      return true;
    } catch (error) {
      console.error('Cart: addToCart exception:', error);
      return false;
    }
  };

  const updateQuantity = async (cartItemId: string, quantity: number): Promise<boolean> => {
    if (!user || !session?.access_token) return false;

    try {
      // Use v2 checkout API
      const response = await fetch('/api/v2/checkout/cart', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        credentials: 'include',
        body: JSON.stringify({
          cartItemId,
          quantity,
        }),
      });

      if (response.ok) {
        await fetchCart(); // Refresh cart data
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating quantity:', error);
      return false;
    }
  };

  const removeFromCart = async (cartItemId: string): Promise<boolean> => {
    if (!user || !session?.access_token) return false;

    try {
      // Use v2 checkout API
      const response = await fetch(`/api/v2/checkout/cart/${cartItemId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        await fetchCart(); // Refresh cart data
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error removing from cart:', error);
      return false;
    }
  };

  const clearCart = async (): Promise<boolean> => {
    if (!user || !cartData?.cartItems.length || !session?.access_token) return false;

    try {
      // Remove all items from cart by calling removeFromCart for each item
      const removePromises = cartData.cartItems.map(item => 
        fetch(`/api/v2/checkout/cart/${item.id}`, {
          method: 'DELETE',
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        })
      );

      const responses = await Promise.all(removePromises);
      const allSuccessful = responses.every(response => response.ok);

      if (allSuccessful) {
        await fetchCart(); // Refresh cart data
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error clearing cart:', error);
      return false;
    }
  };

  const refreshCart = useCallback(async () => {
    await fetchCart();
  }, [fetchCart]);

  useEffect(() => {
    if (user && session?.access_token) {
      // Check if we just added an item (redirect from studio)
      // If so, wait a moment for the DB transaction to commit
      const justUpdated = localStorage.getItem('cart-just-updated');
      if (justUpdated) {
        const updateTime = parseInt(justUpdated, 10);
        const timeSinceUpdate = Date.now() - updateTime;
        
        // If update was less than 2 seconds ago, wait a bit before fetching
        if (timeSinceUpdate < 2000) {
          const waitTime = Math.max(0, 500 - timeSinceUpdate); // Wait up to 500ms
          console.log(`Cart: Just updated ${timeSinceUpdate}ms ago, waiting ${waitTime}ms for DB commit...`);
          
          const timeout = setTimeout(() => {
            localStorage.removeItem('cart-just-updated');
            console.log('Cart: User and session ready, fetching cart (after update delay)');
            fetchCart();
          }, waitTime);
          
          return () => clearTimeout(timeout);
        } else {
          // Update was more than 2 seconds ago, clear the flag and fetch immediately
          localStorage.removeItem('cart-just-updated');
        }
      }
      
      // Only fetch when both user and session token are available
      console.log('Cart: User and session ready, fetching cart');
      fetchCart();
    } else if (user && !session?.access_token) {
      // User exists but session not ready - wait for it
      console.log('Cart: User exists but session not ready, waiting...');
    } else {
      // No user - clear cart
      setCartData(null);
    }
  }, [user, session?.access_token, fetchCart]);

  // Listen for storage events to refetch cart when destination country changes
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent | Event) => {
      if (e instanceof StorageEvent) {
        // Real storage event from another tab/window
        if (e.key === 'cartDestinationCountry' && e.newValue !== e.oldValue) {
          console.log('Cart: Destination country changed in storage, refetching...', {
            oldValue: e.oldValue,
            newValue: e.newValue
          });
          fetchCart();
        }
      } else {
        // Custom event dispatched by same-window updates
        console.log('Cart: Storage event triggered (same window), refetching cart...');
        fetchCart();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [fetchCart]);

  const value: CartContextType = {
    cartData,
    loading,
    refreshCart,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
