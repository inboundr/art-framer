import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useGeneration } from '@/contexts/GenerationContext';
import { SidebarAvatar } from './SidebarAvatar';
import { ProfilePopup } from './ProfilePopup';
import { CartButton } from './CartButton';
// Temporarily commented out to resolve bundler issues
// import { ThemeToggle } from './DynamicThemeProvider';
import { useState, useRef } from 'react';

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  badge?: number;
  onClick?: () => void;
  isMobile?: boolean;
}

interface SidebarProps {
  isMobile?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  onOpenAuthModal?: (redirectPath?: string) => void;
}

function NavItem({ icon, label, active = false, badge, onClick, isMobile = false }: NavItemProps) {
  if (isMobile) {
    return (
      <div className="flex w-full">
        <button
          onClick={onClick}
          className={`flex w-full h-12 px-4 items-center gap-3 rounded-lg ${
            active ? 'bg-white/20' : 'hover:bg-white/5'
          } transition-colors relative`}
        >
          <div className="flex items-center justify-center w-6 h-6">
            {icon}
          </div>
          <span className="text-gray-text text-sm font-medium">
            {label}
          </span>
          {badge && (
            <div className="ml-auto flex items-center justify-center w-5 h-5 bg-pink-primary rounded-full">
              <span className="text-white text-xs font-bold">{badge}</span>
            </div>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="flex pt-1 flex-col items-start">
      <button
        onClick={onClick}
        className={`flex w-16 h-16 flex-col justify-center items-center gap-[-2px] rounded ${
          active ? 'bg-white/20' : 'hover:bg-white/5'
        } transition-colors relative`}
      >
        <div className={`flex p-2 justify-center items-center rounded-md ${active ? 'bg-white/20' : ''}`}>
          <div className="flex flex-col items-start">
            {icon}
          </div>
        </div>
        <div className="flex flex-col items-start">
          <div className="flex flex-col items-center">
            <span className="text-gray-text text-center text-[11px] font-semibold leading-5 tracking-[-0.55px]">
              {label}
            </span>
          </div>
        </div>
        
        {/* Badge */}
        {badge && (
          <div className="absolute -right-0.5 top-3.5 bg-dark-secondary rounded-full">
            <div className="flex w-[22px] h-[22px] justify-center items-center">
              <div className="flex flex-col items-start">
                <svg 
                  width="21" 
                  height="41" 
                  viewBox="0 0 21 41" 
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-10"
                >
                  <path 
                    d="M10.1641 19.8105C15.1346 19.8105 19.1641 15.7811 19.1641 10.8105C19.1641 5.83998 15.1346 1.81055 10.1641 1.81055C5.1935 1.81055 1.16406 5.83998 1.16406 10.8105C1.16406 15.7811 5.1935 19.8105 10.1641 19.8105Z" 
                    stroke="#71717A" 
                    strokeWidth="2" 
                    strokeLinecap="round"
                  />
                  <path 
                    d="M19.1641 30.8105C19.1641 25.84 15.1346 21.8105 10.1641 21.8105C5.1935 21.8105 1.16406 25.84 1.16406 30.8105C1.16406 35.7811 5.1935 39.8105 10.1641 39.8105C15.1346 39.8105 19.1641 35.7811 19.1641 30.8105Z" 
                    stroke="#FF8FB4" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeDasharray="6.79 49.76"
                  />
                </svg>
              </div>
              <div className="flex w-[22px] h-[22px] p-0.75 flex-col items-center absolute">
                <span className="text-pink-primary text-center text-[10px] font-bold leading-4 tracking-[-0.4px]">
                  {badge}
                </span>
              </div>
            </div>
          </div>
        )}
      </button>
    </div>
  );
}

export function Sidebar({ isMobile = false, isOpen = false, onClose, onOpenAuthModal }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, signOut } = useAuth();
  const { activeGenerations } = useGeneration();
  const [profilePopupOpen, setProfilePopupOpen] = useState(false);
  const profileButtonRef = useRef<HTMLButtonElement>(null);


  const handleNavClick = (path: string) => {
    router.push(path);
    if (isMobile && onClose) {
      onClose();
    }
  };

  const handleLogout = async () => {
    try {
      console.log('🚪 Sidebar logout initiated...');
      console.log('🚪 signOut function:', signOut);
      console.log('🚪 user before logout:', user);
      
      const { error } = await signOut();
      console.log('🚪 signOut result:', { error });
      
      if (error) {
        console.error('Logout error:', error);
        // Still redirect even if there's an error
      } else {
        console.log('✅ Sidebar logout successful');
      }
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
      // Still redirect even if there's an error
      router.push('/');
    }
  };

  if (isMobile) {
    return (
      <div className={`fixed left-0 top-0 h-full w-64 z-50 transform transition-transform duration-300 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full bg-dark-secondary border-r border-gray-border">
          {/* Mobile Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-border">
            <div className="flex items-center gap-3">
              <svg 
                width="24" 
                height="24" 
                viewBox="0 0 31 31" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                className="w-6 h-6"
              >
                <path 
                  d="M12.7616 7.62562H8.07338M12.7616 24.021H8.07338M1.63281 15.8302H12.7737M12.0266 28.0245H13.17C15.4162 28.0245 17.2371 26.2036 17.2371 23.9574C17.2371 21.7112 15.4162 19.8904 13.17 19.8904M13.17 19.8904H4.07995M13.17 19.8904C15.4162 19.8904 17.2371 18.0695 17.2371 15.8233C17.2371 13.8857 15.8821 12.2646 14.0681 11.8557C13.7792 11.7905 13.4786 11.7279 13.17 11.7279M12.0266 3.59375H13.17C15.4162 3.59375 17.2371 5.41465 17.2371 7.66082C17.2371 9.90702 15.4162 11.7279 13.17 11.7279M13.17 11.7279H4.07995" 
                  stroke="#F7F7F8" 
                  strokeWidth="2.26667" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </svg>
              <h2 className="text-lg font-semibold text-gray-light">Art Framer</h2>
            </div>
            <button
              onClick={onClose}
              className="flex w-8 h-8 items-center justify-center rounded-lg hover:bg-gray-border/20 transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          
          {/* Mobile Navigation */}
          <div className="flex flex-col p-4 space-y-2 flex-1">
            <NavItem
              isMobile={true}
              icon={
                <svg width="22" height="22" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-[22px] h-[22px]">
                  <path d="M4.98455 7.53371L10.5748 3.94001C10.7522 3.82584 10.9588 3.76514 11.1699 3.76514C11.3809 3.76514 11.5875 3.82584 11.7649 3.94001L17.3551 7.53371C17.8201 7.83254 18.2025 8.24335 18.4674 8.72846C18.7322 9.21356 18.871 9.75742 18.871 10.3101V16.2083C18.871 17.0835 18.5233 17.9229 17.9044 18.5418C17.2855 19.1606 16.4462 19.5083 15.571 19.5083H13.371V15.1083C13.371 14.8166 13.2551 14.5368 13.0488 14.3305C12.8425 14.1242 12.5627 14.0083 12.271 14.0083H10.0688C9.77701 14.0083 9.49722 14.1242 9.29093 14.3305C9.08464 14.5368 8.96875 14.8166 8.96875 15.1083V19.5083H6.76875C5.89354 19.5083 5.05417 19.1606 4.4353 18.5418C3.81643 17.9229 3.46875 17.0835 3.46875 16.2083V10.3101C3.4687 9.75742 3.60746 9.21356 3.87231 8.72846C4.13716 8.24335 4.5196 7.83254 4.98455 7.53371Z" stroke="#F7F7F8" strokeWidth="1.815" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              }
              label="Home"
              active={pathname === '/'}
              onClick={() => handleNavClick('/')}
            />
            
            <NavItem
              isMobile={true}
              icon={
                <svg width="22" height="22" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-[22px] h-[22px]">
                  <path d="M8.21875 15.7736L14.5812 9.41891C14.6946 9.30516 14.8293 9.21491 14.9777 9.15333C15.1261 9.09176 15.2851 9.06006 15.4458 9.06006C15.6064 9.06006 15.7654 9.09176 15.9138 9.15333C16.0622 9.21491 16.1969 9.30516 16.3104 9.41891L20.0284 13.1369" stroke="#AAAAB1" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2.30469 9.06055V17.0047C2.30469 18.3555 3.39919 19.4489 4.74999 19.4489H15.1384" stroke="#AAAAB1" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M8.41295 15.7829H17.5793C17.9004 15.7833 18.2185 15.7204 18.5153 15.5977C18.8121 15.4751 19.0818 15.295 19.3089 15.068C19.5361 14.841 19.7162 14.5714 19.839 14.2746C19.9618 13.9779 20.0248 13.6598 20.0246 13.3387V6.61657C20.0248 6.29541 19.9618 5.97736 19.839 5.68061C19.7162 5.38387 19.5361 5.11426 19.3089 4.88722C19.0818 4.66018 18.8121 4.48018 18.5153 4.35751C18.2185 4.23485 17.9004 4.17193 17.5793 4.17237H8.41295C8.09189 4.17208 7.77393 4.2351 7.47725 4.35783C7.18058 4.48056 6.91102 4.66059 6.684 4.88761C6.45697 5.11463 6.27695 5.38419 6.15422 5.68087C6.03149 5.97754 5.96846 6.29551 5.96875 6.61657V13.3376C5.96875 14.6884 7.06325 15.7829 8.41295 15.7829Z" stroke="#AAAAB1" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9.94085 9.36656C9.61691 9.36598 9.3064 9.23704 9.07734 9.00798C8.84828 8.77891 8.71933 8.46841 8.71875 8.14446C8.71875 7.47016 9.26765 6.92236 9.93975 6.92236C10.614 6.92236 11.163 7.47016 11.163 8.14336C11.163 8.81656 10.6141 9.36656 9.94085 9.36656Z" fill="#AAAAB1"/>
                </svg>
              }
              label="Creations"
              active={pathname === '/creations'}
              badge={activeGenerations > 0 ? activeGenerations : undefined}
              onClick={() => handleNavClick('/creations')}
            />

            <NavItem
              isMobile={true}
              icon={
                <svg width="22" height="22" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-[22px] h-[22px]">
                  <path d="M3.46094 9.61035H18.8609V7.41035C18.8609 6.53514 18.5133 5.69577 17.8944 5.0769C17.2755 4.45803 16.4362 4.11035 15.5609 4.11035H6.76094C5.88572 4.11035 5.04636 4.45803 4.42749 5.0769C3.80862 5.69577 3.46094 6.53514 3.46094 7.41035V16.2104C3.46094 17.0856 3.80862 17.9249 4.42749 18.5438C5.04636 19.1627 5.88572 19.5104 6.76094 19.5104H8.96094V4.11035" stroke="#AAAAB1" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M15.5656 12.9106L16.3906 15.3856L18.8656 16.2106L16.3906 17.0356L15.5656 19.5106L14.7406 17.0356L12.2656 16.2106L14.7406 15.3856L15.5656 12.9106Z" fill="#AAAAB1" stroke="#AAAAB1" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              }
              label="Orders"
              active={pathname === '/orders'}
              onClick={() => handleNavClick('/orders')}
            />
            
            {/* Cart Button for Mobile - Always visible */}
            <div className="flex w-full">
              <div className="flex w-full h-12 px-4 items-center gap-3 rounded-lg hover:bg-white/5 transition-colors">
                <div className="flex items-center justify-center w-6 h-6">
                  <CartButton 
                    onCartClick={() => {
                      if (!user) {
                        // Show auth modal for non-authenticated users
                        if (onOpenAuthModal) {
                          onOpenAuthModal();
                          if (isMobile && onClose) {
                            onClose();
                          }
                        }
                      } else {
                        // Navigate to cart for authenticated users
                        handleNavClick('/cart');
                      }
                    }}
                  />
                </div>
                <span className="text-gray-text text-sm font-medium">
                  Cart
                </span>
              </div>
            </div>
            

            
            {/* Other navigation items... */}
          </div>
          
          {/* Mobile Footer */}
          <div className="p-4 border-t border-gray-border">
            {/* Mobile Theme Toggle - Temporarily disabled */}
            {/* <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-border">
              <span className="text-sm text-gray-text">Theme</span>
              <ThemeToggle 
                variant="switch" 
                showLabel={false}
                className="scale-75"
              />
            </div> */}
            {user ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <SidebarAvatar user={user} profile={profile} size="sm" />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-light">{profile?.username || user.email}</span>
                    <span className="text-xs text-gray-muted">{profile?.is_premium ? 'Premium' : 'Free Plan'}</span>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full px-3 py-2 text-sm text-gray-light hover:text-white hover:bg-gray-border/20 rounded-md transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="text-center space-y-3">
                <SidebarAvatar user={null} profile={null} size="sm" />
                <span className="text-sm text-gray-muted">Not signed in</span>
                <button
                  onClick={() => {
                    if (onOpenAuthModal) {
                      onOpenAuthModal();
                      if (isMobile && onClose) {
                        onClose();
                      }
                    }
                  }}
                  className="w-full px-3 py-2 text-sm text-gray-light hover:text-white hover:bg-gray-border/20 rounded-md transition-colors border border-gray-border"
                >
                  Sign In
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed left-0 top-0 h-full w-20 z-40">
      <div className="flex w-[80.5px] flex-col items-start h-full">
        <div className="flex p-1 px-2 pb-2 flex-col items-start self-stretch border-r-[0.5px] border-gray-border bg-dark-secondary h-full">
          {/* Logo */}
          <div className="flex min-w-16 min-h-16 p-[17px_0] justify-center items-center self-stretch">
            <svg 
              width="30" 
              height="30" 
              viewBox="0 0 31 31" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
              className="w-[30px] h-[30px]"
            >
              <path 
                d="M12.7616 7.62562H8.07338M12.7616 24.021H8.07338M1.63281 15.8302H12.7737M12.0266 28.0245H13.17C15.4162 28.0245 17.2371 26.2036 17.2371 23.9574C17.2371 21.7112 15.4162 19.8904 13.17 19.8904M13.17 19.8904H4.07995M13.17 19.8904C15.4162 19.8904 17.2371 18.0695 17.2371 15.8233C17.2371 13.8857 15.8821 12.2646 14.0681 11.8557C13.7792 11.7905 13.4786 11.7279 13.17 11.7279M12.0266 3.59375H13.17C15.4162 3.59375 17.2371 5.41465 17.2371 7.66082C17.2371 9.90702 15.4162 11.7279 13.17 11.7279M13.17 11.7279H4.07995" 
                stroke="#F7F7F8" 
                strokeWidth="2.26667" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
              <path 
                d="M17.203 8.78355C17.6701 8.41163 18.2326 8.17905 18.826 8.11254C19.4194 8.04603 20.0195 8.14828 20.5573 8.40755C21.6549 8.93662 22.3526 10.0474 22.3526 11.2659C22.3526 10.7089 22.4992 10.1617 22.7777 9.67933C23.0562 9.19695 23.4568 8.79638 23.9392 8.51788C24.4216 8.23939 24.9688 8.09277 25.5258 8.09277C26.0827 8.09277 26.6299 8.23939 27.1123 8.51788M17.1875 16.4962C17.354 16.3472 17.5359 16.2162 17.73 16.1055L17.7284 16.1049C18.1672 15.854 18.6595 15.7115 19.1645 15.6893C19.6694 15.6672 20.1724 15.766 20.6314 15.9775C21.0905 16.189 21.4924 16.5071 21.8036 16.9053C22.1149 17.3036 22.3265 17.7704 22.4209 18.2669C22.7177 19.6744 23.9209 20.6975 25.3419 20.7794L25.3413 20.783C25.6378 20.8005 25.9352 20.7762 26.2249 20.7109" 
                stroke="#F7F7F8" 
                strokeWidth="2.26667" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
              <path 
                d="M15.9729 27.4226C15.9148 27.3077 15.8637 27.1894 15.8199 27.0683M25.5259 14.439C26.8093 14.439 27.9663 13.6659 28.4575 12.4802C28.9486 11.2945 28.6771 9.92965 27.7696 9.02215C27.297 8.55423 26.6893 8.2466 26.0324 8.14278C25.8384 7.14738 25.4312 6.20575 24.8389 5.38257C24.2466 4.5594 23.4831 3.87417 22.601 3.37394C21.4576 2.72581 20.1555 2.41128 18.8423 2.46607C17.5292 2.52087 16.2578 2.9428 15.1724 3.68394C15.0713 3.75579 14.9721 3.83031 14.875 3.90741M21.8699 25.1696C22.6052 26.2953 23.9702 26.8353 25.2767 26.5174C26.5832 26.1995 27.5474 25.0927 27.6833 23.755C27.8071 22.5352 27.217 21.3532 26.1677 20.719C27.7228 20.3978 28.801 18.9765 28.6914 17.3925C28.576 15.7292 27.1931 14.439 25.5259 14.439M15.9833 27.4425C16.7252 28.8845 18.4351 29.5351 19.9479 28.951C21.4607 28.3668 22.2896 26.736 21.8699 25.1696" 
                stroke="#F7F7F8" 
                strokeWidth="2.26667" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
          </div>
          
          {/* Navigation Items */}
          <div className="flex flex-col justify-center items-center self-stretch">
            <NavItem
              icon={
                <svg width="22" height="22" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-[22px] h-[22px]">
                  <path d="M4.98455 7.53371L10.5748 3.94001C10.7522 3.82584 10.9588 3.76514 11.1699 3.76514C11.3809 3.76514 11.5875 3.82584 11.7649 3.94001L17.3551 7.53371C17.8201 7.83254 18.2025 8.24335 18.4674 8.72846C18.7322 9.21356 18.871 9.75742 18.871 10.3101V16.2083C18.871 17.0835 18.5233 17.9229 17.9044 18.5418C17.2855 19.1606 16.4462 19.5083 15.571 19.5083H13.371V15.1083C13.371 14.8166 13.2551 14.5368 13.0488 14.3305C12.8425 14.1242 12.5627 14.0083 12.271 14.0083H10.0688C9.77701 14.0083 9.49722 14.1242 9.29093 14.3305C9.08464 14.5368 8.96875 14.8166 8.96875 15.1083V19.5083H6.76875C5.89354 19.5083 5.05417 19.1606 4.4353 18.5418C3.81643 17.9229 3.46875 17.0835 3.46875 16.2083V10.3101C3.4687 9.75742 3.60746 9.21356 3.87231 8.72846C4.13716 8.24335 4.5196 7.83254 4.98455 7.53371Z" stroke="#F7F7F8" strokeWidth="1.815" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              }
              label="Home"
              active={pathname === '/'}
              onClick={() => handleNavClick('/')}
            />

            <NavItem
              icon={
                <svg width="22" height="22" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-[22px] h-[22px]">
                  <path d="M8.21875 15.7736L14.5812 9.41891C14.6946 9.30516 14.8293 9.21491 14.9777 9.15333C15.1261 9.09176 15.2851 9.06006 15.4458 9.06006C15.6064 9.06006 15.7654 9.09176 15.9138 9.15333C16.0622 9.21491 16.1969 9.30516 16.3104 9.41891L20.0284 13.1369" stroke="#AAAAB1" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2.30469 9.06055V17.0047C2.30469 18.3555 3.39919 19.4489 4.74999 19.4489H15.1384" stroke="#AAAAB1" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M8.41295 15.7829H17.5793C17.9004 15.7833 18.2185 15.7204 18.5153 15.5977C18.8121 15.4751 19.0818 15.295 19.3089 15.068C19.5361 14.841 19.7162 14.5714 19.839 14.2746C19.9618 13.9779 20.0248 13.6598 20.0246 13.3387V6.61657C20.0248 6.29541 19.9618 5.97736 19.839 5.68061C19.7162 5.38387 19.5361 5.11426 19.3089 4.88722C19.0818 4.66018 18.8121 4.48018 18.5153 4.35751C18.2185 4.23485 17.9004 4.17193 17.5793 4.17237H8.41295C8.09189 4.17208 7.77393 4.2351 7.47725 4.35783C7.18058 4.48056 6.91102 4.66059 6.684 4.88761C6.45697 5.11463 6.27695 5.38419 6.15422 5.68087C6.03149 5.97754 5.96846 6.29551 5.96875 6.61657V13.3376C5.96875 14.6884 7.06325 15.7829 8.41295 15.7829Z" stroke="#AAAAB1" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9.94085 9.36656C9.61691 9.36598 9.3064 9.23704 9.07734 9.00798C8.84828 8.77891 8.71933 8.46841 8.71875 8.14446C8.71875 7.47016 9.26765 6.92236 9.93975 6.92236C10.614 6.92236 11.163 7.47016 11.163 8.14336C11.163 8.81656 10.6141 9.36656 9.94085 9.36656Z" fill="#AAAAB1"/>
                </svg>
              }
              label="Creations"
              badge={activeGenerations > 0 ? activeGenerations : undefined}
              active={pathname === '/creations'}
              onClick={() => {
                if (!user) {
                  // Show auth modal for non-authenticated users with redirect path
                  if (onOpenAuthModal) {
                    onOpenAuthModal('/creations');
                  }
                } else {
                  // Navigate to creations for authenticated users
                  handleNavClick('/creations');
                }
              }}
            />

            <NavItem
              icon={
                <svg width="22" height="22" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-[22px] h-[22px]">
                  <path d="M3.46094 9.61035H18.8609V7.41035C18.8609 6.53514 18.5133 5.69577 17.8944 5.0769C17.2755 4.45803 16.4362 4.11035 15.5609 4.11035H6.76094C5.88572 4.11035 5.04636 4.45803 4.42749 5.0769C3.80862 5.69577 3.46094 6.53514 3.46094 7.41035V16.2104C3.46094 17.0856 3.80862 17.9249 4.42749 18.5438C5.04636 19.1627 5.88572 19.5104 6.76094 19.5104H8.96094V4.11035" stroke="#AAAAB1" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M15.5656 12.9106L16.3906 15.3856L18.8656 16.2106L16.3906 17.0356L15.5656 19.5106L14.7406 17.0356L12.2656 16.2106L14.7406 15.3856L15.5656 12.9106Z" fill="#AAAAB1" stroke="#AAAAB1" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              }
              label="Orders"
              active={pathname === '/orders'}
              onClick={() => {
                if (!user) {
                  // Show auth modal for non-authenticated users with redirect path
                  if (onOpenAuthModal) {
                    onOpenAuthModal('/orders');
                  }
                } else {
                  // Navigate to orders for authenticated users
                  handleNavClick('/orders');
                }
              }}
            />
            
            {/* Canvas - COMMENTED OUT */}
            {/* <NavItem
              icon={
                <svg width="22" height="22" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-[22px] h-[22px]">
                  <path d="M14.6016 6.31055V7.45675C14.6016 7.96275 15.0119 8.37305 15.5179 8.37305H16.6641M14.6016 6.31055V5.16435C14.6016 4.65835 15.0119 4.24805 15.5179 4.24805H17.8103C18.3163 4.24805 18.7266 4.65835 18.7266 5.16435V7.45675C18.7266 7.96275 18.3163 8.37305 17.8103 8.37305H16.6641M14.6016 6.31055H7.72656M16.6641 8.37305V10.2067M5.66406 8.37305V15.248M7.49776 17.3105V16.1643C7.49776 16.0439 7.47403 15.9247 7.42791 15.8134C7.38179 15.7022 7.3142 15.6011 7.229 15.516C7.14379 15.4309 7.04265 15.3635 6.93135 15.3175C6.82006 15.2715 6.70079 15.2479 6.58036 15.248H4.51786C4.27484 15.248 4.04178 15.3446 3.86994 15.5164C3.6981 15.6883 3.60156 15.9213 3.60156 16.1643V18.4567C3.60156 18.9627 4.01186 19.373 4.51786 19.373H6.58036C7.08636 19.373 7.49776 18.9627 7.49776 18.4567V17.3105ZM7.49776 17.3105H9.56026M4.51786 8.37305H6.81026C7.31626 8.37305 7.72656 7.96275 7.72656 7.45675V5.16435C7.72656 5.04402 7.70286 4.92486 7.65681 4.81369C7.61076 4.70252 7.54327 4.60151 7.45818 4.51643C7.3731 4.43134 7.27209 4.36384 7.16092 4.3178C7.04974 4.27175 6.93059 4.24805 6.81026 4.24805H4.51786C4.27484 4.24805 4.04178 4.34459 3.86994 4.51643C3.6981 4.68826 3.60156 4.92133 3.60156 5.16435V7.45675C3.60156 7.96275 4.01186 8.37305 4.51786 8.37305ZM12.0045 12.0503L18.2657 13.84C18.6848 13.9588 18.7464 14.5275 18.3625 14.7332L15.7115 16.161C15.6278 16.2063 15.5593 16.2751 15.5146 16.359L14.0868 19.01C14.0409 19.0949 13.9707 19.1641 13.8853 19.2089C13.7999 19.2536 13.7031 19.2719 13.6072 19.2614C13.5114 19.2509 13.4208 19.2121 13.3471 19.1499C13.2735 19.0877 13.22 19.0049 13.1936 18.9121L11.4039 12.6509C11.3798 12.5676 11.3785 12.4794 11.4002 12.3954C11.4218 12.3114 11.4656 12.2347 11.5269 12.1734C11.5882 12.1121 11.6649 12.0683 11.7489 12.0467C11.8329 12.025 11.9211 12.0263 12.0045 12.0503Z" stroke="#AAAAB1" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              }
              label="Canvas"
            /> */}
            
            {/* Batch - COMMENTED OUT */}
            {/* <NavItem
              icon={
                <svg width="22" height="22" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-[22px] h-[22px]">
                  <path d="M3.46094 9.61035H18.8609V7.41035C18.8609 6.53514 18.5133 5.69577 17.8944 5.0769C17.2755 4.45803 16.4362 4.11035 15.5609 4.11035H6.76094C5.88572 4.11035 5.04636 4.45803 4.42749 5.0769C3.80862 5.69577 3.46094 6.53514 3.46094 7.41035V16.2104C3.46094 17.0856 3.80862 17.9249 4.42749 18.5438C5.04636 19.1627 5.88572 19.5104 6.76094 19.5104H8.96094V4.11035" stroke="#AAAAB1" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M15.5656 12.9106L16.3906 15.3856L18.8656 16.2106L16.3906 17.0356L15.5656 19.5106L14.7406 17.0356L12.2656 16.2106L14.7406 15.3856L15.5656 12.9106Z" fill="#AAAAB1" stroke="#AAAAB1" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              }
              label="Batch"
            /> */}
            
            {/* Character - COMMENTED OUT */}
            {/* <NavItem
              icon={
                <svg width="22" height="22" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-[22px] h-[22px]">
                  <path d="M7.58594 12.3604C7.95061 12.3604 8.30035 12.2155 8.55821 11.9576C8.81607 11.6998 8.96094 11.35 8.96094 10.9854C8.96094 10.6207 8.81607 10.2709 8.55821 10.0131C8.30035 9.75522 7.95061 9.61035 7.58594 9.61035C7.22126 9.61035 6.87153 9.75522 6.61367 10.0131C6.3558 10.2709 6.21094 10.6207 6.21094 10.9854C6.21094 11.35 6.3558 11.6998 6.61367 11.9576C6.87153 12.2155 7.22126 12.3604 7.58594 12.3604ZM14.7359 12.3604C15.1006 12.3604 15.4503 12.2155 15.7082 11.9576C15.9661 11.6998 16.1109 11.35 16.1109 10.9854C16.1109 10.6207 15.9661 10.2709 15.7082 10.0131C15.4503 9.75522 15.1006 9.61035 14.7359 9.61035C14.3713 9.61035 14.0215 9.75522 13.7637 10.0131C13.5058 10.2709 13.3609 10.6207 13.3609 10.9854C13.3609 11.35 13.5058 11.6998 13.7637 11.9576C14.0215 12.2155 14.3713 12.3604 14.7359 12.3604ZM9.69464 13.2767H12.6283C13.0331 13.2767 13.362 13.6056 13.362 14.0104C13.362 14.5938 13.1303 15.1534 12.7177 15.566C12.3051 15.9786 11.7455 16.2104 11.162 16.2104C10.5786 16.2104 10.019 15.9786 9.6064 15.566C9.19382 15.1534 8.96204 14.5938 8.96204 14.0104C8.96204 13.6056 9.29094 13.2767 9.69574 13.2767H9.69464Z" fill="#AAAAB1"/>
                  <path d="M3.46094 8.51035V7.41035C3.46094 6.53514 3.80862 5.69577 4.42749 5.0769C5.04636 4.45803 5.88572 4.11035 6.76094 4.11035H7.86094M7.86094 19.5104H6.76094C5.88572 19.5104 5.04636 19.1627 4.42749 18.5438C3.80862 17.9249 3.46094 17.0856 3.46094 16.2104V15.1104M18.8609 15.1104V16.2104C18.8609 17.0856 18.5133 17.9249 17.8944 18.5438C17.2755 19.1627 16.4362 19.5104 15.5609 19.5104H14.4609M14.4609 4.11035H15.5609C16.4362 4.11035 17.2755 4.45803 17.8944 5.0769C18.5133 5.69577 18.8609 6.53514 18.8609 7.41035V8.51035" stroke="#AAAAB1" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              }
              label="Character"
            /> */}
            
            {/* Cart Button - Always visible */}
            <div className="flex pt-1 flex-col items-start">
              <div className="flex w-16 h-16 flex-col justify-center items-center gap-[-2px] rounded hover:bg-white/5 transition-colors relative">
                <div className="flex p-2 justify-center items-center rounded-md">
                  <div className="flex flex-col items-start">
                    <CartButton 
                      onCartClick={() => {
                        if (!user) {
                          // Show auth modal for non-authenticated users with redirect path
                          if (onOpenAuthModal) {
                            onOpenAuthModal('/cart');
                          }
                        } else {
                          // Navigate to cart for authenticated users
                          handleNavClick('/cart');
                        }
                      }}
                    />
                  </div>
                </div>
                <div className="flex flex-col items-start">
                  <div className="flex flex-col items-center">
                    <span className="text-gray-text text-center text-[11px] font-semibold leading-5 tracking-[-0.55px]">
                      Cart
                    </span>
                  </div>
                </div>
              </div>
            </div>
            

          </div>
          
          <div className="flex-1 self-stretch" />
          
          {/* Bottom Section */}
          <div className="flex pb-2 flex-col justify-center items-center self-stretch">
            {/* Theme Toggle - Temporarily disabled */}
            {/* <div className="flex items-center justify-center mb-2">
              <ThemeToggle 
                variant="icon" 
                showLabel={false}
                className="w-11 h-11 flex items-center justify-center rounded hover:bg-gray-border/20 transition-colors"
              />
            </div> */}
            
            {/* Notification Icon */}
            <div className="flex items-start">
              <div className="flex pt-1 flex-col items-start self-stretch">
                <button className="flex w-11 h-11 flex-col justify-center items-center rounded">
                  <div className="flex flex-col items-start">
                    <svg width="22" height="22" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-[22px] h-[22px]">
                      <path d="M18.8609 15.6604C18.2775 15.6604 17.7179 15.4286 17.3053 15.016C16.8927 14.6034 16.6609 14.0438 16.6609 13.4604V9.61035C16.6609 8.15166 16.0815 6.75271 15.05 5.72126C14.0186 4.68981 12.6196 4.11035 11.1609 4.11035C9.70225 4.11035 8.3033 4.68981 7.27185 5.72126C6.2404 6.75271 5.66094 8.15166 5.66094 9.61035V13.4604C5.66094 14.0438 5.42915 14.6034 5.01657 15.016C4.60399 15.4286 4.04441 15.6604 3.46094 15.6604H18.8609Z" stroke="#AAAAB1" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M8.46875 18.4106C8.59498 19.0323 8.93225 19.5912 9.42341 19.9927C9.91456 20.3941 10.5294 20.6134 11.1637 20.6134C11.7981 20.6134 12.4129 20.3941 12.9041 19.9927C13.3952 19.5912 13.7325 19.0323 13.8587 18.4106H8.46875Z" fill="#AAAAB1"/>
                    </svg>
                  </div>
                </button>
              </div>
              
              {/* Profile */}
              <div className="flex pt-1 flex-col items-start relative">
                <button 
                  ref={profileButtonRef}
                  onClick={() => setProfilePopupOpen(!profilePopupOpen)}
                  className="flex w-11 h-11 flex-col justify-center items-center rounded hover:bg-gray-border/20 transition-colors"
                  title={user ? `${profile?.username || user.email}` : 'Not signed in'}
                >
                  <SidebarAvatar user={user} profile={profile} size="sm" />
                </button>
                
                {/* Profile Popup */}
                <ProfilePopup
                  isOpen={profilePopupOpen}
                  onClose={() => setProfilePopupOpen(false)}
                  triggerRef={profileButtonRef}
                />
              </div>
            </div>
            
            {/* Credits/Upgrade Button */}
            <div className="flex pt-2 flex-col items-start">
              {user ? (
                <button className="flex min-w-16 px-2 py-1.5 flex-col justify-center items-center gap-1 rounded-md bg-pink-accent hover:bg-pink-accent/90 transition-colors">
                  <div className="flex pr-2.5 justify-center items-center gap-0.5">
                    <svg width="16" height="16" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4">
                      <path fillRule="evenodd" clipRule="evenodd" d="M9.41518 2.17179C9.26265 2.12583 9.09868 2.13624 8.95318 2.20112C8.77918 2.27646 8.60118 2.42779 8.42652 2.68979L6.98052 4.83512C6.74518 5.18712 6.40252 5.68846 6.10185 6.12846L4.33318 8.68846V8.68979C4.15985 8.94312 4.09318 9.16979 4.08652 9.36179C4.07985 9.55379 4.13185 9.70179 4.18318 9.79846C4.23585 9.89779 4.33118 10.0271 4.49985 10.1318C4.66852 10.2365 4.90185 10.3105 5.22252 10.3105H7.49518V14.4705C7.49518 14.5611 7.49518 14.7591 7.55185 14.9531C7.60985 15.1498 7.73518 15.3685 8.00185 15.4498C8.06038 15.4678 8.12127 15.477 8.18252 15.4771C8.39985 15.4771 8.57585 15.3605 8.70118 15.2425C8.82652 15.1238 8.91652 14.9891 8.96185 14.9211L8.96318 14.9198L10.3419 12.7665L10.4339 12.6291C10.7705 12.1258 11.2559 11.3998 11.5659 10.9451L12.9859 8.84112C13.2479 8.45446 13.3139 8.02112 13.1238 7.66246C12.9372 7.30912 12.5512 7.12246 12.0952 7.12246H9.95318V3.15846C9.95318 2.84179 9.88985 2.61446 9.78652 2.45446C9.70116 2.31786 9.56888 2.21711 9.41452 2.17112L9.41518 2.17179Z" fill="#FF8FB4"/>
                    </svg>
                    <div className="flex flex-col items-center">
                      <span className="text-pink-light text-center text-sm font-semibold leading-5 tracking-[-0.48px]">
                        {profile?.credits || 0}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-pink-light text-center text-xs font-semibold leading-[21px] tracking-[-0.48px]">
                      Credits
                    </span>
                  </div>
                </button>
              ) : (
                <button 
                  onClick={() => {
                    if (onOpenAuthModal) {
                      onOpenAuthModal();
                    }
                  }}
                  className="flex min-w-16 px-2 py-1.5 flex-col justify-center items-center gap-1 rounded-md bg-gray-600 hover:bg-gray-500 transition-colors"
                >
                  <div className="flex pr-2.5 justify-center items-center gap-0.5">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4">
                      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <polyline points="10,17 15,12 10,7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <line x1="15" y1="12" x2="3" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-gray-300 text-center text-xs font-semibold leading-[21px] tracking-[-0.48px]">
                      Sign In
                    </span>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
