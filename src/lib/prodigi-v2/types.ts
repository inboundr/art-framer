/**
 * Prodigi API v4 - Complete TypeScript Types
 * 
 * Covers 100% of the official Prodigi API v4
 * Reference: https://www.prodigi.com/print-api/docs/reference/
 */

// ============================================================================
// COMMON TYPES
// ============================================================================

export type Environment = 'sandbox' | 'production';

export type Currency = 'GBP' | 'USD' | 'EUR' | 'CAD' | 'AUD' | string;

export type ShippingMethod = 'Budget' | 'Standard' | 'Express' | 'Overnight';

export type OrderStage = 
  | 'InProgress' 
  | 'Complete' 
  | 'Cancelled' 
  | 'OnHold' 
  | 'Error' 
  | 'AwaitingPaymentAuthorisation';

export type OrderDetailStatus = 
  | 'NotStarted' 
  | 'InProgress' 
  | 'Complete' 
  | 'Error';

export type ItemStatus = 
  | 'NotYetDownloaded' 
  | 'Ok' 
  | 'Invalid' 
  | 'InProgress';

export type AssetStatus = 
  | 'NotYetDownloaded' 
  | 'InProgress' 
  | 'Complete' 
  | 'Error';

export type ShipmentStatus = 
  | 'Processing' 
  | 'Shipped' 
  | 'Delivered' 
  | 'Cancelled';

export type SizingOption = 
  | 'fillPrintArea' 
  | 'fitPrintArea' 
  | 'stretchToPrintArea';

export interface Cost {
  amount: string;
  currency: Currency;
}

export interface Address {
  line1: string;
  line2?: string;
  postalOrZipCode: string;
  countryCode: string;
  townOrCity: string;
  stateOrCounty?: string | null;
}

// ============================================================================
// ORDER TYPES
// ============================================================================

export interface OrderRecipient {
  name: string;
  email?: string;
  phoneNumber?: string;
  address: Address;
}

export interface OrderBranding {
  postcard?: { url: string };
  flyer?: { url: string };
  packing_slip_bw?: { url: string };
  packing_slip_color?: { url: string };
  sticker_exterior_round?: { url: string };
  sticker_exterior_rectangle?: { url: string };
  sticker_interior_round?: { url: string };
  sticker_interior_rectangle?: { url: string };
}

export interface OrderAsset {
  id?: string;
  printArea: string;
  md5Hash?: string;
  url: string;
  pageCount?: number;
  status?: AssetStatus;
}

export interface OrderItem {
  id?: string;
  merchantReference?: string;
  sku: string;
  copies: number;
  sizing: SizingOption;
  attributes?: Record<string, string | undefined>; // Product-specific attributes
  assets: OrderAsset[];
  status?: ItemStatus;
  recipientCost?: Cost;
}

// Product-specific attributes that can be in OrderItem.attributes
export interface ProductAttributes {
  // Canvas products
  wrap?: 'Black' | 'White' | 'ImageWrap' | 'MirrorWrap';
  edge?: string; // e.g., '38mm'
  frame?: string;
  
  // Framed prints
  color?: 'black' | 'brown' | 'dark grey' | 'gold' | 'light grey' | 'natural' | 'silver' | 'white';
  glaze?: string; // e.g., 'Acrylic / Perspex'
  mount?: string; // e.g., '2.4mm'
  mountColor?: string; // e.g., 'Snow white'
  
  // General
  paperType?: string;
  substrateWeight?: string;
  style?: string;
  finish?: string;
  
  // Additional custom attributes
  [key: string]: string | undefined;
}

export interface PackingSlip {
  url: string;
  status?: 'InProgress' | 'Success' | 'Error';
}

export interface OrderIssue {
  objectId: string;
  errorCode: string;
  description: string;
  authorisationDetails?: {
    authorisationUrl: string;
    paymentDetails: Cost;
  } | null;
}

