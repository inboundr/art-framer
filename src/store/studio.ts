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
  
  // Aspect Ratio (editable option that filters sizes)
  aspectRatio?: 'Portrait' | 'Landscape' | 'Square';
  
  // Paper
  paperType: string;
  finish: string;
  
  // Wrap (for canvas)
  wrap?: 'Black' | 'White' | 'ImageWrap' | 'MirrorWrap';
  
  // Edge/Depth (for canvas products - 19mm slim, 38mm standard)
  edge?: '19mm' | '38mm' | 'auto';
  
  // Canvas Type (standard, slim, eco) - affects SKU selection
  canvasType?: 'standard' | 'slim' | 'eco' | 'auto';
  
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
  hasFrameStyle: boolean;
  hasGlaze: boolean;
  hasMount: boolean;
  hasMountColor: boolean;
  hasPaperType: boolean;
  hasFinish: boolean;
  hasEdge: boolean;
  hasWrap: boolean;
  hasAspectRatio: boolean;
  
  // Available values for each option
  frameColors: string[];
  frameStyles: string[];
  glazes: string[];
  mounts: string[];
  mountColors: string[];
  paperTypes: string[];
  finishes: string[];
  edges: string[];
  wraps: string[];
  sizes: string[];
  aspectRatios: string[];
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
  updateAvailableOptionsAsync: (productType?: string, filters?: Partial<Record<string, string[]>>) => Promise<void>;
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
  edge: 'auto', // Auto-select edge depth based on product
  canvasType: 'auto', // Auto-select canvas type (standard/slim/eco)
  size: '16x20',
  aspectRatio: 'Landscape', // Default aspect ratio
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
        
        // Validate and auto-correct current configuration against available options
        const { config } = get();
        const updates: Partial<FrameConfiguration> = {};
        let needsUpdate = false;
        
        // Validate frame color
        if (options.hasFrameColor && config.frameColor) {
          const validColors = options.frameColors.map(c => c.toLowerCase());
          if (!validColors.includes(config.frameColor.toLowerCase())) {
            updates.frameColor = options.frameColors[0] || 'black';
            needsUpdate = true;
            console.log(`[Validation] Invalid frame color "${config.frameColor}", switching to "${updates.frameColor}"`);
          }
        }
        
        // Validate frame style
        if (options.hasFrameStyle && config.frameStyle) {
          const validStyles = options.frameStyles.map(s => s.toLowerCase());
          if (!validStyles.includes(config.frameStyle.toLowerCase())) {
            updates.frameStyle = options.frameStyles[0] || 'Classic';
            needsUpdate = true;
            console.log(`[Validation] Invalid frame style "${config.frameStyle}", switching to "${updates.frameStyle}"`);
          }
        }
        
        // Validate glaze
        if (options.hasGlaze && config.glaze && config.glaze !== 'none') {
          const validGlazes = options.glazes.map(g => g.toLowerCase().replace(/\s+/g, '-'));
          const currentGlaze = config.glaze.toLowerCase().replace(/\s+/g, '-');
          if (!validGlazes.includes(currentGlaze)) {
            updates.glaze = (validGlazes[0] as 'acrylic' | 'glass' | 'motheye') || 'none';
            needsUpdate = true;
            console.log(`[Validation] Invalid glaze "${config.glaze}", switching to "${updates.glaze}"`);
          }
        }
        
        // Validate mount
        if (options.hasMount && config.mount && config.mount !== 'none') {
          const validMounts = options.mounts.map(m => m.toLowerCase());
          if (!validMounts.includes(config.mount.toLowerCase())) {
            updates.mount = (validMounts[0] as '1.4mm' | '2.0mm' | '2.4mm') || 'none';
            needsUpdate = true;
            console.log(`[Validation] Invalid mount "${config.mount}", switching to "${updates.mount}"`);
          }
        }
        
        // Validate mount color
        if (options.hasMountColor && config.mountColor) {
          const validMountColors = options.mountColors.map(c => c.toLowerCase());
          if (!validMountColors.includes(config.mountColor.toLowerCase())) {
            updates.mountColor = options.mountColors[0] || 'white';
            needsUpdate = true;
            console.log(`[Validation] Invalid mount color "${config.mountColor}", switching to "${updates.mountColor}"`);
          }
        }
        
        // Validate wrap
        if (options.hasWrap && config.wrap) {
          const validWraps = options.wraps.map(w => w.toLowerCase());
          if (!validWraps.includes(config.wrap.toLowerCase())) {
            updates.wrap = (options.wraps[0] as 'Black' | 'White' | 'ImageWrap' | 'MirrorWrap') || 'Black';
            needsUpdate = true;
            console.log(`[Validation] Invalid wrap "${config.wrap}", switching to "${updates.wrap}"`);
          }
        }
        
        // Validate finish
        if (options.hasFinish && config.finish) {
          const validFinishes = options.finishes.map(f => f.toLowerCase());
          if (!validFinishes.includes(config.finish.toLowerCase())) {
            updates.finish = options.finishes[0] || 'gloss';
            needsUpdate = true;
            console.log(`[Validation] Invalid finish "${config.finish}", switching to "${updates.finish}"`);
          }
        }
        
        // Validate edge
        if (options.hasEdge && config.edge && config.edge !== 'auto') {
          const validEdges = options.edges.map(e => e.toLowerCase());
          if (!validEdges.includes(config.edge.toLowerCase())) {
            updates.edge = (options.edges[0] as '19mm' | '38mm') || 'auto';
            needsUpdate = true;
            console.log(`[Validation] Invalid edge "${config.edge}", switching to "${updates.edge}"`);
          }
        }
        
        // Apply updates if needed
        if (needsUpdate) {
          console.log('[Validation] Auto-correcting configuration:', updates);
          set((state) => ({
            config: { ...state.config, ...updates }
          }));
          
          // Update pricing with corrected config
          setTimeout(() => {
            get().updatePricingAsync();
          }, 100);
        }
      },
      
      updateAvailableOptionsAsync: async (productType, filters) => {
        const { config, setFacetsLoading, updateAvailableOptions } = get();
        const typeToUse = productType || config.productType;
        const country = config.destinationCountry || 'US'; // Use selected country or default to US
        const aspectRatio = (filters as any)?.aspectRatioLabel || config.aspectRatio;
        
        setFacetsLoading(true);
        
        try {
          // Normalize filters (map aspectRatioLabel to ProdigiSearchFilters)
          let normalizedFilters: any = filters || {};
          if (aspectRatio) {
            const arLower = aspectRatio.toLowerCase();
            if (arLower === 'landscape') {
              normalizedFilters = {
                ...normalizedFilters,
                aspectRatioMin: 105,
                aspectRatioMax: 100000,
              };
            } else if (arLower === 'portrait') {
              normalizedFilters = {
                ...normalizedFilters,
                aspectRatioMin: 0,
                aspectRatioMax: 95,
              };
            } else {
              normalizedFilters = {
                ...normalizedFilters,
                aspectRatioMin: 95,
                aspectRatioMax: 105,
              };
            }
          }

          // Fetch facets and sizes in parallel
          const [facetsResponse, sizesResponse] = await Promise.allSettled([
            fetch('/api/studio/facets', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                productType: typeToUse,
                country: country,
                filters: normalizedFilters,
              }),
            }),
            fetch(`/api/studio/sizes?productType=${typeToUse}&country=${country}${aspectRatio ? `&aspectRatio=${aspectRatio}` : ''}`, {
              method: 'GET',
            }),
          ]);
          
          let availableOptions: any = {};
          
          // Process facets response
          if (facetsResponse.status === 'fulfilled' && facetsResponse.value.ok) {
            const facetsData = await facetsResponse.value.json();
            availableOptions = facetsData.availableOptions || {};
          }
          
          // Process sizes response (more reliable than facets)
          if (sizesResponse.status === 'fulfilled' && sizesResponse.value.ok) {
            const sizesData = await sizesResponse.value.json();
            if (sizesData.sizes && sizesData.sizes.length > 0) {
              availableOptions.sizes = sizesData.sizes;
              console.log(`[Store] Fetched ${sizesData.sizes.length} sizes for ${typeToUse} from catalog service`);
            }
          }
          
          // If no sizes from catalog, keep sizes from facets (if any)
          if (!availableOptions.sizes || availableOptions.sizes.length === 0) {
            console.log(`[Store] No sizes found for ${typeToUse}, using fallback`);
          }
          
          updateAvailableOptions(availableOptions);
          console.log('[Store] Updated available options:', availableOptions);
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
          
          // Validate size for new product type
          try {
            const country = config.destinationCountry || 'US';
            const aspectRatio = config.aspectRatio;
            const sizesResponse = await fetch(
              `/api/studio/sizes?productType=${updates.productType}&country=${country}${aspectRatio ? `&aspectRatio=${aspectRatio}` : ''}`
            );
            
            if (sizesResponse.ok) {
              const sizesData = await sizesResponse.json();
              const availableSizes = sizesData.sizes || [];
              
              // If current size is not available for new product type, reset to first available
              if (availableSizes.length > 0 && !availableSizes.includes(config.size)) {
                console.log(`[Config] Size ${config.size} not available for ${updates.productType}, resetting to ${availableSizes[0]}`);
                cleanedUpdates.size = availableSizes[0];
              }
            }
          } catch (error) {
            console.error('[Config] Failed to validate size:', error);
            // Continue with update even if size validation fails
          }
          
          // Update config with cleaned attributes
          updateConfig(cleanedUpdates);
          
          // Refresh available options
          await updateAvailableOptionsAsync(updates.productType);
        } else {
          // Normal update - refresh available options to get adaptive options
          updateConfig(updates);
          
          // Refresh available options with current configuration filters
          // This ensures options adapt when frame style or other selections change
          const filters: Partial<Record<string, string[]>> = {};
          const newConfig = { ...config, ...updates };
          
          if (newConfig.frameStyle && newConfig.frameStyle !== 'classic' && newConfig.frameStyle !== 'Classic') {
            filters.frameStyles = [newConfig.frameStyle];
          }
          
          if (newConfig.size) {
            filters.sizes = [newConfig.size];
          }
          
          if (newConfig.frameColor && newConfig.frameColor !== 'black') {
            filters.frameColors = [newConfig.frameColor];
          }
          
          // Refresh options with filters to get compatible options
          await updateAvailableOptionsAsync(newConfig.productType, filters);
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
        const { config, setPricingLoading, availableOptions } = get();
        
        // Validate configuration before making API call
        if (availableOptions) {
          const validationErrors: string[] = [];
          
          // Check if selected options are available
          if (availableOptions.hasFrameColor && config.frameColor) {
            const validColors = availableOptions.frameColors.map(c => c.toLowerCase());
            if (!validColors.includes(config.frameColor.toLowerCase())) {
              validationErrors.push(`Frame color "${config.frameColor}" is not available`);
            }
          }
          
          if (availableOptions.hasFrameStyle && config.frameStyle) {
            const validStyles = availableOptions.frameStyles.map(s => s.toLowerCase());
            if (!validStyles.includes(config.frameStyle.toLowerCase())) {
              validationErrors.push(`Frame style "${config.frameStyle}" is not available`);
            }
          }
          
          if (validationErrors.length > 0) {
            console.warn('[Pricing] Configuration validation failed:', validationErrors);
            console.warn('[Pricing] Skipping pricing update - configuration will be auto-corrected');
            return;
          }
        }
        
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
          } else {
            // Handle API errors - parse error response and clean invalid config
            const errorData = await response.json().catch(() => ({}));
            console.error('[Pricing] API error:', response.status, errorData);
            console.error('[Pricing] Current config:', config);
            
            // If validation error, try to clean invalid attributes from config
            if (response.status === 400 && errorData.validationErrors) {
              const { config } = get();
              const cleanedConfig = { ...config };
              
              // Remove invalid attributes based on error messages
              if (errorData.validationErrors.some((e: string) => e.includes('Glaze is not available'))) {
                cleanedConfig.glaze = 'none';
              }
              if (errorData.validationErrors.some((e: string) => e.includes('Mount is not available'))) {
                cleanedConfig.mount = 'none';
              }
              if (errorData.validationErrors.some((e: string) => e.includes('Wrap is not available'))) {
                delete cleanedConfig.wrap;
              }
              
              // Update config with cleaned values and retry
              set((state) => ({
                config: cleanedConfig,
              }));
              
              // Retry pricing update with cleaned config
              console.log('[Pricing] Retrying with cleaned config');
              await get().updatePricingAsync();
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

