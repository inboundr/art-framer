'use client';

import React, { useRef, useEffect } from 'react';
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

  if (!isOpen || !user) return null;

  const creditsPercentage = Math.min(((profile?.credits || 0) / 100) * 100, 100);

  const handleLogout = async () => {
    try {
      console.log('🚪 ProfilePopup logout initiated...');
      const { error } = await signOut();
      if (error) {
        console.error('Logout error:', error);
      } else {
        console.log('✅ ProfilePopup logout successful');
      }
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
      className="fixed left-20 bottom-4 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden"
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

        {/* Credits Section */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              {profile?.is_premium ? 'Premium' : 'Free'}
            </span>
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="16" 
                height="16" 
                fill="currentColor" 
                viewBox="0 0 24 24"
                className="text-yellow-500"
              >
                <path 
                  fillRule="evenodd" 
                  d="M13.143 2.042a.996.996 0 00-.693.044c-.261.113-.528.34-.79.733L9.491 6.037c-.353.528-.867 1.28-1.318 1.94l-2.653 3.84v.002c-.26.38-.36.72-.37 1.008-.01.288.068.51.145.655.079.149.222.343.475.5.253.157.603.268 1.084.268h3.409v6.24c0 .136 0 .433.085.724.087.295.275.623.675.745a.926.926 0 00.271.041c.326 0 .59-.175.778-.352.188-.178.323-.38.391-.482l.002-.002 2.068-3.23.138-.206c.505-.755 1.233-1.844 1.698-2.526l2.13-3.156c.393-.58.492-1.23.207-1.768-.28-.53-.859-.81-1.543-.81H13.95V3.522c0-.475-.095-.816-.25-1.056a.992.992 0 00-.558-.425z" 
                  clipRule="evenodd"
                />
              </svg>
              <span className="font-semibold">{profile?.credits || 0}</span>
              <span>credits left</span>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${creditsPercentage}%` }}
            />
          </div>
        </div>

        {/* Upgrade Button */}
        <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="20" 
            height="20" 
            fill="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              fillRule="evenodd" 
              d="M13.143 2.042a.996.996 0 00-.693.044c-.261.113-.528.34-.79.733L9.491 6.037c-.353.528-.867 1.28-1.318 1.94l-2.653 3.84v.002c-.26.38-.36.72-.37 1.008-.01.288.068.51.145.655.079.149.222.343.475.5.253.157.603.268 1.084.268h3.409v6.24c0 .136 0 .433.085.724.087.295.275.623.675.745a.926.926 0 00.271.041c.326 0 .59-.175.778-.352.188-.178.323-.38.391-.482l.002-.002 2.068-3.23.138-.206c.505-.755 1.233-1.844 1.698-2.526l2.13-3.156c.393-.58.492-1.23.207-1.768-.28-.53-.859-.81-1.543-.81H13.95V3.522c0-.475-.095-.816-.25-1.056a.992.992 0 00-.558-.425z" 
              clipRule="evenodd"
            />
          </svg>
          Upgrade plan
        </button>
      </div>

      {/* Menu Items */}
      <div className="border-t border-gray-100">
        <button className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors">
          View profile
        </button>
        <button 
          onClick={() => {
            router.push('/faq');
            onClose();
          }}
          className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Help & documentation
        </button>
        <button className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors">
          Manage muted users
        </button>
        <button className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors">
          Delete account
        </button>
        <button className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors">
          API
        </button>
        <button 
          onClick={handleLogout}
          className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Log out
        </button>
      </div>

      {/* Theme Toggle */}
      <div className="border-t border-gray-100 p-4">
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          <button className="flex-1 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 3a.5.5 0 01.5.5v1a.5.5 0 01-1 0v-1a.5.5 0 01.5-.5zm0 10a3 3 0 100-6 3 3 0 000 6zm0-1a2 2 0 110-4 2 2 0 010 4zm6.5-1.5a.5.5 0 000-1h-1a.5.5 0 000 1h1zM10 15a.5.5 0 01.5.5v1a.5.5 0 01-1 0v-1a.5.5 0 01.5-.5zM5 10.5a.5.5 0 000-1H4a.5.5 0 000 1h1zm.646-5.354a.5.5 0 01.708 0l1 1a.5.5 0 11-.708.708l-1-1a.5.5 0 010-.708zm.708 9.708a.5.5 0 11-.708-.707l1-1a.5.5 0 01.708.707l-1 1zm9-9.708a.5.5 0 00-.708 0l-1 1a.5.5 0 00.708.708l1-1a.5.5 0 000-.708zm-.708 9.708a.5.5 0 00.708-.707l-1-1a.5.5 0 00-.708.707l1 1z"/>
            </svg>
            Light
          </button>
          <button className="flex-1 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.184 5.015a5 5 0 11-4.586 7.712c1.403-.38 3.316-1.302 4.16-3.551.552-1.474.584-2.938.426-4.16zM15.79 10a6 6 0 00-6.211-5.996.5.5 0 00-.474.592c.229 1.214.279 2.728-.284 4.228-.8 2.134-2.802 2.84-4.077 3.071a.5.5 0 00-.361.71A6 6 0 0015.79 10z"/>
            </svg>
            Dark
          </button>
          <button className="flex-1 px-3 py-2 text-sm bg-gray-900 text-white flex items-center justify-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
              <path d="M7.167 6a1.5 1.5 0 00-1.5 1.5v4a1.5 1.5 0 001.5 1.5h7a1.5 1.5 0 001.5-1.5v-4a1.5 1.5 0 00-1.5-1.5h-7zm-.5 1.5a.5.5 0 01.5-.5h7a.5.5 0 01.5.5v4a.5.5 0 01-.5.5h-7a.5.5 0 01-.5-.5v-4zm-1.5 6.5a.5.5 0 000 1h11a.5.5 0 000-1h-11z"/>
            </svg>
            Auto
          </button>
        </div>
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