export interface OrderStatusDetails {
  downloadAssets?: OrderDetailStatus;
  printReadyAssetsPrepared?: OrderDetailStatus;
  allocateProductionLocation?: OrderDetailStatus;
  inProduction?: OrderDetailStatus;
  shipping?: OrderDetailStatus;
}

export interface OrderStatus {
  stage: OrderStage;
  issues: OrderIssue[];
  details: OrderStatusDetails;
}

export interface ChargeItem {
  id: string;
  itemId: string | null;
  cost: Cost;
  shipmentId: string | null;
}

export interface Charge {
  id: string;
  prodigiInvoiceNumber?: string;
  totalCost: Cost;
  items: ChargeItem[];
}

export interface Carrier {
  name: string;
  service: string;
}

export interface FulfillmentLocation {
  countryCode: string;
  labCode: string;
}

export interface Tracking {
  number: string;
  url: string;
}

export interface ShipmentItem {
  itemId: string;
}

export interface Shipment {
  id: string;
  dispatchDate: string | null;
  carrier: Carrier;
  fulfillmentLocation: FulfillmentLocation;
  tracking: Tracking | null;
  items: ShipmentItem[];
  status: ShipmentStatus;
}

export interface Order {
  id: string;
  created: string;
  lastUpdated: string;
  callbackUrl: string | null;
  merchantReference: string;
  shippingMethod: ShippingMethod;
  idempotencyKey: string | null;
  status: OrderStatus;
  charges: Charge[];
  shipments: Shipment[];
  recipient: OrderRecipient;
  branding?: OrderBranding | null;
  items: OrderItem[];
  packingSlip: PackingSlip | null;
  metadata?: Record<string, any> | null;
}

export interface CreateOrderRequest {
  merchantReference: string;
  shippingMethod: ShippingMethod;
  callbackUrl?: string;
  idempotencyKey?: string;
  recipient: OrderRecipient;
  branding?: OrderBranding;
  items: OrderItem[];
  packingSlip?: PackingSlip;
  metadata?: Record<string, any>;
}

export interface CreateOrderResponse {
  outcome: 'Created';
  order: Order;
  traceParent: string;
}

export interface GetOrderResponse {
  outcome: 'Ok';
  order: Order;
  traceParent: string;
}

export interface GetOrdersResponse {
  outcome: 'Ok';
  hasMore: boolean;
  nextUrl: string | null;
  orders: Order[];
  traceParent: string;
}

export interface GetOrdersParams {
  /** Maximum number of results to return (default: 25) */
  top?: number;
  /** Number of results to skip for pagination */
  skip?: number;
  /** Filter by order status */
  status?: OrderStage;
  /** Filter by merchant reference */
  merchantReference?: string;
}

// ============================================================================
// ORDER ACTIONS TYPES
// ============================================================================

export interface OrderActions {
  cancel: {
    isAvailable: 'Yes' | 'No';
  };
  changeRecipientDetails: {
    isAvailable: 'Yes' | 'No';
  };
  changeShippingMethod: {
    isAvailable: 'Yes' | 'No';
  };
  changeMetaData: {
    isAvailable: 'Yes' | 'No';
  };
}

export interface GetOrderActionsResponse {
  outcome: 'Ok';
  cancel: OrderActions['cancel'];
  changeRecipientDetails: OrderActions['changeRecipientDetails'];
  changeShippingMethod: OrderActions['changeShippingMethod'];
  changeMetaData: OrderActions['changeMetaData'];
  traceParent: string;
}

export interface CancelOrderResponse {
  outcome: 'Cancelled';
  order: Order;
  traceParent: string;
}

export interface UpdateMetadataRequest {
  metadata: Record<string, any>;
}

export interface UpdateMetadataResponse {
  outcome: 'Updated';
  order: Order;
  traceParent: string;
}

export interface UpdateRecipientRequest {
  name: string;
  email?: string;
  phoneNumber?: string;
  address: Address;
}

export interface UpdateRecipientResponse {
  outcome: 'Updated';
  shipmentUpdateResults: any[];
  order: Order;
  traceParent: string;
}

