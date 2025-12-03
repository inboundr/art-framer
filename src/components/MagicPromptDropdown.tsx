'use client';

import React, { useState, useRef, useEffect } from 'react';

interface MagicPromptDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (option: string) => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  currentValue?: string;
}

const magicPromptOptions = [
  { id: 'auto', name: 'Auto', selected: false },
  { id: 'on', name: 'On', selected: true },
  { id: 'off', name: 'Off', selected: false },
];

export function MagicPromptDropdown({ 
  isOpen, 
  onClose, 
  onSelect, 
  triggerRef,
  currentValue
}: MagicPromptDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [selectedOption, setSelectedOption] = useState(currentValue || 'on');

  // Update local state when currentValue prop changes
  useEffect(() => {
    if (currentValue) {
      setSelectedOption(currentValue);
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

  const handleOptionSelect = (option: string) => {
    setSelectedOption(option);
    onSelect(option);
    onClose();
  };

  return (
    <div 
      ref={dropdownRef}
      className="absolute top-full mt-2 left-0 w-80 bg-white border border-gray-300 rounded-lg shadow-lg p-4 z-50"
      onClick={(e) => e.stopPropagation()}
      style={{ position: 'absolute', zIndex: 1000 }}
    >
      {/* Header with Help Tooltip */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-gray-900 text-sm font-medium">Magic Prompt</h3>
          <div className="relative group">
            <svg width="16" height="16" fill="none" viewBox="0 0 16 16" className="text-gray-600 cursor-help">
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M8 12V8M8 6H8.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-xs text-gray-900 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              Magic Prompt enhances your initial prompt to improve image variety and richness. It can also translate to English.
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-100 border-r border-b border-gray-300 rotate-45"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Options */}
      <div className="space-y-2">
        {magicPromptOptions.map((option) => (
          <button
            key={option.id}
            onClick={() => handleOptionSelect(option.id)}
            className={`w-full text-left p-3 rounded transition-colors ${
              selectedOption === option.id
                ? 'bg-gray-light text-dark'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-border/20'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{option.name}</span>
              {selectedOption === option.id && (
                <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
                  <path d="M13.5 4.5L6 12L2.5 8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
