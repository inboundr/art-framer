-- Cleanup Migration: Remove Unused Tables and Columns
-- This migration removes tables and columns that are not being used in the application

-- ============================================================================
-- 1. Remove unused tables
-- ============================================================================

-- Drop product_reviews table (not used anywhere in the codebase)
DROP TABLE IF EXISTS public.product_reviews CASCADE;

-- Drop wishlist_items table (API endpoint doesn't exist, only referenced in ProductCatalog but not implemented)
DROP TABLE IF EXISTS public.wishlist_items CASCADE;

-- ============================================================================
-- 2. Clean up unused enum values
-- ============================================================================

-- Note: We can't directly remove enum values in PostgreSQL, but we can document
-- which values are unused:
-- - frame_material: 'bamboo', 'plastic' are not used (only 'wood' is used)
-- - dropship_provider: 'gelato', 'printful' are not used (only 'prodigi' is used)
-- - frame_style: 'gold', 'silver' may not be used (need to verify)

-- ============================================================================
-- 3. Remove unused columns from products table
-- ============================================================================

-- Remove weight_grams (not used in calculations or display)
ALTER TABLE public.products DROP COLUMN IF EXISTS weight_grams;

-- Note: dimensions_cm is kept as it may be used for shipping calculations
-- Note: cost is kept as it's used for margin calculations

-- ============================================================================
-- 4. Add missing columns if needed
-- ============================================================================

-- Add name column to products table if it doesn't exist (used in cart.service.ts)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'products' 
    AND column_name = 'name'
  ) THEN
    ALTER TABLE public.products ADD COLUMN name VARCHAR(255) DEFAULT 'Framed Print';
  END IF;
END $$;

-- ============================================================================
-- 5. Clean up unused indexes
-- ============================================================================

-- Drop indexes for removed tables
DROP INDEX IF EXISTS idx_product_reviews_product_id;
DROP INDEX IF EXISTS idx_product_reviews_user_id;
DROP INDEX IF EXISTS idx_wishlist_items_user_id;

-- ============================================================================
-- 6. Clean up unused RLS policies
-- ============================================================================

-- Drop RLS policies for removed tables (only if tables exist)
-- Note: When tables are dropped with CASCADE, policies are automatically removed
-- But we check first to avoid errors if tables don't exist

DO $$ 
BEGIN
  -- Drop product_reviews policies if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'product_reviews') THEN
    DROP POLICY IF EXISTS "Product reviews are viewable by everyone" ON public.product_reviews;
    DROP POLICY IF EXISTS "Users can view own reviews" ON public.product_reviews;
    DROP POLICY IF EXISTS "Users can create reviews for own orders" ON public.product_reviews;
    DROP POLICY IF EXISTS "Users can update own reviews" ON public.product_reviews;
  END IF;
  
  -- Drop wishlist_items policies if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wishlist_items') THEN
    DROP POLICY IF EXISTS "Users can manage own wishlist" ON public.wishlist_items;
  END IF;
END $$;

-- ============================================================================
-- 7. Clean up unused triggers
-- ============================================================================

-- Drop triggers for removed tables (only if tables exist)
-- Note: When tables are dropped with CASCADE, triggers are automatically removed
-- But we check first to avoid errors if tables don't exist

DO $$ 
BEGIN
  -- Drop product_reviews triggers if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'product_reviews') THEN
    DROP TRIGGER IF EXISTS handle_product_reviews_updated_at ON public.product_reviews;
  END IF;
  
  -- Drop wishlist_items triggers if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wishlist_items') THEN
    DROP TRIGGER IF EXISTS handle_wishlist_items_updated_at ON public.wishlist_items;
  END IF;
END $$;

-- ============================================================================
-- 8. Clean up unused functions (if any)
-- ============================================================================

-- Note: Keep calculate_order_totals and generate_order_number as they may be used

-- ============================================================================
-- Success message
-- ============================================================================
SELECT 'Cleanup migration completed successfully!' as message;

