'use client';

import React, { useState, useRef, useEffect } from 'react';

interface ModelOption {
  id: string;
  name: string;
  description?: string;
  selected?: boolean;
}

interface RenderSpeedOption {
  id: string;
  name: string;
  description: string;
  selected?: boolean;
}

interface ModelDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (option: { value: string; label: string }) => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}

const numberOfImagesOptions = [
  { id: '1', name: '1', selected: false },
  { id: '2', name: '2', selected: false },
  { id: '3', name: '3', selected: false },
  { id: '4', name: '4', selected: true },
];

const modelOptions: ModelOption[] = [
  { id: '3.0-latest', name: '3.0 (latest)', description: 'Our most advanced model', selected: true },
  { id: '3.0-march26', name: '3.0 (March 26)', description: 'More contrast and details', selected: false },
  { id: '2.0', name: '2.0', description: 'For realism and design', selected: false },
  { id: '2a', name: '2a', description: 'Fastest creation time', selected: false },
  { id: '1.0', name: '1.0', description: 'Great for creative art', selected: false },
];

const renderSpeedOptions: RenderSpeedOption[] = [
  { id: 'turbo', name: 'Turbo', description: 'Faster More affordable', selected: false },
  { id: 'default', name: 'Default', description: '', selected: true },
  { id: 'quality', name: 'Quality', description: 'Slower More detail', selected: false },
];

export function ModelDropdown({ 
  isOpen, 
  onClose, 
  onSelect, 
  triggerRef 
}: ModelDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [selectedImages, setSelectedImages] = useState('4');
  const [selectedModel, setSelectedModel] = useState('3.0-latest');
  const [selectedSpeed, setSelectedSpeed] = useState('default');

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

  const handleImageSelect = (imageCount: string) => {
    setSelectedImages(imageCount);
    onSelect({ value: imageCount, label: `${imageCount} Images` });
  };

  const handleModelSelect = (modelId: string) => {
    setSelectedModel(modelId);
    const model = modelOptions.find(m => m.id === modelId);
    onSelect({ value: modelId, label: model?.name || modelId });
  };

  const handleSpeedSelect = (speedId: string) => {
    setSelectedSpeed(speedId);
    const speed = renderSpeedOptions.find(s => s.id === speedId);
    onSelect({ value: speedId, label: speed?.name || speedId });
  };

  return (
    <div 
      ref={dropdownRef}
      className="absolute top-full mt-2 left-0 w-80 bg-dark-secondary border border-gray-border rounded-lg shadow-lg p-4 z-50"
      onClick={(e) => e.stopPropagation()}
      style={{ position: 'absolute', zIndex: 1000 }}
    >
      {/* Number of Images Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-gray-light text-sm font-medium">Number of images</h3>
          <div className="flex items-center gap-1">
            <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
              <path d="M8 1L9.5 5.5H14L10.5 8.5L12 13L8 10L4 13L5.5 8.5L2 5.5H6.5L8 1Z" fill="#F7F7F8"/>
            </svg>
            <span className="text-gray-light text-sm">{selectedImages}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {numberOfImagesOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => handleImageSelect(option.name)}
              className={`px-3 py-2 rounded text-sm transition-colors ${
                selectedImages === option.name
                  ? 'bg-gray-light text-dark'
                  : 'text-gray-text hover:text-gray-light hover:bg-gray-border/20'
              }`}
            >
              {option.name}
            </button>
          ))}
        </div>
      </div>

      {/* Model Section */}
      <div className="mb-6">
        <h3 className="text-gray-light text-sm font-medium mb-3">Model</h3>
        <div className="space-y-2">
          {modelOptions.map((model) => (
            <button
              key={model.id}
              onClick={() => handleModelSelect(model.id)}
              className={`w-full text-left p-3 rounded transition-colors ${
                selectedModel === model.id
                  ? 'bg-gray-light text-dark'
                  : 'text-gray-text hover:text-gray-light hover:bg-gray-border/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{model.name}</div>
                  {model.description && (
                    <div className="text-xs opacity-80">{model.description}</div>
                  )}
                </div>
                {selectedModel === model.id && (
                  <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
                    <path d="M13.5 4.5L6 12L2.5 8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Render Speed Section */}
      <div>
        <h3 className="text-gray-light text-sm font-medium mb-3">Render speed</h3>
        <div className="space-y-2">
          {renderSpeedOptions.map((speed) => (
            <button
              key={speed.id}
              onClick={() => handleSpeedSelect(speed.id)}
              className={`w-full text-left p-3 rounded transition-colors ${
                selectedSpeed === speed.id
                  ? 'bg-gray-light text-dark'
                  : 'text-gray-text hover:text-gray-light hover:bg-gray-border/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{speed.name}</div>
                  {speed.description && (
                    <div className="text-xs opacity-80">{speed.description}</div>
                  )}
                </div>
                {selectedSpeed === speed.id && (
                  <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
                    <path d="M13.5 4.5L6 12L2.5 8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
