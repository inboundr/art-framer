'use client';

import React, { useState, useRef, useEffect } from 'react';

interface StyleOption {
  id: string;
  name: string;
  icon: string;
  selected?: boolean;
}

interface StyleDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (option: { value: string; label: string }) => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  currentValue?: string;
}

const predefinedStyles: StyleOption[] = [
  { id: 'auto', name: 'Auto', icon: 'shuffle', selected: true },
  { id: 'random', name: 'Random', icon: 'microchip', selected: false },
  { id: 'general', name: 'General', icon: 'bubbles', selected: false },
  { id: 'realistic', name: 'Realistic', icon: 'camera', selected: false },
  { id: 'design', name: 'Design', icon: 'pen', selected: false },
];

export function StyleDropdown({ 
  isOpen, 
  onClose, 
  onSelect, 
  triggerRef,
  currentValue
}: StyleDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [selectedStyle, setSelectedStyle] = useState(currentValue || 'auto');
  const [styleCode, setStyleCode] = useState('');

  // Update local state when currentValue prop changes
  useEffect(() => {
    if (currentValue) {
      setSelectedStyle(currentValue);
    }
  }, [currentValue]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
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

  if (!isOpen) {
    return null;
  }

  const handleStyleSelect = (styleId: string) => {
    setSelectedStyle(styleId);
    const style = predefinedStyles.find(s => s.id === styleId);
    onSelect({ value: styleId, label: style?.name || styleId });
  };

  const handleReferenceSelect = () => {
    onSelect({ value: 'reference', label: 'Reference Style' });
  };

  const handleStyleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStyleCode(e.target.value);
    onSelect({ value: e.target.value, label: 'Custom Style Code' });
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'shuffle':
        return (
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
            <path d="M16 3H21V8M4 20L21 3M21 16V21H16M15 15L21 21M4 4L9 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case 'microchip':
        return (
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
            <path d="M9 3H5A2 2 0 0 0 3 5V9M21 9V5A2 2 0 0 0 19 3H15M9 21H5A2 2 0 0 1 3 19V15M21 15V19A2 2 0 0 1 19 21H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case 'bubbles':
        return (
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
            <path d="M8 12H8.01M12 12H12.01M16 12H16.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case 'camera':
        return (
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
            <path d="M23 19C23 19.5304 22.7893 20.0391 22.4142 20.4142C22.0391 20.7893 21.5304 21 21 21H3C2.46957 21 1.96086 20.7893 1.58579 20.4142C1.21071 20.0391 1 19.5304 1 19V8C1 7.46957 1.21071 6.96086 1.58579 6.58579C1.96086 6.21071 2.46957 6 3 6H7L9 3H15L17 6H21C21.5304 6 22.0391 6.21071 22.4142 6.58579C22.7893 6.96086 23 7.46957 23 8V19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 17C14.2091 17 16 15.2091 16 13C16 10.7909 14.2091 9 12 9C9.79086 9 8 10.7909 8 13C8 15.2091 9.79086 17 12 17Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case 'pen':
        return (
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
            <path d="M17 3C17.2626 2.73744 17.5744 2.52901 17.9176 2.38687C18.2608 2.24473 18.6286 2.17157 19 2.17157C19.3714 2.17157 19.7392 2.24473 20.0824 2.38687C20.4256 2.52901 20.7374 2.73744 21 3C21.2626 3.26256 21.471 3.57444 21.6131 3.9176C21.7553 4.26077 21.8284 4.62856 21.8284 5C21.8284 5.37144 21.7553 5.73923 21.6131 6.0824C21.471 6.42556 21.2626 6.73744 21 7L7.5 20.5L2 22L3.5 16.5L17 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div 
      ref={dropdownRef}
      className="absolute top-full mt-2 left-0 w-80 bg-white border border-gray-300 rounded-lg shadow-lg p-4 z-50"
      onClick={(e) => e.stopPropagation()}
      style={{ position: 'absolute', zIndex: 1000 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-gray-900 text-sm font-medium">Style</h3>
      </div>

      {/* Predefined Styles Grid */}
      <div className="grid grid-cols-5 gap-2 mb-4">
        {predefinedStyles.map((style) => (
          <button
            key={style.id}
            onClick={() => handleStyleSelect(style.id)}
            className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-colors ${
              selectedStyle === style.id
                ? 'bg-gray-light text-dark border-gray-light'
                : 'bg-gray-100 text-gray-900 border-gray-300 hover:bg-gray-border/20'
            }`}
          >
            <div className="mb-2">
              {getIcon(style.icon)}
            </div>
            <span className="text-xs font-medium">{style.name}</span>
          </button>
        ))}
      </div>

      {/* Separator */}
      <div className="relative mb-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-white px-2 text-gray-600">or</span>
        </div>
      </div>

      {/* Reference Option */}
      <div className="mb-4">
        <button
          onClick={handleReferenceSelect}
          className="w-full flex items-center justify-center p-3 rounded-lg border border-gray-300 bg-gray-100 text-gray-900 hover:bg-gray-border/20 transition-colors"
        >
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24" className="mr-2">
            <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="font-medium">Reference</span>
        </button>
      </div>

      {/* Separator */}
      <div className="relative mb-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-white px-2 text-gray-600">or</span>
        </div>
      </div>

      {/* Style Code Input */}
      <div>
        <input
          type="text"
          value={styleCode}
          onChange={handleStyleCodeChange}
          placeholder="Enter style code..."
          className="w-full p-3 rounded-lg border border-gray-300 bg-gray-100 text-gray-900 placeholder:text-gray-600 focus:outline-none focus:border-gray-light transition-colors"
        />
        <div className="mt-2 text-xs text-gray-600">Style code</div>
      </div>
    </div>
  );
}
