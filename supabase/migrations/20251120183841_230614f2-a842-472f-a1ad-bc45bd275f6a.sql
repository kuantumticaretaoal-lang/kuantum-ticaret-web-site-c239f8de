-- Fix the search_path issue for generate_order_code function
CREATE OR REPLACE FUNCTION generate_order_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;