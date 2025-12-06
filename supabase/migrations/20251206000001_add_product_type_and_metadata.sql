-- Migration: Add product_type and metadata columns to products table
-- This migration adds support for storing product type (poster, canvas, framed-print, etc.)
-- and full configuration metadata (wrap, glaze, mount, paperType, finish, etc.)

-- ============================================================================
-- 1. Add product_type column
-- ============================================================================

-- Add product_type column to products table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'products' 
    AND column_name = 'product_type'
  ) THEN
    ALTER TABLE public.products 
    ADD COLUMN product_type VARCHAR(50) 
    CHECK (product_type IN ('framed-print', 'canvas', 'framed-canvas', 'acrylic', 'metal', 'poster'));
    
    -- Add comment for documentation
    COMMENT ON COLUMN public.products.product_type IS 'Product type: framed-print, canvas, framed-canvas, acrylic, metal, or poster';
  END IF;
END $$;

-- ============================================================================
-- 2. Add metadata JSONB column for full configuration
-- ============================================================================

-- Add metadata column to store full configuration (wrap, glaze, mount, paperType, finish, etc.)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'products' 
    AND column_name = 'metadata'
  ) THEN
    ALTER TABLE public.products 
    ADD COLUMN metadata JSONB DEFAULT '{}';
    
    -- Add comment for documentation
    COMMENT ON COLUMN public.products.metadata IS 'JSONB field storing full product configuration: wrap, glaze, mount, mountColor, paperType, finish, edge, etc.';
  END IF;
END $$;

-- ============================================================================
-- 3. Infer product_type from existing SKUs (backfill)
-- ============================================================================

-- Update existing products to infer product_type from SKU pattern
UPDATE public.products
SET product_type = CASE
  -- Rolled canvas = poster
  WHEN sku ILIKE '%can-rol%' OR sku ILIKE '%rol-%' OR sku ILIKE '%rolled%' THEN 'poster'
  -- Framed canvas
  WHEN sku ILIKE '%fra-can%' OR sku ILIKE '%framed-canvas%' THEN 'framed-canvas'
  -- Canvas (stretched canvas, not rolled)
  WHEN sku ILIKE '%can-%' AND sku NOT ILIKE '%fra-%' AND sku NOT ILIKE '%rol-%' THEN 'canvas'
  -- Acrylic
  WHEN sku ILIKE '%acry%' OR sku ILIKE '%acrylic%' THEN 'acrylic'
  -- Metal
  WHEN sku ILIKE '%metal%' OR sku ILIKE '%dibond%' THEN 'metal'
  -- Default to framed-print for everything else
  ELSE 'framed-print'
END
WHERE product_type IS NULL;

-- ============================================================================
-- 4. Create index on product_type for better query performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_products_product_type ON public.products(product_type);

-- ============================================================================
-- 5. Create GIN index on metadata JSONB for efficient queries
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_products_metadata ON public.products USING GIN (metadata);

-- ============================================================================
-- 6. Update RLS policies if needed (products table should already have policies)
-- ============================================================================

-- Note: RLS policies are typically managed in separate migration files
-- This migration only adds columns and indexes

