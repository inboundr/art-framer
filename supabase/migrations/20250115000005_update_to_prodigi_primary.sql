-- This migration updates the system to use Prodigi as the main dropshipping provider

-- Update existing dropship orders to use Prodigi where possible (only if table exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'dropship_orders'
  ) THEN
    UPDATE public.dropship_orders 
    SET provider = 'prodigi' 
    WHERE provider = 'gelato' 
    AND status IN ('pending', 'submitted');
  END IF;
END
$$;

-- Add comment to document the provider priority (only if type exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM pg_type t 
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'dropship_provider' AND n.nspname = 'public'
  ) THEN
    EXECUTE 'COMMENT ON TYPE public.dropship_provider IS ''Dropshipping providers in priority order: prodigi (primary), gelato (backup), printful (emergency)''';
  END IF;
END
$$;

-- Create index for better performance on provider queries (only if table exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'dropship_orders'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_dropship_orders_provider_status ON public.dropship_orders(provider, status)';
  END IF;
END
$$;

-- Add function to get the best available provider (only if provider type exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM pg_type t 
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'dropship_provider' AND n.nspname = 'public'
  ) THEN
    EXECUTE 
      'CREATE OR REPLACE FUNCTION public.get_best_dropship_provider() ' ||
      'RETURNS public.dropship_provider AS ' ||
      quote_literal('BEGIN
        RETURN ''prodigi'';
      END;') ||
      ' LANGUAGE plpgsql;';
  END IF;
END
$$;

-- Add function to create dropship order with best provider (only if table and type exist)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'dropship_orders'
  ) AND EXISTS (
    SELECT 1 
    FROM pg_type t 
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'dropship_provider' AND n.nspname = 'public'
  ) THEN
    EXECUTE 
      'CREATE OR REPLACE FUNCTION public.create_dropship_order_with_best_provider(' ||
      '  p_order_id UUID, ' ||
      '  p_order_item_id UUID ' ||
      ') ' ||
      'RETURNS UUID AS ' ||
      quote_literal('DECLARE
        dropship_id UUID;
        best_provider public.dropship_provider;
      BEGIN
        best_provider := public.get_best_dropship_provider();
        INSERT INTO public.dropship_orders (
          order_id,
          order_item_id,
          provider,
          status
        ) VALUES (
          p_order_id,
          p_order_item_id,
          best_provider,
          ''pending''
        ) RETURNING id INTO dropship_id;
        RETURN dropship_id;
      END;') ||
      ' LANGUAGE plpgsql;';
  END IF;
END
$$;
