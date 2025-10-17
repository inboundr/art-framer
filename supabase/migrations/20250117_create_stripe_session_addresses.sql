-- Create table to store shipping addresses with Stripe session IDs
CREATE TABLE IF NOT EXISTS stripe_session_addresses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stripe_session_id TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shipping_address JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_stripe_session_addresses_session_id ON stripe_session_addresses(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_stripe_session_addresses_user_id ON stripe_session_addresses(user_id);

-- Enable RLS
ALTER TABLE stripe_session_addresses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own session addresses" ON stripe_session_addresses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own session addresses" ON stripe_session_addresses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_stripe_session_addresses_updated_at
  BEFORE UPDATE ON stripe_session_addresses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
