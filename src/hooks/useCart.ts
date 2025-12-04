'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

interface CartItem {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
  updated_at: string;
  products: {
    id: string;
    frame_size: string;
    frame_style: string;
    frame_material: string;
    price: number;
    cost: number;
    dimensions_cm: {
      width: number;
      height: number;
      depth: number;
    };
    weight_grams: number;
    status: string;
    sku: string;
    images: {
      id: string;
      prompt: string;
      image_url: string;
      thumbnail_url: string;
      user_id: string;
      created_at: string;
    };
  };
}

interface CartTotals {
  subtotal: number;
  taxAmount: number;
  shippingAmount: number;
  total: number;
  itemCount: number;
}

interface UseCartReturn {
  cartItems: CartItem[];
  totals: CartTotals;
  loading: boolean;
  error: string | null;
  addToCart: (productId: string, quantity?: number) => Promise<boolean>;
  updateQuantity: (cartItemId: string, quantity: number) => Promise<boolean>;
  removeFromCart: (cartItemId: string) => Promise<boolean>;
  clearCart: () => Promise<boolean>;
  refreshCart: () => Promise<void>;
}

export function useCart(): UseCartReturn {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [totals, setTotals] = useState<CartTotals>({
    subtotal: 0,
    taxAmount: 0,
    shippingAmount: 0,
    total: 0,
    itemCount: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { user, session } = useAuth();
  const { toast } = useToast();

  const fetchCart = useCallback(async () => {
    if (!user) {
      setCartItems([]);
      setTotals({
        subtotal: 0,
        taxAmount: 0,
        shippingAmount: 0,
        total: 0,
        itemCount: 0,
      });
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Use v2 checkout API
      const response = await fetch('/api/v2/checkout/cart?country=US&shippingMethod=Standard', {
        credentials: 'include',
        headers: session?.access_token ? {
          'Authorization': `Bearer ${session.access_token}`
        } : {}
      });
      if (!response.ok) {
        if (response.status === 401) {
          // User not authenticated - this is expected, don't show as error
          setCartItems([]);
          setTotals({
            subtotal: 0,
            taxAmount: 0,
            shippingAmount: 0,
            total: 0,
            itemCount: 0,
          });
          return;
        }
        
        const errorText = await response.text();
        let errorMessage = 'Failed to fetch cart';
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = `Failed to fetch cart (${response.status})`;
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      // V2 API returns { cart } with items array and totals
      const cart = data.cart || data;
      
      if (cart && Array.isArray(cart.items)) {
        // V2 format
        setCartItems(cart.items);
        setTotals({
          subtotal: cart.totals?.subtotal || 0,
          taxAmount: cart.totals?.tax || 0,
          shippingAmount: cart.totals?.shipping || 0,
          total: cart.totals?.total || 0,
          itemCount: cart.items.length,
        });
      } else {
        // V1 format fallback
        setCartItems(data.cartItems || []);
        setTotals(data.totals || {
          subtotal: 0,
          taxAmount: 0,
          shippingAmount: 0,
          total: 0,
          itemCount: 0,
        });
      }
    } catch (err) {
      // Only set error for non-authentication issues
      if (err instanceof Error && !err.message.includes('401')) {
        setError(err.message);
        console.error('Error fetching cart:', err);
      }
    } finally {
      setLoading(false);
    }
  }, [user, session]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const addToCart = useCallback(async (productId: string, quantity: number = 1): Promise<boolean> => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to add items to your cart.',
        variant: 'destructive',
      });
      return false;
    }

    try {
      setLoading(true);
      setError(null);

      // Get auth token from session
      let authToken = session?.access_token;
      
      // Fallback: get token directly from Supabase if not in context
      if (!authToken) {
        const { supabase } = await import('@/lib/supabase/client');
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        authToken = currentSession?.access_token || null;
      }

      if (!authToken) {
        throw new Error('Please sign in to add items to your cart');
      }

      // Use v2 checkout API for cart with real-time pricing
      const response = await fetch('/api/v2/checkout/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          productId,
          quantity,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Please sign in to add items to your cart');
        }
        
        const errorText = await response.text();
        let errorMessage = 'Failed to add to cart';
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = `Failed to add to cart (${response.status})`;
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      toast({
        title: 'Added to Cart',
        description: data.message || 'Item has been added to your cart successfully.',
      });

      // Refresh cart to get updated data
      await fetchCart();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add item to cart';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, session, toast, fetchCart]);

  const updateQuantity = useCallback(async (cartItemId: string, quantity: number): Promise<boolean> => {
    if (!user) {
      return false;
    }

    if (quantity < 1) {
      return removeFromCart(cartItemId);
    }

    try {
      setLoading(true);
      setError(null);

      // Use v2 checkout API
      const response = await fetch('/api/v2/checkout/cart', {
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

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update cart item');
      }

      // Refresh cart to get updated data
      await fetchCart();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update cart item';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, session, toast, fetchCart]);

  const removeFromCart = useCallback(async (cartItemId: string): Promise<boolean> => {
    if (!user) {
      return false;
    }

    try {
      setLoading(true);
      setError(null);

      // Use v2 checkout API
      const response = await fetch(`/api/v2/checkout/cart/${cartItemId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: session?.access_token ? {
          'Authorization': `Bearer ${session.access_token}`
        } : {}
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove from cart');
      }

      toast({
        title: 'Removed from Cart',
        description: 'Item has been removed from your cart.',
      });

      // Refresh cart to get updated data
      await fetchCart();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove item from cart';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, session, toast, fetchCart]);

  const clearCart = useCallback(async (): Promise<boolean> => {
    if (!user || cartItems.length === 0) {
      return false;
    }

    try {
      setLoading(true);
      setError(null);

      // Remove all items one by one using v2 API
      const promises = cartItems.map(item => 
        fetch(`/api/v2/checkout/cart/${item.id}`, { 
          method: 'DELETE', 
          credentials: 'include',
          headers: session?.access_token ? {
            'Authorization': `Bearer ${session.access_token}`
          } : {}
        })
      );

      const responses = await Promise.all(promises);
      const failed = responses.some(response => !response.ok);

      if (failed) {
        throw new Error('Failed to clear some items from cart');
      }

      toast({
        title: 'Cart Cleared',
        description: 'All items have been removed from your cart.',
      });

      // Refresh cart to get updated data
      await fetchCart();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear cart';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, cartItems, toast, fetchCart]);

  const refreshCart = useCallback(async (): Promise<void> => {
    await fetchCart();
  }, [fetchCart]);

  return {
    cartItems,
    totals,
    loading,
    error,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    refreshCart,
  };
}
