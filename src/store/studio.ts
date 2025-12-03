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
  
  // Product Type (NEW!)
  productType: 'framed-print' | 'canvas' | 'framed-canvas' | 'acrylic' | 'metal' | 'poster';
  
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
  currency: string; // Display currency (user's currency)
  originalCurrency?: string; // Prodigi's original currency
  originalPrice?: number; // Original price in Prodigi currency
  shippingCost: number;
  
  // Production
  sla: number;
  productionCountry: string;
  
  // Shipping
  destinationCountry?: string; // ISO 3166-1 alpha-2 country code
  shippingMethod?: 'Budget' | 'Standard' | 'Express' | 'Overnight';
  
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

// New type for AI Chat Suggestions (with accept/reject)
export interface AIChatSuggestion {
  id: string;
  type: 'configuration' | 'pricing' | 'comparison' | 'info';
  title: string;
  description: string;
  changes: Partial<FrameConfiguration>;
  currentValues?: Record<string, any>;
  estimatedPrice?: {
    before: number;
    after: number;
    currency: string;
  };
  confidence?: number;
  reason?: string;
  timestamp: number;
}

export interface ConfigurationChangeData {
  id: string;
  timestamp: number;
  changes: Partial<FrameConfiguration>;
  previousConfig: FrameConfiguration;
  source: 'user' | 'ai' | 'suggestion';
  description?: string;
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

export interface AvailableOptions {
  // What options are available for current configuration
  hasFrameColor: boolean;
  hasGlaze: boolean;
  hasMount: boolean;
  hasMountColor: boolean;
  hasPaperType: boolean;
  hasFinish: boolean;
  hasEdge: boolean;
  hasWrap: boolean;
  
  // Available values for each option
  frameColors: string[];
  glazes: string[];
  mounts: string[];
  mountColors: string[];
  paperTypes: string[];
  finishes: string[];
  edges: string[];
  wraps: string[];
  sizes: string[];
}

// ============================================================================
// STORE
// ============================================================================

interface StudioStore {
  // Current configuration
  config: FrameConfiguration;
  
  // Available Options (from facets)
  availableOptions: AvailableOptions | null;
  isFacetsLoading: boolean;
  
  // History for undo/redo
  history: FrameConfiguration[];
  currentHistoryIndex: number;
  
  // AI Suggestions
  suggestions: Suggestion[];
  
  // AI Chat Suggestions (with accept/reject)
  pendingSuggestions: AIChatSuggestion[];
  
  // Room Visualizations
  rooms: RoomVisualization[];
  activeRoomId: string | null;
  
  // UI State
  isAnalyzing: boolean;
  isGeneratingImage: boolean;
  isPricingLoading: boolean;
  
  // Shipping Options
  shippingOptions?: Array<{
    method: 'Budget' | 'Standard' | 'Express' | 'Overnight';
    cost: {
      items: number;
      shipping: number;
      total: number;
      currency: string; // Display currency (user's currency)
    };
    originalCost?: {
      items: number;
      shipping: number;
      total: number;
      currency: string; // Prodigi's original currency
    };
    delivery: {
      min: number;
      max: number;
      formatted: string;
      note?: string;
    };
    productionCountry: string;
  }>;
  
  // Chat State
  conversationId: string | null;
  configurationChanges: ConfigurationChangeData[];
  
  // Actions
  addConfigurationChange: (change: ConfigurationChangeData) => void;
  getConfigurationChanges: () => ConfigurationChangeData[];
  revertToConfiguration: (config: FrameConfiguration) => void;
  updateConfig: (updates: Partial<FrameConfiguration>) => void;
  updateConfigAsync: (updates: Partial<FrameConfiguration>) => Promise<void>;
  resetConfig: () => void;
  
  setImageAnalysis: (analysis: ImageAnalysis) => void;
  setImage: (url: string, id: string) => void;
  
  // Facets
  updateAvailableOptions: (options: AvailableOptions) => void;
  updateAvailableOptionsAsync: (productType?: string) => Promise<void>;
  setFacetsLoading: (isLoading: boolean) => void;
  
  setSuggestions: (suggestions: Suggestion[]) => void;
  applySuggestion: (suggestionId: string) => void;
  dismissSuggestion: (suggestionId: string) => void;
  
  // AI Chat Suggestions Actions
  addPendingSuggestion: (suggestion: AIChatSuggestion) => void;
  acceptSuggestion: (suggestionId: string) => Promise<void>;
  rejectSuggestion: (suggestionId: string) => void;
  clearPendingSuggestions: () => void;
  
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
  
