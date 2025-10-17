import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { constructWebhookEvent } from "@/lib/stripe";
import { prodigiClient } from "@/lib/prodigi";
import { orderRetryManager } from "@/lib/orderRetry";
import Stripe from "stripe";

export async function POST(request: NextRequest) {
  try {
    // Try to get the raw request body using the body stream
    const chunks: Uint8Array[] = [];
    const reader = request.body?.getReader();
    
    if (!reader) {
      console.error('❌ No request body reader available');
      return NextResponse.json(
        { error: 'No request body available' },
        { status: 400 }
      );
    }

    // Read the entire body as raw bytes
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    // Combine all chunks into a single Uint8Array
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const body = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      body.set(chunk, offset);
      offset += chunk.length;
    }

    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      console.error('❌ Missing stripe-signature header');
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    console.log('🔍 Webhook signature verification:', {
      hasSignature: !!signature,
      signatureLength: signature.length,
      bodyLength: body.length,
      bodyType: 'Uint8Array',
      signatureHeader: signature.substring(0, 50) + '...',
      bodyPreview: new TextDecoder().decode(body.slice(0, 100)) + '...'
    });

    const event = await constructWebhookEvent(body, signature);
    const supabase = await createClient();

    console.log('🔍 Webhook received:', {
      type: event.type,
      timestamp: new Date().toISOString(),
      eventId: event.id
    });

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(session, supabase);
        break;
      }
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionAsyncPaymentSucceeded(session, supabase);
        break;
      }
      case 'checkout.session.async_payment_failed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionAsyncPaymentFailed(session, supabase);
        break;
      }
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentSucceeded(paymentIntent, supabase);
        break;
      }
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentFailed(paymentIntent, supabase);
        break;
      }
      case 'payment_intent.requires_action': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentRequiresAction(paymentIntent, supabase);
        break;
      }
      case 'charge.dispute.created': {
        const dispute = event.data.object as Stripe.Dispute;
        await handleChargeDisputeCreated(dispute, supabase);
        break;
      }
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 400 }
    );
  }
}

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
  supabase: any
) {
  try {
    console.log('📝 Processing checkout session completed:', {
      sessionId: session.id,
      paymentStatus: session.payment_status,
      customerEmail: session.customer_email,
      metadata: session.metadata
    });

    const userId = session.metadata?.userId;
    const cartItemIds = session.metadata?.cartItemIds?.split(',') || [];

    if (!userId || cartItemIds.length === 0) {
      console.error('❌ Missing required metadata in session:', {
        userId,
        cartItemIds,
        allMetadata: session.metadata
      });
      return;
    }

    console.log('🛒 Processing cart items:', { userId, cartItemIds });

    // Fetch cart items
    const { data: cartItems, error: cartItemsError } = await supabase
      .from('cart_items')
      .select(`
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
      `)
      .eq('user_id', userId)
      .in('id', cartItemIds);

    if (cartItemsError || !cartItems) {
      console.error('❌ Error fetching cart items:', {
        error: cartItemsError,
        userId,
        cartItemIds
      });
      return;
    }

    console.log('✅ Cart items fetched:', { count: cartItems.length, items: cartItems.map((item: any) => ({ id: item.id, productId: item.product_id })) });

    // Check if order already exists (idempotency protection)
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('id, order_number, status')
      .eq('stripe_session_id', session.id)
      .single();

    if (existingOrder) {
      console.log('🔄 Order already exists, skipping creation:', { 
        orderId: existingOrder.id, 
        orderNumber: existingOrder.order_number,
        status: existingOrder.status 
      });
      return;
    }

    // Generate unique order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        user_id: userId,
        stripe_session_id: session.id,
        stripe_payment_intent_id: session.payment_intent as string,
        status: 'paid',
        payment_status: 'paid',
        customer_email: session.customer_email,
        customer_name: session.customer_details?.name,
        customer_phone: session.customer_details?.phone,
        shipping_address: (session as any).shipping_details?.address,
        billing_address: session.customer_details?.address,
        subtotal: parseFloat(session.metadata?.subtotal || '0'),
        tax_amount: parseFloat(session.metadata?.taxAmount || '0'),
        shipping_amount: parseFloat(session.metadata?.shippingAmount || '0'),
        total_amount: parseFloat(session.metadata?.total || '0'),
        currency: session.currency || 'usd',
        metadata: {
          stripe_session_id: session.id,
          payment_intent_id: session.payment_intent,
        }
      })
      .select()
      .single();

    if (orderError) {
      console.error('❌ Error creating order:', {
        error: orderError,
        userId,
        sessionId: session.id
      });
      return;
    }

    console.log('✅ Order created successfully:', { orderId: order.id, userId, total: order.total_amount });

    // Create order items
    const orderItems = cartItems.map((item: any) => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.products.price,
      total_price: item.products.price * item.quantity,
    }));

    const { error: orderItemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (orderItemsError) {
      console.error('❌ Error creating order items:', {
        error: orderItemsError,
        orderId: order.id,
        itemCount: orderItems.length
      });
      return;
    }

    console.log('✅ Order items created:', { orderId: order.id, itemCount: orderItems.length });

    // Clear cart items
    const { error: clearCartError } = await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', userId)
      .in('id', cartItemIds);

    if (clearCartError) {
      console.error('Error clearing cart:', clearCartError);
    }

    // Create dropship orders for each item
    console.log('📦 Creating dropship orders for', cartItems.length, 'items');
    for (const item of cartItems) {
      const orderItem = orderItems.find((oi: any) => oi.product_id === item.product_id);
      const { error: dropshipError } = await supabase
        .from('dropship_orders')
        .insert({
          order_id: order.id,
          order_item_id: orderItem?.id,
          provider: 'prodigi', // Primary provider - Prodigi
          status: 'pending',
        });

      if (dropshipError) {
        console.error('❌ Error creating dropship order:', {
          error: dropshipError,
          orderId: order.id,
          productId: item.product_id,
          orderItemId: orderItem?.id
        });
      } else {
        console.log('✅ Dropship order created for product:', item.product_id);
      }
    }

    // Schedule Prodigi order creation with retry system
    try {
      await orderRetryManager.scheduleOperation(
        'prodigi_order_creation',
        order.id,
        { orderData: order, cartItems },
        true // Process immediately
      );
    } catch (error) {
      console.error('Error scheduling Prodigi order creation:', error);
      // Don't fail the webhook if scheduling fails - we can retry later
    }

    console.log('🎉 Order processing completed successfully:', {
      orderId: order.id,
      userId,
      sessionId: session.id,
      itemCount: cartItems.length,
      totalAmount: order.total_amount
    });
  } catch (error) {
    console.error('Error handling checkout session completed:', error);
  }
}

