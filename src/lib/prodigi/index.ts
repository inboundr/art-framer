/**
 * Prodigi Integration - Main Export
 * Complete API for interacting with Prodigi's catalog and services
 */

// Re-export all types
export type {
  ProdigiSearchFilters,
  ProdigiSearchOptions,
  SearchResult,
  ProcessedFacets,
  ProductMatch,
  ImageAnalysisData,
  UserPreferences,
  ProdigiCatalogProduct,
  SizeCategory,
  Orientation,
  FacetValue,
  RangeFacetValue,
  AzureSearchResponse,
  SearchFacets,
} from './types';

// Re-export constants
export { PRODIGI_CONSTANTS } from './types';

// Re-export clients and utilities
export { azureSearchClient, AzureSearchClient } from './azure-search-client';
export { ProdigiQueryBuilder } from './query-builder';
export { productMatcher, ProductMatcher } from './product-matcher';

// Re-export utility functions
export {
  calculateAspectRatio,
  getOrientation,
  getAspectRatioFilters,
  getSizeRangeForCategory,
  recommendSizeCategory,
  buildScoringOptions,
  createImageMatchQuery,
} from './query-builder';

export {
  getRecommendationsForImage,
} from './product-matcher';

// Re-export service class and instance
export { ProdigiService, prodigiService } from './service';

// Re-export quick access functions
import { prodigiService } from './service';
import type { ProdigiSearchFilters, ProdigiSearchOptions, UserPreferences } from './types';

export const searchProducts = (filters: ProdigiSearchFilters, options?: ProdigiSearchOptions) =>
  prodigiService.search(filters, options);

export const getFrameRecommendations = (
  imageData: { width: number; height: number; dpi?: number },
  country: string,
  userPreferences?: UserPreferences
) => prodigiService.getImageRecommendations(imageData, country, userPreferences);

export const getAllFrames = (country: string, filters?: Partial<ProdigiSearchFilters>) =>
  prodigiService.getFrameProducts(country, filters);

export const getFilterFacets = (filters: ProdigiSearchFilters) =>
  prodigiService.getFacets(filters);
