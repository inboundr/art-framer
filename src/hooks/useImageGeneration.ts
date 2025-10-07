'use client';

import { useState, useCallback, useEffect } from 'react';
import { ideogramAPI, IdeogramImageGenerationRequest, IdeogramImageGenerationResponse } from '@/lib/ideogram/api';
import { useAuth } from '@/hooks/useAuth';

interface UseImageGenerationOptions {
  onSuccess?: (response: IdeogramImageGenerationResponse) => void;
  onError?: (error: Error) => void;
  onProgress?: (status: string) => void;
}

export function useImageGeneration(options: UseImageGenerationOptions = {}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentGeneration, setCurrentGeneration] = useState<IdeogramImageGenerationResponse | null>(null);
  const [generationHistory, setGenerationHistory] = useState<IdeogramImageGenerationResponse[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();

  const generateImage = useCallback(async (request: IdeogramImageGenerationRequest) => {
    if (!user) {
      const authError = new Error('User must be authenticated to generate images');
      setError(authError);
      options.onError?.(authError);
      return null;
    }

    setIsGenerating(true);
    setError(null);
    options.onProgress?.('Starting generation...');

    try {
      // Start the generation
      const response = await ideogramAPI.generateImage(request);
      setCurrentGeneration(response);
      options.onProgress?.('Generation started, processing...');
      options.onSuccess?.(response);

      // Poll for status updates
      if (response.status === 'pending' || response.status === 'generating') {
        pollGenerationStatus(response.id);
      }

      return response;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to start generation');
      setError(error);
      options.onError?.(error);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [user, options]);

  const pollGenerationStatus = useCallback(async (generationId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const status = await ideogramAPI.getGenerationStatus(generationId);
        setCurrentGeneration(status);
        
        if (status.status === 'completed') {
          options.onProgress?.('Generation completed!');
          clearInterval(pollInterval);
          
          // Add to history
          setGenerationHistory(prev => [status, ...prev]);
          
          // Save to local storage for persistence
          const history = JSON.parse(localStorage.getItem('generationHistory') || '[]');
          history.unshift(status);
          localStorage.setItem('generationHistory', JSON.stringify(history.slice(0, 50))); // Keep last 50
        } else if (status.status === 'failed') {
          options.onProgress?.('Generation failed');
          clearInterval(pollInterval);
          setError(new Error(status.error || 'Generation failed'));
        } else {
          options.onProgress?.(`Status: ${status.status}`);
        }
      } catch (err) {
        console.error('Error polling generation status:', err);
        clearInterval(pollInterval);
      }
    }, 2000); // Poll every 2 seconds

    // Cleanup after 10 minutes (300 seconds)
    setTimeout(() => {
      clearInterval(pollInterval);
    }, 300000);
  }, [options, generateImage]);

  const cancelGeneration = useCallback(async (generationId: string) => {
    try {
      await ideogramAPI.cancelGeneration(generationId);
      setCurrentGeneration(prev => prev ? { ...prev, status: 'failed' } : null);
      options.onProgress?.('Generation cancelled');
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to cancel generation');
      setError(error);
      options.onError?.(error);
    }
  }, [options]);

  const retryGeneration = useCallback(async (generationId: string) => {
    const generation = generationHistory.find(g => g.id === generationId);
    if (!generation) return;

    const request: IdeogramImageGenerationRequest = {
      prompt: generation.prompt,
      negative_prompt: generation.negative_prompt,
      aspect_ratio: generation.aspect_ratio as any,
      width: generation.width,
      height: generation.height,
      model: generation.model as any,
      num_images: generation.number_of_images as any,
      rendering_speed: generation.render_speed as any,
      magic_prompt: generation.magic_prompt as any,
      style_type: generation.style as any,
      color_palette: generation.color as any,
      character_reference_images: generation.character ? [generation.character] : undefined,
      seed: generation.seed,
    };

    return generateImage(request);
  }, [generationHistory, generateImage]);

  const clearHistory = useCallback(() => {
    setGenerationHistory([]);
    localStorage.removeItem('generationHistory');
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Load generation history from localStorage on mount
  useEffect(() => {
    try {
      const history = localStorage.getItem('generationHistory');
      if (history) {
        setGenerationHistory(JSON.parse(history));
      }
    } catch (err) {
      console.error('Failed to load generation history:', err);
    }
  }, []);

  return {
    // State
    isGenerating,
    currentGeneration,
    generationHistory,
    error,
    
    // Actions
    generateImage,
    cancelGeneration,
    retryGeneration,
    clearHistory,
    clearError,
    
    // Computed
    hasActiveGeneration: currentGeneration?.status === 'pending' || currentGeneration?.status === 'generating',
    completedGenerations: generationHistory.filter(g => g.status === 'completed'),
    failedGenerations: generationHistory.filter(g => g.status === 'failed'),
  };
}
