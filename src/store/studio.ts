/**
 * AI Studio Global State Management
 * 
 * Manages all state for the AI-powered frame customization experience
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ============================================================================
// TYPES
// ============================================================================

export interface ImageAnalysis {
  dominantColors: string[];
  colorTemperature: 'warm' | 'cool' | 'neutral';
  colorTemperatureConfidence: number;
  subjectMatter: string[];
  mood: string[];
  complexity: number; // 0-1
  recommendedFrameColors: string[];
  recommendedFrameStyle: string;
  recommendedGlazing: string;
  mountRecommendation: boolean;
  mountReason?: string;
  confidence: number; // 0-1
}

export interface FrameConfiguration {
  // Image
  imageUrl: string | null;
  imageId: string | null;
  imageAnalysis: ImageAnalysis | null;
  
  // Frame Options
  sku: string | null;
  frameColor: string;
  frameStyle: string;
  frameThickness: string;
  
  // Glazing
  glaze: 'none' | 'acrylic' | 'glass' | 'motheye';
  
  // Mount/Mat
  mount: 'none' | '1.4mm' | '2.0mm' | '2.4mm';
  mountColor: string;
  
  // Size
  size: string;
  customWidth?: number;
  customHeight?: number;
  
  // Paper
  paperType: string;
  finish: string;
  
  // Wrap (for canvas)
  wrap?: 'Black' | 'White' | 'ImageWrap' | 'MirrorWrap';
  
  // Pricing
  price: number;
  currency: string;
  shippingCost: number;
  
  // Production
  sla: number;
  productionCountry: string;
  
  // AI Metadata
  aiConfidenceScore: number;
  lastModified: number;
}

export interface Suggestion {
  id: string;
  type: 'add' | 'change' | 'upgrade' | 'remove';
  target: keyof FrameConfiguration;
  value: any;
  reason: string;
  impact: {
    price?: number;
    aesthetic?: number;
    quality?: number;
  };
  confidence: number;
  priority: number;
}

export interface RoomVisualization {
  id: string;
  roomImageUrl: string;
  wallDetection: {
    walls: Array<{
      id: string;
      bounds: { x1: number; y1: number; x2: number; y2: number };
      center: { x: number; y: number };
      dimensions?: { width: number; height: number };
    }>;
    lighting: string;
    style: string;
  };
  framePosition: { x: number; y: number };
  frameSize: { width: number; height: number };
}

// ============================================================================
// STORE
// ============================================================================

interface StudioStore {
  // Current configuration
  config: FrameConfiguration;
  
  // History for undo/redo
  history: FrameConfiguration[];
  currentHistoryIndex: number;
  
  // AI Suggestions
  suggestions: Suggestion[];
  
  // Room Visualizations
  rooms: RoomVisualization[];
  activeRoomId: string | null;
  
  // UI State
  isAnalyzing: boolean;
  isGeneratingImage: boolean;
  isPricingLoading: boolean;
  
  // Chat State
  conversationId: string | null;
  
  // Actions
  updateConfig: (updates: Partial<FrameConfiguration>) => void;
  resetConfig: () => void;
  
  setImageAnalysis: (analysis: ImageAnalysis) => void;
  setImage: (url: string, id: string) => void;
  
  setSuggestions: (suggestions: Suggestion[]) => void;
  applySuggestion: (suggestionId: string) => void;
  dismissSuggestion: (suggestionId: string) => void;
  
  addRoom: (room: RoomVisualization) => void;
  setActiveRoom: (roomId: string | null) => void;
  updateRoomFramePosition: (roomId: string, position: { x: number; y: number }) => void;
  
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  
  setAnalyzing: (isAnalyzing: boolean) => void;
  setGeneratingImage: (isGenerating: boolean) => void;
  setPricingLoading: (isLoading: boolean) => void;
  
  setConversationId: (id: string) => void;
  
  // Persistence
  saveConfiguration: (name: string) => Promise<void>;
  loadConfiguration: (id: string) => Promise<void>;
}

// ============================================================================
// DEFAULT STATE
// ============================================================================

const getDefaultConfig = (): FrameConfiguration => ({
  imageUrl: null,
  imageId: null,
  imageAnalysis: null,
  sku: null,
  frameColor: 'black',
  frameStyle: 'classic',
  frameThickness: 'standard',
  glaze: 'acrylic',
  mount: 'none',
  mountColor: 'white',
  size: '16x20',
  paperType: 'enhanced-matte',
  finish: 'matte',
  price: 0,
  currency: 'USD',
  shippingCost: 0,
  sla: 5,
  productionCountry: 'US',
  aiConfidenceScore: 0,
  lastModified: Date.now(),
});

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useStudioStore = create<StudioStore>()(
  persist(
    (set, get) => ({
      // Initial State
      config: getDefaultConfig(),
      history: [getDefaultConfig()],
      currentHistoryIndex: 0,
      suggestions: [],
      rooms: [],
      activeRoomId: null,
      isAnalyzing: false,
      isGeneratingImage: false,
      isPricingLoading: false,
      conversationId: null,
      
      // Update configuration
      updateConfig: (updates) => {
        set((state) => {
          const newConfig = {
            ...state.config,
            ...updates,
            lastModified: Date.now(),
          };
          
          // Add to history
          const newHistory = [
            ...state.history.slice(0, state.currentHistoryIndex + 1),
            newConfig,
          ];
          
          // Keep last 50 history items
          const trimmedHistory = newHistory.slice(-50);
          
          return {
            config: newConfig,
            history: trimmedHistory,
            currentHistoryIndex: trimmedHistory.length - 1,
          };
        });
        
        // Trigger pricing update in background
        const { config } = get();
        updatePricingAsync(config);
      },
      
      // Reset configuration
      resetConfig: () => {
        const defaultConfig = getDefaultConfig();
        set({
          config: defaultConfig,
          history: [defaultConfig],
          currentHistoryIndex: 0,
          suggestions: [],
        });
      },
      
      // Image analysis
      setImageAnalysis: (analysis) => {
        set((state) => ({
          config: {
            ...state.config,
            imageAnalysis: analysis,
            aiConfidenceScore: analysis.confidence,
          },
        }));
      },
      
      setImage: (url, id) => {
        set((state) => ({
          config: {
            ...state.config,
            imageUrl: url,
            imageId: id,
          },
        }));
      },
      
      // Suggestions
      setSuggestions: (suggestions) => {
        set({ suggestions });
      },
      
      applySuggestion: (suggestionId) => {
        const state = get();
        const suggestion = state.suggestions.find(s => s.id === suggestionId);
        
        if (suggestion) {
          state.updateConfig({
            [suggestion.target]: suggestion.value,
          });
          
          // Remove applied suggestion
          set((state) => ({
            suggestions: state.suggestions.filter(s => s.id !== suggestionId),
          }));
        }
      },
      
      dismissSuggestion: (suggestionId) => {
        set((state) => ({
          suggestions: state.suggestions.filter(s => s.id !== suggestionId),
        }));
      },
      
      // Room visualization
      addRoom: (room) => {
        set((state) => ({
          rooms: [...state.rooms, room],
          activeRoomId: room.id,
        }));
      },
      
      setActiveRoom: (roomId) => {
        set({ activeRoomId: roomId });
      },
      
      updateRoomFramePosition: (roomId, position) => {
        set((state) => ({
          rooms: state.rooms.map(room =>
            room.id === roomId
              ? { ...room, framePosition: position }
              : room
          ),
        }));
      },
      
      // Undo/Redo
      undo: () => {
        set((state) => {
          if (state.currentHistoryIndex > 0) {
            const newIndex = state.currentHistoryIndex - 1;
            return {
              config: state.history[newIndex],
              currentHistoryIndex: newIndex,
            };
          }
          return state;
        });
      },
      
      redo: () => {
        set((state) => {
          if (state.currentHistoryIndex < state.history.length - 1) {
            const newIndex = state.currentHistoryIndex + 1;
            return {
              config: state.history[newIndex],
              currentHistoryIndex: newIndex,
            };
          }
          return state;
        });
      },
      
      canUndo: () => {
        const state = get();
        return state.currentHistoryIndex > 0;
      },
      
      canRedo: () => {
        const state = get();
        return state.currentHistoryIndex < state.history.length - 1;
      },
      
      // UI State
      setAnalyzing: (isAnalyzing) => set({ isAnalyzing }),
      setGeneratingImage: (isGeneratingImage) => set({ isGeneratingImage }),
      setPricingLoading: (isPricingLoading) => set({ isPricingLoading }),
      
      // Chat
      setConversationId: (id) => set({ conversationId: id }),
      
      // Persistence
      saveConfiguration: async (name) => {
        const { config } = get();
        
        try {
          const response = await fetch('/api/studio/configurations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, config }),
          });
          
          if (!response.ok) {
            throw new Error('Failed to save configuration');
          }
          
          return response.json();
        } catch (error) {
          console.error('Error saving configuration:', error);
          throw error;
        }
      },
      
      loadConfiguration: async (id) => {
        try {
          const response = await fetch(`/api/studio/configurations/${id}`);
          
          if (!response.ok) {
            throw new Error('Failed to load configuration');
          }
          
          const { config } = await response.json();
          
          set({
            config,
            history: [config],
            currentHistoryIndex: 0,
          });
        } catch (error) {
          console.error('Error loading configuration:', error);
          throw error;
        }
      },
    }),
    {
      name: 'studio-storage',
      partialize: (state) => ({
        config: state.config,
        history: state.history.slice(-10), // Keep last 10 for persistence
        currentHistoryIndex: Math.min(state.currentHistoryIndex, 9),
        rooms: state.rooms,
        conversationId: state.conversationId,
      }),
    }
  )
);

// ============================================================================
// BACKGROUND TASKS
// ============================================================================

/**
 * Update pricing in the background (debounced)
 */
