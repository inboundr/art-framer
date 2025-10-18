-- Fix ambiguous subtotal reference in calculate_order_totals function
-- This fixes the database trigger that's preventing order items from being created

CREATE OR REPLACE FUNCTION public.calculate_order_totals(p_order_id UUID)
RETURNS VOID AS $$
DECLARE
  order_subtotal DECIMAL;
  tax_rate DECIMAL := 0.08;
  tax_amount DECIMAL;
  shipping_amount DECIMAL := 9.99;
  total_amount DECIMAL;
BEGIN
  SELECT COALESCE(SUM(total_price), 0) INTO order_subtotal
  FROM public.order_items
  WHERE order_id = p_order_id;
  
  tax_amount := order_subtotal * tax_rate;
  total_amount := order_subtotal + tax_amount + shipping_amount;
  
  UPDATE public.orders
  SET 
    subtotal = order_subtotal,
    tax_amount = tax_amount,
    shipping_amount = shipping_amount,
    total_amount = total_amount,
    updated_at = NOW()
  WHERE id = p_order_id;
END;
$$ LANGUAGE plpgsql;
