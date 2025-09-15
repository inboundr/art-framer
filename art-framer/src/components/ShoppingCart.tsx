'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  ShoppingCart as ShoppingCartIcon, 
  Plus, 
  Minus, 
  Trash2, 
  X,
  CreditCard,
  Truck,
  Shield
} from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface ShoppingCartProps {
  onCheckout?: () => void;
  showAsModal?: boolean;
  trigger?: React.ReactNode;
}

export function ShoppingCart({ onCheckout, showAsModal = false, trigger }: ShoppingCartProps) {
  const { cartItems, totals, loading, updateQuantity, removeFromCart, clearCart } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const getFrameSizeLabel = (size: string) => {
    const labels = {
      small: 'Small (8" x 10")',
      medium: 'Medium (12" x 16")',
      large: 'Large (16" x 20")',
      extra_large: 'Extra Large (20" x 24")',
    };
    return labels[size as keyof typeof labels] || size;
  };

  const getFrameStyleLabel = (style: string) => {
    return style.charAt(0).toUpperCase() + style.slice(1);
  };

  const getFrameMaterialLabel = (material: string) => {
    return material.charAt(0).toUpperCase() + material.slice(1);
  };

  const handleQuantityChange = async (cartItemId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      await removeFromCart(cartItemId);
    } else {
      await updateQuantity(cartItemId, newQuantity);
    }
  };

  const handleCheckout = () => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to proceed to checkout.',
        variant: 'destructive',
      });
      return;
    }

    if (cartItems.length === 0) {
      toast({
        title: 'Empty Cart',
        description: 'Please add items to your cart before checking out.',
        variant: 'destructive',
      });
      return;
    }

    if (showAsModal) {
      setIsOpen(false);
    }
    
    onCheckout?.();
  };

  const handleClearCart = async () => {
    if (cartItems.length === 0) return;
    
    const confirmed = window.confirm('Are you sure you want to clear your cart?');
    if (confirmed) {
      await clearCart();
    }
  };

  const cartContent = (
    <div className="space-y-4">
      {cartItems.length === 0 ? (
        <div className="text-center py-8">
          <ShoppingCartIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Your cart is empty</h3>
          <p className="text-gray-500 mb-4">Add some framed art to get started!</p>
          {showAsModal && (
            <Button onClick={() => setIsOpen(false)} variant="outline">
              Continue Shopping
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Cart Items */}
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {cartItems.map((item) => (
              <Card key={item.id} className="p-4">
                <div className="flex gap-4">
                  {/* Product Image */}
                  <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    <img
                      src={item.products.images.thumbnail_url}
                      alt={item.products.images.prompt}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Product Details */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm line-clamp-2">
                      {getFrameSizeLabel(item.products.frame_size)} Frame
                    </h4>
                    <p className="text-xs text-gray-600 mb-1">
                      {getFrameStyleLabel(item.products.frame_style)} {getFrameMaterialLabel(item.products.frame_material)}
                    </p>
                    <p className="text-xs text-gray-500 line-clamp-1 mb-2">
                      "{item.products.images.prompt}"
                    </p>
                    
                    {/* Quantity Controls */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center border rounded-md">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                          disabled={loading}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || 1;
                            handleQuantityChange(item.id, value);
                          }}
                          className="w-12 h-8 text-center border-0 p-0 text-sm"
                          min="1"
                          max="10"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                          disabled={loading || item.quantity >= 10}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                        onClick={() => removeFromCart(item.id)}
                        disabled={loading}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="text-right">
                    <div className="font-medium text-sm">
                      {formatPrice(item.products.price * item.quantity)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatPrice(item.products.price)} each
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Cart Summary */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Order Summary</CardTitle>
                {cartItems.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearCart}
                    className="text-red-500 hover:text-red-700"
                    disabled={loading}
                  >
                    Clear Cart
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Subtotal ({totals.itemCount} items)</span>
                <span>{formatPrice(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tax</span>
                <span>{formatPrice(totals.taxAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Shipping</span>
                <span>{formatPrice(totals.shippingAmount)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span>{formatPrice(totals.total)}</span>
              </div>

              {/* Trust Badges */}
              <div className="flex items-center justify-center gap-4 pt-2 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  <span>Secure</span>
                </div>
                <div className="flex items-center gap-1">
                  <Truck className="h-3 w-3" />
                  <span>Fast Shipping</span>
                </div>
                <div className="flex items-center gap-1">
                  <CreditCard className="h-3 w-3" />
                  <span>Easy Returns</span>
                </div>
              </div>

              {/* Checkout Button */}
              <Button 
                className="w-full mt-4" 
                onClick={handleCheckout}
                disabled={loading}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Proceed to Checkout
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );

  if (showAsModal) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          {trigger || (
            <Button variant="outline" className="relative">
              <ShoppingCartIcon className="h-4 w-4 mr-2" />
              Cart
              {totals.itemCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
                >
                  {totals.itemCount}
                </Badge>
              )}
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="max-w-md max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCartIcon className="h-5 w-5" />
              Shopping Cart
              {totals.itemCount > 0 && (
                <Badge variant="secondary">
                  {totals.itemCount} {totals.itemCount === 1 ? 'item' : 'items'}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto">
            {cartContent}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="w-full max-w-md">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCartIcon className="h-5 w-5" />
            Shopping Cart
            {totals.itemCount > 0 && (
              <Badge variant="secondary">
                {totals.itemCount} {totals.itemCount === 1 ? 'item' : 'items'}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {cartContent}
        </CardContent>
      </Card>
    </div>
  );
}
