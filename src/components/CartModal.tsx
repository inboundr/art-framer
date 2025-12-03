'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ShoppingCart, 
  X, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard,
  Package,
  Truck
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { getProxiedImageUrl } from '@/lib/utils/imageProxy';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { formatSizeWithCm } from '@/lib/utils/size-conversion';

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

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CartModal({ isOpen, onClose }: CartModalProps) {
  const [cartData, setCartData] = useState<CartData | null>(null);
  // Normalize any DB-stored storage path into a public URL
  const normalizeImageUrl = useCallback((url?: string | null) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    // Prefer curated-images bucket for curated paths
    try {
      const supa = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
      );
      const { data } = supa.storage.from('curated-images').getPublicUrl(url);
      return data?.publicUrl || url;
    } catch {
      return url;
    }
  }, []);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchCart = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/cart', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch cart');
      }

      const data = await response.json();
      setCartData(data);
    } catch (error) {
      console.error('Error fetching cart:', error);
      toast({
        title: 'Error',
        description: 'Failed to load cart items',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (isOpen && user) {
      fetchCart();
    }
  }, [isOpen, user, fetchCart]);

  const updateQuantity = async (cartItemId: string, newQuantity: number) => {
    if (!user || newQuantity < 1 || newQuantity > 10) return;

    setUpdating(cartItemId);
    try {
      const response = await fetch('/api/cart', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          cartItemId,
          quantity: newQuantity,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update quantity');
      }

      await fetchCart(); // Refresh cart data
      toast({
        title: 'Updated',
        description: 'Cart item quantity updated',
      });
    } catch (error) {
      console.error('Error updating quantity:', error);
      toast({
        title: 'Error',
        description: 'Failed to update quantity',
        variant: 'destructive',
      });
    } finally {
      setUpdating(null);
    }
  };

  const removeItem = async (cartItemId: string) => {
    if (!user) return;

    setUpdating(cartItemId);
    try {
      const response = await fetch(`/api/cart/${cartItemId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to remove item');
      }

      await fetchCart(); // Refresh cart data
      toast({
        title: 'Removed',
        description: 'Item removed from cart',
      });
    } catch (error) {
      console.error('Error removing item:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove item',
        variant: 'destructive',
      });
    } finally {
      setUpdating(null);
    }
  };

  const handleCheckout = async () => {
    if (!user || !cartData || cartData.cartItems.length === 0) return;

    try {
      // Get the session to access the token for authentication
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token && {
            'Authorization': `Bearer ${session.access_token}`
          })
        },
        credentials: 'include',
        body: JSON.stringify({
          cartItemIds: cartData.cartItems.map(item => item.id),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast({
        title: 'Error',
        description: 'Failed to start checkout process',
        variant: 'destructive',
      });
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const getFrameSizeLabel = (size: string) => {
    // Use the utility function for size conversion
    if (size.includes('x')) {
      return formatSizeWithCm(size);
    }
    // Fallback for old labels (backward compatibility)
    const labels: Record<string, string> = {
      small: '8×10" (20×25 cm)',
      medium: '11×14" (28×36 cm)',
      large: '16×20" (41×51 cm)',
      extra_large: '24×36" (61×91 cm)',
    };
    return labels[size] || size;
  };

  const getFrameStyleLabel = (style: string) => {
    const labels = {
      black: 'Black',
      white: 'White',
      natural: 'Natural Wood',
      gold: 'Gold',
      silver: 'Silver',
    };
    return labels[style as keyof typeof labels] || style;
  };

  const getFrameMaterialLabel = (material: string) => {
    const labels = {
      wood: 'Wood',
      metal: 'Metal',
      plastic: 'Plastic',
      bamboo: 'Bamboo',
    };
    return labels[material as keyof typeof labels] || material;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-50 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <ShoppingCart className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold text-gray-900">Shopping Cart</h2>
            {cartData && (
              <Badge variant="secondary" className="ml-2">
                {cartData.totals.itemCount} {cartData.totals.itemCount === 1 ? 'item' : 'items'}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex flex-col lg:flex-row h-full">
          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : !cartData || cartData.cartItems.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Your cart is empty</h3>
                <p className="text-gray-600 mb-4">Add some framed art to get started!</p>
                <Button onClick={onClose} variant="outline">
                  Continue Shopping
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {cartData.cartItems.map((item) => (
                  <Card key={item.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        {/* Product Image */}
                        <div className="flex-shrink-0">
                          <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted">
                            <img
                              src={getProxiedImageUrl(normalizeImageUrl(item.products.images.image_url || item.products.images.thumbnail_url))}
                              alt={item.products.images.prompt}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </div>

                        {/* Product Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900 truncate">
                                {item.products.images.prompt}
                              </h4>
                              <p className="text-sm text-gray-600 mt-1">
                                {getFrameSizeLabel(item.products.frame_size)}
                              </p>
                              <p className="text-sm text-gray-600 mt-1">
                                {getFrameStyleLabel(item.products.frame_style)} • {getFrameMaterialLabel(item.products.frame_material)}
                              </p>
                              <p className="text-sm text-gray-600 mt-1">
                                SKU: {item.products.sku}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-gray-900">
                                {formatPrice(item.products.price)}
                              </p>
                              <p className="text-sm text-gray-600">
                                {(item.products.dimensions_cm.width / 2.54).toFixed(1)}×{(item.products.dimensions_cm.height / 2.54).toFixed(1)}" ({item.products.dimensions_cm.width}×{item.products.dimensions_cm.height} cm)
                              </p>
                            </div>
                          </div>

                          {/* Quantity Controls */}
                          <div className="flex items-center justify-between mt-4">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                disabled={updating === item.id || item.quantity <= 1}
                                className="h-8 w-8 p-0"
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-8 text-center font-medium">
                                {updating === item.id ? '...' : item.quantity}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                disabled={updating === item.id || item.quantity >= 10}
                                className="h-8 w-8 p-0"
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(item.id)}
                              disabled={updating === item.id}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Order Summary */}
          {cartData && cartData.cartItems.length > 0 && (
            <div className="lg:w-80 border-l bg-muted/30 p-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Order Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal</span>
                      <span>{formatPrice(cartData.totals.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Tax</span>
                      <span>{formatPrice(cartData.totals.taxAmount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-1">
                        <Truck className="h-3 w-3" />
                        Shipping
                      </span>
                      <span>{formatPrice(cartData.totals.shippingAmount)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold text-lg">
                      <span>Total</span>
                      <span>{formatPrice(cartData.totals.total)}</span>
                    </div>
                  </div>

                  <Button
                    onClick={handleCheckout}
                    className="w-full"
                    size="lg"
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Proceed to Checkout
                  </Button>

                  <p className="text-xs text-gray-600 text-center">
                    Secure checkout powered by Stripe
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
