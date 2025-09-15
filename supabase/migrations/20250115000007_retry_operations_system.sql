-- Retry Operations System Migration
-- This migration adds a comprehensive retry system for failed operations

-- Create retry_operations table
CREATE TABLE IF NOT EXISTS public.retry_operations (
  id VARCHAR(255) PRIMARY KEY,
  type VARCHAR(100) NOT NULL, -- 'prodigi_order_creation', 'prodigi_status_update', 'stripe_webhook', 'notification_send'
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  payload JSONB NOT NULL,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 5,
  last_attempt TIMESTAMP WITH TIME ZONE,
  next_retry TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'cancelled'
  error TEXT,
  result JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_retry_operations_status ON public.retry_operations(status);
CREATE INDEX IF NOT EXISTS idx_retry_operations_next_retry ON public.retry_operations(next_retry);
CREATE INDEX IF NOT EXISTS idx_retry_operations_order_id ON public.retry_operations(order_id);
CREATE INDEX IF NOT EXISTS idx_retry_operations_type ON public.retry_operations(type);
CREATE INDEX IF NOT EXISTS idx_retry_operations_created_at ON public.retry_operations(created_at);

-- Create function to clean up old retry operations
CREATE OR REPLACE FUNCTION cleanup_old_retry_operations()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete completed operations older than 7 days
  DELETE FROM public.retry_operations
  WHERE status = 'completed' 
    AND completed_at < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Delete failed operations older than 30 days
  DELETE FROM public.retry_operations
  WHERE status = 'failed' 
    AND failed_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to get retry statistics
CREATE OR REPLACE FUNCTION get_retry_stats(hours_back INTEGER DEFAULT 24)
RETURNS TABLE (
  total_count BIGINT,
  pending_count BIGINT,
  processing_count BIGINT,
  completed_count BIGINT,
  failed_count BIGINT,
  cancelled_count BIGINT,
  avg_attempts NUMERIC,
  success_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
    COUNT(*) FILTER (WHERE status = 'processing') as processing_count,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
    COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count,
    ROUND(AVG(attempts), 2) as avg_attempts,
    ROUND(
      (COUNT(*) FILTER (WHERE status = 'completed')::NUMERIC / 
       NULLIF(COUNT(*) FILTER (WHERE status IN ('completed', 'failed')), 0)) * 100, 
      2
    ) as success_rate
  FROM public.retry_operations
  WHERE created_at >= NOW() - (hours_back || ' hours')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- Create function to cancel retry operations for a specific order
CREATE OR REPLACE FUNCTION cancel_retry_operations_for_order(p_order_id UUID)
RETURNS INTEGER AS $$
DECLARE
  cancelled_count INTEGER;
BEGIN
  UPDATE public.retry_operations
  SET 
    status = 'cancelled',
    cancelled_at = NOW()
  WHERE order_id = p_order_id 
    AND status IN ('pending', 'processing');
  
  GET DIAGNOSTICS cancelled_count = ROW_COUNT;
  
  RETURN cancelled_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to reschedule failed operations
CREATE OR REPLACE FUNCTION reschedule_failed_operations(
  p_type VARCHAR(100) DEFAULT NULL,
  p_max_age_hours INTEGER DEFAULT 24
)
RETURNS INTEGER AS $$
DECLARE
  rescheduled_count INTEGER;
BEGIN
  UPDATE public.retry_operations
  SET 
    status = 'pending',
    next_retry = NOW() + INTERVAL '1 hour',
    attempts = 0,
    error = NULL
  WHERE status = 'failed'
    AND failed_at >= NOW() - (p_max_age_hours || ' hours')::INTERVAL
    AND (p_type IS NULL OR type = p_type)
    AND attempts < max_attempts;
  
  GET DIAGNOSTICS rescheduled_count = ROW_COUNT;
  
  RETURN rescheduled_count;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies for retry_operations
ALTER TABLE public.retry_operations ENABLE ROW LEVEL SECURITY;

-- Service role can manage all retry operations
CREATE POLICY "Service role can manage retry operations" ON public.retry_operations
  FOR ALL USING (auth.role() = 'service_role');

-- Users can view retry operations for their own orders
CREATE POLICY "Users can view their own retry operations" ON public.retry_operations
  FOR SELECT USING (
    order_id IN (
      SELECT id FROM public.orders WHERE user_id = auth.uid()
    )
  );

-- Create a view for retry operations with order details
CREATE OR REPLACE VIEW public.retry_operations_details AS
SELECT 
  ro.*,
  o.order_number,
  o.customer_email,
  o.status as order_status,
  o.created_at as order_created_at
FROM public.retry_operations ro
LEFT JOIN public.orders o ON ro.order_id = o.id;

-- Grant access to the view
GRANT SELECT ON public.retry_operations_details TO authenticated;
GRANT SELECT ON public.retry_operations_details TO service_role;

-- Create a function to automatically retry failed Prodigi operations
CREATE OR REPLACE FUNCTION auto_retry_prodigi_operations()
RETURNS INTEGER AS $$
DECLARE
  retried_count INTEGER;
BEGIN
  -- Reschedule failed Prodigi operations that are less than 2 hours old
  UPDATE public.retry_operations
  SET 
    status = 'pending',
    next_retry = NOW() + INTERVAL '5 minutes',
    attempts = 0,
    error = NULL
  WHERE status = 'failed'
    AND type IN ('prodigi_order_creation', 'prodigi_status_update')
    AND failed_at >= NOW() - INTERVAL '2 hours'
    AND attempts < max_attempts;
  
  GET DIAGNOSTICS retried_count = ROW_COUNT;
  
  RETURN retried_count;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get operations that need immediate attention
CREATE OR REPLACE FUNCTION get_critical_retry_operations()
RETURNS TABLE (
  id VARCHAR(255),
  type VARCHAR(100),
  order_id UUID,
  order_number VARCHAR(50),
  customer_email TEXT,
  attempts INTEGER,
  max_attempts INTEGER,
  last_attempt TIMESTAMP WITH TIME ZONE,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ro.id,
    ro.type,
    ro.order_id,
    o.order_number,
    o.customer_email,
    ro.attempts,
    ro.max_attempts,
    ro.last_attempt,
    ro.error,
    ro.created_at
  FROM public.retry_operations ro
  LEFT JOIN public.orders o ON ro.order_id = o.id
  WHERE ro.status = 'failed'
    AND ro.attempts >= ro.max_attempts
    AND ro.failed_at >= NOW() - INTERVAL '24 hours'
  ORDER BY ro.failed_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Create a function to monitor retry system health
CREATE OR REPLACE FUNCTION monitor_retry_system_health()
RETURNS TABLE (
  metric_name TEXT,
  metric_value NUMERIC,
  threshold NUMERIC,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT 
      COUNT(*) as total_ops,
      COUNT(*) FILTER (WHERE status = 'failed' AND attempts >= max_attempts) as critical_failures,
      COUNT(*) FILTER (WHERE status = 'pending' AND next_retry < NOW() - INTERVAL '1 hour') as overdue_ops,
      COUNT(*) FILTER (WHERE status = 'processing' AND last_attempt < NOW() - INTERVAL '30 minutes') as stuck_ops
    FROM public.retry_operations
    WHERE created_at >= NOW() - INTERVAL '24 hours'
  )
  SELECT 
    'critical_failures'::TEXT,
    stats.critical_failures::NUMERIC,
    10::NUMERIC,
    CASE WHEN stats.critical_failures > 10 THEN 'critical' ELSE 'ok' END::TEXT
  FROM stats
  UNION ALL
  SELECT 
    'overdue_operations'::TEXT,
    stats.overdue_ops::NUMERIC,
    5::NUMERIC,
    CASE WHEN stats.overdue_ops > 5 THEN 'warning' ELSE 'ok' END::TEXT
  FROM stats
  UNION ALL
  SELECT 
    'stuck_operations'::TEXT,
    stats.stuck_ops::NUMERIC,
    3::NUMERIC,
    CASE WHEN stats.stuck_ops > 3 THEN 'warning' ELSE 'ok' END::TEXT
  FROM stats;
END;
$$ LANGUAGE plpgsql;
