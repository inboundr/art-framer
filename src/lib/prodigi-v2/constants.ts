/**
 * Prodigi API v4 - Constants
 * 
 * All constants and configuration for the Prodigi API integration
 */

import type { Environment, ShippingMethod, RetryConfig } from './types';

// ============================================================================
// API ENDPOINTS
// ============================================================================

export const API_URLS: Record<Environment, string> = {
  sandbox: 'https://api.sandbox.prodigi.com/v4.0',
  production: 'https://api.prodigi.com/v4.0',
};

export const DASHBOARD_URLS: Record<Environment, string> = {
  sandbox: 'https://sandbox-beta-dashboard.pwinty.com',
  production: 'https://dashboard.prodigi.com',
};

// ============================================================================
// API CONFIGURATION
// ============================================================================

export const DEFAULT_CONFIG = {
  timeout: 30000, // 30 seconds
  retries: 3,
  retryDelay: 1000, // 1 second
  enableCache: true,
  cacheTtl: 3600000, // 1 hour in milliseconds
} as const;

export const RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
};

// ============================================================================
// SHIPPING METHODS
// ============================================================================

export const SHIPPING_METHODS: Record<ShippingMethod, {
  name: string;
  description: string;
  estimatedDays: number;
}> = {
  Budget: {
    name: 'Budget',
    description: 'Economy shipping option',
    estimatedDays: 10-14,
  },
  Standard: {
    name: 'Standard',
    description: 'Standard shipping option',
    estimatedDays: 5-7,
  },
  Express: {
    name: 'Express',
    description: 'Fast shipping option',
    estimatedDays: 2-3,
  },
  Overnight: {
    name: 'Overnight',
    description: 'Next day delivery',
    estimatedDays: 1,
  },
};

// ============================================================================
// ORDER STATUSES
// ============================================================================

export const ORDER_STATUS_DESCRIPTIONS: Record<string, string> = {
  InProgress: 'Order is being processed',
  Complete: 'Order has been completed and shipped',
  Cancelled: 'Order has been cancelled',
  OnHold: 'Order is on hold',
  Error: 'Order has encountered an error',
  AwaitingPaymentAuthorisation: 'Order is awaiting payment authorization',
};

export const ORDER_DETAIL_STATUS_DESCRIPTIONS: Record<string, string> = {
  NotStarted: 'Process has not started',
  InProgress: 'Process is in progress',
  Complete: 'Process is complete',
  Error: 'Process has encountered an error',
};

// ============================================================================
// ERROR CODES
// ============================================================================

export const ERROR_CODES = {
  // Asset errors
  ASSET_NOT_DOWNLOADED: 'order.items.assets.NotDownloaded',
  ASSET_FAILED_TO_DOWNLOAD: 'order.items.assets.FailedToDownloaded',
  
  // Item errors
  ITEM_UNAVAILABLE: 'order.items.ItemUnavailable',
  
  // Authentication errors
  UNAUTHORIZED: 'unauthorized',
  FORBIDDEN: 'forbidden',
  
  // General errors
  NOT_FOUND: 'not_found',
  BAD_REQUEST: 'bad_request',
  INTERNAL_SERVER_ERROR: 'internal_server_error',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
} as const;

// ============================================================================
// HTTP STATUS CODES
// ============================================================================

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

// ============================================================================
// SIZING OPTIONS
// ============================================================================

export const SIZING_OPTIONS = {
  FILL: 'fillPrintArea' as const,
  FIT: 'fitPrintArea' as const,
  STRETCH: 'stretchToPrintArea' as const,
};

export const SIZING_DESCRIPTIONS = {
  fillPrintArea: 'Image fills entire print area, may crop edges',
  fitPrintArea: 'Image fits within print area, may have borders',
  stretchToPrintArea: 'Image stretches to fill print area, may distort',
};

// ============================================================================
// PAGINATION
// ============================================================================

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 25,
  MAX_PAGE_SIZE: 100,
} as const;

// ============================================================================
// CACHE KEYS
// ============================================================================

export const CACHE_KEYS = {
  PRODUCT: (sku: string) => `prodigi:product:${sku}`,
  ORDER: (orderId: string) => `prodigi:order:${orderId}`,
  QUOTE: (hash: string) => `prodigi:quote:${hash}`,
} as const;

