'use client';

import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import { useGeneration } from '@/contexts/GenerationContext';
import { useCart } from '@/contexts/CartContext';
import { SidebarAvatar } from './SidebarAvatar';
import { ProfilePopup } from './ProfilePopup';
import { useState, useRef } from 'react';
import { ShoppingCart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface HeaderProps {
  onOpenAuthModal?: (redirectPath?: string) => void;
  onOpenCart?: () => void;
  isFixed?: boolean;
  offsetTop?: number;
}

export function Header({ onOpenAuthModal, onOpenCart, isFixed = true, offsetTop = 0 }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, signOut } = useAuth();
  const { activeGenerations } = useGeneration();
  const { cartData } = useCart();
  const totals = cartData?.totals || { subtotal: 0, taxAmount: 0, shippingAmount: 0, total: 0, itemCount: 0 };
  const [profilePopupOpen, setProfilePopupOpen] = useState(false);
  const profileButtonRef = useRef<HTMLButtonElement>(null);

  const handleNavClick = (path: string) => {
    router.push(path);
  };

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
      router.push('/');
    }
  };

  const positionClasses = isFixed ? 'fixed left-0 right-0' : 'relative';

  return (
    <header
      className={`${positionClasses} h-16 bg-white border-b border-gray-200 z-[100] shadow-sm pointer-events-auto`}
      style={isFixed ? { top: offsetTop } : undefined}
    >
      <div className="flex items-center justify-between h-full px-4 lg:px-6">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleNavClick('/');
            }}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity pointer-events-auto cursor-pointer"
            type="button"
          >
            <Image
              src="https://irugsjzjqdxulliobuwt.supabase.co/storage/v1/object/public/general/logo.png"
              alt="Art Framer"
              width={150}
              height={150}
              className="h-12 w-auto object-contain"
              priority
              unoptimized
            />
            <span className="text-lg font-semibold text-gray-900 hidden sm:inline">Cool Art</span>
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex items-center gap-1 lg:gap-2 flex-1 justify-center">
          <NavButton
            icon={
              <svg width="20" height="20" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4.98455 7.53371L10.5748 3.94001C10.7522 3.82584 10.9588 3.76514 11.1699 3.76514C11.3809 3.76514 11.5875 3.82584 11.7649 3.94001L17.3551 7.53371C17.8201 7.83254 18.2025 8.24335 18.4674 8.72846C18.7322 9.21356 18.871 9.75742 18.871 10.3101V16.2083C18.871 17.0835 18.5233 17.9229 17.9044 18.5418C17.2855 19.1606 16.4462 19.5083 15.571 19.5083H13.371V15.1083C13.371 14.8166 13.2551 14.5368 13.0488 14.3305C12.8425 14.1242 12.5627 14.0083 12.271 14.0083H10.0688C9.77701 14.0083 9.49722 14.1242 9.29093 14.3305C9.08464 14.5368 8.96875 14.8166 8.96875 15.1083V19.5083H6.76875C5.89354 19.5083 5.05417 19.1606 4.4353 18.5418C3.81643 17.9229 3.46875 17.0835 3.46875 16.2083V10.3101C3.4687 9.75742 3.60746 9.21356 3.87231 8.72846C4.13716 8.24335 4.5196 7.83254 4.98455 7.53371Z" stroke="currentColor" strokeWidth="1.815" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            }
            label="Home"
            active={pathname === '/'}
            onClick={() => handleNavClick('/')}
          />

          <NavButton
            icon={
              <svg width="20" height="20" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8.21875 15.7736L14.5812 9.41891C14.6946 9.30516 14.8293 9.21491 14.9777 9.15333C15.1261 9.09176 15.2851 9.06006 15.4458 9.06006C15.6064 9.06006 15.7654 9.09176 15.9138 9.15333C16.0622 9.21491 16.1969 9.30516 16.3104 9.41891L20.0284 13.1369" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2.30469 9.06055V17.0047C2.30469 18.3555 3.39919 19.4489 4.74999 19.4489H15.1384" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8.41295 15.7829H17.5793C17.9004 15.7833 18.2185 15.7204 18.5153 15.5977C18.8121 15.4751 19.0818 15.295 19.3089 15.068C19.5361 14.841 19.7162 14.5714 19.839 14.2746C19.9618 13.9779 20.0248 13.6598 20.0246 13.3387V6.61657C20.0248 6.29541 19.9618 5.97736 19.839 5.68061C19.7162 5.38387 19.5361 5.11426 19.3089 4.88722C19.0818 4.66018 18.8121 4.48018 18.5153 4.35751C18.2185 4.23485 17.9004 4.17193 17.5793 4.17237H8.41295C8.09189 4.17208 7.77393 4.2351 7.47725 4.35783C7.18058 4.48056 6.91102 4.66059 6.684 4.88761C6.45697 5.11463 6.27695 5.38419 6.15422 5.68087C6.03149 5.97754 5.96846 6.29551 5.96875 6.61657V13.3376C5.96875 14.6884 7.06325 15.7829 8.41295 15.7829Z" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9.94085 9.36656C9.61691 9.36598 9.3064 9.23704 9.07734 9.00798C8.84828 8.77891 8.71933 8.46841 8.71875 8.14446C8.71875 7.47016 9.26765 6.92236 9.93975 6.92236C10.614 6.92236 11.163 7.47016 11.163 8.14336C11.163 8.81656 10.6141 9.36656 9.94085 9.36656Z" fill="currentColor"/>
              </svg>
            }
            label="My creations"
            active={pathname === '/creations'}
            badge={activeGenerations > 0 ? activeGenerations : undefined}
            onClick={() => {
              if (!user) {
                if (onOpenAuthModal) {
                  onOpenAuthModal('/creations');
                }
              } else {
                handleNavClick('/creations');
              }
            }}
          />

          <NavButton
            icon={
              <svg width="20" height="20" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3.46094 9.61035H18.8609V7.41035C18.8609 6.53514 18.5133 5.69577 17.8944 5.0769C17.2755 4.45803 16.4362 4.11035 15.5609 4.11035H6.76094C5.88572 4.11035 5.04636 4.45803 4.42749 5.0769C3.80862 5.69577 3.46094 6.53514 3.46094 7.41035V16.2104C3.46094 17.0856 3.80862 17.9249 4.42749 18.5438C5.04636 19.1627 5.88572 19.5104 6.76094 19.5104H8.96094V4.11035" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M15.5656 12.9106L16.3906 15.3856L18.8656 16.2106L16.3906 17.0356L15.5656 19.5106L14.7406 17.0356L12.2656 16.2106L14.7406 15.3856L15.5656 12.9106Z" fill="currentColor" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            }
            label="Orders"
            active={pathname === '/orders'}
            onClick={() => {
              if (!user) {
                if (onOpenAuthModal) {
                  onOpenAuthModal('/orders');
                }
              } else {
                handleNavClick('/orders');
              }
            }}
          />

          <NavButton
            icon={<ShoppingCart className="w-5 h-5" />}
            label="Cart"
            active={pathname === '/cart'}
            badge={totals.itemCount > 0 ? totals.itemCount : undefined}
            onClick={() => {
              if (!user) {
                if (onOpenAuthModal) {
                  onOpenAuthModal('/cart');
                }
              } else {
                // Open cart sidebar instead of navigating
                if (onOpenCart) {
                  onOpenCart();
                } else {
                  handleNavClick('/cart');
                }
              }
            }}
          />
        </nav>

        {/* Right Side - Profile & Actions */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <button 
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors relative pointer-events-auto cursor-pointer"
            type="button"
          >
            <svg width="20" height="20" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18.8609 15.6604C18.2775 15.6604 17.7179 15.4286 17.3053 15.016C16.8927 14.6034 16.6609 14.0438 16.6609 13.4604V9.61035C16.6609 8.15166 16.0815 6.75271 15.05 5.72126C14.0186 4.68981 12.6196 4.11035 11.1609 4.11035C9.70225 4.11035 8.3033 4.68981 7.27185 5.72126C6.2404 6.75271 5.66094 8.15166 5.66094 9.61035V13.4604C5.66094 14.0438 5.42915 14.6034 5.01657 15.016C4.60399 15.4286 4.04441 15.6604 3.46094 15.6604H18.8609Z" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M8.46875 18.4106C8.59498 19.0323 8.93225 19.5912 9.42341 19.9927C9.91456 20.3941 10.5294 20.6134 11.1637 20.6134C11.7981 20.6134 12.4129 20.3941 12.9041 19.9927C13.3952 19.5912 13.7325 19.0323 13.8587 18.4106H8.46875Z" fill="currentColor"/>
            </svg>
          </button>

          {/* Profile */}
          <div className="relative">
            <button 
              ref={profileButtonRef}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setProfilePopupOpen(!profilePopupOpen);
              }}
              className="p-1 rounded-lg hover:bg-gray-100 transition-colors pointer-events-auto cursor-pointer"
              title={user ? `${profile?.username || user.email}` : 'Not signed in'}
              type="button"
            >
              <SidebarAvatar user={user} profile={profile} size="sm" />
            </button>
            
            <ProfilePopup
              isOpen={profilePopupOpen}
              onClose={() => setProfilePopupOpen(false)}
              triggerRef={profileButtonRef}
            />
          </div>
        </div>
      </div>
    </header>
  );
}

interface NavButtonProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  badge?: number;
  onClick?: () => void;
}

function NavButton({ icon, label, active = false, badge, onClick }: NavButtonProps) {
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (onClick) {
          onClick();
        }
      }}
      className={`relative flex items-center gap-2 px-3 py-2 rounded-lg transition-colors pointer-events-auto cursor-pointer ${
        active 
          ? 'bg-black text-white' 
          : 'text-gray-700 hover:bg-gray-100'
      }`}
      type="button"
    >
      <div className="flex items-center justify-center w-5 h-5 relative">
        {icon}
        {badge && (
          <div className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-4.5 px-1.5 bg-red-500 rounded-full">
            <span className="text-white text-[10px] font-bold leading-none">{badge}</span>
          </div>
        )}
      </div>
      <span className="text-sm font-medium hidden sm:inline">{label}</span>
    </button>
  );
}

