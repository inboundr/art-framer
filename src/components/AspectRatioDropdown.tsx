'use client';

import React, { useState, useRef, useEffect } from 'react';

interface AspectRatio {
  label: string;
  value: string;
  width: number;
  height: number;
  locked?: boolean;
}

interface AspectRatioDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (ratio: AspectRatio) => void;
  currentRatio: AspectRatio;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}

const aspectRatios: AspectRatio[] = [
  // Portrait - All supported by Ideogram API v3
  { label: '1:3', value: '1:3', width: 512, height: 1536 },
  { label: '1:2', value: '1:2', width: 704, height: 1408 },
  { label: '9:16', value: '9:16', width: 736, height: 1312 },
  { label: '10:16', value: '10:16', width: 800, height: 1280 },
  { label: '2:3', value: '2:3', width: 832, height: 1248 },
  { label: '3:4', value: '3:4', width: 864, height: 1152 },
  { label: '4:5', value: '4:5', width: 896, height: 1120 },
  
  // Landscape - All supported by Ideogram API v3
  { label: '3:1', value: '3:1', width: 1536, height: 512 },
  { label: '2:1', value: '2:1', width: 1408, height: 704 },
  { label: '16:9', value: '16:9', width: 1312, height: 736 },
  { label: '16:10', value: '16:10', width: 1280, height: 800 },
  { label: '3:2', value: '3:2', width: 1248, height: 832 },
  { label: '4:3', value: '4:3', width: 1152, height: 864 },
  { label: '5:4', value: '5:4', width: 1120, height: 896 },
  
  // Square
  { label: '1:1 (Square)', value: '1:1', width: 1024, height: 1024 },
  
  // Custom
  { label: 'Custom', value: 'custom', width: 1024, height: 1024, locked: true },
];