// ============================================================================
// WEBHOOK EVENTS
// ============================================================================

export const WEBHOOK_EVENTS = {
  ORDER_CREATED: 'order.created',
  ORDER_SHIPMENT_SHIPPED: 'order.shipment.shipped',
  ORDER_COMPLETE: 'order.complete',
  ORDER_CANCELLED: 'order.cancelled',
  ORDER_ERROR: 'order.error',
} as const;

// ============================================================================
// PRODUCT CATEGORIES
// ============================================================================

export const PRODUCT_CATEGORIES = {
  WALL_ART: 'Wall art',
  HOME_DECOR: 'Home decor',
  STATIONERY: 'Stationery',
  CLOTHING: 'Clothing',
  ACCESSORIES: 'Accessories',
  PHOTOBOOKS: 'Photobooks',
} as const;

// ============================================================================
// PRINT AREAS
// ============================================================================

export const PRINT_AREAS = {
  DEFAULT: 'default',
  FRONT: 'front',
  BACK: 'back',
  SPINE: 'spine',
  COVER: 'cover',
} as const;

// ============================================================================
// ATTRIBUTE KEYS
// ============================================================================

export const ATTRIBUTE_KEYS = {
  COLOR: 'color',
  WRAP: 'wrap',
  FINISH: 'finish',
  PAPER_TYPE: 'paperType',
  FRAME_COLOUR: 'frameColour',
  MOUNT_COLOUR: 'mountColour',
  MOUNT_COLOR: 'mountColor', // Alternative spelling
  GLAZE: 'glaze',
  MOUNT: 'mount',
  EDGE: 'edge',
  FRAME: 'frame',
  STYLE: 'style',
  SIZE: 'size',
  SUBSTRATE_WEIGHT: 'substrateWeight',
} as const;

// ============================================================================
// ATTRIBUTE VALUES (Discovered from real API testing)
// ============================================================================

export const WRAP_OPTIONS = {
  BLACK: 'Black',
  WHITE: 'White',
  IMAGE_WRAP: 'ImageWrap',
  MIRROR_WRAP: 'MirrorWrap',
} as const;

export const COLOR_OPTIONS = {
  BLACK: 'black',
  WHITE: 'white',
  BROWN: 'brown',
  DARK_GREY: 'dark grey',
  LIGHT_GREY: 'light grey',
  NATURAL: 'natural',
  GOLD: 'gold',
  SILVER: 'silver',
} as const;

export const GLAZE_OPTIONS = {
  ACRYLIC_PERSPEX: 'Acrylic / Perspex',
} as const;

export const MOUNT_COLOR_OPTIONS = {
  SNOW_WHITE: 'Snow white',
} as const;

export const PAPER_TYPE_OPTIONS = {
  STANDARD_CANVAS: 'Standard canvas (SC)',
  EMA: 'EMA',
} as const;

// ============================================================================
// VALIDATION
// ============================================================================

export const VALIDATION = {
  MAX_MERCHANT_REFERENCE_LENGTH: 100,
  MAX_METADATA_SIZE: 2000, // characters
  MAX_ASSET_URL_LENGTH: 2048,
  MIN_IMAGE_DPI: 72,
  RECOMMENDED_IMAGE_DPI: 300,
  SUPPORTED_IMAGE_FORMATS: ['jpg', 'jpeg', 'png', 'tiff', 'pdf'],
} as const;

// ============================================================================
// TIMEOUT VALUES
// ============================================================================

export const TIMEOUTS = {
  DEFAULT_REQUEST: 30000, // 30 seconds
  QUOTE_REQUEST: 45000, // 45 seconds (quotes can take longer)
  ORDER_CREATE: 60000, // 60 seconds (order creation can take longer)
  PRODUCT_DETAILS: 15000, // 15 seconds
} as const;

// ============================================================================
// RATE LIMITS (based on Prodigi's typical limits)
// ============================================================================

export const RATE_LIMITS = {
  REQUESTS_PER_SECOND: 10,
  REQUESTS_PER_MINUTE: 100,
  REQUESTS_PER_HOUR: 1000,
} as const;

