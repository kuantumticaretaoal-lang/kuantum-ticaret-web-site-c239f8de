-- Enable pgcrypto properly in extensions schema
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Drop and recreate functions with correct digest syntax
DROP FUNCTION IF EXISTS public.hash_backup_code(text);
DROP FUNCTION IF EXISTS public.generate_hashed_backup_code(uuid);
DROP FUNCTION IF EXISTS public.verify_backup_code(uuid, text);

-- Hash function using extensions schema
CREATE OR REPLACE FUNCTION public.hash_backup_code(plain_code text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN encode(digest(plain_code::bytea, 'sha256'), 'hex');
END;
$$;

-- Generate hashed backup code
CREATE OR REPLACE FUNCTION public.generate_hashed_backup_code(user_id_param uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  plain_code TEXT;
  hashed_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    plain_code := 
      CHR(65 + FLOOR(RANDOM() * 26)::INT) ||
      CHR(65 + FLOOR(RANDOM() * 26)::INT) ||
      FLOOR(RANDOM() * 10)::TEXT ||
      CHR(65 + FLOOR(RANDOM() * 26)::INT) ||
      CHR(65 + FLOOR(RANDOM() * 26)::INT) ||
      '-' ||
      FLOOR(RANDOM() * 10)::TEXT ||
      CHR(65 + FLOOR(RANDOM() * 26)::INT) ||
      CHR(65 + FLOOR(RANDOM() * 26)::INT) ||
      '-' ||
      FLOOR(RANDOM() * 10)::TEXT ||
      FLOOR(RANDOM() * 10)::TEXT ||
      FLOOR(RANDOM() * 10)::TEXT;
    
    hashed_code := encode(digest(plain_code::bytea, 'sha256'), 'hex');
    
    SELECT EXISTS(
      SELECT 1 FROM public.backup_codes WHERE code = hashed_code
    ) INTO code_exists;
    
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  DELETE FROM public.backup_codes WHERE user_id = user_id_param;
  
  INSERT INTO public.backup_codes (user_id, code, used)
  VALUES (user_id_param, hashed_code, false);
  
  RETURN plain_code;
END;
$$;

-- Verify backup code
CREATE OR REPLACE FUNCTION public.verify_backup_code(user_id_param uuid, plain_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  hashed_code TEXT;
  code_exists BOOLEAN;
BEGIN
  hashed_code := encode(digest(plain_code::bytea, 'sha256'), 'hex');
  
  SELECT EXISTS(
    SELECT 1 
    FROM public.backup_codes 
    WHERE user_id = user_id_param 
    AND code = hashed_code 
    AND used = false
  ) INTO code_exists;
  
  RETURN code_exists;
END;
$$;