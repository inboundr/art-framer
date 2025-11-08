#!/usr/bin/env node

/**
 * Diagnostic script to check image URLs in orders
 * This helps debug why Prodigi isn't showing images
 */

const { createClient } = require('@supabase/supabase-js');

// Get Supabase credentials from environment
const supabaseUrl = "https://irugsjzjqdxulliobuwt.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlydWdzanpqcWR4dWxsaW9idXd0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzg1NjgwOCwiZXhwIjoyMDczNDMyODA4fQ.DO6iUfTIkSoLq8AqGzT_0-G5unnOtoVkwx5X2nLdV9M";

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials!');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkOrderImageUrls(orderId) {
  console.log('🔍 Checking order:', orderId);
  console.log('');

  // Get order with all related data
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select(`
      *,
      order_items (
        *,
        products (
          *,
          images (
            id,
            image_url,
            thumbnail_url,
            prompt,
            status
          )
        )
      ),
      dropship_orders (
        *
      )
    `)
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    console.error('❌ Order not found:', orderError?.message);
    return;
  }

  console.log('✅ Order found:', {
    order_number: order.order_number,
    status: order.status,
    created_at: order.created_at,
    items_count: order.order_items?.length || 0
  });
  console.log('');

  // Check each order item's image
  for (const item of order.order_items || []) {
    console.log('📦 Order Item:', {
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price
    });

    const product = item.products;
    const image = product?.images;

    if (!image) {
      console.error('  ❌ NO IMAGE DATA FOUND!');
      continue;
    }

    console.log('  🖼️ Image data:', {
      image_id: image.id,
      status: image.status,
      prompt: image.prompt?.substring(0, 50) + '...',
      has_image_url: !!image.image_url,
      has_thumbnail_url: !!image.thumbnail_url
    });

    // Check image_url
    if (image.image_url) {
      const imageUrl = image.image_url;
      console.log('  📍 Image URL:', imageUrl);
      
      // Check if it's a full URL or a storage path
      if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        console.log('  ✅ URL is a full URL (publicly accessible)');
        
        // Try to fetch it
        try {
          const response = await fetch(imageUrl, { method: 'HEAD' });
          if (response.ok) {
            console.log('  ✅ URL is accessible! Status:', response.status);
            console.log('  ✅ Content-Type:', response.headers.get('content-type'));
          } else {
            console.error('  ❌ URL returned error:', response.status, response.statusText);
          }
        } catch (error) {
          console.error('  ❌ Failed to fetch URL:', error.message);
        }
      } else {
        console.error('  ⚠️ URL is NOT a full URL - it\'s a storage path!');
        console.error('  ⚠️ Prodigi CANNOT access storage paths!');
        console.error('  ⚠️ Need to convert to public URL first');
        
        // Try to convert to public URL
        const bucket = imageUrl.includes('curated') ? 'curated-images' : 'images';
        const { data } = supabase.storage.from(bucket).getPublicUrl(imageUrl);
        if (data?.publicUrl) {
          console.log('  ✅ Converted to public URL:', data.publicUrl);
          
          // Test the converted URL
          try {
            const response = await fetch(data.publicUrl, { method: 'HEAD' });
            if (response.ok) {
              console.log('  ✅ Public URL is accessible!');
            } else {
              console.error('  ❌ Public URL returned error:', response.status);
            }
          } catch (error) {
            console.error('  ❌ Public URL failed:', error.message);
          }
        }
      }
    } else {
      console.error('  ❌ NO IMAGE URL!');
    }

    console.log('');
  }

  // Check dropship orders
  if (order.dropship_orders && order.dropship_orders.length > 0) {
    console.log('📦 Dropship Orders:');
    for (const dropship of order.dropship_orders) {
      console.log('  Provider:', dropship.provider);
      console.log('  Status:', dropship.status);
      console.log('  Provider Order ID:', dropship.provider_order_id || 'Not created yet');
      
      if (dropship.provider_response) {
        console.log('  Provider Response:', JSON.stringify(dropship.provider_response, null, 2));
      }
    }
  }
}

// Get order ID from command line
const orderId = process.argv[2];

if (!orderId) {
  console.log('Usage: node check-order-image-urls.js <order-id>');
  console.log('');
  console.log('To find your order ID:');
  console.log('1. Go to Supabase Dashboard > Table Editor > orders');
  console.log('2. Copy the ID of your recent order');
  console.log('');
  process.exit(1);
}

checkOrderImageUrls(orderId);

