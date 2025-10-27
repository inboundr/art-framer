'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useImageGeneration } from '@/hooks/useImageGeneration';
import { IdeogramImageGenerationRequest } from '@/lib/ideogram/api';
import { CreationsModal } from './CreationsModal';
import { getProxiedImageUrl } from '@/lib/utils/imageProxy';
import { saveGeneratedImageToSupabase } from '@/lib/utils/saveGeneratedImage';
import { useAuth } from '@/hooks/useAuth';
import { useGeneration } from '@/contexts/GenerationContext';
import { RobustImage } from '@/components/RobustImage';

interface GenerationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  promptText?: string;
  aspectRatio?: string;
  numberOfImages?: number;
  model?: string;
  renderSpeed?: string;
  style?: string;
  color?: string;
  referenceImages?: string[];
}

export function GenerationPanel({ 
  isOpen, 
  onClose, 
  promptText = '', 
  aspectRatio = '1x1',
  numberOfImages = 4,
  model = 'V_3',
  renderSpeed = 'BALANCED',
  style = 'AUTO',
  color = 'AUTO',
  referenceImages = []
}: GenerationPanelProps) {
  const { user } = useAuth();
  const { setActiveGenerations, setIsGenerating } = useGeneration();
  const [isExpanded, setIsExpanded] = useState(true);
  const [localPromptText, setLocalPromptText] = useState(promptText);
  const [generationStatus, setGenerationStatus] = useState('Waiting in the slow queue...');
  const [images, setImages] = useState<Array<{ id: string; url: string; originalUrl?: string; isLoaded: boolean }>>([]);
  
  // Debug logging for state changes
  useEffect(() => {
    console.log('GenerationPanel state - isExpanded:', isExpanded, 'images.length:', images.length);
  }, [isExpanded, images.length]);
  const [hasStartedGeneration, setHasStartedGeneration] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ id: string; url: string; originalUrl?: string; isLoaded: boolean } | null>(null);
  const [isCreationsModalOpen, setIsCreationsModalOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Use ref to prevent duplicate generation calls
  const generationInitiatedRef = useRef(false);
  const currentPromptRef = useRef('');

  // Image generation hook
  const {
    isGenerating,
    currentGeneration,
    error,
    generateImage,
    cancelGeneration,
    clearError,
  } = useImageGeneration({
    onSuccess: async (response) => {
      console.log('Generation started:', response);
      setGenerationStatus('Generation started, processing...');
      
      // Handle the actual API response structure
      // The API returns { created: string, data: Array }
      if (response && typeof response === 'object') {
        // Check if response has a 'data' property (actual API response)
        if ('data' in response && Array.isArray(response.data)) {
          console.log('📥 Found data array:', response.data);
          console.log('📊 Data array length:', response.data.length);
          const actualImages = response.data.map((img: any, index: number) => {
            console.log(`🖼️ Processing image ${index}:`, img);
            return {
              id: `img-${Date.now()}-${index}`, // Use timestamp to ensure unique IDs
              url: getProxiedImageUrl(img.url || ''),
              originalUrl: img.url || '',
              isLoaded: true
            };
          });
          console.log('✅ Final actualImages array:', actualImages);
          console.log('🔄 Adding images to existing array');
          
          // Accumulate images instead of replacing them
          setImages(prevImages => {
            const newImages = [...prevImages, ...actualImages];
            console.log('📦 Total images now:', newImages.length);
            return newImages;
          });
          
          // Save each generated image to Supabase Storage and update IDs
          if (user) {
            console.log('💾 Saving images to Supabase...');
            setGenerationStatus('Saving images...');
            
            const savedImages: { id: string; url: string; originalUrl?: string; isLoaded: boolean }[] = [];
            for (let i = 0; i < response.data.length; i++) {
              const img = response.data[i];
              try {
                const savedImage = await saveGeneratedImageToSupabase({
                  imageUrl: img.url,
                  prompt: promptText,
                  aspectRatio: aspectRatio,
                  model: model,
                  style: style !== 'AUTO' ? style : undefined,
                  color: color !== 'AUTO' ? color : undefined,
                  userId: user.id,
                });
                console.log('✅ Image saved to Supabase with ID:', savedImage.id);
                savedImages.push({
                  ...actualImages[i],
                  id: savedImage.id, // Use the actual database UUID
                });
              } catch (error) {
                console.error('❌ Failed to save image to Supabase:', error);
                // Keep the temporary ID if saving fails
                savedImages.push(actualImages[i]);
              }
            }
            
            // Update the images array with the correct database IDs
            setImages(prevImages => {
              const updatedImages = [...prevImages];
              // Replace the last batch of images with the saved versions
              const startIndex = updatedImages.length - actualImages.length;
              updatedImages.splice(startIndex, actualImages.length, ...savedImages);
              return updatedImages;
            });
            
            setGenerationStatus(`Your art is ready! Choose a frame to order.`);
          } else {
            setGenerationStatus(`Your art is ready! Choose a frame to order.`);
          }
          
          return;
        }
        
        // Check if response has an 'images' property (expected interface)
        if ('images' in response && Array.isArray(response.images)) {
          console.log('Found images array:', response.images);
          const actualImages = response.images.map((img: any, index: number) => ({
            id: `img-${index}`,
            url: getProxiedImageUrl(img.url || ''),
            originalUrl: img.url || '',
            isLoaded: true
          }));
          setImages(actualImages);
          setGenerationStatus(`Your art is ready! Choose a frame to order.`);
          return;
        }
      }
      
      // Fallback to placeholders if no actual images found
      console.log('No images found in response, using placeholders');
      const numberOfImages = (response as any)?.number_of_images || 4;
      setImages(Array.from({ length: numberOfImages }, (_, i) => ({
        id: `img-${i}`,
        url: '',
        isLoaded: false
      })));
    },
    onError: (error) => {
      console.error('Generation failed:', error);
      setGenerationStatus('Generation failed');
    },
    onProgress: (status) => {
      console.log('Generation progress:', status);
      setGenerationStatus(`Status: ${status}`);
    },
  });

  // Update local prompt when prop changes and reset generation state
  useEffect(() => {
    setLocalPromptText(promptText);
    // Reset generation state when prompt changes or panel closes
    if (!isOpen) {
      generationInitiatedRef.current = false;
      setHasStartedGeneration(false);
      // Reset global generation state when panel closes
      setActiveGenerations(0);
      setIsGenerating(false);
    }
  }, [promptText, isOpen, setActiveGenerations, setIsGenerating]);

  // Update global generation state when local generation state changes
  useEffect(() => {
    setIsGenerating(isGenerating);
    if (isGenerating) {
      // Set the number of images being generated
      setActiveGenerations(numberOfImages);
    } else if (!isGenerating && hasStartedGeneration) {
      // Keep the count until the panel is closed or a new generation starts
      // This ensures the badge shows the count of the last generation
    }
  }, [isGenerating, numberOfImages, hasStartedGeneration, setIsGenerating, setActiveGenerations]);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Remove simulation - we're getting real images from the API

  const handleGenerate = useCallback(async () => {
    if (!localPromptText.trim()) return;
    
    console.log('🚀 handleGenerate called - hasStartedGeneration:', hasStartedGeneration, 'isGenerating:', isGenerating);
    
    // Prevent duplicate calls
    if (isGenerating) {
      console.log('⚠️ Generation already in progress, skipping duplicate call');
      return;
    }

    // Clear previous images when starting new generation
    console.log('🗑️ Clearing previous images');
    setImages([]);

    const request: IdeogramImageGenerationRequest = {
      prompt: localPromptText.trim(),
      aspect_ratio: aspectRatio as any,
      num_images: numberOfImages as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8, // Updated parameter name
      rendering_speed: renderSpeed as any,
      style_type: style as any,
      magic_prompt: 'AUTO', // Add magic_prompt parameter
      // Handle color_palette for Ideogram API v3 - use uppercase preset names
      color_palette: color && color !== 'AUTO' ? { name: color } : undefined,
      character_reference_images: referenceImages.length > 0 ? referenceImages : undefined,
    };

    console.log('GenerationPanel - Props received:', {
      aspectRatio,
      numberOfImages,
      model,
      renderSpeed,
      style,
      color,
      referenceImages
    });
    console.log('GenerationPanel - Starting generation with request:', request);
    console.log('🔍 Key parameters check:', {
      'aspect_ratio in request': request.aspect_ratio,
      'num_images in request': request.num_images,
      'rendering_speed in request': request.rendering_speed,
      'style_type in request': request.style_type,
      'color_palette in request': request.color_palette,
      'color prop received': color
    });
    await generateImage(request);
  }, [localPromptText, aspectRatio, numberOfImages, model, renderSpeed, style, color, referenceImages, generateImage]); // Added color to deps

  // Auto-start generation when panel opens with a prompt
  useEffect(() => {
    const currentPrompt = promptText.trim();
    console.log('🔄 useEffect triggered - isOpen:', isOpen, 'promptText:', currentPrompt, 'generationInitiated:', generationInitiatedRef.current, 'isGenerating:', isGenerating);
    
    // Only start generation if:
    // 1. Panel is open
    // 2. There's a prompt
    // 3. Generation hasn't been initiated for this prompt
    // 4. Not currently generating
    if (isOpen && currentPrompt && !generationInitiatedRef.current && !isGenerating) {
      console.log('✨ Auto-starting generation for prompt:', currentPrompt);
      generationInitiatedRef.current = true;
      currentPromptRef.current = currentPrompt;
      setHasStartedGeneration(true);
      setGenerationStatus('Starting generation...');
      handleGenerate();
    }
  }, [isOpen, promptText, isGenerating]);

  const handleImageClick = (image: { id: string; url: string; originalUrl?: string; isLoaded: boolean }) => {
    if (image.isLoaded) {
      console.log('Opening image:', image);
      setSelectedImage(image);
      setIsCreationsModalOpen(true);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-0 right-2 md:right-4 w-full max-w-[662px] md:w-[662px] max-h-[1080px] z-50 px-2 md:px-0">
      <div className="flex flex-col items-end p-1 px-1 md:px-[5px] pb-1 rounded-t-xl border-t border-r border-l border-gray-border bg-dark-secondary shadow-lg">
        {/* Header with Status and Controls */}
        <div className="flex justify-between items-center self-stretch bg-dark-secondary p-1">
          <div className="flex justify-center items-center">
            <div className="flex flex-col items-start">
              <div className="flex h-8 md:h-10 p-1.5 md:p-2 justify-center items-center rounded-md">
                <div className="flex justify-center items-center">
                  <span className="text-gray-light text-center text-xs md:text-sm font-semibold leading-4 md:leading-5 tracking-[-0.4px] md:tracking-[-0.56px]">
                    <span className="hidden sm:inline">{generationStatus}</span>
                    <span className="sm:hidden">{generationStatus.length > 20 ? generationStatus.substring(0, 20) + '...' : generationStatus}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-center items-center">
            <div className="flex flex-col items-start">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex w-8 md:w-10 h-8 md:h-10 justify-center items-center rounded-md hover:bg-gray-border/20 transition-colors"
              >
                <div className="flex flex-col items-start">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 21 21"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className={`w-4 md:w-5 h-4 md:h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  >
                    <path 
                      d="M3.66406 8.31055L10.1641 14.8105L16.6641 8.31055" 
                      stroke="white" 
                      strokeWidth="1.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </button>
            </div>
            
            <button 
              onClick={onClose}
              className="flex w-8 md:w-10 h-8 md:h-10 justify-center items-center rounded-md hover:bg-gray-border/20 transition-colors"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 21 21"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 md:w-5 h-4 md:h-5"
              >
                <path 
                  d="M5.16406 5.81055L15.1641 15.8105M5.16406 15.8105L15.1641 5.81055" 
                  stroke="white" 
                  strokeWidth="1.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Content Area */}
        {isExpanded && (
          <div className="flex w-full justify-center items-start">
            <div className="flex pb-2 justify-center items-center flex-1 self-stretch">
              <div className="flex w-full p-1 px-2 pb-2 justify-center items-start flex-wrap">
                {/* Images Grid */}
                {(() => {
                  console.log('Rendering images array:', images);
                  return images.map((image, index) => (
                  <div key={image.id} className="flex max-w-full sm:max-w-[165px] pt-2 pl-2 flex-col items-start flex-1 self-stretch">
                    <div className="flex flex-col items-start self-stretch rounded">
                      <div 
                        className="h-[100px] sm:h-[153px] self-stretch rounded bg-dark-tertiary cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => handleImageClick(image)}
                      >
                        <RobustImage
                          src={image.url}
                          alt={`Generated image ${index + 1}`}
                          className="w-full h-full"
                          imageClassName="rounded"
                          loadOptions={{
                            maxRetries: 3,
                            retryDelay: 1000,
                            timeout: 10000,
                            useProxy: true,
                            enableCache: true
                          }}
                          onLoad={(result) => {
                            console.log(`✅ Image ${index + 1} loaded successfully:`, result);
                          }}
                          onError={(error) => {
                            console.error(`❌ Image ${index + 1} failed to load:`, error);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  ));
                })()}
                
                {/* Show placeholder placeholders if no images yet */}
                {images.length === 0 && (
                  <>
                <div className="flex max-w-full sm:max-w-[165px] pt-2 pl-2 flex-col items-start flex-1 self-stretch">
                  <div className="flex flex-col items-start self-stretch rounded">
                    <div className="h-[100px] sm:h-[153px] self-stretch rounded bg-dark-tertiary" />
                  </div>
                </div>
                <div className="flex max-w-full sm:max-w-[165px] pt-2 pl-2 flex-col items-start flex-1 self-stretch">
                  <div className="flex flex-col items-start self-stretch rounded">
                    <div className="h-[100px] sm:h-[153px] self-stretch rounded bg-dark-tertiary" />
                  </div>
                </div>
                <div className="hidden sm:flex max-w-[165px] pt-2 pl-2 flex-col items-start flex-1 self-stretch">
                  <div className="flex flex-col items-start self-stretch rounded">
                    <div className="h-[153px] self-stretch rounded bg-dark-tertiary" />
                  </div>
                </div>
                <div className="hidden sm:flex max-w-[165px] pt-2 pl-2 flex-col items-start flex-1 self-stretch">
                  <div className="flex flex-col items-start self-stretch rounded">
                    <div className="h-[153px] self-stretch rounded bg-dark-tertiary" />
                  </div>
                </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Input Section */}
      <div className="flex w-full max-h-10 md:max-h-12 justify-center items-center self-stretch mt-[-40px] md:mt-[-56px] relative z-10">
        <div className="flex h-10 md:h-12 max-w-full justify-center items-center self-stretch">
          <div className="flex w-full h-10 md:h-12 justify-center items-start rounded-[10px] bg-dark-secondary border border-gray-border/50 shadow-sm absolute">
            <div className="flex flex-col items-start flex-1 self-stretch">
              <div className="flex w-full min-h-10 md:min-h-12 p-1 md:p-1.5 flex-col items-start">
                <div className="flex pl-[60%] md:pl-[712px] items-end self-stretch">
                  <div className="flex items-center gap-2 bg-dark-secondary">
                    {/* Camera Icon */}
                    <button className="flex flex-col items-start">
                      <div className="flex w-7 md:w-9 h-7 md:h-9 justify-center items-center rounded-md">
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 21 21"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-4 md:w-5 h-4 md:h-5"
                        >
                          <path 
                            d="M10.6641 9.06055C10.9595 9.06055 11.2521 9.11875 11.5251 9.23182C11.7981 9.34489 12.0461 9.51062 12.2551 9.71956C12.464 9.92849 12.6297 10.1765 12.7428 10.4495C12.8559 10.7225 12.9141 11.0151 12.9141 11.3105C12.9141 11.606 12.8559 11.8986 12.7428 12.1716C12.6297 12.4446 12.464 12.6926 12.2551 12.9015C12.0461 13.1105 11.7981 13.2762 11.5251 13.3893C11.2521 13.5023 10.9595 13.5605 10.6641 13.5605C10.0673 13.5605 9.49503 13.3235 9.07307 12.9015C8.65112 12.4796 8.41406 11.9073 8.41406 11.3105C8.41406 10.7138 8.65112 10.1415 9.07307 9.71956C9.49503 9.2976 10.0673 9.06055 10.6641 9.06055Z" 
                            stroke="#AAAAB1" 
                            strokeWidth="1.5"
                          />
                          <path 
                            d="M14.6641 5.81055H13.5811L12.9311 4.39355C12.8512 4.21956 12.7232 4.07214 12.562 3.9688C12.4009 3.86545 12.2135 3.81053 12.0221 3.81055H9.30606C9.11447 3.81034 8.92685 3.86517 8.76552 3.96853C8.6042 4.07188 8.47596 4.21941 8.39606 4.39355L7.74806 5.81055H6.66406C5.86841 5.81055 5.10535 6.12662 4.54274 6.68923C3.98013 7.25184 3.66406 8.0149 3.66406 8.81055V13.8105C3.66406 14.6062 3.98013 15.3693 4.54274 15.9319C5.10535 16.4945 5.86841 16.8105 6.66406 16.8105H14.6641C15.4597 16.8105 16.2228 16.4945 16.7854 15.9319C17.348 15.3693 17.6641 14.6062 17.6641 13.8105V8.81055C17.6641 8.0149 17.348 7.25184 16.7854 6.68923C16.2228 6.12662 15.4597 5.81055 14.6641 5.81055Z" 
                            stroke="#AAAAB1" 
                            strokeWidth="1.5" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    </button>
                    
                    {/* Generate Button */}
                    <div className="flex flex-col items-start">
                      <button 
                        onClick={handleGenerate}
                        disabled={!localPromptText.trim() || isGenerating}
                        className="flex w-16 md:w-[91px] h-7 md:h-9 min-w-16 md:min-w-[91px] px-2 md:px-3 py-1 md:py-1.5 justify-center items-center rounded-md bg-gray-light shadow-sm hover:bg-gray-light/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="flex flex-col items-center">
                          {isGenerating ? (
                            <div className="w-4 h-4 border-2 border-dark border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                          <span className="text-dark text-center text-xs md:text-sm font-semibold leading-4 md:leading-[21px] tracking-[-0.4px] md:tracking-[-0.56px]">
                            <span className="hidden sm:inline">Generate</span>
                            <span className="sm:hidden">Gen</span>
                          </span>
                          )}
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Text Input Area */}
                <div className="flex w-full min-h-8 md:min-h-12 py-1.5 md:py-3 pr-16 md:pr-20 pl-2 md:pl-4 flex-col items-start flex-1">
                  <textarea
                    value={localPromptText}
                    onChange={(e) => setLocalPromptText(e.target.value)}
                    placeholder="Describe what you want to see and order it framed to your house"
                    className="text-gray-text text-sm md:text-base font-normal leading-5 md:leading-6 tracking-[-0.12px] md:tracking-[-0.16px] bg-transparent border-none outline-none resize-none w-full min-h-6 md:min-h-8 placeholder:text-gray-text"
                    rows={1}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && e.ctrlKey) {
                        handleGenerate();
                      }
                    }}
                  />

                  {/* Gradient Overlay */}
                  <div
                    className="absolute right-0 top-0 w-8 md:w-12 h-full pointer-events-none"
                    style={{
                      background: 'linear-gradient(270deg, #27272A 0%, rgba(38, 39, 43, 0.00) 100%)'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Creations Modal */}
      {isCreationsModalOpen && selectedImage && (
        <CreationsModal
          isOpen={isCreationsModalOpen}
          onClose={() => {
            setIsCreationsModalOpen(false);
            setSelectedImage(null);
          }}
          imageUrl={selectedImage.url}
          promptText={localPromptText}
          imageId={selectedImage.id}
          isMobile={isMobile}
          isCuratedImage={false} // Generated images are not curated images
        />
      )}
    </div>
  );
}
