-- Migration: Update frame_style enum to include 'brown' and 'grey'
-- This aligns the database schema with the API validation schema
-- Date: 2025-01-30

-- Add 'brown' and 'grey' to the frame_style enum type
-- Using ALTER TYPE ... ADD VALUE which is safe and doesn't require recreating the type
DO $$ 
BEGIN
    -- Add 'brown' if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'brown' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'frame_style')
    ) THEN
        ALTER TYPE frame_style ADD VALUE 'brown';
    END IF;

    -- Add 'grey' if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'grey' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'frame_style')
    ) THEN
        ALTER TYPE frame_style ADD VALUE 'grey';
    END IF;
END $$;

-- Verify the enum now has all 7 values
-- Expected: black, white, natural, gold, silver, brown, grey
COMMENT ON TYPE frame_style IS 'Frame color/style options: black, white, natural, gold, silver, brown, grey';