async function handlePaymentIntentSucceeded(
  paymentIntent: Stripe.PaymentIntent,
  supabase: any
) {
  try {
    console.log('Processing payment intent succeeded:', paymentIntent.id);

    // Update order status if it exists
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'paid',
        payment_status: 'paid',
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_payment_intent_id', paymentIntent.id);

    if (updateError) {
      console.error('Error updating order status:', updateError);
    }
  } catch (error) {
    console.error('Error handling payment intent succeeded:', error);
  }
}

async function handlePaymentIntentFailed(
  paymentIntent: Stripe.PaymentIntent,
  supabase: any
) {
  try {
    console.log('Processing payment intent failed:', paymentIntent.id);

    // Update order status if it exists
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        payment_status: 'failed',
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_payment_intent_id', paymentIntent.id);

    if (updateError) {
      console.error('Error updating order status:', updateError);
    }
  } catch (error) {
    console.error('Error handling payment intent failed:', error);
  }
}

async function handleCheckoutSessionAsyncPaymentSucceeded(
  session: Stripe.Checkout.Session,
  supabase: any
) {
  try {
    console.log('🔄 Processing async payment succeeded:', {
      sessionId: session.id,
      paymentStatus: session.payment_status,
      customerEmail: session.customer_email
    });

    // Update order status to paid
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'paid',
        payment_status: 'paid',
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_session_id', session.id);

    if (updateError) {
      console.error('Error updating order for async payment success:', updateError);
    } else {
      console.log('✅ Order updated for async payment success');
    }
  } catch (error) {
    console.error('Error handling async payment succeeded:', error);
  }
}

async function handleCheckoutSessionAsyncPaymentFailed(
  session: Stripe.Checkout.Session,
  supabase: any
) {
  try {
    console.log('❌ Processing async payment failed:', {
      sessionId: session.id,
      paymentStatus: session.payment_status,
      customerEmail: session.customer_email
    });

    // Update order status to cancelled
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        payment_status: 'failed',
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_session_id', session.id);

    if (updateError) {
      console.error('Error updating order for async payment failure:', updateError);
    } else {
      console.log('✅ Order updated for async payment failure');
    }
  } catch (error) {
    console.error('Error handling async payment failed:', error);
  }
}

async function handlePaymentIntentRequiresAction(
  paymentIntent: Stripe.PaymentIntent,
  supabase: any
) {
  try {
    console.log('🔐 Processing payment requires action:', paymentIntent.id);

    // Update order status to pending action
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'pending',
        payment_status: 'requires_action',
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_payment_intent_id', paymentIntent.id);

    if (updateError) {
      console.error('Error updating order for requires action:', updateError);
    } else {
      console.log('✅ Order updated for requires action');
    }
  } catch (error) {
    console.error('Error handling payment requires action:', error);
  }
}

