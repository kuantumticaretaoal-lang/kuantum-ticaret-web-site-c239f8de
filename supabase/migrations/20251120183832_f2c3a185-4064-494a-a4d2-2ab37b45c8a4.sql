-- Add stock_quantity to products table
ALTER TABLE public.products ADD COLUMN stock_quantity integer DEFAULT 0;

-- Add order_code to orders table for tracking
ALTER TABLE public.orders ADD COLUMN order_code text UNIQUE;

-- Create function to generate unique order codes
CREATE OR REPLACE FUNCTION generate_order_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    -- Generate format: XXX-XXXX-XXXX (letters and numbers)
    code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 3)) || '-' ||
            UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4)) || '-' ||
            UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM orders WHERE order_code = code) INTO exists;
    
    EXIT WHEN NOT exists;
  END LOOP;
  
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Set order_code for existing orders
UPDATE public.orders SET order_code = generate_order_code() WHERE order_code IS NULL;

-- Make order_code required for new orders
ALTER TABLE public.orders ALTER COLUMN order_code SET DEFAULT generate_order_code();
ALTER TABLE public.orders ALTER COLUMN order_code SET NOT NULL;