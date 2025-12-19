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
import { extractSizeFromSku } from '@/lib/utils/size-conversion';

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

      // Use the product's SKU from database (should be full SKU with image ID)
      // Only extract base SKU when making Prodigi API calls, not for storage
      const sku = product.sku;

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
                size: product.frame_size || '16x20', // V2 sizing: default to "16x20" instead of 'medium'
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
        console.error('[CartService] Pricing failed when adding to cart:', pricingError);
        // Don't use stored price - pricing must succeed to add item
        // This ensures cart always has accurate pricing
        throw new CartError(
          'Failed to get pricing for this item. Please try again.',
          {
            originalError: pricingError,
            statusCode: 500,
          }
        );
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
        console.error('[CartService] Pricing failed in updateItem:', pricingError);
        // Don't use stored price - throw error so frontend can handle it
        throw new CartError(
          'Failed to update item pricing. Please try again.',
          {
            originalError: pricingError,
            statusCode: 500,
          }
        );
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
      console.log('[CartService] removeItem: Deleting cart item', { userId, itemId });
      
      const { data: deletedItems, error } = await this.supabase
        .from('cart_items')
        .delete()
        .eq('id', itemId)
        .eq('user_id', userId)
        .select(); // Select to see what was deleted

      if (error) {
        console.error('[CartService] removeItem: Delete error', error);
        throw new CartError('Failed to remove item from cart', {
          error,
        });
      }

      console.log('[CartService] removeItem: Deleted items', {
        count: deletedItems?.length || 0,
        deletedIds: deletedItems?.map((item: any) => item.id) || [],
      });
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

      // Log what we got from the database
      console.log('[CartService] getCart: Fetched items from database:', {
        count: cartItems?.length || 0,
        items: cartItems?.map((item: any) => ({
          id: item.id,
          productId: item.product_id,
          quantity: item.quantity,
          sku: item.products?.sku,
        })) || [],
      });

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

      // Check for duplicate products (same SKU, different product_id)
      // This can happen if products were created multiple times with the same SKU
      const itemsBySku = new Map<string, any[]>();
      cartItems.forEach((item: any) => {
        const sku = item.products?.sku || '';
        if (sku) {
          if (!itemsBySku.has(sku)) {
            itemsBySku.set(sku, []);
          }
          itemsBySku.get(sku)!.push(item);
        }
      });

      // Log duplicates for debugging
      itemsBySku.forEach((items, sku) => {
        if (items.length > 1) {
          console.warn(`[CartService] getCart: Found ${items.length} cart items with same SKU "${sku}":`, 
            items.map((item: any) => ({
              id: item.id,
              productId: item.product_id,
              quantity: item.quantity,
            }))
          );
        }
      });

      // Get real-time pricing for all items first
      // This ensures we use actual Prodigi prices, not stored DB prices
      let items: CartItem[] = [];
      let totals: Cart['totals'];
      
      try {
        // First, format items with temporary prices (will be updated with real-time pricing)
        const tempItems: CartItem[] = cartItems.map((item: any) =>
          this.formatCartItem(item, (item.products as any).price)
        );

        // Get real-time pricing for all items
        const pricing = await this.pricingService.calculatePricing(
          tempItems,
          destinationCountry,
          shippingMethod
        );

        // Update items with real-time prices from Prodigi
        // Use per-item prices from quote if available, otherwise fallback to average
        const totalItemCost = pricing.subtotal;
        const totalQuantity = tempItems.reduce((sum, item) => sum + item.quantity, 0);
        const averagePricePerItem = totalQuantity > 0 ? totalItemCost / totalQuantity : 0;

        // Update items with real-time prices
        items = tempItems.map((item, index) => {
          // Use per-item price from quote if available, otherwise use average
          const itemPrice = pricing.itemPrices?.get(index) ?? averagePricePerItem;
          
          return {
            ...item,
            price: itemPrice,
            originalPrice: itemPrice, // Will be updated if currency conversion happened
            currency: pricing.currency,
          };
        });

        // Cart only shows subtotal - shipping calculated at checkout
        totals = {
          subtotal: pricing.subtotal,
          shipping: 0, // Shipping calculated at checkout only
          tax: 0, // Tax calculated at checkout only
          total: pricing.subtotal, // Only subtotal in cart
          currency: pricing.currency,
          originalCurrency: pricing.originalCurrency,
          originalTotal: pricing.subtotal, // Only subtotal in cart
          exchangeRate: pricing.exchangeRate,
        };
      } catch (pricingError) {
        console.error('[CartService] Pricing failed in getCart:', pricingError);
        // Throw CartError with 500 status code for pricing failures
        throw new CartError(
          'Failed to calculate pricing for cart items. Please try again or contact support.',
          {
            originalError: pricingError instanceof Error ? {
              message: pricingError.message,
              name: pricingError.name,
              stack: pricingError.stack,
            } : pricingError,
            statusCode: 500,
          }
        );
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
    
    // Extract actual size from SKU if available, otherwise use stored frame_size
    let size = product.frame_size || '16x20'; // V2 sizing: default to "16x20" instead of 'medium'
    if (product.sku) {
      const extractedSize = extractSizeFromSku(product.sku);
      if (extractedSize) {
        size = extractedSize;
      }
    }
    
    // Extract metadata fields (wrap, glaze, mount, paperType, finish, etc.)
    const metadata = product.metadata || {};
    
    // Infer product type from SKU or stored product_type
    const productType = product.product_type || this.inferProductTypeFromSku(product.sku);
    
    // Infer missing metadata from SKU and product type for backward compatibility
    const inferredMetadata = this.inferMetadataFromSku(product.sku, productType, metadata);
    
    // Build proper product name with product type
    const productTypeName = this.getProductTypeLabel(productType);
    const productName = product.name || productTypeName;
    
    return {
      id: dbItem.id,
      productId: dbItem.product_id,
      sku: product.sku || '',
      name: productName,
      imageUrl: product.images?.image_url || product.images?.thumbnail_url || '',
      quantity: dbItem.quantity,
      price,
      originalPrice: product.price || price,
      currency: 'USD',
      frameConfig: {
        size,
        color: product.frame_style || 'black',
        style: product.frame_style || 'black',
        material: product.frame_material || 'wood',
        productType, // Store product type in frameConfig for easier access
        // Use metadata if available, otherwise infer from SKU/product type
        // Only include fields that are relevant for the product type
        ...(metadata.wrap || inferredMetadata.wrap ? { wrap: metadata.wrap || inferredMetadata.wrap } : {}),
        ...(metadata.glaze || inferredMetadata.glaze ? { glaze: metadata.glaze || inferredMetadata.glaze } : {}),
        ...(metadata.mount || inferredMetadata.mount ? { mount: metadata.mount || inferredMetadata.mount } : {}),
        ...(metadata.mountColor || inferredMetadata.mountColor ? { mountColor: metadata.mountColor || inferredMetadata.mountColor } : {}),
        ...(metadata.paperType || inferredMetadata.paperType ? { paperType: metadata.paperType || inferredMetadata.paperType } : {}),
        ...(metadata.finish || inferredMetadata.finish ? { finish: metadata.finish || inferredMetadata.finish } : {}),
        ...(metadata.edge || inferredMetadata.edge ? { edge: metadata.edge || inferredMetadata.edge } : {}),
      },
      createdAt: new Date(dbItem.created_at),
      updatedAt: new Date(dbItem.updated_at || dbItem.created_at),
    };
  }

  /**
   * Get product type label for display
   */
  private getProductTypeLabel(productType: string | undefined): string {
    const labels: Record<string, string> = {
      'framed-print': 'Framed Print',
      'canvas': 'Canvas',
      'framed-canvas': 'Framed Canvas',
      'poster': 'Poster',
      'acrylic': 'Acrylic Print',
      'metal': 'Metal Print',
    };
    
    return labels[productType || ''] || 'Framed Print';
  }

  /**
   * Infer product type from SKU pattern
   */
  private inferProductTypeFromSku(sku: string | null | undefined): string | undefined {
    if (!sku) return undefined;
    const skuLower = sku.toLowerCase();
    
    if (skuLower.includes('can-rol') || skuLower.includes('rol-')) {
      return 'poster';
    } else if (skuLower.includes('fra-can') || skuLower.includes('framed-canvas')) {
      return 'framed-canvas';
    } else if (skuLower.includes('can-') && !skuLower.includes('fra-') && !skuLower.includes('rol-')) {
      return 'canvas';
    } else if (skuLower.includes('acry') || skuLower.includes('acrylic')) {
      return 'acrylic';
    } else if (skuLower.includes('metal') || skuLower.includes('dibond')) {
      return 'metal';
    } else if (skuLower.includes('cfpm') || skuLower.includes('fra-')) {
      return 'framed-print';
    }
    return undefined;
  }

  /**
   * Infer missing metadata from SKU and product type for backward compatibility
   */
  private inferMetadataFromSku(
    sku: string | null | undefined,
    productType: string | undefined,
    existingMetadata: Record<string, any>
  ): {
    wrap?: string;
    glaze?: string;
    mount?: string;
    mountColor?: string;
    paperType?: string;
    finish?: string;
    edge?: string;
  } {
    const inferred: Record<string, string> = {};
    
    if (!sku) return inferred;
    const skuLower = sku.toLowerCase();
    
    // Infer edge depth from SKU
    if (!existingMetadata.edge) {
      if (skuLower.includes('slimcan') || skuLower.includes('slim-can')) {
        inferred.edge = '19mm';
      } else if (skuLower.includes('can-') || skuLower.includes('fra-can')) {
        // Standard canvas typically has 38mm edge
        inferred.edge = '38mm';
      }
    }
    
    // Infer wrap for canvas products (not for posters)
    if (!existingMetadata.wrap && (productType === 'canvas' || productType === 'framed-canvas')) {
      inferred.wrap = 'Black'; // Default wrap for canvas
    }
    // Posters don't have wrap - don't infer it
    
    // Infer glaze for framed prints
    if (!existingMetadata.glaze && productType === 'framed-print') {
      inferred.glaze = 'none'; // Default to none, user can change
    }
    
    // Infer mount for framed prints
    if (!existingMetadata.mount && productType === 'framed-print') {
      inferred.mount = 'none'; // Default to none
    }
    
    // Infer mount color for framed prints
    if (!existingMetadata.mountColor && productType === 'framed-print') {
      inferred.mountColor = 'white'; // Default mount color
    }
    
    // Infer paper type
    if (!existingMetadata.paperType) {
      if (productType === 'canvas' || productType === 'framed-canvas') {
        inferred.paperType = 'enhanced-matte'; // Default for canvas
      } else if (productType === 'framed-print') {
        inferred.paperType = 'enhanced-matte'; // Default for framed prints
      }
    }
    
    // Infer finish
    if (!existingMetadata.finish) {
      if (productType === 'canvas' || productType === 'framed-canvas') {
        inferred.finish = 'matte'; // Default finish for canvas
      }
    }
    
    return inferred;
  }
}




