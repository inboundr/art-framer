-- Manual Database Fix Script
-- Run this directly against your Supabase database to fix the order items issue

-- Step 1: Fix the calculate_order_totals function (fixes all ambiguous references)
CREATE OR REPLACE FUNCTION public.calculate_order_totals(p_order_id UUID)
RETURNS VOID AS $$
DECLARE
  order_subtotal DECIMAL;
  tax_rate DECIMAL := 0.08;
  order_tax_amount DECIMAL;
  order_shipping_amount DECIMAL := 9.99;
  order_total_amount DECIMAL;
BEGIN
  SELECT COALESCE(SUM(total_price), 0) INTO order_subtotal
  FROM public.order_items
  WHERE order_id = p_order_id;
  
  order_tax_amount := order_subtotal * tax_rate;
  order_total_amount := order_subtotal + order_tax_amount + order_shipping_amount;
  
  UPDATE public.orders
  SET 
    subtotal = order_subtotal,
    tax_amount = order_tax_amount,
    shipping_amount = order_shipping_amount,
    total_amount = order_total_amount,
    updated_at = NOW()
  WHERE id = p_order_id;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Create order items for existing orders
-- Get the cart item data
INSERT INTO public.order_items (
  id,
  order_id, 
  product_id, 
  quantity, 
  unit_price, 
  total_price, 
  created_at
) 
SELECT 
  gen_random_uuid(),
  '053a6dd9-ebd4-4e2a-9093-13b86b74834b', -- Order ID
  ci.product_id,
  ci.quantity,
  p.price,
  p.price * ci.quantity,
  NOW()
FROM public.cart_items ci
JOIN public.products p ON ci.product_id = p.id
WHERE ci.user_id = '5681d4ab-bf1f-49fc-b544-7fb3ccc02383';

-- Step 3: Update order totals
UPDATE public.orders 
SET 
  subtotal = (
    SELECT COALESCE(SUM(total_price), 0) 
    FROM public.order_items 
    WHERE order_id = '053a6dd9-ebd4-4e2a-9093-13b86b74834b'
  ),
  tax_amount = (
    SELECT COALESCE(SUM(total_price), 0) * 0.08 
    FROM public.order_items 
    WHERE order_id = '053a6dd9-ebd4-4e2a-9093-13b86b74834b'
  ),
  shipping_amount = 9.99,
  total_amount = (
    SELECT COALESCE(SUM(total_price), 0) * 1.08 + 9.99 
    FROM public.order_items 
    WHERE order_id = '053a6dd9-ebd4-4e2a-9093-13b86b74834b'
  ),
  updated_at = NOW()
WHERE id = '053a6dd9-ebd4-4e2a-9093-13b86b74834b';

-- Step 4: Clear cart items
DELETE FROM public.cart_items 
WHERE user_id = '5681d4ab-bf1f-49fc-b544-7fb3ccc02383';

-- Step 5: Verify the fix
SELECT 
  o.order_number,
  o.subtotal,
  o.tax_amount,
  o.shipping_amount,
  o.total_amount,
  COUNT(oi.id) as item_count
FROM public.orders o
LEFT JOIN public.order_items oi ON o.id = oi.order_id
WHERE o.id = '053a6dd9-ebd4-4e2a-9093-13b86b74834b'
GROUP BY o.id, o.order_number, o.subtotal, o.tax_amount, o.shipping_amount, o.total_amount;
