'use client';

import React from 'react';
import { AppLayout } from '@/components/AppLayout';
import { ShoppingCart } from '@/components/ShoppingCart';

export default function CartPage() {
  return (
    <AppLayout>
      <div className="flex flex-col min-h-screen bg-background">
        {/* Top Spacer - same as other pages */}
        <div className="h-16 min-h-16 self-stretch bg-background" />
        
        {/* Main Content */}
        <div className="flex-1 container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-foreground mb-2">Shopping Cart</h1>
            <p className="text-muted-foreground mb-8">
              Review your selected items and proceed to checkout.
            </p>
            <ShoppingCart />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
