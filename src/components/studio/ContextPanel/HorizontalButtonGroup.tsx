/**
 * Horizontal Button Group Component
 * Pill-shaped buttons for options like Aspect Ratio, Finish, etc.
 */

'use client';

import { useState } from 'react';

interface HorizontalButtonGroupProps {
  options: string[];
  selectedOption: string;
  onChange: (option: string) => void;
  disabled?: boolean;
  displayNames?: Record<string, string>;
}

export function HorizontalButtonGroup({ 
  options, 
  selectedOption, 
  onChange, 
  disabled = false,
  displayNames 
}: HorizontalButtonGroupProps) {
  const [hoveredOption, setHoveredOption] = useState<string | null>(null);

  const getDisplayName = (option: string) => {
    if (displayNames && option in displayNames) {
      return displayNames[option];
    }
    // Capitalize first letter
    return option.charAt(0).toUpperCase() + option.slice(1);
  };

  return (
    <div className="inline-flex items-center bg-gray-100 rounded-full p-1 gap-1">
      {options.map((option) => {
        const isSelected = selectedOption.toLowerCase() === option.toLowerCase();
        const isHovered = hoveredOption === option;

        return (
          <button
            key={option}
            onClick={() => !disabled && onChange(option)}
            disabled={disabled}
            onMouseEnter={() => setHoveredOption(option)}
            onMouseLeave={() => setHoveredOption(null)}
            className={`
              relative px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
              ${isSelected 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              ${!isSelected && isHovered ? 'bg-white/50' : ''}
            `}
            aria-label={getDisplayName(option)}
          >
            {/* Checkmark for selected option */}
            {isSelected && (
              <span className="inline-flex items-center mr-1">
                <svg 
                  className="w-4 h-4 text-gray-900" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2.5} 
                    d="M5 13l4 4L19 7" 
                  />
                </svg>
              </span>
            )}
            {getDisplayName(option)}
          </button>
        );
      })}
    </div>
  );
}