  // Pricing
  updatePricingAsync: () => Promise<void>;
  
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
  productType: 'framed-print', // Default product type
  sku: null,
  frameColor: 'black',
  frameStyle: 'classic',
  frameThickness: 'standard',
  glaze: 'acrylic',
  mount: 'none',
  mountColor: 'white',
  wrap: 'Black', // Default canvas wrap
  size: '16x20',
  paperType: 'enhanced-matte',
  finish: 'matte',
  price: 0,
  currency: 'USD',
  shippingCost: 0,
  sla: 5,
  productionCountry: 'US',
  destinationCountry: 'US', // Will be updated on page load
  shippingMethod: 'Standard',
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
      availableOptions: null,
      isFacetsLoading: false,
      history: [getDefaultConfig()],
      currentHistoryIndex: 0,
      suggestions: [],
      pendingSuggestions: [],
      rooms: [],
      activeRoomId: null,
      isAnalyzing: false,
      isGeneratingImage: false,
      isPricingLoading: false,
      conversationId: null,
      configurationChanges: [],
      
      // Update configuration
      updateConfig: (updates) => {
        set((state) => {
          const previousConfig = state.config;
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
          
          // Create configuration change record
          const change: ConfigurationChangeData = {
            id: `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            changes: updates,
            previousConfig,
            source: 'user', // Default to user; can be overridden with updateConfigFromSource
          };
          
          // Add to configuration changes (keep last 100)
          const newConfigChanges = [...state.configurationChanges, change].slice(-100);
          
          return {
            config: newConfig,
            history: trimmedHistory,
            currentHistoryIndex: trimmedHistory.length - 1,
            configurationChanges: newConfigChanges,
          };
        });
        
        // Trigger pricing update in background (API will handle SKU lookup)
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
      
      // Facets and Available Options
      updateAvailableOptions: (options) => {
        set({ availableOptions: options });
      },
      
      updateAvailableOptionsAsync: async (productType) => {
        const { config, setFacetsLoading, updateAvailableOptions } = get();
        const typeToUse = productType || config.productType;
        
        setFacetsLoading(true);
        
        try {
          const response = await fetch('/api/studio/facets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              productType: typeToUse,
              country: 'US',
            }),
          });
          
          if (response.ok) {
            const data = await response.json();
            updateAvailableOptions(data.availableOptions);
            console.log('[Store] Updated available options:', data.availableOptions);
          } else {
            console.error('[Store] Failed to fetch available options:', response.status);
          }
        } catch (error) {
          console.error('[Store] Error fetching available options:', error);
        } finally {
          setFacetsLoading(false);
        }
      },
      
      setFacetsLoading: (isLoading) => {
        set({ isFacetsLoading: isLoading });
      },
      
      // Async update config with facet refresh
      updateConfigAsync: async (updates) => {
        const { config, updateConfig, updateAvailableOptionsAsync } = get();
        
        // If product type is changing, clean up invalid attributes
        if (updates.productType && updates.productType !== config.productType) {
          const cleanedUpdates = { ...updates };
          
          // Clean up based on the NEW product type
          switch (updates.productType) {
            case 'canvas':
              // Canvas: Only wrap, no frame/glaze/mount
              delete cleanedUpdates.frameColor;
              delete cleanedUpdates.frameStyle;
              delete cleanedUpdates.frameThickness;
              cleanedUpdates.glaze = 'none';
              cleanedUpdates.mount = 'none';
              if (!cleanedUpdates.wrap) cleanedUpdates.wrap = 'Black';
              break;
              
            case 'framed-canvas':
              // Framed canvas: Frame color + wrap, but NO glaze/mount
              cleanedUpdates.glaze = 'none';
              cleanedUpdates.mount = 'none';
              if (!cleanedUpdates.frameColor) cleanedUpdates.frameColor = 'black';
              if (!cleanedUpdates.wrap) cleanedUpdates.wrap = 'Black';
              break;
              
            case 'framed-print':
              // Framed print: Frame + glaze + mount, but NO wrap
              delete cleanedUpdates.wrap;
              if (!cleanedUpdates.frameColor) cleanedUpdates.frameColor = 'black';
              if (!cleanedUpdates.glaze) cleanedUpdates.glaze = 'acrylic';
              if (!cleanedUpdates.mount) cleanedUpdates.mount = 'none';
              break;
              
            case 'acrylic':
            case 'metal':
              // Acrylic/Metal: Usually just finish, no frame/glaze/mount/wrap
              delete cleanedUpdates.frameColor;
              delete cleanedUpdates.wrap;
              cleanedUpdates.glaze = 'none';
              cleanedUpdates.mount = 'none';
              break;
              
            case 'poster':
              // Poster: No frame/glaze/mount/wrap
              delete cleanedUpdates.frameColor;
              delete cleanedUpdates.wrap;
              cleanedUpdates.glaze = 'none';
              cleanedUpdates.mount = 'none';
              break;
          }
          
          // Update config with cleaned attributes
          updateConfig(cleanedUpdates);
          
          // Refresh available options
          await updateAvailableOptionsAsync(updates.productType);
        } else {
          // Normal update
          updateConfig(updates);
        }
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
      
      // AI Chat Suggestions Management
      addPendingSuggestion: (suggestion) => {
        set((state) => ({
          pendingSuggestions: [...state.pendingSuggestions, suggestion],
        }));
      },
      
      acceptSuggestion: async (suggestionId) => {
        const { pendingSuggestions, updateConfigAsync, updatePricingAsync } = get();
        const suggestion = pendingSuggestions.find(s => s.id === suggestionId);
        
        if (!suggestion) return;
        
        try {
          // Apply the configuration changes
          await updateConfigAsync(suggestion.changes);
          
          // Remove from pending
          set((state) => ({
            pendingSuggestions: state.pendingSuggestions.filter(s => s.id !== suggestionId),
          }));
          
          // Update pricing in background
          updatePricingAsync();
        } catch (error) {
          console.error('Error accepting suggestion:', error);
        }
      },
      
      rejectSuggestion: (suggestionId) => {
        set((state) => ({
          pendingSuggestions: state.pendingSuggestions.filter(s => s.id !== suggestionId),
        }));
      },
      
      clearPendingSuggestions: () => {
        set({ pendingSuggestions: [] });
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
      
      // Pricing
      updatePricingAsync: async () => {
        const { config, setPricingLoading } = get();
        
        try {
          setPricingLoading(true);
          
          const response = await fetch('/api/studio/pricing', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              config,
              country: config.destinationCountry || 'US', // ✅ Send country
            }),
          });
          
          if (response.ok) {
            const data = await response.json();
            
            if (data.pricing) {
              const { 
                total, 
                subtotal, // Items cost (frame & print)
                shipping, 
                sla, 
                productionCountry, 
                currency,
                originalCurrency,
                originalTotal,
              } = data.pricing;
              const { sku, shippingOptions, recommended } = data; // ✅ Get shipping options
              
              set((state) => {
                // Preserve user's shipping method selection if it's available in the returned options
                // Only use recommended method if user's selection is not available
                const currentShippingMethod = state.config.shippingMethod || 'Standard';
                const availableMethods = shippingOptions?.map((o: any) => o.method) || [];
                const isMethodAvailable = availableMethods.includes(currentShippingMethod);
                
                // Always preserve user's selection if it's available
                // Only fall back to recommended if the selected method is not available
                const finalShippingMethod = isMethodAvailable 
                  ? currentShippingMethod 
                  : (recommended || availableMethods[0] || 'Standard');

                return {
                  config: {
                    ...state.config,
                    price: subtotal || 0, // Frame & print cost (items), not total
                    shippingCost: shipping || 0,
                    currency: currency || 'USD', // Display currency (user's currency)
                    originalCurrency: originalCurrency || currency, // Prodigi's original currency
                    originalPrice: originalTotal || total, // Original total price in Prodigi currency
                    sla: sla || 5,
                    productionCountry: productionCountry || 'US',
                    shippingMethod: finalShippingMethod, // Preserve user selection when available
                    ...(sku && { sku }), // Update SKU if provided by API
                  },
                  shippingOptions: shippingOptions || [], // ✅ Store all options (with converted prices)
                };
              });
            }
          }
        } catch (error) {
          console.error('Error updating pricing:', error);
        } finally {
          setPricingLoading(false);
        }
      },
      
      // Configuration changes
      addConfigurationChange: (change) => {
        set((state) => ({
          configurationChanges: [...state.configurationChanges, change].slice(-100),
        }));
      },
      
      getConfigurationChanges: () => {
        return get().configurationChanges;
      },
      
      revertToConfiguration: (targetConfig) => {
        set((state) => {
          const previousConfig = state.config;
          
          // Create a revert change record
          const change: ConfigurationChangeData = {
            id: `revert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            changes: targetConfig,
            previousConfig,
            source: 'user',
            description: 'Reverted configuration',
          };
          
          // Add to history
          const newHistory = [
            ...state.history.slice(0, state.currentHistoryIndex + 1),
            targetConfig,
          ];
          const trimmedHistory = newHistory.slice(-50);
          
          return {
            config: targetConfig,
            history: trimmedHistory,
            currentHistoryIndex: trimmedHistory.length - 1,
            configurationChanges: [...state.configurationChanges, change].slice(-100),
          };
        });
        
        // Update pricing
        const newConfig = get().config;
        updatePricingAsync(newConfig);
      },
      
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
 * Wrapper function for backward compatibility
 */
let pricingTimeout: NodeJS.Timeout;

async function updatePricingAsync(config: FrameConfiguration) {
  clearTimeout(pricingTimeout);
  
  pricingTimeout = setTimeout(async () => {
    // Call the store's updatePricingAsync method
    await useStudioStore.getState().updatePricingAsync();
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
  const total = (price || 0) + (shippingCost || 0);
  return isNaN(total) ? 0 : total;
};

