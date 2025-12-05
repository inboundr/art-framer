-- Ecommerce Setup Script for Art Framer
-- Run this in the Supabase Dashboard SQL Editor

-- Create custom types for ecommerce (if they don't exist)
DO $$ BEGIN
    CREATE TYPE order_status AS ENUM ('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Note: frame_size enum removed - now using VARCHAR for v2 sizing system (actual sizes like "8x10", "16x20")
-- Migration 20250131000002_migrate_to_v2_sizing_system.sql handles the conversion

DO $$ BEGIN
    CREATE TYPE frame_style AS ENUM ('black', 'white', 'natural', 'gold', 'silver');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE frame_material AS ENUM ('wood', 'metal', 'plastic', 'bamboo');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE dropship_status AS ENUM ('pending', 'submitted', 'processing', 'shipped', 'delivered', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE dropship_provider AS ENUM ('gelato', 'prodigi', 'printful');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Products table (framed images)
-- V2 sizing system: frame_size is VARCHAR (e.g., "8x10", "16x20", "12x30")
CREATE TABLE IF NOT EXISTS public.products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  image_id UUID REFERENCES public.images(id) ON DELETE CASCADE NOT NULL,
  frame_size VARCHAR(50) NOT NULL, -- V2 sizing: actual sizes like "8x10", "16x20", etc.
  frame_style frame_style NOT NULL,
  frame_material frame_material NOT NULL DEFAULT 'wood',
  price DECIMAL(10,2) NOT NULL,
  cost DECIMAL(10,2) NOT NULL,
  dimensions_cm JSONB NOT NULL,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'discontinued')),
  sku VARCHAR(100) UNIQUE,
  name VARCHAR(255) DEFAULT 'Framed Print',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  order_number VARCHAR(50) UNIQUE NOT NULL,
  stripe_payment_intent_id VARCHAR(255) UNIQUE,
  stripe_session_id VARCHAR(255) UNIQUE,
  status order_status DEFAULT 'pending',
  payment_status payment_status DEFAULT 'pending',
  customer_email VARCHAR(255) NOT NULL,
  customer_name VARCHAR(255),
  customer_phone VARCHAR(50),
  shipping_address JSONB NOT NULL,
  billing_address JSONB,
  subtotal DECIMAL(10,2) NOT NULL,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  shipping_amount DECIMAL(10,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Order items table
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Dropshipping orders table
CREATE TABLE IF NOT EXISTS public.dropship_orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  order_item_id UUID REFERENCES public.order_items(id) ON DELETE CASCADE NOT NULL,
  provider dropship_provider NOT NULL,
  provider_order_id VARCHAR(255),
  provider_reference VARCHAR(255),
  status dropship_status DEFAULT 'pending',
  tracking_number VARCHAR(255),
  tracking_url TEXT,
  estimated_delivery DATE,
  actual_delivery DATE,
  shipping_cost DECIMAL(10,2),
  provider_response JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shopping cart table
CREATE TABLE IF NOT EXISTS public.cart_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- Note: product_reviews and wishlist_items tables removed as they are not used in the application

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_products_image_id ON public.products(image_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_dropship_orders_order_id ON public.dropship_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_dropship_orders_provider ON public.dropship_orders(provider);
CREATE INDEX IF NOT EXISTS idx_dropship_orders_status ON public.dropship_orders(status);
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON public.cart_items(user_id);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dropship_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies (drop existing first to avoid conflicts)
DROP POLICY IF EXISTS "Products are viewable by everyone" ON public.products;
DROP POLICY IF EXISTS "Users can view all products" ON public.products;
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can create orders" ON public.orders;
DROP POLICY IF EXISTS "Users can update own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can view order items for own orders" ON public.order_items;
DROP POLICY IF EXISTS "Users can view dropship orders for own orders" ON public.dropship_orders;
DROP POLICY IF EXISTS "Users can manage own cart items" ON public.cart_items;

-- Products policies
CREATE POLICY "Products are viewable by everyone" ON public.products
  FOR SELECT USING (status = 'active');

CREATE POLICY "Users can view all products" ON public.products
  FOR SELECT USING (true);

-- Orders policies
CREATE POLICY "Users can view own orders" ON public.orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create orders" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own orders" ON public.orders
  FOR UPDATE USING (auth.uid() = user_id);

-- Order items policies
CREATE POLICY "Users can view order items for own orders" ON public.order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = order_items.order_id 
      AND orders.user_id = auth.uid()
    )
  );

-- Dropship orders policies
CREATE POLICY "Users can view dropship orders for own orders" ON public.dropship_orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = dropship_orders.order_id 
      AND orders.user_id = auth.uid()
    )
  );

-- Cart items policies
CREATE POLICY "Users can manage own cart items" ON public.cart_items
  FOR ALL USING (auth.uid() = user_id);

-- Create functions
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT AS $$
DECLARE
  order_num TEXT;
  counter INTEGER;
BEGIN
  order_num := TO_CHAR(NOW(), 'YYYYMMDD');
  SELECT COUNT(*) + 1 INTO counter
  FROM public.orders
  WHERE DATE(created_at) = CURRENT_DATE;
  order_num := order_num || LPAD(counter::TEXT, 4, '0');
  RETURN order_num;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.calculate_order_totals(p_order_id UUID)
RETURNS VOID AS $$
DECLARE
  subtotal DECIMAL;
  tax_rate DECIMAL := 0.08;
  tax_amount DECIMAL;
  shipping_amount DECIMAL := 9.99;
  total_amount DECIMAL;
BEGIN
  SELECT COALESCE(SUM(total_price), 0) INTO subtotal
  FROM public.order_items
  WHERE order_id = p_order_id;
  
  tax_amount := subtotal * tax_rate;
  total_amount := subtotal + tax_amount + shipping_amount;
  
  UPDATE public.orders
  SET 
    subtotal = subtotal,
    tax_amount = tax_amount,
    shipping_amount = shipping_amount,
    total_amount = total_amount,
    updated_at = NOW()
  WHERE id = p_order_id;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE OR REPLACE FUNCTION public.set_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL THEN
    NEW.order_number := public.generate_order_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_order_number ON public.orders;
CREATE TRIGGER trigger_set_order_number
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_order_number();

CREATE OR REPLACE FUNCTION public.trigger_calculate_order_totals()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    PERFORM public.calculate_order_totals(NEW.order_id);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.calculate_order_totals(OLD.order_id);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_order_items_totals ON public.order_items;
CREATE TRIGGER trigger_order_items_totals
  AFTER INSERT OR UPDATE OR DELETE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.trigger_calculate_order_totals();

-- Updated_at triggers
DROP TRIGGER IF EXISTS handle_products_updated_at ON public.products;
CREATE TRIGGER handle_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_orders_updated_at ON public.orders;
CREATE TRIGGER handle_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_dropship_orders_updated_at ON public.dropship_orders;
CREATE TRIGGER handle_dropship_orders_updated_at
  BEFORE UPDATE ON public.dropship_orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_cart_items_updated_at ON public.cart_items;
CREATE TRIGGER handle_cart_items_updated_at
  BEFORE UPDATE ON public.cart_items
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Success message
SELECT 'Ecommerce schema setup completed successfully!' as message;
