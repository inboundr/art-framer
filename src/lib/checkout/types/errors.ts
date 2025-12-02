/**
 * Checkout Error Types
 */

export class CheckoutError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public details?: any
  ) {
    super(message);
    this.name = 'CheckoutError';
    Object.setPrototypeOf(this, CheckoutError.prototype);
  }
}

export class CartError extends CheckoutError {
  constructor(message: string, details?: any) {
    super(message, 'CART_ERROR', 400, details);
    this.name = 'CartError';
    Object.setPrototypeOf(this, CartError.prototype);
  }
}

export class PricingError extends CheckoutError {
  constructor(message: string, details?: any) {
    super(message, 'PRICING_ERROR', 400, details);
    this.name = 'PricingError';
    Object.setPrototypeOf(this, PricingError.prototype);
  }
}

export class ShippingError extends CheckoutError {
  constructor(message: string, details?: any) {
    super(message, 'SHIPPING_ERROR', 400, details);
    this.name = 'ShippingError';
    Object.setPrototypeOf(this, ShippingError.prototype);
  }
}

export class OrderError extends CheckoutError {
  constructor(message: string, details?: any) {
    super(message, 'ORDER_ERROR', 500, details);
    this.name = 'OrderError';
    Object.setPrototypeOf(this, OrderError.prototype);
  }
}

export class PaymentError extends CheckoutError {
  constructor(message: string, details?: any) {
    super(message, 'PAYMENT_ERROR', 400, details);
    this.name = 'PaymentError';
    Object.setPrototypeOf(this, PaymentError.prototype);
  }
}

export class AddressError extends CheckoutError {
  constructor(message: string, details?: any) {
    super(message, 'ADDRESS_ERROR', 400, details);
    this.name = 'AddressError';
    Object.setPrototypeOf(this, AddressError.prototype);
  }
}




