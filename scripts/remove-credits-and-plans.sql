-- Migration to remove credits and plan_type columns
-- This script safely checks if columns exist before dropping them

DO $$ 
BEGIN
    -- Drop credits column if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'profiles' AND column_name = 'credits') THEN
        ALTER TABLE profiles DROP COLUMN credits;
        RAISE NOTICE 'Dropped credits column from profiles table';
    ELSE
        RAISE NOTICE 'credits column does not exist in profiles table';
    END IF;
    
    -- Drop plan_type column if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'profiles' AND column_name = 'plan_type') THEN
        ALTER TABLE profiles DROP COLUMN plan_type;
        RAISE NOTICE 'Dropped plan_type column from profiles table';
    ELSE
        RAISE NOTICE 'plan_type column does not exist in profiles table';
    END IF;
END $$;

-- Keep is_premium for any future premium features, but no plan restrictions
-- This column can remain for potential future use without affecting the current unlimited model
