'use client';

import React, { useState, useRef, useEffect } from 'react';

interface ColorPalette {
  id: string;
  name: string;
  colors: string[];
}

interface ColorDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (option: any) => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  selectedValue?: string;
}

const predefinedPalettes: ColorPalette[] = [
  { id: 'auto', name: 'Auto', colors: [] },
  { 
    id: 'ember', 
    name: 'Ember', 
    colors: ['#FF4444', '#2A2A2A', '#D2691E', '#FF6347', '#FF1493'] 
  },
  { 
    id: 'fresh', 
    name: 'Fresh', 
    colors: ['#FFB6C1', '#FF7F50', '#00BFFF', '#98FB98', '#87CEEB'] 
  },
  { 
    id: 'jungle', 
    name: 'Jungle', 
    colors: ['#006400', '#228B22', '#2E8B57', '#32CD32', '#013220'] 
  },
  { 
    id: 'magic', 
    name: 'Magic', 
    colors: ['#FFC0CB', '#E6E6FA', '#40E0D0', '#000080', '#FF69B4'] 
  },
  { 
    id: 'melon', 
    name: 'Melon', 
    colors: ['#FF6347', '#32CD32', '#90EE90', '#FFB6C1', '#8B0000'] 
  },
  { 
    id: 'mosaic', 
    name: 'Mosaic', 
    colors: ['#FF69B4', '#000080', '#008080', '#FFD700', '#FF4500'] 
  },
  { 
    id: 'pastel', 
    name: 'Pastel', 
    colors: ['#FFE4E1', '#E0FFFF', '#F5F5DC', '#F0FFF0', '#E6E6FA'] 
  },
  { 
    id: 'ultramarine', 
    name: 'Ultramarine', 
    colors: ['#000080', '#191970', '#00BFFF', '#87CEEB', '#4169E1'] 
  },
];

export function ColorDropdown({ 
  isOpen, 
  onClose, 
  onSelect, 
  triggerRef,
  selectedValue = 'auto'
}: ColorDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [selectedPalette, setSelectedPalette] = useState(selectedValue);
  const [customPaletteCode, setCustomPaletteCode] = useState('');

  // Update selectedPalette when selectedValue prop changes
  useEffect(() => {
    setSelectedPalette(selectedValue);
  }, [selectedValue]);

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

  const handlePaletteSelect = (paletteId: string) => {
    setSelectedPalette(paletteId);
    onSelect({ type: 'palette', value: paletteId });
  };

  const handleCustomPaletteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomPaletteCode(e.target.value);
    onSelect({ type: 'customPalette', value: e.target.value });
  };

  const handleAddCustomPalette = () => {
    onSelect({ type: 'addCustom', value: 'add' });
  };

  return (
    <div 
      ref={dropdownRef}
      className="absolute top-full mt-2 left-0 w-80 bg-dark-secondary border border-gray-border rounded-lg shadow-lg p-4 z-50"
      onClick={(e) => e.stopPropagation()}
      style={{ position: 'absolute', zIndex: 1000 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-gray-light text-sm font-medium">Color palette</h3>
      </div>

      {/* Predefined Palettes */}
      <div className="space-y-3 mb-6">
        {predefinedPalettes.map((palette) => (
          <div
            key={palette.id}
            onClick={() => handlePaletteSelect(palette.id)}
            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
              selectedPalette === palette.id
                ? 'bg-gray-light text-dark'
                : 'text-gray-light hover:bg-gray-border/20'
            }`}
          >
            <span className="text-sm font-medium">{palette.name}</span>
            {palette.colors.length > 0 && (
              <div className="flex gap-1">
                {palette.colors.map((color, index) => (
                  <div
                    key={index}
                    className="w-4 h-4 rounded border border-gray-border"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Custom Palette Section */}
      <div className="border-t border-gray-border pt-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-gray-light text-sm font-medium">Custom</span>
            <svg 
              width="12" 
              height="12" 
              viewBox="0 0 13 13" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
              className="w-3 h-3"
            >
              <path 
                d="M8.16406 4.81055V3.81055C8.16406 3.28011 7.95335 2.77141 7.57828 2.39633C7.2032 2.02126 6.6945 1.81055 6.16406 1.81055C5.63363 1.81055 5.12492 2.02126 4.74985 2.39633C4.37478 2.77141 4.16406 3.28011 4.16406 3.81055V4.81055H3.66406C3.26624 4.81055 2.88471 4.96858 2.6034 5.24989C2.3221 5.53119 2.16406 5.91272 2.16406 6.31055V10.3105C2.16406 10.7084 2.3221 11.0899 2.6034 11.3712C2.88471 11.6525 3.26624 11.8105 3.66406 11.8105H8.66406C9.06189 11.8105 9.44342 11.6525 9.72472 11.3712C10.006 11.0899 10.1641 10.7084 10.1641 10.3105V6.31055C10.1641 5.91272 10.006 5.53119 9.72472 5.24989C9.44342 4.96858 9.06189 4.81055 8.66406 4.81055H8.16406ZM6.16406 2.81055C6.42928 2.81055 6.68363 2.9159 6.87117 3.10344C7.05871 3.29098 7.16406 3.54533 7.16406 3.81055V4.81055H5.16406V3.81055C5.16406 3.54533 5.26942 3.29098 5.45696 3.10344C5.64449 2.9159 5.89885 2.81055 6.16406 2.81055Z" 
                fill="currentColor"
              />
            </svg>
          </div>
          <button
            onClick={handleAddCustomPalette}
            className="flex items-center justify-center w-6 h-6 rounded border border-gray-border bg-dark-tertiary text-gray-light hover:bg-gray-border/20 transition-colors"
          >
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24">
              <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Custom Palette Input */}
        <input
          type="text"
          value={customPaletteCode}
          onChange={handleCustomPaletteChange}
          placeholder="Enter custom color palette..."
          className="w-full p-3 rounded-lg border border-gray-border bg-dark-tertiary text-gray-light placeholder:text-gray-text focus:outline-none focus:border-gray-light transition-colors"
        />
      </div>
    </div>
  );
}
