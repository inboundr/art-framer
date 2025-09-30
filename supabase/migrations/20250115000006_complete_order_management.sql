-- Complete Order Management System Migration
-- This migration adds comprehensive order tracking, logging, and management features

-- Create order_logs table for comprehensive order tracking
CREATE TABLE IF NOT EXISTS public.order_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  action VARCHAR(100) NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create order_status_history table for status tracking
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  status VARCHAR(50) NOT NULL,
  previous_status VARCHAR(50),
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create customer_notifications table for order updates
CREATE TABLE IF NOT EXISTS public.customer_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'order_created', 'order_processing', 'order_shipped', 'order_delivered', 'order_cancelled'
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add order_number field to orders table if it doesn't exist
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_number VARCHAR(50) UNIQUE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS estimated_delivery_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(100);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_url TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create function to generate order numbers
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
  counter INTEGER;
BEGIN
  -- Get the current date in YYYYMMDD format
  new_number := TO_CHAR(NOW(), 'YYYYMMDD');
  
  -- Get the count of orders for today
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 9) AS INTEGER)), 0) + 1
  INTO counter
  FROM public.orders
  WHERE order_number LIKE new_number || '%';
  
  -- Format as YYYYMMDD-XXXX
  new_number := new_number || '-' || LPAD(counter::TEXT, 4, '0');
  
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Create function to log order status changes
CREATE OR REPLACE FUNCTION log_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.order_status_history (
      order_id,
      status,
      previous_status,
      created_at
    ) VALUES (
      NEW.id,
      NEW.status,
      OLD.status,
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for order status logging
DROP TRIGGER IF EXISTS order_status_change_trigger ON public.orders;
CREATE TRIGGER order_status_change_trigger
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION log_order_status_change();

-- Create function to create customer notifications
CREATE OR REPLACE FUNCTION create_order_notification(
  p_order_id UUID,
  p_type VARCHAR(50),
  p_title VARCHAR(255),
  p_message TEXT,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
  p_user_id UUID;
BEGIN
  -- Get the user_id from the order
  SELECT user_id INTO p_user_id
  FROM public.orders
  WHERE id = p_order_id;
  
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Order not found or has no user_id';
  END IF;
  
  -- Create the notification
  INSERT INTO public.customer_notifications (
    order_id,
    user_id,
    type,
    title,
    message,
    metadata
  ) VALUES (
    p_order_id,
    p_user_id,
    p_type,
    p_title,
    p_message,
    p_metadata
  ) RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to update order with tracking information
CREATE OR REPLACE FUNCTION update_order_tracking(
  p_order_id UUID,
  p_tracking_number VARCHAR(100),
  p_tracking_url TEXT,
  p_estimated_delivery TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.orders
  SET 
    tracking_number = p_tracking_number,
    tracking_url = p_tracking_url,
    estimated_delivery_date = p_estimated_delivery,
    status = CASE 
      WHEN status = 'processing' THEN 'shipped'
      ELSE status
    END,
    updated_at = NOW()
  WHERE id = p_order_id;
  
  -- Create notification for tracking update
  PERFORM create_order_notification(
    p_order_id,
    'order_shipped',
    'Your order has been shipped!',
    'Your order has been shipped and is on its way. Track your package using the tracking number: ' || p_tracking_number,
    jsonb_build_object(
      'tracking_number', p_tracking_number,
      'tracking_url', p_tracking_url,
      'estimated_delivery', p_estimated_delivery
    )
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_order_logs_order_id ON public.order_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_order_logs_action ON public.order_logs(action);
CREATE INDEX IF NOT EXISTS idx_order_logs_created_at ON public.order_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON public.order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_status ON public.order_status_history(status);
CREATE INDEX IF NOT EXISTS idx_order_status_history_created_at ON public.order_status_history(created_at);

CREATE INDEX IF NOT EXISTS idx_customer_notifications_user_id ON public.customer_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_notifications_order_id ON public.customer_notifications(order_id);
CREATE INDEX IF NOT EXISTS idx_customer_notifications_type ON public.customer_notifications(type);
CREATE INDEX IF NOT EXISTS idx_customer_notifications_is_read ON public.customer_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_customer_notifications_created_at ON public.customer_notifications(created_at);

CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_tracking_number ON public.orders(tracking_number);

-- RLS Policies for order_logs
ALTER TABLE public.order_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own order logs" ON public.order_logs
  FOR SELECT USING (
    order_id IN (
      SELECT id FROM public.orders WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage order logs" ON public.order_logs
  FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for order_status_history
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own order status history" ON public.order_status_history
  FOR SELECT USING (
    order_id IN (
      SELECT id FROM public.orders WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage order status history" ON public.order_status_history
  FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for customer_notifications
ALTER TABLE public.customer_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications" ON public.customer_notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" ON public.customer_notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Service role can manage notifications" ON public.customer_notifications
  FOR ALL USING (auth.role() = 'service_role');

-- Update existing orders with order numbers if they don't have them
UPDATE public.orders 
SET order_number = generate_order_number()
WHERE order_number IS NULL;

-- Create a view for comprehensive order information
CREATE OR REPLACE VIEW public.order_details AS
SELECT 
  o.id,
  o.user_id,
  o.order_number,
  o.stripe_payment_intent_id,
  o.stripe_session_id,
  o.status,
  o.payment_status,
  o.customer_email,
  o.customer_name,
  o.customer_phone,
  o.shipping_address,
  o.billing_address,
  o.subtotal,
  o.tax_amount,
  o.shipping_amount,
  o.discount_amount,
  o.total_amount,
  o.currency,
  o.notes,
  o.metadata,
  o.created_at,
  o.updated_at,
  p.full_name as profile_name,
  COUNT(oi.id) as item_count,
  SUM(oi.total_price) as calculated_total,
  ds.provider as dropship_provider,
  ds.status as dropship_status,
  ds.provider_order_id,
  ds.tracking_number as dropship_tracking_number,
  ds.tracking_url as dropship_tracking_url,
  ds.estimated_delivery as dropship_estimated_delivery
FROM public.orders o
LEFT JOIN public.profiles p ON o.user_id = p.id
LEFT JOIN public.order_items oi ON o.id = oi.order_id
LEFT JOIN public.dropship_orders ds ON o.id = ds.order_id
GROUP BY o.id, o.user_id, o.order_number, o.stripe_payment_intent_id, o.stripe_session_id,
         o.status, o.payment_status, o.customer_email, o.customer_name, o.customer_phone,
         o.shipping_address, o.billing_address, o.subtotal, o.tax_amount, o.shipping_amount,
         o.discount_amount, o.total_amount, o.currency, o.notes, o.metadata, o.created_at, o.updated_at,
         p.full_name, ds.provider, ds.status, ds.provider_order_id, 
         ds.tracking_number, ds.tracking_url, ds.estimated_delivery;

-- Grant access to the view
GRANT SELECT ON public.order_details TO authenticated;
GRANT SELECT ON public.order_details TO service_role;
