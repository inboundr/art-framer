'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { SidebarAvatar } from './SidebarAvatar';

interface ProfilePopupProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}

export function ProfilePopup({ isOpen, onClose, triggerRef }: ProfilePopupProps) {
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const popupRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current && 
        !popupRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, triggerRef]);

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const popupWidth = 320; // w-80 = 320px
      const popupHeight = 300; // approximate height
      const spacing = 8; // spacing between button and popup
      
      // Calculate position - align popup to the right edge of the button
      let top = triggerRect.bottom + spacing;
      let left = triggerRect.right - popupWidth; // Align right edge of popup with right edge of button
      
      // If popup would go off bottom of screen, position it above the button
      if (top + popupHeight > window.innerHeight - 16) {
        top = triggerRect.top - popupHeight - spacing;
      }
      
      // If popup would go off left of screen, align it to the left edge of the button
      if (left < 16) {
        left = triggerRect.left;
      }
      
      // If popup would go off right of screen, align it to the right edge with margin
      if (left + popupWidth > window.innerWidth - 16) {
        left = window.innerWidth - popupWidth - 16;
      }
      
      setPosition({ top, left });
    }
  }, [isOpen, triggerRef]);

  if (!isOpen || !user) return null;

  // Simple user status - no plans needed

  const handleLogout = async () => {
    try {
      console.log('🚪 ProfilePopup logout initiated...');
      await signOut();
      console.log('✅ ProfilePopup logout successful');
      onClose();
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
      onClose();
      router.push('/');
    }
  };

  return (
    <div 
      ref={popupRef}
      className="fixed w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      {/* User Info Section */}
      <div className="p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-shrink-0">
            <SidebarAvatar user={user} profile={profile} size="lg" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {profile?.username || profile?.full_name || user.email?.split('@')[0] || 'User'}
            </p>
            <p className="text-sm text-gray-500 truncate">
              {user.email}
            </p>
          </div>
        </div>

      </div>

      {/* Menu Items */}
      <div className="border-t border-gray-100">
        <button 
          onClick={() => {
            router.push('/faq');
            onClose();
          }}
          className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Help & documentation
        </button>
        <button 
          onClick={handleLogout}
          className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Log out
        </button>
      </div>


      {/* Footer */}
      <div className="border-t border-gray-100 p-4">
        <div className="flex items-center justify-between">
          <div className="flex gap-4">
            <button className="text-sm text-gray-500 hover:text-gray-700">Terms</button>
            <button 
              onClick={() => {
                router.push('/privacy');
                onClose();
              }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Privacy
            </button>
          </div>
          
          <div className="flex gap-2">
            {/* Discord */}
            <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M13.545 2.77a13.195 13.195 0 00-3.257-1.01.05.05 0 00-.052.025c-.141.25-.297.577-.406.833a12.18 12.18 0 00-3.658 0 8.426 8.426 0 00-.412-.833.051.051 0 00-.052-.025 13.158 13.158 0 00-3.257 1.01.047.047 0 00-.021.019C.356 5.888-.213 8.91.066 11.896c.001.014.01.028.02.037a13.27 13.27 0 003.996 2.02.052.052 0 00.056-.019 9.48 9.48 0 00.818-1.33.05.05 0 00-.028-.07 8.735 8.735 0 01-1.248-.595.051.051 0 01-.005-.085c.084-.062.168-.128.248-.194a.05.05 0 01.051-.007c2.619 1.196 5.454 1.196 8.041 0a.05.05 0 01.053.006c.08.067.164.133.248.195a.051.051 0 01-.004.086c-.399.232-.813.43-1.249.594a.051.051 0 00-.027.07c.24.466.514.91.817 1.33a.05.05 0 00.056.019 13.227 13.227 0 004.001-2.02.051.051 0 00.021-.037c.334-3.45-.559-6.449-2.365-9.107a.04.04 0 00-.021-.019zm-8.198 7.308c-.789 0-1.438-.724-1.438-1.613 0-.888.637-1.612 1.438-1.612.807 0 1.45.73 1.438 1.612 0 .89-.637 1.613-1.438 1.613zm5.316 0c-.788 0-1.438-.724-1.438-1.613 0-.888.637-1.612 1.438-1.612.807 0 1.45.73 1.438 1.612 0 .89-.63 1.613-1.438 1.613z"/>
              </svg>
            </button>
            
            {/* Twitter/X */}
            <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 14">
                <path d="M12.163.5h2.205L9.55 6.007l5.668 7.493H10.78L7.304 8.955 3.327 13.5H1.12l5.153-5.89L.836.5h4.55L8.53 4.654 12.163.5zm-.774 11.68h1.222L4.723 1.75H3.41l7.978 10.43z"/>
              </svg>
            </button>
            
            {/* YouTube */}
            <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
                <path d="M19.8 6s-.195-1.379-.796-1.984c-.762-.797-1.613-.801-2.004-.848-2.797-.203-6.996-.203-6.996-.203h-.008s-4.2 0-6.996.203c-.39.047-1.242.05-2.004.848C.395 4.62.203 6 .203 6S0 7.621 0 9.238v1.516c0 1.617.2 3.238.2 3.238s.195 1.38.792 1.985c.762.796 1.762.77 2.207.855 1.602.152 6.801.2 6.801.2s4.203-.009 7-.208c.39-.047 1.242-.05 2.004-.847.601-.606.797-1.985.797-1.985S20 12.375 20 10.754V9.238C20 7.621 19.8 6 19.8 6zM7.935 12.594V6.973l5.402 2.82-5.402 2.8z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
