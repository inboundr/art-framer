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
      
      // Get destination country and shipping method from localStorage (set by studio)
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
        console.log('Cart: fetchCart success', { 
          hasData: !!data, 
          hasCart: !!data.cart,
          dataKeys: Object.keys(data),
          cartKeys: data.cart ? Object.keys(data.cart) : [],
          itemsCount: data.cart?.items?.length || 0
        });
        
        // V2 API returns { cart } with items and totals
        const cart = data.cart || data;
        
        console.log('Cart: Processing cart', {
          hasCart: !!cart,
          hasItems: !!cart?.items,
          isItemsArray: Array.isArray(cart?.items),
          itemsLength: cart?.items?.length || 0,
          hasTotals: !!cart?.totals
        });
        
        if (cart && Array.isArray(cart.items)) {
          if (cart.items.length === 0) {
            // Empty cart - valid response
            console.log('Cart: Empty cart received');
            setCartData({
              cartItems: [],
              totals: {
                subtotal: cart.totals?.subtotal || 0,
                taxAmount: cart.totals?.tax || 0,
                shippingAmount: cart.totals?.shipping || 0,
                total: cart.totals?.total || 0,
                itemCount: 0,
              },
            });
            return;
          }
          
          console.log('Cart: Mapping items', { count: cart.items.length });
          // Map v2 API response to CartData interface
          // V2 returns { cart: { items: [...], totals: {...} } }
          // But CartData expects { cartItems: [...], totals: {...} }
          const mappedCartData = {
            cartItems: cart.items.map((item: any) => {
              console.log('Cart: Mapping item', { 
                id: item.id, 
                productId: item.productId,
                hasImageUrl: !!item.imageUrl,
                hasFrameConfig: !!item.frameConfig
              });
              // Transform v2 cart item format to v1 format expected by ShoppingCart
              // V2 format: { id, productId, sku, name, imageUrl, quantity, price, frameConfig, ... }
              // V1 format: { id, user_id, product_id, quantity, products: {...} }
              const createdAt = item.createdAt instanceof Date 
                ? item.createdAt.toISOString() 
                : (typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString());
              const updatedAt = item.updatedAt instanceof Date 
                ? item.updatedAt.toISOString() 
                : (typeof item.updatedAt === 'string' ? item.updatedAt : new Date().toISOString());
              
              return {
                id: item.id,
                user_id: user.id,
                product_id: item.productId,
                quantity: item.quantity,
                created_at: createdAt,
                updated_at: updatedAt,
                products: {
                  id: item.productId,
                  image_id: item.productId, // Use productId as fallback
                  frame_size: item.frameConfig?.size || 'medium',
                  frame_style: item.frameConfig?.color || item.frameConfig?.style || 'black',
                  frame_material: item.frameConfig?.material || 'wood',
                  price: item.price || item.originalPrice || 0,
                  cost: item.price || item.originalPrice || 0,
                  weight_grams: 0,
                  dimensions_cm: {
                    width: 0,
                    height: 0,
                    depth: 0,
                  },
                  status: 'active',
                  sku: item.sku || '',
                  images: {
                    id: item.productId,
                    prompt: '',
                    image_url: item.imageUrl || '',
                    thumbnail_url: item.imageUrl || null,
                    user_id: user.id,
                    created_at: createdAt,
                  },
                },
              };
            }),
            totals: {
              subtotal: cart.totals?.subtotal || 0,
              taxAmount: cart.totals?.tax || 0,
              shippingAmount: cart.totals?.shipping || 0,
              total: cart.totals?.total || 0,
              itemCount: cart.items.length,
            },
          };
          
          console.log('Cart: Setting cart data', {
            cartItemsCount: mappedCartData.cartItems.length,
            totals: mappedCartData.totals
          });
          
          setCartData(mappedCartData);
        } else {
          console.warn('Cart: Unexpected cart format, using fallback', {
            cart,
            hasItems: !!cart?.items,
            itemsType: typeof cart?.items,
            isArray: Array.isArray(cart?.items),
            itemsLength: cart?.items?.length,
            fullData: data
          });
          // Fallback for v1 format
          setCartData(data);
        }
      } else {
        const errorText = await response.text();
        console.warn('Cart: fetchCart failed', { 
          status: response.status,
          statusText: response.statusText,
          error: errorText
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
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = `Failed to add to cart (${response.status})`;
        }
        
        console.error('Cart: addToCart API error', { 
          status: response.status, 
          statusText: response.statusText,
          error: errorMessage 
        });
        return false;
      }

      const data = await response.json();
      console.log('Cart: addToCart API response', { 
        productId, 
        quantity,
        response: data,
        hasItem: !!data.item,
        hasCartItem: !!data.cartItem,
        message: data.message
      });
      
      // V2 API returns { item } instead of { cartItem }
      const cartItem = data.item || data.cartItem;
      
      // Validate response contains cart item
      if (!cartItem) {
        console.error('Cart: addToCart - API returned success but no cartItem in response', data);
      return false;
      }
      
      // Refresh cart data and wait for it to complete
      console.log('Cart: addToCart - Refreshing cart data...');
      await fetchCart();
      console.log('Cart: addToCart - Cart data refreshed successfully');
      
      return true;
    } catch (error) {
      console.error('Cart: addToCart exception:', error);
      return false;
    }
  };

  const updateQuantity = async (cartItemId: string, quantity: number): Promise<boolean> => {
    if (!user) return false;

    try {
      const response = await fetch('/api/cart', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
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
    if (!user) return false;

    try {
      const response = await fetch(`/api/cart/${cartItemId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: session?.access_token ? {
          'Authorization': `Bearer ${session.access_token}`
        } : {}
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
    if (!user || !cartData?.cartItems.length) return false;

    try {
      // Remove all items from cart by calling removeFromCart for each item
      const removePromises = cartData.cartItems.map(item => 
        fetch(`/api/cart/${item.id}`, {
          method: 'DELETE',
          credentials: 'include',
          headers: session?.access_token ? {
            'Authorization': `Bearer ${session.access_token}`
          } : {}
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
