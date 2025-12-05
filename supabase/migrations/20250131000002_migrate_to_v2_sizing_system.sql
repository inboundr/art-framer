-- Migration: Migrate from legacy sizing (small/medium/large/extra_large) to v2 sizing system (actual sizes like "8x10", "12x30")
-- This migration converts the frame_size enum to VARCHAR and migrates existing data

-- ============================================================================
-- 1. Add temporary column for new sizing
-- ============================================================================

-- Add new VARCHAR column for v2 sizing
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS frame_size_v2 VARCHAR(50);

-- ============================================================================
-- 2. Migrate existing data from enum to v2 sizing
-- ============================================================================

-- Map legacy sizes to default v2 sizes
UPDATE public.products
SET frame_size_v2 = CASE
  WHEN frame_size::text = 'small' THEN '8x10'
  WHEN frame_size::text = 'medium' THEN '16x20'
  WHEN frame_size::text = 'large' THEN '24x30'
  WHEN frame_size::text = 'extra_large' THEN '30x40'
  ELSE '16x20' -- Default fallback
END
WHERE frame_size_v2 IS NULL;

-- ============================================================================
-- 3. Drop old enum column and rename new column
-- ============================================================================

-- Drop the old enum column
ALTER TABLE public.products DROP COLUMN IF EXISTS frame_size;

-- Rename new column to frame_size
ALTER TABLE public.products RENAME COLUMN frame_size_v2 TO frame_size;

-- Make it NOT NULL (since we've populated all rows)
ALTER TABLE public.products ALTER COLUMN frame_size SET NOT NULL;

-- ============================================================================
-- 4. Drop the enum type (if no other tables use it)
-- ============================================================================

-- Check if any other tables use frame_size enum before dropping
DO $$ 
BEGIN
  -- Only drop if no other tables reference it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE data_type = 'USER-DEFINED' 
    AND udt_name = 'frame_size'
  ) THEN
    DROP TYPE IF EXISTS frame_size CASCADE;
  END IF;
END $$;

-- ============================================================================
-- 5. Add index for better query performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_products_frame_size ON public.products(frame_size);

-- ============================================================================
-- Success message
-- ============================================================================
SELECT 'Migration to v2 sizing system completed successfully!' as message;

