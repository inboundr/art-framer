import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface SidebarAvatarProps {
  user: any;
  profile?: any;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function SidebarAvatar({ user, profile, size = 'md', className = '' }: SidebarAvatarProps) {
  if (!user) {
    return (
      <div className={`flex items-center justify-center rounded-full bg-gray-600 text-gray-300 ${getSizeClasses(size)} ${className}`}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    );
  }

  const username = profile?.username || user.email?.split('@')[0] || 'U';
  const firstLetter = username.charAt(0).toUpperCase();
  const avatarUrl = profile?.avatar_url;

  return (
    <Avatar className={`${getSizeClasses(size)} ${className}`}>
      {avatarUrl ? (
        <AvatarImage src={avatarUrl} alt={username} />
      ) : null}
      <AvatarFallback className="bg-gradient-to-br from-pink-500 to-purple-600 text-white font-semibold">
        {firstLetter}
      </AvatarFallback>
    </Avatar>
  );
}

function getSizeClasses(size: 'sm' | 'md' | 'lg'): string {
  switch (size) {
    case 'sm':
      return 'h-8 w-8 text-sm';
    case 'md':
      return 'h-10 w-10 text-base';
    case 'lg':
      return 'h-12 w-12 text-lg';
    default:
      return 'h-10 w-10 text-base';
  }
}