export interface UpdateShippingMethodRequest {
  shippingMethod: ShippingMethod;
}

export interface UpdateShippingMethodResponse {
  outcome: 'Updated';
  shippingUpdateResults: any[];
  order: Order;
  traceParent: string;
}

// ============================================================================
// QUOTES TYPES
// ============================================================================

export interface QuoteItem {
  sku: string;
  copies: number;
  attributes?: Record<string, string>;
  assets: Array<{
    printArea: string;
  }>;
}

export interface CreateQuoteRequest {
  shippingMethod: ShippingMethod;
  destinationCountryCode: string;
  items: QuoteItem[];
}

export interface QuoteShipment {
  carrier: Carrier;
  fulfillmentLocation: FulfillmentLocation;
  cost: Cost;
  items: string[];
}

export interface QuoteCostSummary {
  items: Cost;
  shipping: Cost;
  branding?: Cost;
  totalCost?: Cost;
}

export interface Quote {
  shipmentMethod: ShippingMethod;
  costSummary: QuoteCostSummary;
  shipments: QuoteShipment[];
  items: Array<{
    id: string;
    sku: string;
    copies: number;
    unitCost: Cost;
    attributes?: Record<string, string>;
    assets: Array<{
      printArea: string;
    }>;
  }>;
}

export interface CreateQuoteResponse {
  outcome: 'Created' | 'CreatedWithIssues' | 'NotAvailable';
  quotes?: Quote[]; // Quotes may be empty or undefined for NotAvailable
  issues?: Array<{
    objectId?: string | null;
    errorCode?: string;
    description?: string;
  }>;
  traceParent?: string;
}

// ============================================================================
// PRODUCTS TYPES
// ============================================================================

export interface ProductDimensions {
  width: number;
  height: number;
  units: 'in' | 'cm' | 'mm';
}

export interface PrintAreaSizes {
  horizontalResolution: number;
  verticalResolution: number;
}

export interface ProductVariant {
  attributes: Record<string, string>;
  shipsTo: string[];
  printAreaSizes: Record<string, PrintAreaSizes>;
}

export interface Product {
  sku: string;
  description: string;
  productDimensions: ProductDimensions;
  attributes: Record<string, string[]>;
  printAreas: Record<string, { required: boolean }>;
  variants: ProductVariant[];
}

export interface GetProductDetailsResponse {
  outcome: 'Ok';
  product: Product;
  traceParent: string;
}

export interface PhotobookSpineRequest {
  sku: string;
  pageCount: number;
  destinationCountryCode: string;
}

export interface PhotobookSpineResponse {
  outcome: 'Ok';
  spineWidth: {
    value: number;
    units: 'in' | 'cm' | 'mm';
  };
  traceParent: string;
}

// ============================================================================
// WEBHOOKS/CALLBACKS TYPES
// ============================================================================

export type CallbackEvent = 
  | 'order.created'
  | 'order.shipment.shipped'
  | 'order.complete'
  | 'order.cancelled'
  | 'order.error';

export interface CallbackPayload {
  event: CallbackEvent;
  order: Order;
  timestamp: string;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export interface ProdigiErrorData {
  [key: string]: any;
}

export interface ProdigiError {
  statusText: string;
  statusCode: number;
  data: ProdigiErrorData;
  traceParent: string;
}

// ============================================================================
// API CLIENT CONFIGURATION
// ============================================================================

export interface ProdigiClientConfig {
  apiKey: string;
  environment?: Environment;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  enableCache?: boolean;
  cacheTtl?: number;
  callbackUrl?: string;
}

export interface RequestOptions {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  endpoint: string;
  body?: any;
  params?: Record<string, string | number | boolean | undefined>;
  idempotencyKey?: string;
}

// ============================================================================
// RATE LIMITING & RETRY TYPES
// ============================================================================

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
}

export interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  retryableStatusCodes: number[];
}

