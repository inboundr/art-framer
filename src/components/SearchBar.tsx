'use client';

import React, { useState, useRef } from 'react';
import { AspectRatioDropdown } from './AspectRatioDropdown';
import { ModelDropdown } from './ModelDropdown';
import { MagicPromptDropdown } from './MagicPromptDropdown';
import { StyleDropdown } from './StyleDropdown';
import { ColorDropdown } from './ColorDropdown';
import { useAuth } from '@/contexts/AuthContext';

interface CategoryButtonProps {
  label: string;
  active?: boolean;
  onClick?: () => void;
}

function CategoryButton({ label, active = false, onClick }: CategoryButtonProps) {
  return (
    <div className="flex p-0.5 flex-col items-start">
      <button
        onClick={onClick}
        className={`flex min-w-[40px] md:min-w-[50px] px-2 md:px-3 py-1.5 md:py-2 justify-center items-center rounded-md text-xs md:text-sm font-semibold leading-4 md:leading-5 transition-colors ${
          active
            ? 'bg-white/10 text-white'
            : 'text-gray-text hover:bg-white/5'
        }`}
      >
        {label}
      </button>
    </div>
  );
}

function Separator() {
  return (
    <div className="flex px-1 py-1.5 flex-col justify-center items-start self-stretch">
      <div className="w-px flex-1 border-r border-gray-border" />
    </div>
  );
}

interface SearchBarProps {
  onGenerate?: (prompt: string) => void;
  onOpenGenerationPanel?: (prompt: string, settings: {
    aspectRatio: string;
    numberOfImages: number;
    model: string;
    renderSpeed: string;
    style: string;
    color: string;
    referenceImages: string[];
  }) => void;
}

interface AspectRatio {
  label: string;
  value: string;
  width: number;
  height: number;
  locked?: boolean;
}

interface AttachedImage {
  id: string;
  file: File;
  preview: string;
}