let pricingTimeout: NodeJS.Timeout;

async function updatePricingAsync(config: FrameConfiguration) {
  clearTimeout(pricingTimeout);
  
  pricingTimeout = setTimeout(async () => {
    try {
      useStudioStore.getState().setPricingLoading(true);
      
      const response = await fetch('/api/studio/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });
      
      if (response.ok) {
        const { price, shippingCost, sla, productionCountry } = await response.json();
        
        useStudioStore.setState((state) => ({
          config: {
            ...state.config,
            price,
            shippingCost,
            sla,
            productionCountry,
          },
        }));
      }
    } catch (error) {
      console.error('Error updating pricing:', error);
    } finally {
      useStudioStore.getState().setPricingLoading(false);
    }
  }, 500); // 500ms debounce
}

// ============================================================================
// SELECTORS
// ============================================================================

/**
 * Get current frame configuration
 */
export const useFrameConfig = () => useStudioStore((state) => state.config);

/**
 * Get current suggestions
 */
export const useSuggestions = () => useStudioStore((state) => state.suggestions);

/**
 * Get active room visualization
 */
export const useActiveRoom = () => {
  const { rooms, activeRoomId } = useStudioStore();
  return rooms.find(r => r.id === activeRoomId) || null;
};

/**
 * Get total price (frame + shipping)
 */
export const useTotalPrice = () => {
  const { price, shippingCost } = useStudioStore((state) => state.config);
  return price + shippingCost;
};

