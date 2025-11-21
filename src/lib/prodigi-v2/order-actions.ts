/**
 * Prodigi API v4 - Order Actions Module
 * 
 * Complete implementation of order action endpoints for modifying existing orders
 */

import type {
  GetOrderActionsResponse,
  CancelOrderResponse,
  UpdateMetadataRequest,
  UpdateMetadataResponse,
  UpdateRecipientRequest,
  UpdateRecipientResponse,
  UpdateShippingMethodRequest,
  UpdateShippingMethodResponse,
  Order,
  OrderActions,
  ShippingMethod,
} from './types';
import { ProdigiClient } from './client';
import {
  isValidEmail,
  isValidCountryCode,
  isValidMetadata,
} from './utils';
import { ProdigiValidationError } from './errors';

/**
 * Order Actions API Module
 * 
 * Handles all order modification operations:
 * - Checking available actions
 * - Cancelling orders
 * - Updating metadata
 * - Updating recipient details
 * - Updating shipping methods
 */
export class OrderActionsAPI {
  constructor(private readonly client: ProdigiClient) {}

  /**
   * Get available actions for an order
   * 
   * Checks what modifications can be performed on an order based on its current state
   * 
   * @param orderId - Prodigi order ID
   * @returns Available actions for the order
   * 
   * @example
   * ```ts
   * const actions = await orderActionsAPI.getActions('ord_840796');
   * 
   * if (actions.cancel.isAvailable === 'Yes') {
   *   console.log('Order can be cancelled');
   * }
   * 
   * if (actions.changeRecipientDetails.isAvailable === 'Yes') {
   *   console.log('Recipient can be changed');
   * }
   * ```
   */
  async getActions(orderId: string): Promise<OrderActions> {
    this.validateOrderId(orderId);

    const response = await this.client.request<GetOrderActionsResponse>({
      method: 'GET',
      endpoint: `/Orders/${orderId}/actions`,
    });

    return {
      cancel: response.cancel,
      changeRecipientDetails: response.changeRecipientDetails,
      changeShippingMethod: response.changeShippingMethod,
      changeMetaData: response.changeMetaData,
    };
  }

  /**
   * Cancel an order
   * 
   * Cancels an order if it hasn't entered production yet.
   * Once cancelled, an order cannot be un-cancelled.
   * 
   * @param orderId - Prodigi order ID
   * @returns Cancelled order details
   * 
   * @example
   * ```ts
   * const order = await orderActionsAPI.cancel('ord_840796');
   * console.log(order.status.stage); // 'Cancelled'
   * ```
   */
  async cancel(orderId: string): Promise<Order> {
    this.validateOrderId(orderId);

    // Check if cancellation is available
    const actions = await this.getActions(orderId);
    if (actions.cancel.isAvailable !== 'Yes') {
      throw new ProdigiValidationError(
        'Order cannot be cancelled at this stage',
        [{ message: 'Order has already entered production or is complete' }]
      );
    }

    const response = await this.client.request<CancelOrderResponse>({
      method: 'POST',
      endpoint: `/Orders/${orderId}/actions/cancel`,
    });

    return response.order;
  }

  /**
   * Update order metadata
   * 
   * Updates or adds metadata to an order.
   * This replaces all existing metadata - pass all metadata you want to keep.
   * 
   * @param orderId - Prodigi order ID
   * @param metadata - New metadata object
   * @returns Updated order details
   * 
   * @example
   * ```ts
   * const order = await orderActionsAPI.updateMetadata('ord_840796', {
   *   customerReference: 'CUST-001',
   *   internalNote: 'Rush order',
   *   sourceId: 12345,
   * });
   * ```
   */
  async updateMetadata(
    orderId: string,
    metadata: Record<string, any>
  ): Promise<Order> {
    this.validateOrderId(orderId);
    
    if (!isValidMetadata(metadata)) {
      throw new ProdigiValidationError(
        'Metadata too large. Maximum 2000 characters.',
        []
      );
    }

    const response = await this.client.request<UpdateMetadataResponse>({
      method: 'POST',
      endpoint: `/Orders/${orderId}/actions/updateMetadata`,
      body: { metadata },
    });

    return response.order;
  }