export function SearchBar({ onGenerate, onOpenGenerationPanel }: SearchBarProps) {
  const { user, profile } = useAuth();
  const [activeCategory, setActiveCategory] = useState('Poster');
  const [promptText, setPromptText] = useState('');
  const [aspectRatioDropdownOpen, setAspectRatioDropdownOpen] = useState(false);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [magicPromptDropdownOpen, setMagicPromptDropdownOpen] = useState(false);
  const [styleDropdownOpen, setStyleDropdownOpen] = useState(false);
  const [colorDropdownOpen, setColorDropdownOpen] = useState(false);
  const [attachedImages, setAttachedImages] = useState<AttachedImage[]>([]);
  const [currentAspectRatio, setCurrentAspectRatio] = useState<AspectRatio>({
    label: '1:1',
    value: '1:1',
    width: 1024,
    height: 1024
  });
  const [modelSettings, setModelSettings] = useState({
    images: '4',
    model: '3.0-latest',
    speed: 'default'
  });
  const [magicPromptSetting, setMagicPromptSetting] = useState('on');
  const [styleSetting, setStyleSetting] = useState('auto');
  const [colorSetting, setColorSetting] = useState('auto');
  
  const aspectRatioButtonRef = useRef<HTMLButtonElement>(null);
  const modelButtonRef = useRef<HTMLButtonElement>(null);
  const magicPromptButtonRef = useRef<HTMLButtonElement>(null);
  const styleButtonRef = useRef<HTMLButtonElement>(null);
  const colorButtonRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleGenerate = async () => {
    if (!promptText.trim()) return;
    
    // Check if user is authenticated
    if (!user) {
      // This will be handled by the parent component to show auth modal
      if (onOpenGenerationPanel) {
        onOpenGenerationPanel(promptText.trim(), {
          aspectRatio: currentAspectRatio.value === '1:1' ? '1x1' : 
                       currentAspectRatio.value === '16:9' ? '16x9' : 
                       currentAspectRatio.value === '9:16' ? '9x16' : 
                       currentAspectRatio.value === '4:3' ? '4x3' : 
                       currentAspectRatio.value === '3:4' ? '3x4' : 
                       currentAspectRatio.value === '3:2' ? '3x2' : 
                       currentAspectRatio.value === '2:3' ? '2x3' : '1x1',
          numberOfImages: parseInt(modelSettings.images) as 1 | 2 | 3 | 4,
          model: modelSettings.model === '3.0-latest' ? 'V_3' : 
                 modelSettings.model === '2.0-latest' ? 'V_2' : 
                 modelSettings.model === '1.0-latest' ? 'V_1' : 'V_3',
          renderSpeed: modelSettings.speed === 'default' ? 'BALANCED' : 
                      modelSettings.speed === 'fast' ? 'TURBO' : 
                      modelSettings.speed === 'quality' ? 'QUALITY' : 'BALANCED',
          style: styleSetting === 'auto' ? 'AUTO' : 
                 styleSetting === 'realistic' ? 'REALISTIC' : 
                 styleSetting === 'design' ? 'DESIGN' : 
                 styleSetting === 'general' ? 'GENERAL' : 'AUTO',
          color: colorSetting === 'auto' ? 'AUTO' : 
                 colorSetting === 'ember' ? 'EMBER' : 
                 colorSetting === 'fresh' ? 'FRESH' : 
                 colorSetting === 'jungle' ? 'JUNGLE' : 
                 colorSetting === 'magic' ? 'MAGIC' : 
                 colorSetting === 'melon' ? 'MELON' : 
                 colorSetting === 'mosaic' ? 'MOSAIC' : 
                 colorSetting === 'pastel' ? 'PASTEL' : 
                 colorSetting === 'ultramarine' ? 'ULTRAMARINE' : 'AUTO',
          referenceImages: attachedImages.map(img => img.preview),
        });
      }
      return;
    }
    
        // User is authenticated, proceed with generation
    if (onOpenGenerationPanel) {
      const settings = {
        aspectRatio: currentAspectRatio.value === '1:1' ? '1x1' : 
                     currentAspectRatio.value === '16:9' ? '16x9' : 
                     currentAspectRatio.value === '9:16' ? '9x16' : 
                     currentAspectRatio.value === '4:3' ? '4x3' : 
                     currentAspectRatio.value === '3:4' ? '3x4' : 
                     currentAspectRatio.value === '3:2' ? '3x2' : 
                     currentAspectRatio.value === '2:3' ? '2x3' : '1x1',
        numberOfImages: parseInt(modelSettings.images) as 1 | 2 | 3 | 4,
        model: modelSettings.model === '3.0-latest' ? 'V_3' : 
               modelSettings.model === '2.0-latest' ? 'V_2' : 
               modelSettings.model === '1.0-latest' ? 'V_1' : 'V_3',
        renderSpeed: modelSettings.speed === 'default' ? 'BALANCED' : 
                    modelSettings.speed === 'fast' ? 'TURBO' : 
                    modelSettings.speed === 'quality' ? 'QUALITY' : 'BALANCED',
        style: styleSetting === 'auto' ? 'AUTO' : 
               styleSetting === 'realistic' ? 'REALISTIC' : 
               styleSetting === 'design' ? 'DESIGN' : 
               styleSetting === 'general' ? 'GENERAL' : 'AUTO',
        color: colorSetting === 'auto' ? 'AUTO' :
               colorSetting === 'ember' ? 'EMBER' : 
               colorSetting === 'fresh' ? 'FRESH' : 
               colorSetting === 'jungle' ? 'JUNGLE' : 
               colorSetting === 'magic' ? 'MAGIC' : 
               colorSetting === 'melon' ? 'MELON' : 
               colorSetting === 'mosaic' ? 'MOSAIC' : 
               colorSetting === 'pastel' ? 'PASTEL' : 
               colorSetting === 'ultramarine' ? 'ULTRAMARINE' : 'AUTO',
        referenceImages: attachedImages.map(img => img.preview),
      };
      
      console.log('SearchBar - Current UI state:', {
        currentAspectRatio,
        modelSettings,
        styleSetting,
        colorSetting,
        attachedImages: attachedImages.length
      });
      console.log('SearchBar - Sending settings to GenerationPanel:', settings);
      
      onOpenGenerationPanel(promptText.trim(), settings);
    } else if (onGenerate) {
      onGenerate(promptText.trim());
    }
  };

  const handleAspectRatioSelect = (ratio: AspectRatio) => {
    setCurrentAspectRatio(ratio);
    setAspectRatioDropdownOpen(false);
  };

  const handleAspectRatioClick = () => {
    setAspectRatioDropdownOpen(!aspectRatioDropdownOpen);
  };

  const handleModelSelect = (option: any) => {
    setModelSettings(prev => ({
      ...prev,
      [option.type]: option.value
    }));
  };

  const handleModelClick = () => {
    setModelDropdownOpen(!modelDropdownOpen);
  };

  const handleMagicPromptSelect = (option: string) => {
    setMagicPromptSetting(option);
  };

  const handleMagicPromptClick = () => {
    setMagicPromptDropdownOpen(!magicPromptDropdownOpen);
  };

  const handleStyleSelect = (option: any) => {
    if (option.type === 'style') {
      setStyleSetting(option.value);
    }
  };

  const handleStyleClick = () => {
    setStyleDropdownOpen(!styleDropdownOpen);
  };

  const handleColorSelect = (option: any) => {
    if (option.type === 'palette') {
      setColorSetting(option.value);
      setColorDropdownOpen(false); // Close dropdown after selection
    }
  };

  const handleColorClick = () => {
    setColorDropdownOpen(!colorDropdownOpen);
  };

  const handleCameraClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newImages: AttachedImage[] = Array.from(files).map((file, index) => ({
        id: `img-${Date.now()}-${index}`,
        file,
        preview: URL.createObjectURL(file)
      }));
      setAttachedImages(prev => [...prev, ...newImages]);
    }
    // Reset the input value to allow selecting the same file again
    if (event.target) {
      event.target.value = '';
    }
  };

  const handleRemoveImage = (imageId: string) => {
    setAttachedImages(prev => {
      const imageToRemove = prev.find(img => img.id === imageId);
      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.preview);
      }
      return prev.filter(img => img.id !== imageId);
    });
  };

  const getModelButtonText = () => {
    const modelName = modelSettings.model === '3.0-latest' ? '3.0 Default' : modelSettings.model;
    return `${modelName} x${modelSettings.images}`;
  };

  const getMagicPromptButtonText = () => {
    return `MP ${magicPromptSetting.charAt(0).toUpperCase() + magicPromptSetting.slice(1)}`;
  };

  const getColorButtonText = () => {
    if (colorSetting === 'auto') return 'Color';
    return colorSetting.charAt(0).toUpperCase() + colorSetting.slice(1);
  };

  const leftCategories = ['Explore', 'Top'];
  const rightCategories = ['People', 'Product', 'Nature', 'Poster', 'Logo', 'T-shirt'];

  return (
    <div className="flex flex-col items-start self-stretch bg-dark">
      {/* Prompt Generation Interface */}
      <div className="flex flex-col px-4 py-6 justify-center items-center self-stretch bg-dark">
        <div className="flex flex-col items-center gap-4 w-full max-w-4xl mx-auto">
          {/* Title */}
          <h1 className="text-gray-light text-xl md:text-2xl font-semibold text-center">
            What will you create?
          </h1>

          {/* Input Field */}
          <div className="flex items-start gap-2 flex-1 w-full px-4 py-4 rounded-lg bg-dark-secondary border border-gray-border focus-within:border-gray-light transition-colors">
            <textarea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder="Describe what you want to see"
              className="flex-1 bg-transparent text-gray-light placeholder:text-gray-text text-sm md:text-base outline-none border-none resize-none min-h-[80px] leading-relaxed"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                  handleGenerate();
                }
              }}
            />
            {/* Camera Button */}
            <button
              onClick={handleCameraClick}
              className="flex items-center justify-center w-8 h-8 rounded-md bg-dark-tertiary text-gray-light hover:bg-gray-border transition-colors flex-shrink-0"
              title="Attach image"
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                <path d="M23 19C23 19.5304 22.7893 20.0391 22.4142 20.4142C22.0391 20.7893 21.5304 21 21 21H3C2.46957 21 1.96086 20.7893 1.58579 20.4142C1.21071 20.0391 1 19.5304 1 19V8C1 7.46957 1.21071 6.96086 1.58579 6.58579C1.96086 6.21071 2.46957 6 3 6H7L9 3H15L17 6H21C21.5304 6 22.0391 6.21071 22.4142 6.58579C22.7893 6.96086 23 7.46957 23 8V19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 17C14.2091 17 16 15.2091 16 13C16 10.7909 14.2091 9 12 9C9.79086 9 8 10.7909 8 13C8 15.2091 9.79086 17 12 17Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Options Row */}
          <div className="flex items-center gap-2 flex-wrap justify-center w-full">
            {/* Public Dropdown */}
            <button className="flex items-center gap-1 px-3 py-2 rounded-md bg-dark-tertiary text-gray-light text-sm hover:bg-gray-border transition-colors">
              <span>Public</span>
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>

            {/* Aspect Ratio */}
            <div className="relative">
              <button 
                ref={aspectRatioButtonRef}
                onClick={handleAspectRatioClick}
                className="flex items-center gap-1 px-3 py-2 rounded-md bg-dark-tertiary text-gray-light text-sm hover:bg-gray-border transition-colors"
              >
                <span>{currentAspectRatio.label}</span>
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              
              {aspectRatioDropdownOpen && (
                <AspectRatioDropdown
                  isOpen={aspectRatioDropdownOpen}
                  onClose={() => setAspectRatioDropdownOpen(false)}
                  onSelect={handleAspectRatioSelect}
                  currentRatio={currentAspectRatio}
                  triggerRef={aspectRatioButtonRef}
                />
              )}
            </div>

            {/* Model */}
            <div className="relative">
              <button 
                ref={modelButtonRef}
                onClick={handleModelClick}
                className="flex items-center gap-1 px-3 py-2 rounded-md bg-dark-tertiary text-gray-light text-sm hover:bg-gray-border transition-colors"
              >
                <span>{getModelButtonText()}</span>
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              
              {modelDropdownOpen && (
                <ModelDropdown
                  isOpen={modelDropdownOpen}
                  onClose={() => setModelDropdownOpen(false)}
                  onSelect={handleModelSelect}
                  triggerRef={modelButtonRef}
                />
              )}
            </div>

            {/* MP Toggle */}
            <div className="relative">
              <button 
                ref={magicPromptButtonRef}
                onClick={handleMagicPromptClick}
                className="flex items-center gap-1 px-3 py-2 rounded-md bg-dark-tertiary text-gray-light text-sm hover:bg-gray-border transition-colors"
              >
                <span>{getMagicPromptButtonText()}</span>
              </button>
              
              {magicPromptDropdownOpen && (
                <MagicPromptDropdown
                  isOpen={magicPromptDropdownOpen}
                  onClose={() => setMagicPromptDropdownOpen(false)}
                  onSelect={handleMagicPromptSelect}
                  triggerRef={magicPromptButtonRef}
                />
              )}
            </div>

            {/* Character with Attached Images */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-dark-tertiary text-gray-light text-sm">
              <span>Character</span>
              {attachedImages.length > 0 && (
                <div className="flex items-center gap-1">
                  {attachedImages.slice(0, 3).map((image) => (
                    <div key={image.id} className="relative">
                      <img
                        src={image.preview}
                        alt="Attached"
                        className="w-6 h-6 rounded-full object-cover border border-gray-border"
                      />
                      <button
                        onClick={() => handleRemoveImage(image.id)}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {attachedImages.length > 3 && (
                    <span className="text-xs text-gray-text">+{attachedImages.length - 3}</span>
                  )}
                </div>
              )}
            </div>

            {/* Style */}
            <div className="relative">
              <button 
                ref={styleButtonRef}
                onClick={handleStyleClick}
                className="flex items-center gap-1 px-3 py-2 rounded-md bg-dark-tertiary text-gray-light text-sm hover:bg-gray-border transition-colors"
              >
                <span>Style</span>
              </button>
              
              {styleDropdownOpen && (
                <StyleDropdown
                  isOpen={styleDropdownOpen}
                  onClose={() => setStyleDropdownOpen(false)}
                  onSelect={handleStyleSelect}
                  triggerRef={styleButtonRef}
                />
              )}
            </div>

            {/* Color */}
            <div className="relative">
              <button 
                ref={colorButtonRef}
                onClick={handleColorClick}
                className="flex items-center gap-1 px-3 py-2 rounded-md bg-dark-tertiary text-gray-light text-sm hover:bg-gray-border transition-colors"
              >
                <span>{getColorButtonText()}</span>
              </button>
              
              {colorDropdownOpen && (
                <ColorDropdown
                  isOpen={colorDropdownOpen}
                  onClose={() => setColorDropdownOpen(false)}
                  onSelect={handleColorSelect}
                  triggerRef={colorButtonRef}
                  selectedValue={colorSetting}
                />
              )}
            </div>

            {/* More Options */}
            <button className="flex items-center gap-1 px-3 py-2 rounded-md bg-dark-tertiary text-gray-light text-sm hover:bg-gray-border transition-colors">
              <span>•••</span>
            </button>

            {/* Generate Button */}
            <button 
              onClick={handleGenerate}
              disabled={!promptText.trim()}
              className="flex items-center gap-2 px-6 py-2 rounded-md bg-pink-primary text-white font-medium text-sm hover:bg-pink-primary/90 transition-colors ml-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>Generate</span>
            </button>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex max-w-full p-1 flex-col items-start self-stretch bg-dark overflow-x-auto">
        <div className="flex max-w-full items-center self-stretch min-w-max">
          <div className="flex h-8 md:h-10 items-center flex-1 bg-dark">
            <div className="flex h-8 md:h-10 items-center">
              <div className="flex w-8 md:w-10 h-8 md:h-10 p-0.5 justify-center items-center relative">
                {/* Search Icon with Lock Overlay */}
                <div className="flex h-7 md:h-9 min-w-7 md:min-w-9 p-1 justify-center items-center rounded-md">
                  <svg 
                    width="22" 
                    height="22" 
                    viewBox="0 0 23 23" 
                    fill="none" 
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-4 md:w-[22px] h-4 md:h-[22px]"
                  >
                    <path 
                      d="M18.3125 18.9604L14.5021 15.15M10.3375 16.7604C11.8691 16.7604 13.338 16.152 14.421 15.069C15.5041 13.986 16.1125 12.5171 16.1125 10.9854C16.1125 9.45382 15.5041 7.98493 14.421 6.90191C13.338 5.81888 11.8691 5.21045 10.3375 5.21045C8.80587 5.21045 7.33698 5.81888 6.25396 6.90191C5.17094 7.98493 4.5625 9.45382 4.5625 10.9854C4.5625 12.5171 5.17094 13.986 6.25396 15.069C7.33698 16.152 8.80587 16.7604 10.3375 16.7604Z" 
                      stroke="#D4D4D8" 
                      strokeWidth="1.65" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                {/* Lock Icon Overlay */}
                <div className="flex flex-col items-start absolute -right-0.5 top-3.5">
                  <svg 
                    width="12" 
                    height="12" 
                    viewBox="0 0 13 13" 
                    fill="none" 
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-2.5 md:w-3 h-2.5 md:h-3"
                  >
                    <path 
                      d="M8.16406 4.81055V3.81055C8.16406 3.28011 7.95335 2.77141 7.57828 2.39633C7.2032 2.02126 6.6945 1.81055 6.16406 1.81055C5.63363 1.81055 5.12492 2.02126 4.74985 2.39633C4.37478 2.77141 4.16406 3.28011 4.16406 3.81055V4.81055H3.66406C3.26624 4.81055 2.88471 4.96858 2.6034 5.24989C2.3221 5.53119 2.16406 5.91272 2.16406 6.31055V10.3105C2.16406 10.7084 2.3221 11.0899 2.6034 11.3712C2.88471 11.6525 3.26624 11.8105 3.66406 11.8105H8.66406C9.06189 11.8105 9.44342 11.6525 9.72472 11.3712C10.006 11.0899 10.1641 10.7084 10.1641 10.3105V6.31055C10.1641 5.91272 10.006 5.53119 9.72472 5.24989C9.44342 4.96858 9.06189 4.81055 8.66406 4.81055H8.16406ZM6.16406 2.81055C6.42928 2.81055 6.68363 2.9159 6.87117 3.10344C7.05871 3.29098 7.16406 3.54533 7.16406 3.81055V4.81055H5.16406V3.81055C5.16406 3.54533 5.26942 3.29098 5.45696 3.10344C5.64449 2.9159 5.89885 2.81055 6.16406 2.81055Z" 
                      fill="url(#paint0_linear_8_95253)"
                    />
                    <defs>
                      <linearGradient id="paint0_linear_8_95253" x1="1.59306" y1="1.44055" x2="11.7811" y2="11.3735" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#F7F7F8"/>
                        <stop offset="0.4" stopColor="#F7F7F8"/>
                        <stop offset="1" stopColor="#F7F7F8" stopOpacity="0.1"/>
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>
              
              {/* Left Categories */}
              <div className="flex items-center gap-0">
                {leftCategories.map((category) => (
                  <CategoryButton
                    key={category}
                    label={category}
                    active={activeCategory === category}
                    onClick={() => setActiveCategory(category)}
                  />
                ))}
              </div>

              <Separator />

              {/* Right Categories */}
              <div className="flex items-center">
                {rightCategories.map((category) => (
                  <CategoryButton
                    key={category}
                    label={category}
                    active={activeCategory === category}
                    onClick={() => setActiveCategory(category)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
