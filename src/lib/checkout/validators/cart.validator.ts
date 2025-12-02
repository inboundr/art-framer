/**
 * Cart Validation
 */

import { z } from 'zod';
import { CartError } from '../types/errors';

export const CartItemInputSchema = z.object({
  productId: z.string().uuid('Invalid product ID format'),
  quantity: z.number().int().min(1).max(10, 'Maximum quantity is 10'),
  frameConfig: z.object({
    size: z.string().optional(),
    color: z.string().optional(),
    style: z.string().optional(),
    material: z.string().optional(),
    mount: z.string().optional(),
    glaze: z.string().optional(),
    wrap: z.string().optional(),
  }).optional(),
});

export const UpdateCartItemSchema = z.object({
  quantity: z.number().int().min(1).max(10, 'Maximum quantity is 10'),
});

export function validateCartItemInput(input: unknown) {
  try {
    return CartItemInputSchema.parse(input);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new CartError('Invalid cart item input', {
        issues: error.issues,
      });
    }
    throw error;
  }
}

export function validateUpdateCartItem(input: unknown) {
  try {
    return UpdateCartItemSchema.parse(input);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new CartError('Invalid update input', {
        issues: error.issues,
      });
    }
    throw error;
  }
}

