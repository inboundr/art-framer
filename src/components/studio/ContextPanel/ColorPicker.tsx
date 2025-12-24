/**
 * Color Picker Component
 * Horizontal color swatches with hover tooltips
 */

'use client';

import { useState } from 'react';

interface ColorPickerProps {
  colors: string[];
  selectedColor: string;
  onChange: (color: string) => void;
  disabled?: boolean;
}

// Color to hex/display mapping
const colorMap: Record<string, { hex: string; name: string }> = {
  'black': { hex: '#000000', name: 'Black' },
  'white': { hex: '#FFFFFF', name: 'White' },
  'natural': { hex: '#D4C4A8', name: 'Natural' },
  'brown': { hex: '#8B4513', name: 'Brown' },
  'gold': { hex: '#FFD700', name: 'Gold' },
  'silver': { hex: '#C0C0C0', name: 'Silver' },
  'oak': { hex: '#C19A6B', name: 'Oak' },
  'walnut': { hex: '#5C4033', name: 'Walnut' },
  'grey': { hex: '#808080', name: 'Grey' },
  'gray': { hex: '#808080', name: 'Gray' },
  'beige': { hex: '#F5F5DC', name: 'Beige' },
  'ivory': { hex: '#FFFFF0', name: 'Ivory' },
  'cream': { hex: '#FFFDD0', name: 'Cream' },
  'snow white': { hex: '#FFFAFA', name: 'Snow White' },
  'off white': { hex: '#FAF9F6', name: 'Off White' },
  'off-white': { hex: '#FAF9F6', name: 'Off White' },
};

export function ColorPicker({ colors, selectedColor, onChange, disabled = false }: ColorPickerProps) {
  const [hoveredColor, setHoveredColor] = useState<string | null>(null);

  const getColorInfo = (color: string) => {
    const normalizedColor = color.toLowerCase();
    return colorMap[normalizedColor] || { 
      hex: '#CCCCCC', 
      name: color.charAt(0).toUpperCase() + color.slice(1) 
    };
  };

  return (
    <div className="flex flex-wrap gap-2">
      {colors.map((color) => {
        const colorInfo = getColorInfo(color);
        const isSelected = selectedColor.toLowerCase() === color.toLowerCase();
        const isHovered = hoveredColor === color;

        return (
          <div
            key={color}
            className="relative"
            onMouseEnter={() => setHoveredColor(color)}
            onMouseLeave={() => setHoveredColor(null)}
          >
            {/* Color Swatch Button */}
            <button
              onClick={() => !disabled && onChange(color)}
              disabled={disabled}
              className={`
                w-10 h-10 rounded-full transition-all duration-200
                ${isSelected 
                  ? 'ring-2 ring-black ring-offset-2 scale-110' 
                  : 'ring-1 ring-gray-300 hover:ring-gray-400 hover:scale-105'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                ${color.toLowerCase() === 'white' || color.toLowerCase().includes('white') 
                  ? 'shadow-sm' 
                  : 'shadow-md'
                }
              `}
              style={{ 
                backgroundColor: colorInfo.hex,
                border: color.toLowerCase() === 'white' || color.toLowerCase().includes('white')
                  ? '1px solid #e5e7eb'
                  : 'none'
              }}
              aria-label={colorInfo.name}
              title={colorInfo.name}
            />

            {/* Tooltip on Hover */}
            {isHovered && !disabled && (
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 pointer-events-none z-10 whitespace-nowrap">
                <div className="bg-gray-900 text-white text-xs font-medium px-2 py-1 rounded shadow-lg">
                  {colorInfo.name}
                  {/* Arrow pointing down */}
                  <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900" />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}