export function AspectRatioDropdown({ 
  isOpen, 
  onClose, 
  onSelect, 
  currentRatio, 
  triggerRef 
}: AspectRatioDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [sliderRatio, setSliderRatio] = useState<AspectRatio>(currentRatio);

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

  // Update slider ratio when currentRatio changes
  useEffect(() => {
    setSliderRatio(currentRatio);
  }, [currentRatio]);

  if (!isOpen) {
    return null;
  }

  const portraitRatios = aspectRatios.filter(ratio => 
    ratio.value !== '1:1' && 
    ratio.value !== 'custom' && 
    ratio.width < ratio.height
  );
  
  const landscapeRatios = aspectRatios.filter(ratio => 
    ratio.value !== '1:1' && 
    ratio.value !== 'custom' && 
    ratio.width > ratio.height
  );
  
  const squareRatio = aspectRatios.find(ratio => ratio.value === '1:1');
  const customRatio = aspectRatios.find(ratio => ratio.value === 'custom');

  // Calculate slider value based on aspect ratio
  const getSliderValue = (ratio: AspectRatio) => {
    const aspectRatio = ratio.width / ratio.height;
    
    // Map aspect ratios to slider positions (1-11)
    if (aspectRatio <= 0.5) return 1; // 1:2 and narrower
    if (aspectRatio <= 0.67) return 2; // 2:3
    if (aspectRatio <= 0.75) return 3; // 3:4
    if (aspectRatio <= 0.8) return 4; // 4:5
    if (aspectRatio <= 0.9) return 5; // 9:10, 10:11, etc.
    if (aspectRatio <= 1.1) return 6; // 1:1 (square)
    if (aspectRatio <= 1.25) return 7; // 4:3, 5:4, etc.
    if (aspectRatio <= 1.5) return 8; // 3:2
    if (aspectRatio <= 1.6) return 9; // 16:10
    if (aspectRatio <= 1.8) return 10; // 16:9
    return 11; // 2:1 and wider
  };

  // Calculate aspect ratio from slider value
  const getRatioFromSlider = (sliderValue: number) => {
    const baseWidth = 1024;
    let width, height;
    
    switch (sliderValue) {
      case 1: // Very tall (portrait)
        width = baseWidth;
        height = baseWidth * 2;
        break;
      case 2: // Tall portrait
        width = baseWidth;
        height = baseWidth * 1.5;
        break;
      case 3: // Portrait
        width = baseWidth;
        height = baseWidth * 1.33;
        break;
      case 4: // Slightly portrait
        width = baseWidth;
        height = baseWidth * 1.25;
        break;
      case 5: // Slightly portrait
        width = baseWidth;
        height = baseWidth * 1.11;
        break;
      case 6: // Square
        width = baseWidth;
        height = baseWidth;
        break;
      case 7: // Slightly landscape
        width = baseWidth;
        height = baseWidth * 0.8;
        break;
      case 8: // Landscape
        width = baseWidth;
        height = baseWidth * 0.67;
        break;
      case 9: // Wide landscape
        width = baseWidth;
        height = baseWidth * 0.625;
        break;
      case 10: // Very wide landscape
        width = baseWidth;
        height = baseWidth * 0.56;
        break;
      case 11: // Ultra wide
        width = baseWidth;
        height = baseWidth * 0.5;
        break;
      default:
        width = baseWidth;
        height = baseWidth;
    }
    
    return { width: Math.round(width), height: Math.round(height) };
  };

  // Generate label for the current slider position
  const getSliderLabel = (sliderValue: number) => {
    switch (sliderValue) {
      case 1: return '1:2';
      case 2: return '2:3';
      case 3: return '3:4';
      case 4: return '4:5';
      case 5: return '9:10';
      case 6: return '1:1';
      case 7: return '5:4';
      case 8: return '3:2';
      case 9: return '16:10';
      case 10: return '16:9';
      case 11: return '2:1';
      default: return '1:1';
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sliderValue = parseInt(e.target.value);
    const { width, height } = getRatioFromSlider(sliderValue);
    const newRatio = {
      label: getSliderLabel(sliderValue),
      value: `custom-${sliderValue}`,
      width,
      height
    };
    setSliderRatio(newRatio);
  };

  const handleSliderMouseUp = () => {
    // When user finishes dragging, update the actual selection
    onSelect(sliderRatio);
  };

  return (
    <div 
      ref={dropdownRef}
      className="absolute top-full mt-2 left-0 w-96 bg-white border border-gray-300 rounded-lg shadow-lg p-4 z-50"
      onClick={(e) => e.stopPropagation()}
      style={{ position: 'absolute', zIndex: 1000 }}
    >
      <div className="flex gap-4">
        {/* Left Side - Preview and Controls */}
        <div className="flex-1">
          {/* Preview Box */}
          <div className="w-full h-32 bg-gray-100 border border-gray-300 rounded-lg flex items-center justify-center mb-4 overflow-hidden relative">
            {(() => {
              const containerWidth = 80;
              const containerHeight = 60;
              const aspectRatio = sliderRatio.width / sliderRatio.height;
              
              let previewWidth, previewHeight;
              
              if (aspectRatio > 1) {
                // Landscape - fit to width
                previewWidth = containerWidth;
                previewHeight = containerWidth / aspectRatio;
              } else {
                // Portrait - fit to height
                previewHeight = containerHeight;
                previewWidth = containerHeight * aspectRatio;
              }
              
              return (
                <div 
                  className="bg-gray-light/20 border border-gray-300 rounded"
                  style={{
                    width: `${previewWidth}px`,
                    height: `${previewHeight}px`,
                    minWidth: '20px',
                    minHeight: '20px'
                  }}
                />
              );
            })()}
            {/* Aspect Ratio Text Overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-gray-900 text-sm font-medium bg-gray-100/80 px-2 py-1 rounded">
                {sliderRatio.label}
              </div>
            </div>
          </div>
          
          {/* Slider */}
          <div className="mb-4">
            <input
              type="range"
              min="1"
              max="11"
              step="1"
              value={getSliderValue(sliderRatio)}
              onChange={handleSliderChange}
              onMouseUp={handleSliderMouseUp}
              onTouchEnd={handleSliderMouseUp}
              className="w-full h-2 bg-gray-border rounded-lg appearance-none cursor-pointer slider"
            />
          </div>
          
          {/* Dimensions */}
          <div className="flex justify-between text-sm text-gray-600">
            <div>
              <p className="text-gray-600">Width</p>
              <p className="text-gray-900">{sliderRatio.width} px</p>
            </div>
            <div>
              <p className="text-gray-600">Height</p>
              <p className="text-gray-900">{sliderRatio.height} px</p>
            </div>
          </div>
        </div>

        {/* Right Side - Options */}
        <div className="flex-1">
          {/* Portrait Section */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <svg width="20" height="20" fill="none" viewBox="0 0 20 20">
                <rect width="15" height="8" x="14" y="2.5" stroke="currentColor" opacity="0.9" rx="1" transform="rotate(90 14 2.5)"/>
              </svg>
              <p className="text-gray-900 text-sm">Portrait</p>
            </div>
            <div className="space-y-1">
              {portraitRatios.map((ratio) => (
                <button
                  key={ratio.value}
                  onClick={() => {
                    onSelect(ratio);
                    setSliderRatio(ratio);
                  }}
                  disabled={ratio.locked}
                  className={`w-full text-left px-2 py-1 rounded text-sm transition-colors ${
                    currentRatio.value === ratio.value
                      ? 'bg-gray-light text-dark'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-border/20'
                  } ${ratio.locked ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span>{ratio.label}</span>
                    {ratio.locked && (
                      <svg width="12" height="12" fill="none" viewBox="0 0 12 12">
                        <path fill="currentColor" d="M8 4V3a2 2 0 10-4 0v1h-.5A1.5 1.5 0 002 5.5v4A1.5 1.5 0 003.5 11h5A1.5 1.5 0 0010 9.5v-4A1.5 1.5 0 008.5 4H8zM6 2a1 1 0 011 1v1H5V3a1 1 0 011-1z"/>
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Landscape Section */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <svg width="20" height="20" fill="none" viewBox="0 0 20 20">
                <rect width="15" height="8" x="2.5" y="6" stroke="currentColor" rx="1"/>
              </svg>
              <p className="text-gray-900 text-sm">Landscape</p>
            </div>
            <div className="space-y-1">
              {landscapeRatios.map((ratio) => (
                <button
                  key={ratio.value}
                  onClick={() => {
                    onSelect(ratio);
                    setSliderRatio(ratio);
                  }}
                  disabled={ratio.locked}
                  className={`w-full text-left px-2 py-1 rounded text-sm transition-colors ${
                    currentRatio.value === ratio.value
                      ? 'bg-gray-light text-dark'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-border/20'
                  } ${ratio.locked ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span>{ratio.label}</span>
                    {ratio.locked && (
                      <svg width="12" height="12" fill="none" viewBox="0 0 12 12">
                        <path fill="currentColor" d="M8 4V3a2 2 0 10-4 0v1h-.5A1.5 1.5 0 002 5.5v4A1.5 1.5 0 003.5 11h5A1.5 1.5 0 0010 9.5v-4A1.5 1.5 0 008.5 4H8zM6 2a1 1 0 011 1v1H5V3a1 1 0 011-1z"/>
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Square and Custom Section */}
          <div className="space-y-1">
            {squareRatio && (
              <button
                onClick={() => {
                  onSelect(squareRatio);
                  setSliderRatio(squareRatio);
                }}
                className={`w-full text-left px-2 py-1 rounded text-sm transition-colors ${
                  currentRatio.value === squareRatio.value
                    ? 'bg-gray-light text-dark'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-border/20'
                }`}
              >
                {squareRatio.label}
              </button>
            )}

            {customRatio && (
              <button
                onClick={() => {
                  onSelect(customRatio);
                  setSliderRatio(customRatio);
                }}
                disabled={customRatio.locked}
                className={`w-full text-left px-2 py-1 rounded text-sm transition-colors ${
                  currentRatio.value === customRatio.value
                    ? 'bg-gray-light text-dark'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-border/20'
                } ${customRatio.locked ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <span>{customRatio.label}</span>
                  {customRatio.locked && (
                    <svg width="12" height="12" fill="none" viewBox="0 0 12 12">
                      <path fill="currentColor" d="M8 4V3a2 2 0 10-4 0v1h-.5A1.5 1.5 0 002 5.5v4A1.5 1.5 0 003.5 11h5A1.5 1.5 0 0010 9.5v-4A1.5 1.5 0 008.5 4H8zM6 2a1 1 0 011 1v1H5V3a1 1 0 011-1z"/>
                    </svg>
                  )}
                </div>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
