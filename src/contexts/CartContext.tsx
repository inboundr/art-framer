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

    setLoading(true);
    try {
      console.log('Cart: Session data', { 
        hasSession: !!session, 
        hasToken: !!session?.access_token,
        userId: user.id,
        userEmail: user.email,
        sessionExpiry: session?.expires_at
      });
      
      const response = await fetch('/api/cart', {
        credentials: 'include',
        headers: session?.access_token ? {
          'Authorization': `Bearer ${session.access_token}`
        } : {}
      });

      if (response.ok) {
        const data = await response.json();
        setCartData(data);
      } else {
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
      // Get fresh session before making API call
      const { data: { session: freshSession }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Cart: Session error in addToCart:', sessionError);
        return false;
      }
      
      if (!freshSession) {
        console.error('Cart: No session available in addToCart');
        return false;
      }

      console.log('Cart: addToCart - Making API call', { 
        productId, 
        quantity, 
        hasToken: !!freshSession.access_token 
      });

      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${freshSession.access_token}`
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
      console.log('Cart: addToCart success', { productId, quantity });
      
      await fetchCart(); // Refresh cart data
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

  const refreshCart = async () => {
    await fetchCart();
  };

  useEffect(() => {
    if (user) {
      fetchCart();
    } else {
      setCartData(null);
    }
  }, [user, session, fetchCart]);

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
