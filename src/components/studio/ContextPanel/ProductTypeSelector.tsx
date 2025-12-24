/**
 * Product Type Selector Component
 * Professional visual selector with layered illustrations
 */

'use client';

import { useState } from 'react';

interface ProductType {
  value: string;
  label: string;
  description: string;
}

interface ProductTypeSelectorProps {
  selectedType: string;
  onChange: (type: string) => void;
  disabled?: boolean;
}

const productTypes: ProductType[] = [
  {
    value: 'framed-print',
    label: 'Framed Print',
    description: 'Classic framed artwork with glass protection'
  },
  {
    value: 'canvas',
    label: 'Canvas',
    description: 'Gallery-wrapped canvas, ready to hang'
  },
  {
    value: 'framed-canvas',
    label: 'Framed Canvas',
    description: 'Canvas print in decorative frame'
  },
  {
    value: 'acrylic',
    label: 'Acrylic Print',
    description: 'Modern acrylic with stunning depth'
  },
  {
    value: 'metal',
    label: 'Metal Print',
    description: 'Vibrant colors on aluminum'
  },
  {
    value: 'poster',
    label: 'Poster',
    description: 'Unframed print on premium paper'
  }
];

// Visual illustration component for each product type
function ProductIllustration({ type, isSelected }: { type: string; isSelected: boolean }) {
  const baseColor = isSelected ? 'rgb(255, 255, 255)' : 'rgb(17, 24, 39)';
  const accentColor = isSelected ? 'rgb(229, 231, 235)' : 'rgb(107, 114, 128)';
  const bgColor = isSelected ? 'rgb(31, 41, 55)' : 'rgb(243, 244, 246)';

  switch (type) {
    case 'framed-print':
      return (
        <svg viewBox="0 0 80 80" className="w-16 h-16" fill="none">
          {/* Frame */}
          <rect x="10" y="10" width="60" height="60" fill={baseColor} rx="2"/>
          <rect x="14" y="14" width="52" height="52" fill={bgColor}/>
          {/* Mount */}
          <rect x="18" y="18" width="44" height="44" fill={accentColor}/>
          {/* Print */}
          <rect x="24" y="24" width="32" height="32" fill={baseColor} opacity="0.3"/>
          {/* Glass reflection */}
          <path d="M 15 15 L 25 15 L 15 25 Z" fill="white" opacity="0.2"/>
        </svg>
      );
    
    case 'canvas':
      return (
        <svg viewBox="0 0 80 80" className="w-16 h-16" fill="none">
          {/* Canvas front */}
          <rect x="15" y="15" width="50" height="50" fill={baseColor} rx="1"/>
          {/* Image */}
          <rect x="17" y="17" width="46" height="46" fill={accentColor} opacity="0.5"/>
          {/* Side edge (depth) */}
          <path d="M 65 15 L 70 20 L 70 70 L 65 65 Z" fill={baseColor} opacity="0.6"/>
          {/* Bottom edge (depth) */}
          <path d="M 15 65 L 20 70 L 70 70 L 65 65 Z" fill={baseColor} opacity="0.4"/>
        </svg>
      );
    
    case 'framed-canvas':
      return (
        <svg viewBox="0 0 80 80" className="w-16 h-16" fill="none">
          {/* Frame */}
          <rect x="8" y="8" width="64" height="64" fill={baseColor} rx="2"/>
          <rect x="13" y="13" width="54" height="54" fill={bgColor}/>
          {/* Canvas */}
          <rect x="16" y="16" width="48" height="48" fill={accentColor}/>
          {/* Canvas edge */}
          <path d="M 64 16 L 68 20 L 68 64 L 64 64 Z" fill={accentColor} opacity="0.6"/>
        </svg>
      );
    
    case 'acrylic':
      return (
        <svg viewBox="0 0 80 80" className="w-16 h-16" fill="none">
          {/* Acrylic panel */}
          <rect x="15" y="15" width="50" height="50" fill={baseColor} rx="2"/>
          {/* Image */}
          <rect x="17" y="17" width="46" height="46" fill={accentColor} opacity="0.4"/>
          {/* Depth/shadow */}
          <rect x="18" y="68" width="50" height="2" fill="black" opacity="0.2" rx="1"/>
          {/* Glossy reflection */}
          <path d="M 20 20 L 35 20 L 20 35 Z" fill="white" opacity="0.4"/>
          <circle cx="55" cy="55" r="8" fill="white" opacity="0.1"/>
        </svg>
      );
    
    case 'metal':
      return (
        <svg viewBox="0 0 80 80" className="w-16 h-16" fill="none">
          {/* Metal panel */}
          <rect x="15" y="15" width="50" height="50" fill={baseColor} rx="1"/>
          {/* Metallic gradient effect */}
          <defs>
            <linearGradient id={`metalGrad-${isSelected}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={accentColor} stopOpacity="0.3"/>
              <stop offset="50%" stopColor={accentColor} stopOpacity="0.6"/>
              <stop offset="100%" stopColor={accentColor} stopOpacity="0.3"/>
            </linearGradient>
          </defs>
          <rect x="17" y="17" width="46" height="46" fill={`url(#metalGrad-${isSelected})`}/>
          {/* Metallic shine */}
          <path d="M 20 20 L 40 20 L 20 40 Z" fill="white" opacity="0.3"/>
        </svg>
      );
    
    case 'poster':
      return (
        <svg viewBox="0 0 80 80" className="w-16 h-16" fill="none">
          {/* Paper */}
          <rect x="20" y="15" width="45" height="55" fill={baseColor} rx="1"/>
          {/* Image */}
          <rect x="22" y="17" width="41" height="51" fill={accentColor} opacity="0.4"/>
          {/* Paper curl */}
          <path d="M 65 15 L 65 25 L 60 20 Z" fill={baseColor} opacity="0.8"/>
          <path d="M 65 15 L 65 25 L 60 20 Z" fill="black" opacity="0.1"/>
        </svg>
      );
    
    default:
      return null;
  }
}

export function ProductTypeSelector({ selectedType, onChange, disabled = false }: ProductTypeSelectorProps) {
  const [hoveredType, setHoveredType] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-2 gap-3">
      {productTypes.map((type) => {
        const isSelected = selectedType === type.value;
        const isHovered = hoveredType === type.value;

        return (
          <button
            key={type.value}
            onClick={() => !disabled && onChange(type.value)}
            disabled={disabled}
            onMouseEnter={() => setHoveredType(type.value)}
            onMouseLeave={() => setHoveredType(null)}
            className={`
              relative p-4 rounded-xl border-2 transition-all duration-300 text-left overflow-hidden
              ${isSelected 
                ? 'border-black bg-gradient-to-br from-gray-900 to-gray-800 text-white shadow-lg scale-[1.02]' 
                : 'border-gray-200 bg-white hover:border-gray-400 hover:shadow-md'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
            aria-label={type.label}
          >
            {/* Visual Illustration */}
            <div className="flex items-center justify-center mb-3">
              <ProductIllustration type={type.value} isSelected={isSelected} />
            </div>

            {/* Label */}
            <div className="flex items-center justify-between">
              <h3 className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                {type.label}
              </h3>
              {/* Checkmark for selected */}
              {isSelected && (
                <svg 
                  className="w-5 h-5 text-white" 
                  fill="currentColor" 
                  viewBox="0 0 20 20"
                >
                  <path 
                    fillRule="evenodd" 
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" 
                    clipRule="evenodd" 
                  />
                </svg>
              )}
            </div>

            {/* Hover indicator */}
            {isHovered && !isSelected && (
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-transparent pointer-events-none opacity-50" />
            )}
          </button>
        );
      })}
    </div>
  );
}

