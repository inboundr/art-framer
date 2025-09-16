'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { getProxiedImageUrl } from '@/lib/utils/imageProxy';

interface ShoppingCartProps {
  onCheckout?: (shippingAddress?: any) => void;
  showAsModal?: boolean;
  trigger?: React.ReactNode;
}

export function ShoppingCart({ onCheckout, showAsModal = false, trigger }: ShoppingCartProps) {
  const { cartItems, totals, loading, updateQuantity, removeFromCart, clearCart } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [shippingAddress, setShippingAddress] = useState({
    countryCode: 'US',
    stateOrCounty: '',
    postalCode: ''
  });
  const [shippingInfo, setShippingInfo] = useState({
    cost: 9.99,
    estimatedDays: 7,
    serviceName: 'Standard Shipping'
  });
  const [calculatingShipping, setCalculatingShipping] = useState(false);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const calculateShippingCost = async () => {
    if (!shippingAddress.countryCode || !shippingAddress.postalCode) {
      return;
    }

    setCalculatingShipping(true);
    try {
      const response = await fetch('/api/cart/shipping', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(shippingAddress),
      });

      if (response.ok) {
        const data = await response.json();
        setShippingInfo({
          cost: data.shippingCost,
          estimatedDays: data.estimatedDays,
          serviceName: data.serviceName
        });
      } else {
        console.error('Failed to calculate shipping cost');
      }
    } catch (error) {
      console.error('Error calculating shipping cost:', error);
    } finally {
      setCalculatingShipping(false);
    }
  };

  // Calculate shipping when address changes
  React.useEffect(() => {
    if (shippingAddress.countryCode && shippingAddress.postalCode) {
      const timeoutId = setTimeout(calculateShippingCost, 500); // Debounce
      return () => clearTimeout(timeoutId);
    }
  }, [shippingAddress]);

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
    
    onCheckout?.(shippingAddress);
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
          <ShoppingCartIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">Your cart is empty</h3>
          <p className="text-muted-foreground mb-4">Add some framed art to get started!</p>
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
                  <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    <img
                      src={getProxiedImageUrl(item.products.images.image_url || item.products.images.thumbnail_url)}
                      alt={item.products.images.prompt}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        if (target.src !== item.products.images.thumbnail_url) {
                          target.src = item.products.images.thumbnail_url;
                        }
                      }}
                    />
                  </div>

                  {/* Product Details */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm line-clamp-2">
                      {getFrameSizeLabel(item.products.frame_size)} Frame
                    </h4>
                    <p className="text-xs text-muted-foreground mb-1">
                      {getFrameStyleLabel(item.products.frame_style)} {getFrameMaterialLabel(item.products.frame_material)}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
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
                    <div className="text-xs text-muted-foreground">
                      {formatPrice(item.products.price)} each
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Shipping Address Form */}
          {cartItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Shipping Address</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Enter your address to calculate accurate shipping costs
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="country">Country</Label>
                    <select
                      id="country"
                      value={shippingAddress.countryCode}
                      onChange={(e) => setShippingAddress(prev => ({ ...prev, countryCode: e.target.value }))}
                      className="w-full p-2 border rounded-md bg-background"
                    >
                      <option value="US">United States</option>
                      <option value="CA">Canada</option>
                      <option value="GB">United Kingdom</option>
                      <option value="AU">Australia</option>
                      <option value="DE">Germany</option>
                      <option value="FR">France</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="state">State/Province</Label>
                    <Input
                      id="state"
                      value={shippingAddress.stateOrCounty}
                      onChange={(e) => setShippingAddress(prev => ({ ...prev, stateOrCounty: e.target.value }))}
                      placeholder="e.g., CA, NY, ON"
                    />
                  </div>
                  <div>
                    <Label htmlFor="postalCode">ZIP/Postal Code</Label>
                    <Input
                      id="postalCode"
                      value={shippingAddress.postalCode}
                      onChange={(e) => setShippingAddress(prev => ({ ...prev, postalCode: e.target.value }))}
                      placeholder="e.g., 90210"
                    />
                  </div>
                </div>
                {calculatingShipping && (
                  <div className="text-sm text-muted-foreground">
                    Calculating shipping costs...
                  </div>
                )}
                {shippingInfo.serviceName && !calculatingShipping && (
                  <div className="text-sm text-muted-foreground">
                    {shippingInfo.serviceName} - {shippingInfo.estimatedDays} days
                  </div>
                )}
              </CardContent>
            </Card>
          )}

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
                <span>
                  {calculatingShipping ? (
                    <span className="text-muted-foreground">Calculating...</span>
                  ) : (
                    formatPrice(shippingInfo.cost)
                  )}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span>
                  {calculatingShipping ? (
                    <span className="text-muted-foreground">Calculating...</span>
                  ) : (
                    formatPrice(totals.subtotal + totals.taxAmount + shippingInfo.cost)
                  )}
                </span>
              </div>

              {/* Trust Badges */}
              <div className="flex items-center justify-center gap-4 pt-2 text-xs text-muted-foreground">
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