async function handleChargeDisputeCreated(
  dispute: Stripe.Dispute,
  supabase: any
) {
  try {
    console.log('⚖️ Processing charge dispute created:', dispute.id);

    // Update order status to disputed
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'disputed',
        payment_status: 'disputed',
        updated_at: new Date().toISOString(),
        metadata: {
          dispute_id: dispute.id,
          dispute_reason: dispute.reason,
          dispute_amount: dispute.amount,
          dispute_currency: dispute.currency,
        }
      })
      .eq('stripe_payment_intent_id', dispute.payment_intent);

    if (updateError) {
      console.error('Error updating order for dispute:', updateError);
    } else {
      console.log('✅ Order updated for dispute');
    }
  } catch (error) {
    console.error('Error handling charge dispute:', error);
  }
}

// Unused function - can be removed or implemented later
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function triggerProdigiOrderCreation(orderId: string, supabase: any) {
  try {
    console.log('🚀 Triggering Prodigi order creation for order:', orderId);

    // Fetch order with all details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          products (
            *,
            images (
              image_url,
              thumbnail_url
            )
          )
        )
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      throw new Error(`Order not found: ${orderError?.message}`);
    }

    if (order.status !== 'paid') {
      throw new Error('Order must be paid before creating Prodigi order');
    }

    // Check if Prodigi order already exists
    const { data: existingDropship } = await supabase
      .from('dropship_orders')
      .select('id, status, provider_order_id')
      .eq('order_id', orderId)
      .eq('provider', 'prodigi')
      .single();

    if (existingDropship && existingDropship.provider_order_id) {
      console.log('Prodigi order already exists:', existingDropship.provider_order_id);
      return;
    }

    // Prepare order data for Prodigi
    const prodigiOrderData = {
      orderReference: order.order_number || `ORDER-${orderId.slice(-8)}`,
      items: await Promise.all(order.order_items.map(async (item: any) => ({
        productUid: await prodigiClient.getProductSku(
          item.products?.frame_size || 'medium',
          item.products?.frame_style || 'black',
          item.products?.frame_material || 'wood'
        ),
        quantity: item.quantity,
        imageUrl: item.products?.images?.image_url || '',
        frameSize: item.products?.frame_size || 'medium',
        frameStyle: item.products?.frame_style || 'black',
        frameMaterial: item.products?.frame_material || 'wood',
      }))),
      shippingAddress: order.shipping_address,
      customerEmail: order.customer_email,
      customerPhone: order.customer_phone,
    };

    // Convert to Prodigi format
    const prodigiOrder = await prodigiClient.convertToProdigiOrder(prodigiOrderData);

    // Create order in Prodigi
    const prodigiResponse = await prodigiClient.createOrder(prodigiOrder);

    // Update dropship order record
    const dropshipOrderRecord = {
      provider_order_id: prodigiResponse.id,
      tracking_number: prodigiResponse.trackingNumber,
      tracking_url: prodigiResponse.trackingUrl,
      estimated_delivery: prodigiResponse.estimatedDelivery ? new Date(prodigiResponse.estimatedDelivery) : null,
      provider_response: prodigiResponse,
      status: prodigiResponse.status.toLowerCase(),
      updated_at: new Date().toISOString(),
    };

    if (existingDropship) {
      // Update existing record
      const { error: updateError } = await supabase
        .from('dropship_orders')
        .update(dropshipOrderRecord)
        .eq('id', existingDropship.id);

      if (updateError) {
        throw new Error(`Failed to update dropship order: ${updateError.message}`);
      }
    } else {
      // Create new record
      const { error: insertError } = await supabase
        .from('dropship_orders')
        .insert({
          order_id: orderId,
          order_item_id: order.order_items[0]?.id, // Assuming one item per dropship order for simplicity
          provider: 'prodigi',
          ...dropshipOrderRecord,
        });

      if (insertError) {
        throw new Error(`Failed to create dropship order: ${insertError.message}`);
      }
    }

    // Update main order status
    const { error: orderUpdateError } = await supabase
      .from('orders')
      .update({
        status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (orderUpdateError) {
      console.error('Error updating order status:', orderUpdateError);
    }

    console.log('✅ Prodigi order created successfully:', prodigiResponse.id);
    
    // Log the successful creation
    await supabase
      .from('order_logs')
      .insert({
        order_id: orderId,
        action: 'prodigi_order_created',
        details: {
          prodigi_order_id: prodigiResponse.id,
          status: prodigiResponse.status,
          tracking_number: prodigiResponse.trackingNumber,
        },
        created_at: new Date().toISOString(),
      });

  } catch (error) {
    console.error('❌ Error creating Prodigi order:', error);
    
    // Log the error
    await supabase
      .from('order_logs')
      .insert({
        order_id: orderId,
        action: 'prodigi_order_failed',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        },
        created_at: new Date().toISOString(),
      });

    throw error;
  }
}