  /**
   * Update recipient details
   * 
   * Updates the recipient name and shipping address for an order.
   * Can only be done before the order ships.
   * 
   * @param orderId - Prodigi order ID
   * @param recipient - New recipient details
   * @returns Updated order details and shipment update results
   * 
   * @example
   * ```ts
   * const order = await orderActionsAPI.updateRecipient('ord_840796', {
   *   name: 'Jane Smith',
   *   email: 'jane@example.com',
   *   phoneNumber: '+1234567890',
   *   address: {
   *     line1: '456 Oak Street',
   *     line2: 'Apt 2B',
   *     postalOrZipCode: '54321',
   *     countryCode: 'US',
   *     townOrCity: 'Los Angeles',
   *     stateOrCounty: 'CA',
   *   },
   * });
   * ```
   */
  async updateRecipient(
    orderId: string,
    recipient: UpdateRecipientRequest
  ): Promise<Order> {
    this.validateOrderId(orderId);
    this.validateRecipient(recipient);

    // Check if recipient update is available
    const actions = await this.getActions(orderId);
    if (actions.changeRecipientDetails.isAvailable !== 'Yes') {
      throw new ProdigiValidationError(
        'Recipient details cannot be changed at this stage',
        [{ message: 'Order has already been allocated or shipped' }]
      );
    }

    const response = await this.client.request<UpdateRecipientResponse>({
      method: 'POST',
      endpoint: `/Orders/${orderId}/actions/updateRecipient`,
      body: recipient,
    });

    return response.order;
  }

  /**
   * Update shipping method
   * 
   * Changes the shipping method for an order.
   * Can only be done before the order ships.
   * 
   * @param orderId - Prodigi order ID
   * @param shippingMethod - New shipping method
   * @returns Updated order details and shipment update results
   * 
   * @example
   * ```ts
   * const order = await orderActionsAPI.updateShippingMethod(
   *   'ord_840796',
   *   'Express'
   * );
   * ```
   */
  async updateShippingMethod(
    orderId: string,
    shippingMethod: ShippingMethod
  ): Promise<Order> {
    this.validateOrderId(orderId);

    // Check if shipping method update is available
    const actions = await this.getActions(orderId);
    if (actions.changeShippingMethod.isAvailable !== 'Yes') {
      throw new ProdigiValidationError(
        'Shipping method cannot be changed at this stage',
        [{ message: 'Order has already been allocated or shipped' }]
      );
    }

    const response = await this.client.request<UpdateShippingMethodResponse>({
      method: 'POST',
      endpoint: `/Orders/${orderId}/actions/updateShippingMethod`,
      body: { shippingMethod },
    });

    return response.order;
  }

  /**
   * Check if order can be cancelled
   * 
   * @param orderId - Prodigi order ID
   * @returns true if order can be cancelled
   */
  async canCancel(orderId: string): Promise<boolean> {
    const actions = await this.getActions(orderId);
    return actions.cancel.isAvailable === 'Yes';
  }

  /**
   * Check if recipient can be changed
   * 
   * @param orderId - Prodigi order ID
   * @returns true if recipient can be changed
   */
  async canChangeRecipient(orderId: string): Promise<boolean> {
    const actions = await this.getActions(orderId);
    return actions.changeRecipientDetails.isAvailable === 'Yes';
  }

  /**
   * Check if shipping method can be changed
   * 
   * @param orderId - Prodigi order ID
   * @returns true if shipping method can be changed
   */
  async canChangeShippingMethod(orderId: string): Promise<boolean> {
    const actions = await this.getActions(orderId);
    return actions.changeShippingMethod.isAvailable === 'Yes';
  }

  /**
   * Check if metadata can be changed
   * 
   * @param orderId - Prodigi order ID
   * @returns true if metadata can be changed
   */
  async canChangeMetadata(orderId: string): Promise<boolean> {
    const actions = await this.getActions(orderId);
    return actions.changeMetaData.isAvailable === 'Yes';
  }

  // ============================================================================
  // PRIVATE VALIDATION METHODS
  // ============================================================================

  /**
   * Validate order ID format
   */
  private validateOrderId(orderId: string): void {
    if (!orderId || !orderId.startsWith('ord_')) {
      throw new ProdigiValidationError(
        'Invalid order ID format. Expected: ord_XXXXXX',
        []
      );
    }
  }

  /**
   * Validate recipient data
   */
  private validateRecipient(recipient: UpdateRecipientRequest): void {
    const errors: string[] = [];

    if (!recipient.name || recipient.name.trim().length === 0) {
      errors.push('Recipient name is required');
    }

    if (recipient.email && !isValidEmail(recipient.email)) {
      errors.push('Invalid email address');
    }

    // Validate address
    const addr = recipient.address;
    if (!addr) {
      errors.push('Address is required');
    } else {
      if (!addr.line1 || addr.line1.trim().length === 0) {
        errors.push('Address line 1 is required');
      }
      if (!addr.postalOrZipCode || addr.postalOrZipCode.trim().length === 0) {
        errors.push('Postal/Zip code is required');
      }
      if (!addr.countryCode || !isValidCountryCode(addr.countryCode)) {
        errors.push('Valid country code is required (ISO 3166-1 alpha-2)');
      }
      if (!addr.townOrCity || addr.townOrCity.trim().length === 0) {
        errors.push('Town/City is required');
      }
    }

    if (errors.length > 0) {
      throw new ProdigiValidationError(
        'Recipient validation failed',
        errors.map(msg => ({ message: msg }))
      );
    }
  }
}

