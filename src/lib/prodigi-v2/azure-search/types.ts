/**
 * Comprehensive Prodigi API Type Definitions
 * Based on reverse engineering of Prodigi Dashboard and Azure Search Index
 */

// ============================================================================
// Azure Search Index Types
// ============================================================================

export interface AzureSearchResponse<T = ProdigiCatalogProduct> {
  '@odata.context': string;
  '@odata.count'?: number;
  '@search.facets'?: SearchFacets;
  value: T[];
}

export interface SearchFacets {
  frame?: FacetValue[];
  frameColour?: FacetValue[];
  glaze?: FacetValue[];
  mount?: FacetValue[];
  mountColour?: FacetValue[];
  paperType?: FacetValue[];
  finish?: FacetValue[];
  edge?: FacetValue[];
  size?: FacetValue[];
  category?: FacetValue[];
  style?: FacetValue[];
  brand?: FacetValue[];
  gender?: FacetValue[];
  maxProductDimensionsMm?: RangeFacetValue[];
  productAspectRatio?: RangeFacetValue[];
}

export interface FacetValue {
  value: string;
  count: number;
}

export interface RangeFacetValue {
  from?: number;
  to?: number;
  count: number;
}

// ============================================================================
// Prodigi Catalog Product (from Azure Search Index)
// ============================================================================

export interface ProdigiCatalogProduct {
  '@search.score'?: number;
  
  // Identifiers
  sku: string;
  shortcode: string | null;
  description: string;
  
  // Category & Type
  category: string;
  productType: string;
  
  // Dimensions
  productWidthMm: number;
  productHeightMm: number;
  maxProductDimensionsMm: number;
  productAspectRatio: number;
  fullProductHorizontalDimensions: number;
  fullProductVerticalDimensions: number;
  printedAreaHorizontalDimensions: number;
  printedAreaVerticalDimensions: number;
  sizeUnits: string;
  
  // Frame & Material Options (arrays of available options)
  frameColour?: string[];
  frame?: string[];
  glaze?: string[];
  edge?: string[];
  mount?: string[];
  mountColour?: string[];
  paperType?: string[];
  substrateWeight?: string[];
  wrap?: string[];
  finish?: string[];
  style?: string[];
  size?: string[];
  brand?: string[];
  gender?: string[];
  
  // Pricing & Logistics
  basePriceFrom: number; // In pence/cents
  priceCurrency: string;
  lastUpdated: string;
  sla: number; // Hours
  productionCountries: string[];
  
  // Technical
  optimumDpi: number;
  searchWeighting: number;
}

// ============================================================================
// Query Builder Types
// ============================================================================

export interface ProdigiSearchFilters {
  // Required
  country: string;
  
  // Category
  category?: string;
  
  // Frame Options
  frameColors?: string[];
  frameStyles?: string[];
  frameThickness?: string[];
  
  // Glazing
  glazes?: string[];
  
  // Mount/Mat
  mounts?: string[];
  mountColors?: string[];
  
  // Paper & Material
  paperTypes?: string[];
  finishes?: string[];
  edges?: string[];
  
  // Size Filtering
  minDimensionMm?: number;
  maxDimensionMm?: number;
  sizeCategory?: SizeCategory;
  
  // Aspect Ratio
  aspectRatioMin?: number;
  aspectRatioMax?: number;
  orientation?: Orientation;
  
  // Metadata
  brands?: string[];
  productTypes?: string[];
}

export interface ProdigiSearchOptions {
  top?: number;
  skip?: number;
  selectFields?: string[];
  includeFacets?: boolean;
  scoringProfile?: string;
  scoringParameter?: string;
}

export type SizeCategory = 
  | 'small'        // < 300mm
  | 'medium'       // 300-500mm
  | 'medium-large' // 500-700mm
  | 'large'        // 700-1000mm
  | 'extra-large'  // 1000-1500mm
  | 'oversized';   // > 1500mm

export type Orientation = 'portrait' | 'square' | 'landscape';

// ============================================================================
// Constants
// ============================================================================

