-- Update dropshipping provider priority to use Prodigi as primary
-- This migration updates the system to use Prodigi as the main dropshipping provider

-- Update existing dropship orders to use Prodigi where possible
UPDATE public.dropship_orders 
SET provider = 'prodigi' 
WHERE provider = 'gelato' 
AND status IN ('pending', 'submitted');

-- Add comment to document the provider priority
COMMENT ON TYPE dropship_provider IS 'Dropshipping providers in priority order: prodigi (primary), gelato (backup), printful (emergency)';

-- Create index for better performance on provider queries
CREATE INDEX IF NOT EXISTS idx_dropship_orders_provider_status ON public.dropship_orders(provider, status);

-- Add function to get the best available provider
CREATE OR REPLACE FUNCTION public.get_best_dropship_provider()
RETURNS dropship_provider AS $$
BEGIN
  -- Return Prodigi as the primary provider
  -- In the future, this could include logic to check provider availability
  RETURN 'prodigi';
END;
$$ LANGUAGE plpgsql;

-- Add function to create dropship order with best provider
CREATE OR REPLACE FUNCTION public.create_dropship_order_with_best_provider(
  p_order_id UUID,
  p_order_item_id UUID
)
RETURNS UUID AS $$
DECLARE
  dropship_id UUID;
  best_provider dropship_provider;
BEGIN
  -- Get the best available provider
  best_provider := public.get_best_dropship_provider();
  
  -- Create the dropship order
  INSERT INTO public.dropship_orders (
    order_id,
    order_item_id,
    provider,
    status
  ) VALUES (
    p_order_id,
    p_order_item_id,
    best_provider,
    'pending'
  ) RETURNING id INTO dropship_id;
  
  RETURN dropship_id;
END;
$$ LANGUAGE plpgsql;
