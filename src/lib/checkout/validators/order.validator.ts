/**
 * Order Validation
 */

import { z } from 'zod';
import { OrderError } from '../types/errors';
import { ShippingAddressSchema } from './address.validator';

export const CreateOrderSchema = z.object({
  cartItemIds: z.array(z.string().uuid()).min(1, 'At least one cart item is required'),
  shippingAddress: ShippingAddressSchema,
  billingAddress: ShippingAddressSchema.optional(),
  shippingMethod: z.enum(['Budget', 'Standard', 'Express', 'Overnight']),
  sameAsShipping: z.boolean().optional().default(true),
});

export function validateCreateOrder(input: unknown) {
  try {
    return CreateOrderSchema.parse(input);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new OrderError('Invalid order data', {
        issues: error.issues,
      });
    }
    throw error;
  }
}

