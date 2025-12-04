/**
 * Cart Service for V2 Checkout
 * 
 * Handles all cart operations with real-time pricing
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { ProdigiClient } from '@/lib/prodigi';
import { CartError } from '../types/errors';
import type {
  Cart,
  CartItem,
  CartItemInput,
  PriceValidationResult,
} from '../types/cart.types';
import { PricingService } from './pricing.service';
import type { ShippingMethod } from '../types/order.types';

export class CartService {
  constructor(
    private supabase: SupabaseClient,
    private prodigiClient: ProdigiClient,
    private pricingService: PricingService
  ) {}

  /**
   * Add item to cart
   */
  async addItem(userId: string, item: CartItemInput): Promise<CartItem> {
    try {
      // Validate input
      if (!item.productId) {
        throw new CartError('Product ID is required');
      }

      if (item.quantity < 1 || item.quantity > 10) {
        throw new CartError('Quantity must be between 1 and 10');
      }

      // Fetch product details
      const { data: product, error: productError } = await this.supabase
        .from('products')
        .select(
          `
          *,
          images (
            id,
            prompt,
            image_url,
            thumbnail_url
          )
        `
        )
        .eq('id', item.productId)
        .eq('status', 'active')
        .single();

      if (productError || !product) {
        throw new CartError('Product not found or not available', {
          productId: item.productId,
        });
      }

      // Generate/validate SKU
      let sku = product.sku;
      if (this.prodigiClient) {
        try {
          const freshSku = await this.prodigiClient.generateFrameSku(
            product.frame_size || 'medium',
            product.frame_style || 'black',
            product.frame_material || 'wood',
            product.image_id
          );
          const baseSku = this.prodigiClient.extractBaseProdigiSku(freshSku);
          sku = baseSku;
        } catch (skuError) {
          console.warn('Failed to generate fresh SKU, using stored SKU:', skuError);
        }
      }

      // Get real-time pricing from Prodigi
      // If pricing fails, we'll use the stored product price as fallback
      let realTimePrice = product.price;
      try {
        console.log('[CartService] Getting pricing for product:', {
          productId: product.id,
          sku,
          frameSize: product.frame_size,
          frameStyle: product.frame_style,
          frameMaterial: product.frame_material,
        });
        
        const pricing = await this.pricingService.calculatePricing(
          [
            {
              id: 'temp',
              productId: product.id,
              sku,
              name: product.name || 'Framed Print',
              imageUrl: product.images?.image_url || product.images?.thumbnail_url || '',
              quantity: item.quantity,
              price: product.price, // Will be updated with real-time price
              originalPrice: product.price,
              currency: 'USD',
              frameConfig: {
                size: product.frame_size || 'medium',
                color: product.frame_style || 'black',
                style: product.frame_style || 'black',
                material: product.frame_material || 'wood',
                mount: item.frameConfig?.mount,
                glaze: item.frameConfig?.glaze,
                wrap: item.frameConfig?.wrap,
              },
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
          'US', // Default country, will be updated when address is provided
          'Standard'
        );

        // Update price with real-time quote
        realTimePrice = pricing.subtotal / item.quantity;
        console.log('[CartService] Got real-time pricing:', realTimePrice);
      } catch (pricingError) {
        console.error('[CartService] Pricing failed, using stored price:', {
          error: pricingError,
          storedPrice: product.price,
        });
        // Continue with stored price - pricing will be calculated later at checkout
        // This allows users to add items to cart even if Prodigi pricing temporarily fails
      }

      // Check for existing cart item
      const { data: existingItem } = await this.supabase
        .from('cart_items')
        .select('id, quantity')
        .eq('user_id', userId)
        .eq('product_id', item.productId)
        .single();

      let finalQuantity = item.quantity;
      if (existingItem) {
        finalQuantity = (existingItem as any).quantity + item.quantity;
        if (finalQuantity > 10) {
          throw new CartError('Maximum quantity per item is 10');
        }
      }

      // Upsert cart item
      const { data: cartItem, error: upsertError } = await this.supabase
        .from('cart_items')
        .upsert(
          {
            user_id: userId,
            product_id: item.productId,
            quantity: finalQuantity,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id,product_id',
          }
        )
        .select(
          `
          *,
          products (
            *,
            images (
              id,
              prompt,
              image_url,
              thumbnail_url
            )
          )
        `
        )
        .single();

      if (upsertError || !cartItem) {
        throw new CartError('Failed to add item to cart', {
          error: upsertError,
        });
      }

      // Return formatted cart item
      return this.formatCartItem(cartItem, realTimePrice);
    } catch (error) {
      if (error instanceof CartError) {
        throw error;
      }
      throw new CartError('Failed to add item to cart', {
        originalError: error,
      });
    }
  }

  /**
   * Update item quantity
   */
  async updateItem(
    userId: string,
    itemId: string,
    quantity: number
  ): Promise<CartItem> {
    try {
      if (quantity < 1 || quantity > 10) {
        throw new CartError('Quantity must be between 1 and 10');
      }

      const { data: cartItem, error: updateError } = await this.supabase
        .from('cart_items')
        .update({
          quantity,
          updated_at: new Date().toISOString(),
        })
        .eq('id', itemId)
        .eq('user_id', userId)
        .select(
          `
          *,
          products (
            *,
            images (
              id,
              prompt,
              image_url,
              thumbnail_url
            )
          )
        `
        )
        .single();

      if (updateError || !cartItem) {
        throw new CartError('Failed to update cart item', {
          error: updateError,
        });
      }

      // Get real-time pricing (optional - fallback to stored price if it fails)
      let price = (cartItem.products as any).price;
      try {
        const pricing = await this.pricingService.calculatePricing(
          [this.formatCartItem(cartItem, price)],
          'US',
          'Standard'
        );
        price = pricing.subtotal / quantity;
      } catch (pricingError) {
        console.error('[CartService] Pricing failed in updateItem, using stored price:', pricingError);
        // Continue with stored price
      }

      return this.formatCartItem(cartItem, price);
    } catch (error) {
      if (error instanceof CartError) {
        throw error;
      }
      throw new CartError('Failed to update cart item', {
        originalError: error,
      });
    }
  }

  /**
   * Remove item from cart
   */
  async removeItem(userId: string, itemId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('cart_items')
        .delete()
        .eq('id', itemId)
        .eq('user_id', userId);

      if (error) {
        throw new CartError('Failed to remove item from cart', {
          error,
        });
      }
    } catch (error) {
      if (error instanceof CartError) {
        throw error;
      }
      throw new CartError('Failed to remove item from cart', {
        originalError: error,
      });
    }
  }

  /**
   * Get cart with real-time pricing
   */
  async getCart(
    userId: string,
    destinationCountry: string = 'US',
    shippingMethod: ShippingMethod = 'Standard'
  ): Promise<Cart> {
    try {
      const { data: cartItems, error } = await this.supabase
        .from('cart_items')
        .select(
          `
          *,
          products (
            *,
            images (
              id,
              prompt,
              image_url,
              thumbnail_url
            )
          )
        `
        )
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new CartError('Failed to fetch cart', { error });
      }

      if (!cartItems || cartItems.length === 0) {
        return {
          items: [],
          totals: {
            subtotal: 0,
            shipping: 0,
            tax: 0,
            total: 0,
            currency: 'USD',
            originalCurrency: 'USD',
            originalTotal: 0,
            exchangeRate: 1,
          },
          shippingMethod,
          destinationCountry,
          updatedAt: new Date(),
        };
      }

      // Format cart items
      const items: CartItem[] = cartItems.map((item: any) =>
        this.formatCartItem(item, (item.products as any).price)
      );

      // Get real-time pricing (optional - fallback to stored prices if it fails)
      let totals: Cart['totals'];
      try {
        const pricing = await this.pricingService.calculatePricing(
          items,
          destinationCountry,
          shippingMethod
        );

        totals = {
          subtotal: pricing.subtotal,
          shipping: pricing.shipping,
          tax: pricing.tax,
          total: pricing.total,
          currency: pricing.currency,
          originalCurrency: pricing.originalCurrency,
          originalTotal: pricing.originalTotal,
          exchangeRate: pricing.exchangeRate,
        };
      } catch (pricingError) {
        console.error('[CartService] Pricing failed in getCart, using stored prices:', pricingError);
        // Fallback to stored prices
        const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        totals = {
          subtotal,
          shipping: 0, // Will be calculated at checkout
          tax: 0, // Will be calculated at checkout
          total: subtotal,
          currency: 'USD',
          originalCurrency: 'USD',
          originalTotal: subtotal,
          exchangeRate: 1,
        };
      }

      return {
        items,
        totals,
        shippingMethod,
        destinationCountry,
        updatedAt: new Date(),
      };
    } catch (error) {
      if (error instanceof CartError) {
        throw error;
      }
      throw new CartError('Failed to get cart', {
        originalError: error,
      });
    }
  }

  /**
   * Clear cart
   */
  async clearCart(userId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('cart_items')
        .delete()
        .eq('user_id', userId);

      if (error) {
        throw new CartError('Failed to clear cart', { error });
      }
    } catch (error) {
      if (error instanceof CartError) {
        throw error;
      }
      throw new CartError('Failed to clear cart', {
        originalError: error,
      });
    }
  }

  /**
   * Validate cart prices with Prodigi
   */
  async validatePrices(
    userId: string,
    destinationCountry: string = 'US'
  ): Promise<PriceValidationResult> {
    try {
      const cart = await this.getCart(userId, destinationCountry);
      return await this.pricingService.validatePrices(
        cart.items,
        destinationCountry
      );
    } catch (error) {
      throw new CartError('Failed to validate prices', {
        originalError: error,
      });
    }
  }

  /**
   * Format database cart item to CartItem type
   */
  private formatCartItem(dbItem: any, price: number): CartItem {
    const product = dbItem.products as any;
    return {
      id: dbItem.id,
      productId: dbItem.product_id,
      sku: product.sku || '',
      name: product.name || 'Framed Print',
      imageUrl: product.images?.image_url || product.images?.thumbnail_url || '',
      quantity: dbItem.quantity,
      price,
      originalPrice: product.price || price,
      currency: 'USD',
      frameConfig: {
        size: product.frame_size || 'medium',
        color: product.frame_style || 'black',
        style: product.frame_style || 'black',
        material: product.frame_material || 'wood',
      },
      createdAt: new Date(dbItem.created_at),
      updatedAt: new Date(dbItem.updated_at || dbItem.created_at),
    };
  }
}