export const PRODIGI_CONSTANTS = {
  // Azure Search Index
  SEARCH_ENDPOINT: 'https://pwintylive.search.windows.net/indexes/live-catalogue/docs',
  API_VERSION: '2016-09-01',
  API_KEY: '9142D85CE18C3AE0349B1FB21956B072',
  
  // Categories
  CATEGORIES: {
    WALL_ART: 'Wall art',
    APPAREL: 'Apparel',
    HOME_LIVING: 'Home & Living',
    STATIONERY: 'Stationery',
  } as const,
  
  // Aspect Ratios (as percentage: height/width * 100)
  ASPECT_RATIOS: {
    PORTRAIT: { min: 0, max: 95, tolerance: 5 },
    SQUARE: { min: 95, max: 105, tolerance: 5 },
    LANDSCAPE: { min: 105, max: 999, tolerance: 5 },
  } as const,
  
  // Size Ranges (in mm)
  SIZE_RANGES: {
    SMALL: { min: 0, max: 300, label: 'Small (under 30cm)' },
    MEDIUM: { min: 300, max: 500, label: 'Medium (30-49cm)' },
    MEDIUM_LARGE: { min: 500, max: 700, label: 'Medium-Large (50-69cm)' },
    LARGE: { min: 700, max: 1000, label: 'Large (70-99cm)' },
    EXTRA_LARGE: { min: 1000, max: 1500, label: 'Extra Large (100-149cm)' },
    OVERSIZED: { min: 1500, max: 10000, label: 'Oversized (150cm+)' },
  } as const,
  
  // Frame Colors
  FRAME_COLORS: [
    'black',
    'white',
    'brown',
    'natural',
    'gold',
    'silver',
    'dark grey',
    'light grey',
  ] as const,
  
  // Glazes
  GLAZES: [
    'none',
    'acrylic / perspex',
    'float glass',
    'motheye',
    'gloss varnish',
  ] as const,
  
  // Mounts
  MOUNT_THICKNESSES: [
    'no mount / mat',
    '1.4mm',
    '2.0mm',
    '2.4mm',
  ] as const,
  
  // Mount Colors
  MOUNT_COLORS: [
    'snow white',
    'black',
    'off-white',
    'navy',
  ] as const,
  
  // Finishes
  FINISHES: [
    'gloss',
    'matte',
    'lustre',
  ] as const,
  
  // Edge Depths
  EDGE_DEPTHS: [
    '19mm',
    '38mm',
    'rolled',
  ] as const,
} as const;

// ============================================================================
// Facet Processing Types
// ============================================================================

export interface ProcessedFacets {
  frames: ProcessedFacet[];
  frameColors: ProcessedFacet[];
  glazes: ProcessedFacet[];
  mounts: ProcessedFacet[];
  mountColors: ProcessedFacet[];
  paperTypes: ProcessedFacet[];
  finishes: ProcessedFacet[];
  edges: ProcessedFacet[];
  sizes: ProcessedFacet[];
  dimensionRanges: ProcessedRangeFacet[];
  aspectRatios: ProcessedRangeFacet[];
}

export interface ProcessedFacet {
  value: string;
  label: string; // User-friendly label
  count: number;
  available: boolean;
}

export interface ProcessedRangeFacet {
  from?: number;
  to?: number;
  label: string;
  count: number;
  available: boolean;
}

// ============================================================================
// Product Matching & Scoring
// ============================================================================

export interface ProductMatch {
  product: ProdigiCatalogProduct;
  matchScore: number;
  matchReasons: string[];
  confidence: number;
}

export interface ImageAnalysisData {
  width: number;
  height: number;
  aspectRatio: number;
  orientation: Orientation;
  dominantColors?: string[];
  colorTemperature?: 'warm' | 'cool' | 'neutral';
  complexity?: number; // 0-1
  dpi?: number;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface SearchResult {
  products: ProdigiCatalogProduct[];
  totalCount: number;
  facets?: ProcessedFacets;
  appliedFilters: ProdigiSearchFilters;
  recommendations?: ProductMatch[];
}

// ============================================================================
// User Preferences & Context
// ============================================================================

export interface UserPreferences {
  budget?: { min: number; max: number };
  style?: 'modern' | 'classic' | 'ornate' | 'minimal';
  priority?: 'price' | 'quality' | 'speed';
  room?: {
    style: string;
    lightLevel: 'bright' | 'moderate' | 'dim';
    wallColor?: string;
  };
}

// ============================================================================
// Utility Types
// ============================================================================

export type FrameColor = typeof PRODIGI_CONSTANTS.FRAME_COLORS[number];
export type Glaze = typeof PRODIGI_CONSTANTS.GLAZES[number];
export type MountThickness = typeof PRODIGI_CONSTANTS.MOUNT_THICKNESSES[number];
export type MountColor = typeof PRODIGI_CONSTANTS.MOUNT_COLORS[number];
export type Finish = typeof PRODIGI_CONSTANTS.FINISHES[number];
export type EdgeDepth = typeof PRODIGI_CONSTANTS.EDGE_DEPTHS[number];

