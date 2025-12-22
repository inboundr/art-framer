'use client';

import { Header } from './Header';
import { CartSidebar } from './CartSidebar';
import { AuthModal } from './AuthModal';
import { NotificationBar } from './NotificationBar';
import { useCartSidebar } from '@/contexts/CartSidebarContext';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function GlobalHeader() {
  const router = useRouter();
  const { isOpen: cartSidebarOpen, openCart, closeCart: closeCartSidebar } = useCartSidebar();
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [authRedirectPath, setAuthRedirectPath] = useState<string | null>(null);
  const [showBanner, setShowBanner] = useState(true);

  const BANNER_HEIGHT = 56; // px (approx NotificationBar height)
  const HEADER_HEIGHT = 64; // px
  const spacerHeight = (showBanner ? BANNER_HEIGHT : 0) + HEADER_HEIGHT;

  return (
    <>
      {/* Fixed Header Container - z-40 */}
      <div className="fixed top-0 left-0 right-0 z-40">
        {showBanner && (
          <NotificationBar onClose={() => setShowBanner(false)} />
        )}
        <Header
          isFixed={false}
          onOpenAuthModal={(redirectPath) => {
            setAuthRedirectPath(redirectPath || null);
            setAuthModalVisible(true);
          }}
          onOpenCart={openCart}
        />
      </div>
      {/* Spacer to offset fixed header + banner */}
      <div aria-hidden style={{ height: spacerHeight }} />
      
      {/* Cart Sidebar - z-50, above header */}
      <CartSidebar
        isOpen={cartSidebarOpen}
        onClose={closeCartSidebar}
      />
      
      {/* Auth Modal - z-60, above cart */}
      <AuthModal
        isOpen={authModalVisible}
        onClose={() => {
          setAuthModalVisible(false);
          setAuthRedirectPath(null);
        }}
        onAuthSuccess={() => {
          setAuthModalVisible(false);
          if (authRedirectPath) {
            router.push(authRedirectPath);
            setAuthRedirectPath(null);
          }
        }}
      />
    </>
  );
}

