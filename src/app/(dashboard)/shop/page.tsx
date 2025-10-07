'use client';

import React, { useState } from 'react';
import { ProductCatalog } from '@/components/ProductCatalog';
import { ShoppingCart } from '@/components/ShoppingCart';
import { CheckoutFlow } from '@/components/CheckoutFlow';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ShoppingCart as ShoppingCartIcon, Package, CreditCard } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { AuthenticatedLayout } from '@/components/AuthenticatedLayout';

export default function ShopPage() {
  const [activeTab, setActiveTab] = useState('catalog');
  const [showCheckout, setShowCheckout] = useState(false);
  const { user } = useAuth();

  const handleCheckout = () => {
    setShowCheckout(true);
    setActiveTab('checkout');
  };

  const handleCheckoutSuccess = () => {
    setShowCheckout(false);
    setActiveTab('orders');
    // You could show a success message or redirect to order details
  };

  const handleCheckoutCancel = () => {
    setShowCheckout(false);
    setActiveTab('catalog');
  };

  if (!user) {
    return (
      <AuthenticatedLayout>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign In Required</h2>
            <p className="text-gray-600 mb-4">
              Please sign in to access the shop and purchase framed art.
            </p>
            <Button onClick={() => window.location.href = '/login'}>
              Sign In
            </Button>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  if (showCheckout) {
    return (
      <AuthenticatedLayout>
        <div className="min-h-screen bg-background">
          <div className="container mx-auto px-4 py-8">
            <CheckoutFlow
              onSuccess={handleCheckoutSuccess}
              onCancel={handleCheckoutCancel}
            />
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Art Shop</h1>
          <p className="text-gray-600">
            Discover and purchase beautifully framed AI-generated art pieces.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="catalog" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Catalog
            </TabsTrigger>
            <TabsTrigger value="cart" className="flex items-center gap-2">
              <ShoppingCartIcon className="h-4 w-4" />
              Cart
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Orders
            </TabsTrigger>
          </TabsList>

          <TabsContent value="catalog" className="space-y-6">
            <ProductCatalog showFilters={true} limit={20} />
          </TabsContent>

          <TabsContent value="cart" className="space-y-6">
            <div className="flex justify-center">
              <ShoppingCart onCheckout={handleCheckout} />
            </div>
          </TabsContent>

          <TabsContent value="orders" className="space-y-6">
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Order Management</h3>
              <p className="text-gray-500 mb-4">
                Order management interface will be available here.
              </p>
              <Button variant="outline">
                View Orders
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
    </AuthenticatedLayout>
  );
}
