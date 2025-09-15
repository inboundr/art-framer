-- Fix products table RLS policy to allow inserts
-- This migration adds the missing INSERT policy for the products table

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can insert products" ON public.products;

-- Create INSERT policy for products
-- Users can create products for images they own
CREATE POLICY "Users can insert products" ON public.products
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.images 
      WHERE images.id = products.image_id 
      AND images.user_id = auth.uid()
    )
  );

-- Also add UPDATE and DELETE policies for completeness
DROP POLICY IF EXISTS "Users can update own products" ON public.products;
CREATE POLICY "Users can update own products" ON public.products
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.images 
      WHERE images.id = products.image_id 
      AND images.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete own products" ON public.products;
CREATE POLICY "Users can delete own products" ON public.products
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.images 
      WHERE images.id = products.image_id 
      AND images.user_id = auth.uid()
    )
  );
